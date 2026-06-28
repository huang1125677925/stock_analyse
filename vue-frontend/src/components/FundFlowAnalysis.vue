<template>
  <div class="fund-flow-analysis">
    <div class="controls">
      <el-select
        v-model="selectedLevel"
        placeholder="行业层级"
        :disabled="loading"
        @change="updateChart"
        style="width: 160px; margin-right: 10px;"
      >
        <el-option
          v-for="option in levelOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <!-- 数据周期选择 -->
      <el-select 
        v-model="weekFlag" 
        :disabled="loading"
        placeholder="数据周期" 
        style="width: 120px; margin-right: 10px;"
      >
        <el-option label="按天" :value="false" />
        <el-option label="按周" :value="true" />
      </el-select>
      
      <!-- 资金流指标选择 -->
      <FundFlowMetricSelector 
        v-model="selectedFundFlowMetric" 
        @change="updateChart" 
        :disabled="loading"
        style="margin-right: 10px;"
      />
      
      <!-- 日期范围选择 -->
      <DateRangeSelector 
        v-model="selectedDateRange" 
        :week-flag="weekFlag"
        :disabled="loading"
        @change="updateChart" 
      />
      
      <!-- 数值过滤选择 -->
      <el-select 
        v-model="valueFilter" 
        @change="updateChart" 
        :disabled="loading"
        placeholder="数值过滤" 
        style="width: 120px; margin-right: 10px;"
      >
        <el-option label="全部" value="all" />
        <el-option label="仅正值" value="positive" />
        <el-option label="仅负值" value="negative" />
      </el-select>
      
      <el-button @click="sortByLastColumn" type="primary" :disabled="loading">按最后一列排序</el-button>
    </div>
    
    <div class="chart-container">
      <!-- 资金流热力图 -->
      <FundFlowHeatmap 
        :data="industryFundFlowData"
        :selected-metric="selectedFundFlowMetric"
        :sort-ascending="sortAscending"
        :value-filter="valueFilter"
        @chart-ready="handleChartReady"
        @chart-click="handleChartClick"
      />
    </div>

    <IndustryTrendDialog
      v-model="trendDialogVisible"
      :sector-code="trendBoard.sectorCode"
      :sector-name="trendBoard.name"
      idx-type="行业板块"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 行业资金流分析组件
 * 功能：
 * - 按东财行业层级查询并展示行业资金流热力图
 * - 支持日/周周期切换、多种资金流指标、日期范围和正负值过滤
 * - 支持点击行业单元格后弹出东财行业趋势看板
 * 参数：无
 * 返回值：无
 * 事件：
 * - chart-ready: 热力图实例初始化完成
 * - chart-click: 点击热力图行业单元格后弹出趋势看板
 */
import { ref, onMounted } from 'vue'
import { watch } from 'vue'
import { ElMessage } from 'element-plus'
import FundFlowMetricSelector from './FundFlowMetricSelector.vue'
import DateRangeSelector from './DateRangeSelector.vue'
import FundFlowHeatmap from './FundFlowHeatmap.vue'
import IndustryTrendDialog from '@/components/IndustryTrendDialog.vue'
import { FundFlowMetricType } from '@/services/industry-fund-flow'
import { fetchIndustryFundFlowData } from '@/services/industry-fund-flow'
import type { IndustryFundFlowData } from '@/services/industry-fund-flow'
import type { EastMoneyIndustryLevel } from '@/services/strategyBreadthApi'

// 响应式变量
const selectedFundFlowMetric = ref(FundFlowMetricType.MAIN_NET_INFLOW_AMOUNT)
const selectedDateRange = ref('5') // 修改默认值为5（按天时为5天，按周时为5周）
const weekFlag = ref(false) // 数据周期标志，false为按天，true为按周
const valueFilter = ref<'all' | 'positive' | 'negative'>('all')
const sortAscending = ref(true)
const loading = ref(false)
const trendDialogVisible = ref(false)
const trendBoard = ref({
  sectorCode: '',
  name: ''
})
const levelOptions: Array<{ label: EastMoneyIndustryLevel; value: EastMoneyIndustryLevel }> = [
  { label: '东财一级行业', value: '东财一级行业' },
  { label: '东财二级行业', value: '东财二级行业' },
  { label: '东财三级行业', value: '东财三级行业' }
]
const selectedLevel = ref<EastMoneyIndustryLevel>('东财一级行业')

// 数据存储
const industryFundFlowData = ref<IndustryFundFlowData | null>(null)

// 获取行业资金流数据
const fetchFundFlowData = async () => {
  loading.value = true
  try {
    // 计算日期范围
    const today = new Date()
    const endDate = today.toISOString().split('T')[0]
    
    // 根据选择的日期范围和周期标志计算开始日期
    let days: number
    if (weekFlag.value) {
      // 按周模式：将周数转换为天数
      const weeks = selectedDateRange.value === 'all' ? 5 : parseInt(selectedDateRange.value)
      days = weeks * 7
    } else {
      // 按天模式：直接使用天数
      days = selectedDateRange.value === 'all' ? 30 : parseInt(selectedDateRange.value)
    }
    
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - days)
    const formattedStartDate = startDate.toISOString().split('T')[0]
    
    const response = await fetchIndustryFundFlowData({
      startDate: formattedStartDate,
      endDate,
      weekFlag: weekFlag.value,
      idxType: '行业板块',
      level: selectedLevel.value
    })
    
    if (response) {
      industryFundFlowData.value = response
    } else {
      ElMessage.error('获取行业资金流数据失败')
    }
  } catch (error) {
    console.error('获取资金流数据出错:', error)
    ElMessage.error('获取资金流数据出错，请检查网络连接或API服务是否可用')
  } finally {
    loading.value = false
  }
}

// 更新图表
const updateChart = () => {
  fetchFundFlowData()
}

// 监听周期标志变化，重置日期范围为默认值
watch(weekFlag, (newWeekFlag: boolean) => {
  selectedDateRange.value = '5' // 重置为默认值5（按天时为5天，按周时为5周）
  updateChart() // 更新图表
})

// 更新图表
const sortByLastColumn = () => {
  sortAscending.value = !sortAscending.value
}

// 图表事件处理
const handleChartReady = (chartInstance: any) => {
  // 图表准备就绪
}

const handleChartClick = (payload: any) => {
  const industryName = payload?.industry?.indexName
  const sectorCode = payload?.industry?.indexCode
  if (!industryName || !sectorCode) {
    ElMessage.warning('未找到该行业板块代码，暂时无法打开趋势图')
    return
  }

  trendBoard.value = {
    sectorCode,
    name: industryName
  }
  trendDialogVisible.value = true
}

// 组件挂载时获取数据
onMounted(() => {
  fetchFundFlowData()
})
</script>

<style scoped lang="scss">
.fund-flow-analysis {
  .controls {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    gap: 10px;
  }
  
  .chart-container {
    width: 100%;
    min-height: 500px;
  }
}
</style>

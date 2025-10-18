<template>
  <div class="fund-flow-analysis">
    <div class="controls">
      <!-- 资金流指标选择 -->
      <FundFlowMetricSelector 
        v-model="selectedFundFlowMetric" 
        @change="updateChart" 
        style="margin-right: 10px;"
      />
      
      <!-- 日期范围选择 -->
      <DateRangeSelector 
        v-model="selectedDateRange" 
        @change="updateChart" 
        style="margin-right: 10px;"
      />
      
      <!-- 数值过滤选择 -->
      <el-select 
        v-model="valueFilter" 
        @change="updateChart" 
        placeholder="数值过滤" 
        style="width: 120px; margin-right: 10px;"
      >
        <el-option label="全部" value="all" />
        <el-option label="仅正值" value="positive" />
        <el-option label="仅负值" value="negative" />
      </el-select>
      
      <el-button @click="sortByLastColumn" type="primary">按最后一列排序</el-button>
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
  </div>
</template>

<script setup lang="ts">
/**
 * 行业资金流分析组件
 * 功能：显示行业资金流热力图，支持多种资金流指标和日期范围选择
 * 参数：无
 * 返回值：无
 * 事件：chart-ready, chart-click
 */
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchIndustryFundFlowData, FundFlowMetricType } from '@/services/industry-fund-flow'
import type { IndustryFundFlowData } from '@/services/industry-fund-flow'
import FundFlowMetricSelector from '@/components/FundFlowMetricSelector.vue'
import DateRangeSelector from '@/components/DateRangeSelector.vue'
import FundFlowHeatmap from '@/components/FundFlowHeatmap.vue'

// 响应式变量
const selectedFundFlowMetric = ref(FundFlowMetricType.MAIN_NET_INFLOW_AMOUNT)
const selectedDateRange = ref('20')
const valueFilter = ref<'all' | 'positive' | 'negative'>('all')
const sortAscending = ref(true)
const loading = ref(false)

// 数据存储
const industryFundFlowData = ref<IndustryFundFlowData | null>(null)

// 获取行业资金流数据
const fetchFundFlowData = async () => {
  loading.value = true
  try {
    // 计算日期范围
    const today = new Date()
    const endDate = today.toISOString().split('T')[0]
    
    // 根据选择的日期范围计算开始日期
    const days = selectedDateRange.value === 'all' ? 30 : parseInt(selectedDateRange.value)
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - days)
    const formattedStartDate = startDate.toISOString().split('T')[0]
    
    const response = await fetchIndustryFundFlowData(formattedStartDate, endDate)
    
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

// 按最后一列排序
const sortByLastColumn = () => {
  sortAscending.value = !sortAscending.value
}

// 图表事件处理
const handleChartReady = (chartInstance: any) => {
  // 图表准备就绪
}

const handleChartClick = (params: any) => {
  // 图表点击事件
  console.log('Fund flow chart clicked:', params)
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
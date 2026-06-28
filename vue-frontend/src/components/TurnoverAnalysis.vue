<template>
  <div class="turnover-analysis">
    <div class="controls">
      <el-select
        v-model="selectedLevel"
        placeholder="行业层级"
        :disabled="loading"
        @change="updateChart"
        style="width: 160px;"
      >
        <el-option
          v-for="option in levelOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <!-- 日期范围选择 -->
      <DateRangeSelector 
        v-model="selectedDateRange" 
        :disabled="loading"
        @change="updateChart" 
        style="margin-right: 10px;"
      />
      <el-button @click="sortByLastColumn" type="primary" :disabled="loading">按最后一列排序</el-button>
    </div>
    
    <div class="chart-container">
      <!-- 换手率热力图 -->
      <TurnoverHeatmap 
        :industries="allIndustries"
        :dates="allDates"
        :sort-metric="sortMetric as 'turnover' | 'amount'"
        :sort-ascending="sortAscending"
        @chart-ready="handleChartReady"
        @chart-click="handleChartClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 成交金额占比分位数分析组件
 * 功能：
 * - 按东财行业层级查询并展示行业成交金额占比分位数热力图
 * - 支持日期范围切换和按最后一列排序
 * 参数：无
 * 返回值：无
 * 事件：
 * - chart-ready: 热力图实例初始化完成
 * - chart-click: 点击热力图行业单元格后跳转股票列表
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchIndustryTurnoverPercentile } from '@/services/industry-turnover-percentile'
import type { IndustryTurnoverPercentileItem } from '@/services/industry-turnover-percentile'
import type { EastMoneyIndustryLevel } from '@/services/strategyBreadthApi'
import DateRangeSelector from '@/components/DateRangeSelector.vue'
import TurnoverHeatmap from '@/components/TurnoverHeatmap.vue'

// 数据结构定义
interface CongestionData {
  turnoverRateFQuantile: number
  amountCongestionQuantile: number
}

interface IndustryData {
  name: string
  data: CongestionData[]
}

// 响应式变量
const router = useRouter()
const sortMetric = ref('amount')
const selectedDateRange = ref('20')
const sortAscending = ref(true)
const loading = ref(false)
const levelOptions: Array<{ label: EastMoneyIndustryLevel; value: EastMoneyIndustryLevel }> = [
  { label: '东财一级行业', value: '东财一级行业' },
  { label: '东财二级行业', value: '东财二级行业' },
  { label: '东财三级行业', value: '东财三级行业' }
]
const selectedLevel = ref<EastMoneyIndustryLevel>('东财一级行业')

// 数据存储
const allIndustries = ref<IndustryData[]>([])
const allDates = ref<string[]>([])

// 获取换手率数据
const fetchTurnoverData = async () => {
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
    
    // 使用stockApi中的函数获取数据
    const response = await fetchIndustryTurnoverPercentile({
      startDate: formattedStartDate,
      endDate,
      idxType: '行业板块',
      level: selectedLevel.value
    })

    if (response) {
      const apiData = response.data

      if (!Array.isArray(apiData)) {
        console.error('API返回的数据不是数组:', apiData)
        throw new Error('API返回的数据格式不正确')
      }
      
      // 提取所有唯一日期
      const uniqueDates = [...new Set(apiData.map((item: IndustryTurnoverPercentileItem) => item.date))].sort() as string[]
      allDates.value = uniqueDates
      
      // 按行业分组数据
      const industriesMap = new Map<string, {name: string, data: CongestionData[]}>() 
      
      apiData.forEach((item: IndustryTurnoverPercentileItem) => {
        if (!industriesMap.has(item.sector_code)) {
          industriesMap.set(item.sector_code, {
            name: item.sector_name,
            data: []
          })
        }
        
        // 为每个日期添加数据
        const industryData = industriesMap.get(item.sector_code)!
        const dateIndex = uniqueDates.indexOf(item.date)
        
        // 确保数据数组长度与日期数组一致
        while (industryData.data.length < uniqueDates.length) {
          industryData.data.push({
            turnoverRateFQuantile: 0,
            amountCongestionQuantile: 0
          })
        }
        
        // 更新对应日期的数据
        const amountPercentile = item.amount_percentile ?? item.turnover_ratio_percentile ?? 0
        industryData.data[dateIndex] = {
          turnoverRateFQuantile: amountPercentile,
          amountCongestionQuantile: amountPercentile
        }
      })
      
      // 转换为数组
      allIndustries.value = Array.from(industriesMap.values())
    } else {
      ElMessage.error('获取数据失败')
    }
  } catch (error) {
    console.error('获取数据出错:', error)
    ElMessage.error('获取数据出错，请检查网络连接或API服务是否可用')
  } finally {
    loading.value = false
  }
}

// 更新图表
const updateChart = () => {
  fetchTurnoverData()
}

// 按最后一列排序
const sortByLastColumn = () => {
  sortAscending.value = !sortAscending.value
}

// 图表事件处理
const handleChartReady = (chartInstance: any) => {
  // 图表准备就绪
}

const handleChartClick = (payload: any) => {
  // 图表点击事件 - 跳转到股票列表页面（使用子组件提供的结构化 payload，避免索引错位）
  console.log('Chart clicked payload:', payload)

  const industryName = payload?.industry?.name
  if (!industryName) return

  router.push({
    path: '/stock-list',
    query: { industry: industryName }
  })

  ElMessage.success(`正在跳转到 ${industryName} 行业的股票列表`)
}

// 组件挂载时获取数据
onMounted(() => {
  fetchTurnoverData()
})
</script>

<style scoped lang="scss">
.turnover-analysis {
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

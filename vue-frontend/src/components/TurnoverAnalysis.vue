<template>
  <div class="turnover-analysis">
    <div class="controls">
      <!-- 日期范围选择 -->
      <DateRangeSelector 
        v-model="selectedDateRange" 
        @change="updateChart" 
        style="margin-right: 10px;"
      />
      <el-button @click="sortByLastColumn" type="primary">按最后一列排序</el-button>
    </div>
    
    <div class="chart-container">
      <!-- 换手率热力图 -->
      <TurnoverHeatmap 
        :industries="displayedIndustries"
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
 * 功能：显示行业成交金额占比分位数热力图，并支持行业白名单过滤（用于“仅看我的”）
 * 参数：
 * - industryWhitelist?: string[] 行业白名单，传入后仅显示该列表中的行业
 * 返回值：无
 * 事件：chart-ready, chart-click
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchIndustryTurnoverPercentile } from '@/services/industry-turnover-percentile'
import type { IndustryTurnoverPercentileItem } from '@/services/industry-turnover-percentile'
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

interface Props {
  industryWhitelist?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  industryWhitelist: () => []
})

// 响应式变量
const router = useRouter()
const sortMetric = ref('amount')
const selectedDateRange = ref('20')
const sortAscending = ref(true)
const loading = ref(false)

// 数据存储
const allIndustries = ref<IndustryData[]>([])
const allDates = ref<string[]>([])

// 根据白名单过滤后的行业
const displayedIndustries = computed<IndustryData[]>(() => {
  if (!props.industryWhitelist || props.industryWhitelist.length === 0) {
    return allIndustries.value
  }
  const set = new Set(props.industryWhitelist.map(s => s.trim().toLowerCase()))
  return allIndustries.value.filter(ind => set.has(ind.name.trim().toLowerCase()))
})

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
    const response = await fetchIndustryTurnoverPercentile(formattedStartDate, endDate)
    
    if (response) {
      // 处理API返回的数据
      const apiData = response.data
      
      // 确保apiData是数组
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
        industryData.data[dateIndex] = {
          turnoverRateFQuantile: item.turnover_ratio_percentile,
          amountCongestionQuantile: item.turnover_ratio_percentile
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
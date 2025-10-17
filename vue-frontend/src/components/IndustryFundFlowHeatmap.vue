<template>
  <div class="industry-fund-flow-heatmap">
    <el-card shadow="hover">
      <template #header>
        <div class="header-controls">
          <h3>{{ title }}</h3>
          <div class="controls">
            <!-- 显示类型选择 -->
            <el-radio-group 
              v-model="displayType" 
              @change="updateChart" 
              size="small"
            >
              <el-radio-button label="amount">资金数量</el-radio-button>
              <el-radio-button label="ratio">资金比率</el-radio-button>
            </el-radio-group>
            
            <!-- 日期范围选择 -->
            <el-select 
              v-model="selectedDateRange" 
              @change="fetchData" 
              placeholder="选择日期范围" 
              style="width: 150px; margin-left: 10px;"
            >
              <el-option label="最近10天" value="10" />
              <el-option label="最近15天" value="15" />
              <el-option label="最近20天" value="20" />
              <el-option label="全部29天" value="all" />
            </el-select>
            
            <!-- 数值过滤选择 -->
            <el-select 
              v-model="valueFilter" 
              @change="updateChart" 
              placeholder="数值过滤" 
              style="width: 120px; margin-left: 10px;"
            >
              <el-option label="全部" value="all" />
              <el-option label="仅正值" value="positive" />
              <el-option label="仅负值" value="negative" />
            </el-select>
            
            <el-button @click="sortByLastColumn" type="primary" style="margin-left: 10px;">
              按最后一列排序
            </el-button>
          </div>
        </div>
      </template>
      
      <div v-loading="loading" element-loading-text="正在加载数据...">
        <div ref="chartContainer" class="chart-container"></div>
        
        <!-- 空状态 -->
        <el-empty
          v-if="!loading && !fundFlowData"
          description="暂无数据"
          :image-size="200"
        />
        
        <!-- 净流入正负比率统计 -->
        <div v-if="!loading && fundFlowData && positiveNegativeStats" class="stats-container">
          <el-card class="stats-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>净流入正负比率统计 ({{ 
                  valueFilter === 'all' ? '全部数值' : 
                  valueFilter === 'positive' ? '仅正值' : 
                  '仅负值' 
                }})</span>
              </div>
            </template>
            <div class="stats-content">
              <div class="stat-item">
                <span class="stat-label">正值项数:</span>
                <span class="stat-value positive">{{ positiveNegativeStats.positiveCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">负值项数:</span>
                <span class="stat-value negative">{{ positiveNegativeStats.negativeCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">总项数:</span>
                <span class="stat-value">{{ positiveNegativeStats.totalCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">正值比率:</span>
                <span class="stat-value positive">{{ positiveNegativeStats.positiveRatio }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">负值比率:</span>
                <span class="stat-value negative">{{ positiveNegativeStats.negativeRatio }}%</span>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 单个行业资金流热力图组件
 * 功能：
 * 1. 显示特定行业的资金流热力图，横轴为日期，纵轴为不同类型的资金
 * 2. 支持资金数量和比率两种显示模式
 * 3. 支持日期范围筛选
 * 4. 支持按最后一列数据排序
 * 5. 计算并显示净流入正负比率统计（排除全部净流入相关指标）
 * 
 * 参数：
 * - industry: string - 行业名称（必传）
 * - title: string - 热力图标题
 * 
 * 返回值：无
 * 事件：无
 */

import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { 
  fetchIndustryFundFlowData, 
  FundFlowMetricType, 
  FUND_FLOW_METRICS,
  type IndustryFundFlowData,
  type IndustryFundFlowDataItem,
  type SwCodeName
} from '@/services/industry-fund-flow'

// Props定义
interface Props {
  industry: string   // 行业名称（必传）
  title?: string     // 热力图标题
}

const props = withDefaults(defineProps<Props>(), {
  title: '行业资金流热力图'
})

// 净流入正负比率统计接口
interface PositiveNegativeStats {
  positiveCount: number
  negativeCount: number
  totalCount: number
  positiveRatio: string
  negativeRatio: string
}

// 响应式数据
const chartContainer = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
const loading = ref(false)
const sortAscending = ref(false) // 默认从大到小排序

// 控制参数
const displayType = ref<'amount' | 'ratio'>('amount')
const selectedDateRange = ref('20')
const valueFilter = ref<'all' | 'positive' | 'negative'>('all')

// 数据存储
const fundFlowData = ref<IndustryFundFlowData | null>(null)
const positiveNegativeStats = ref<PositiveNegativeStats | null>(null)

// 资金类型配置（按显示类型分组）
const fundTypeConfigs = computed(() => {
  if (displayType.value === 'amount') {
    return [
      { key: FundFlowMetricType.TOTAL_NET_INFLOW_AMOUNT, name: '全部净流入' },
      { key: FundFlowMetricType.MAIN_NET_INFLOW_AMOUNT, name: '主力净流入' },
      { key: FundFlowMetricType.SUPER_LARGE_NET_INFLOW_AMOUNT, name: '超大单净流入' },
      { key: FundFlowMetricType.LARGE_NET_INFLOW_AMOUNT, name: '大单净流入' },
      { key: FundFlowMetricType.MEDIUM_NET_INFLOW_AMOUNT, name: '中单净流入' },
      { key: FundFlowMetricType.SMALL_NET_INFLOW_AMOUNT, name: '小单净流入' }
    ]
  } else {
    return [
      { key: FundFlowMetricType.TOTAL_NET_INFLOW_RATIO, name: '全部净流入占比' },
      { key: FundFlowMetricType.MAIN_NET_INFLOW_RATIO, name: '主力净流入占比' },
      { key: FundFlowMetricType.SUPER_LARGE_NET_INFLOW_RATIO, name: '超大单净流入占比' },
      { key: FundFlowMetricType.LARGE_NET_INFLOW_RATIO, name: '大单净流入占比' },
      { key: FundFlowMetricType.MEDIUM_NET_INFLOW_RATIO, name: '中单净流入占比' },
      { key: FundFlowMetricType.SMALL_NET_INFLOW_RATIO, name: '小单净流入占比' }
    ]
  }
})

// 计算净流入正负比率统计
const calculatePositiveNegativeStats = () => {
  if (!fundFlowData.value) {
    positiveNegativeStats.value = null
    return
  }

  const data = fundFlowData.value
  
  // 查找指定行业的数据
  const targetIndustry = data.swCodeNames.find(industry => 
    industry.indexName === props.industry
  )
  
  if (!targetIndustry) {
    positiveNegativeStats.value = null
    return
  }
  
  const industryData = data.congestions[targetIndustry.indexCode] || data.congestions[targetIndustry.indexName as any]
  
  if (!industryData || industryData.length === 0) {
    positiveNegativeStats.value = null
    return
  }

  // 需要统计的资金流指标（排除全部净流入相关指标）
  const metricsToAnalyze = [
    'main_net_inflow_amount',
    'main_net_inflow_ratio', 
    'super_large_net_inflow_amount',
    'super_large_net_inflow_ratio',
    'large_net_inflow_amount',
    'large_net_inflow_ratio',
    'medium_net_inflow_amount',
    'medium_net_inflow_ratio',
    'small_net_inflow_amount',
    'small_net_inflow_ratio'
  ]

  let positiveCount = 0
  let negativeCount = 0
  let totalCount = 0

  // 遍历所有数据项和指标
  industryData.forEach((item: IndustryFundFlowDataItem) => {
    metricsToAnalyze.forEach((metric) => {
      const value = item[metric as keyof IndustryFundFlowDataItem] as number
      if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
        // 根据数值过滤条件筛选统计数据
        let shouldInclude = true
        if (valueFilter.value === 'positive' && value <= 0) {
          shouldInclude = false
        } else if (valueFilter.value === 'negative' && value >= 0) {
          shouldInclude = false
        }
        
        if (shouldInclude) {
          totalCount++
          if (value > 0) {
            positiveCount++
          } else if (value < 0) {
            negativeCount++
          }
        }
      }
    })
  })

  // 计算比率
  const positiveRatio = totalCount > 0 ? ((positiveCount / totalCount) * 100).toFixed(2) : '0.00'
  const negativeRatio = totalCount > 0 ? ((negativeCount / totalCount) * 100).toFixed(2) : '0.00'

  positiveNegativeStats.value = {
    positiveCount,
    negativeCount,
    totalCount,
    positiveRatio,
    negativeRatio
  }
}

// 获取资金流数据
const fetchData = async () => {
  loading.value = true
  try {
    // 计算日期范围
    const today = new Date()
    const endDate = today.toISOString().split('T')[0]
    
    const days = selectedDateRange.value === 'all' ? 30 : parseInt(selectedDateRange.value)
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - days)
    const formattedStartDate = startDate.toISOString().split('T')[0]
    
    const response = await fetchIndustryFundFlowData(formattedStartDate, endDate)
    
    if (response) {
      fundFlowData.value = response
      await nextTick()
      updateChart()
      calculatePositiveNegativeStats()
    } else {
      ElMessage.error('获取资金流数据失败')
    }
  } catch (error) {
    console.error('获取资金流数据出错:', error)
    ElMessage.error('获取数据出错，请检查网络连接或API服务是否可用')
  } finally {
    loading.value = false
  }
}

// 初始化图表
const initChart = () => {
  if (!chartContainer.value) return
  
  chart = echarts.init(chartContainer.value)
  updateChart()
}

// 更新图表
const updateChart = () => {
  if (!chart || !fundFlowData.value) return
  
  const data = fundFlowData.value
  const dates = data.dates
  
  // 查找指定行业的数据
  const targetIndustry = data.swCodeNames.find(industry => 
    industry.indexName === props.industry
  )
  
  if (!targetIndustry) {
    ElMessage.warning(`未找到行业"${props.industry}"的数据`)
    return
  }
  
  const industryData = data.congestions[targetIndustry.indexCode] || data.congestions[targetIndustry.indexName as any]
  
  if (!industryData || industryData.length === 0) {
    ElMessage.warning(`行业"${props.industry}"暂无资金流数据`)
    return
  }
  
  // 按最后一列数据排序资金类型
  const sortedFundTypes = [...fundTypeConfigs.value].sort((a, b) => {
    if (industryData.length === 0) return 0
    
    // 为排序计算最后一项的全部净流入数据
    const lastItem = industryData[industryData.length - 1]
    let aLastValue: number
    let bLastValue: number
    
    if (a.key === FundFlowMetricType.TOTAL_NET_INFLOW_AMOUNT) {
      aLastValue = lastItem.super_large_net_inflow_amount + 
                   lastItem.large_net_inflow_amount + 
                   lastItem.medium_net_inflow_amount + 
                   lastItem.small_net_inflow_amount
    } else if (a.key === FundFlowMetricType.TOTAL_NET_INFLOW_RATIO) {
      aLastValue = lastItem.super_large_net_inflow_ratio + 
                   lastItem.large_net_inflow_ratio + 
                   lastItem.medium_net_inflow_ratio + 
                   lastItem.small_net_inflow_ratio
    } else {
      aLastValue = lastItem[a.key as keyof IndustryFundFlowDataItem] as number
    }
    
    if (b.key === FundFlowMetricType.TOTAL_NET_INFLOW_AMOUNT) {
      bLastValue = lastItem.super_large_net_inflow_amount + 
                   lastItem.large_net_inflow_amount + 
                   lastItem.medium_net_inflow_amount + 
                   lastItem.small_net_inflow_amount
    } else if (b.key === FundFlowMetricType.TOTAL_NET_INFLOW_RATIO) {
      bLastValue = lastItem.super_large_net_inflow_ratio + 
                   lastItem.large_net_inflow_ratio + 
                   lastItem.medium_net_inflow_ratio + 
                   lastItem.small_net_inflow_ratio
    } else {
      bLastValue = lastItem[b.key as keyof IndustryFundFlowDataItem] as number
    }
    
    return sortAscending.value ? aLastValue - bLastValue : bLastValue - aLastValue
  })
  
  // 构建热力图数据
  const heatmapData: [number, number, number][] = []
  let minValue = Infinity
  let maxValue = -Infinity
  
  // 为每个数据项计算全部净流入金额和占比
  const processedIndustryData = industryData.map((item: IndustryFundFlowDataItem) => {
    // 计算全部净流入金额（所有类型净流入金额之和）
    const totalAmount = item.main_net_inflow_amount + 
                       item.super_large_net_inflow_amount + 
                       item.large_net_inflow_amount + 
                       item.medium_net_inflow_amount + 
                       item.small_net_inflow_amount
    
    // 计算全部净流入占比（所有类型净流入占比之和）
    const totalRatio = item.main_net_inflow_ratio + 
                      item.super_large_net_inflow_ratio + 
                      item.large_net_inflow_ratio + 
                      item.medium_net_inflow_ratio + 
                      item.small_net_inflow_ratio
    
    return {
      ...item,
      total_net_inflow_amount: totalAmount,
      total_net_inflow_ratio: totalRatio
    }
  })
  
  processedIndustryData.forEach((item: IndustryFundFlowDataItem, dateIndex: number) => {
    sortedFundTypes.forEach((fundType, fundTypeIndex) => {
      const value = item[fundType.key as keyof IndustryFundFlowDataItem] as number
      if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
        // 根据数值过滤条件筛选数据
        let shouldInclude = true
        if (valueFilter.value === 'positive' && value <= 0) {
          shouldInclude = false
        } else if (valueFilter.value === 'negative' && value >= 0) {
          shouldInclude = false
        }
        
        if (shouldInclude) {
          heatmapData.push([dateIndex, fundTypeIndex, value])
          minValue = Math.min(minValue, value)
          maxValue = Math.max(maxValue, value)
        }
      }
    })
  })
  
  // 如果没有有效数据，设置默认值
  if (minValue === Infinity || maxValue === -Infinity) {
    minValue = 0
    maxValue = 100
  }
  
  chart.clear()
  const option: echarts.EChartsOption = {
    tooltip: {
      position: 'top',
      formatter: function (params: any) {
        const [dateIndex, fundTypeIndex, value] = params.data
        const date = dates[dateIndex]
        const fundType = sortedFundTypes[fundTypeIndex]
        const metricConfig = FUND_FLOW_METRICS[fundType.key]
        const formattedValue = metricConfig.formatter ? metricConfig.formatter(value) : value.toFixed(2)
        return `${fundType.name}<br/>${date}<br/>数值: ${formattedValue}${metricConfig.unit}`
      }
    },
    grid: {
      height: Math.max(300, sortedFundTypes.length * 40) + 'px',
      top: '2%',
      left: '5%',
      right: '10%',
      bottom: '2%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: dates,
        splitArea: { show: true },
        axisLabel: { rotate: 45, fontSize: 10 }
      },
      {
        type: 'category',
        position: 'top',
        data: dates,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { rotate: 45, fontSize: 10, margin: 6 },
        name: '日期',
        nameLocation: 'end',
        nameTextStyle: { fontSize: 12 }
      }
    ],
    yAxis: [
      {
        type: 'category',
        data: sortedFundTypes.map(fundType => fundType.name),
        splitArea: { show: true },
        axisLabel: { fontSize: 11 }
      },
      {
        type: 'category',
        position: 'right',
        data: sortedFundTypes.map(fundType => fundType.name),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontSize: 11 },
        name: '资金类型',
        nameLocation: 'end',
        nameTextStyle: { fontSize: 12 }
      }
    ],
    visualMap: {
      min: minValue,
      max: maxValue,
      calculable: true,
      orient: 'vertical',
      right: '0%',
      top: '5%',
      width: 15,
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      },
      text: ['高', '低'],
      textStyle: {
        fontSize: 12
      }
    },
    series: [{
      name: displayType.value === 'amount' ? '资金流入金额' : '资金流入占比',
      type: 'heatmap',
      data: heatmapData,
      label: {
        show: true,
        fontSize: 9,
        formatter: function (params: any) {
          const [dateIndex, fundTypeIndex, value] = params.data
          const fundType = sortedFundTypes[fundTypeIndex]
          const metricConfig = FUND_FLOW_METRICS[fundType.key]
          return metricConfig.formatter ? metricConfig.formatter(value) : value.toFixed(1)
        }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
  
  nextTick(() => {
    if (!chart) return
    
    chart.setOption(option)
    
    // 动态调整容器高度
    if (chartContainer.value) {
      const containerHeight = Math.max(400, sortedFundTypes.length * 50 + 120)
      chartContainer.value.style.height = containerHeight + 'px'
      
      setTimeout(() => {
        if (chart) {
          chart.resize()
        }
      }, 0)
    }
  })
}

// 按最后一列排序
const sortByLastColumn = () => {
  sortAscending.value = !sortAscending.value
  updateChart()
}

// 监听显示类型变化
watch(displayType, () => {
  updateChart()
})

// 监听行业变化
watch(() => props.industry, () => {
  updateChart()
  calculatePositiveNegativeStats()
})

// 监听数据变化，重新计算统计
watch([fundFlowData, () => props.industry], () => {
  calculatePositiveNegativeStats()
})

// 监听过滤条件变化，重新计算统计
watch(valueFilter, () => {
  calculatePositiveNegativeStats()
})

// 生命周期
onMounted(() => {
  initChart()
  fetchData()
})

onUnmounted(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
})

// 暴露方法给父组件
defineExpose({
  refreshData: fetchData
})
</script>

<style scoped>
.industry-fund-flow-heatmap {
  width: 100%;
}

.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.header-controls h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chart-container {
  width: 100%;
  min-height: 400px;
}

.stats-container {
  margin-top: 0px;
}

.stats-card {
  border: 1px solid #e4e7ed;
}

.stats-card :deep(.el-card__header) {
  padding: 12px 20px;
  background-color: #f5f7fa;
}

.stats-card h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.stats-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  padding: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.stat-value.negative {
  color: #67c23a;
}

.stat-value.positive {
  color: #f56c6c;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .controls {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .controls .el-select,
  .controls .el-radio-group,
  .controls .el-button {
    width: 100%;
  }
  
  .stats-content {
    grid-template-columns: 1fr;
  }
}
</style>
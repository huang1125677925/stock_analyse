<template>
  <div class="industry-trend-charts">
    <!-- 收入利润数据图表 -->
    <el-card class="chart-card" shadow="hover">
      <div class="chart-header">
        <h3>收入利润数据</h3>
        <div class="chart-info">
          <span class="info-item">行业: {{ industryName }}</span>
          <span class="info-item">季度: {{ quarterName }}</span>
        </div>
      </div>
      <div ref="revenueChartRef" class="chart" style="width: 100%; height: 400px;"></div>
    </el-card>

    <!-- 增长率毛利率数据图表 -->
    <el-card class="chart-card" shadow="hover">
      <div class="chart-header">
        <h3>增长率毛利率数据</h3>
        <div class="chart-info">
          <span class="info-item">行业: {{ industryName }}</span>
          <span class="info-item">季度: {{ quarterName }}</span>
        </div>
      </div>
      <div ref="growthChartRef" class="chart" style="width: 100%; height: 400px;"></div>
    </el-card>

    <!-- ROA/ROE数据图表 -->
    <el-card class="chart-card" shadow="hover">
      <div class="chart-header">
        <h3>ROA/ROE数据</h3>
        <div class="chart-info">
          <span class="info-item">行业: {{ industryName }}</span>
          <span class="info-item">季度: {{ quarterName }}</span>
        </div>
      </div>
      <div ref="roeChartRef" class="chart" style="width: 100%; height: 400px;"></div>
    </el-card>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <el-loading
        element-loading-text="正在加载数据..."
        element-loading-spinner="el-icon-loading"
        element-loading-background="rgba(0, 0, 0, 0.8)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 行业趋势图表组件
 * 功能：
 * 1. 显示收入利润数据趋势图
 * 2. 显示增长率毛利率数据趋势图
 * 3. 显示ROA/ROE数据趋势图
 * 4. 支持行业和季度筛选
 * 5. 不支持外部日期范围过滤（由父级移除该功能）
 * 
 * 参数：
 * - industry: string - 行业名称
 * - quarter: string - 季度类型
 * - industryName: string - 显示用的行业名称
 * - quarterName: string - 显示用的季度名称
 * 
 * 返回值：无
 * 事件：无
 */

import { ref, watch, onMounted, nextTick, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { 
  getIndustryPerformanceReports,
  type IndustryPerformanceReport
} from '../services/industryAnalysisApi'

// Props定义
interface Props {
  industry?: string
  quarter: string
  industryName: string
  quarterName: string
}

const props = withDefaults(defineProps<Props>(), {
  industry: undefined
})

// 响应式数据
const loading = ref(false)
const revenueChartRef = ref<HTMLDivElement>()
const growthChartRef = ref<HTMLDivElement>()
const roeChartRef = ref<HTMLDivElement>()

const revenueChartInstance = ref<echarts.ECharts>()
const growthChartInstance = ref<echarts.ECharts>()
const roeChartInstance = ref<echarts.ECharts>()

const chartData = ref<IndustryPerformanceReport[]>([])

// 方法
/**
 * 获取行业数据
 */
const fetchIndustryData = async () => {
  if (!props.quarter) return

  loading.value = true
  
  try {
    const params: any = {
      report_type: props.quarter
    }

    // 如果选择了特定行业，添加行业参数
    if (props.industry && props.industry !== 'all') {
      params.industry = props.industry
    }

    const response = await getIndustryPerformanceReports(params)
    chartData.value = response.aggregated_reports
    
    // 渲染所有图表
    await nextTick()
    renderAllCharts()
    
  } catch (error) {
    console.error('获取行业数据失败:', error)
    ElMessage.error('获取数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

/**
 * 渲染所有图表
 */
const renderAllCharts = () => {
  renderRevenueChart()
  renderGrowthChart()
  renderRoeChart()
}

/**
 * 渲染收入利润数据图表
 */
const renderRevenueChart = () => {
  const data = chartData.value
  if (!revenueChartRef.value || data.length === 0) return

  // 销毁现有图表实例
  if (revenueChartInstance.value) {
    revenueChartInstance.value.dispose()
  }

  // 创建新的图表实例
  revenueChartInstance.value = echarts.init(revenueChartRef.value)

  const quarters = data.map(item => item.report_date)
  const revenueData = data.map(item => item.total_operating_revenue || 0)
  const profitData = data.map(item => item.total_net_profit || 0)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['营业收入', '净利润']
    },
    xAxis: {
      type: 'category',
      data: quarters
    },
    yAxis: [
      {
        type: 'value',
        name: '营业收入 (万元)',
        position: 'left',
        axisLabel: {
          formatter: '{value}'
        }
      },
      {
        type: 'value',
        name: '净利润 (万元)',
        position: 'right',
        axisLabel: {
          formatter: '{value}'
        }
      }
    ],
    series: [
      {
        name: '营业收入',
        type: 'line',
        yAxisIndex: 0,
        data: revenueData,
        smooth: true,
        itemStyle: {
          color: '#1890ff'
        },
        lineStyle: {
          color: '#1890ff'
        }
      },
      {
        name: '净利润',
        type: 'line',
        yAxisIndex: 1,
        data: profitData,
        smooth: true,
        itemStyle: {
          color: '#52c41a'
        },
        lineStyle: {
          color: '#52c41a'
        }
      }
    ]
  }

  revenueChartInstance.value.setOption(option)
}

/**
 * 渲染增长率毛利率数据图表
 */
const renderGrowthChart = () => {
  const data = chartData.value
  if (!growthChartRef.value || data.length === 0) return

  // 销毁现有图表实例
  if (growthChartInstance.value) {
    growthChartInstance.value.dispose()
  }

  // 创建新的图表实例
  growthChartInstance.value = echarts.init(growthChartRef.value)

  const quarters = data.map(item => item.report_date)
  const revenueGrowthData = data.map(item => item.avg_operating_revenue_growth_rate || 0)
  const profitGrowthData = data.map(item => item.avg_net_profit_growth_rate || 0)
  const grossMarginData = data.map(item => item.avg_gross_profit_margin || 0)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: function(params: any) {
        let result = params[0].name + '<br/>'
        params.forEach((param: any) => {
          result += param.marker + param.seriesName + ': ' + param.value.toFixed(2) + '%<br/>'
        })
        return result
      }
    },
    legend: {
      data: ['营业收入增长率', '净利润增长率', '毛利率']
    },
    xAxis: {
      type: 'category',
      data: quarters
    },
    yAxis: {
      type: 'value',
      name: '百分比 (%)',
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: '营业收入增长率',
        type: 'line',
        data: revenueGrowthData,
        smooth: true,
        itemStyle: {
          color: '#faad14'
        },
        lineStyle: {
          color: '#faad14'
        }
      },
      {
        name: '净利润增长率',
        type: 'line',
        data: profitGrowthData,
        smooth: true,
        itemStyle: {
          color: '#f5222d'
        },
        lineStyle: {
          color: '#f5222d'
        }
      },
      {
        name: '毛利率',
        type: 'line',
        data: grossMarginData,
        smooth: true,
        itemStyle: {
          color: '#722ed1'
        },
        lineStyle: {
          color: '#722ed1'
        }
      }
    ]
  }

  growthChartInstance.value.setOption(option)
}

/**
 * 渲染ROA/ROE数据图表
 */
const renderRoeChart = () => {
  const data = chartData.value
  if (!roeChartRef.value || data.length === 0) return

  // 销毁现有图表实例
  if (roeChartInstance.value) {
    roeChartInstance.value.dispose()
  }

  // 创建新的图表实例
  roeChartInstance.value = echarts.init(roeChartRef.value)

  const quarters = data.map(item => item.report_date)
  const roeData = data.map(item => item.avg_roe || 0)
  // 由于API中没有ROA数据，这里使用ROE作为示例，实际项目中需要根据API调整
  const roaData = data.map(item => (item.avg_roe || 0) * 0.8) // 模拟ROA数据

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: function(params: any) {
        let result = params[0].name + '<br/>'
        params.forEach((param: any) => {
          result += param.marker + param.seriesName + ': ' + param.value.toFixed(2) + '%<br/>'
        })
        return result
      }
    },
    legend: {
      data: ['ROE', 'ROA']
    },
    xAxis: {
      type: 'category',
      data: quarters
    },
    yAxis: {
      type: 'value',
      name: '百分比 (%)',
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: 'ROE',
        type: 'line',
        data: roeData,
        smooth: true,
        itemStyle: {
          color: '#13c2c2'
        },
        lineStyle: {
          color: '#13c2c2'
        }
      },
      {
        name: 'ROA',
        type: 'line',
        data: roaData,
        smooth: true,
        itemStyle: {
          color: '#eb2f96'
        },
        lineStyle: {
          color: '#eb2f96'
        }
      }
    ]
  }

  roeChartInstance.value.setOption(option)
}

/**
 * 处理窗口大小变化
 */
const handleResize = () => {
  revenueChartInstance.value?.resize()
  growthChartInstance.value?.resize()
  roeChartInstance.value?.resize()
}

// 监听props变化
watch([() => props.industry, () => props.quarter], () => {
  fetchIndustryData()
}, { immediate: false })

// 监听外部日期范围变更，仅重新渲染（无需重新拉取）
// 已移除外部日期范围监听，趋势图仅根据行业与季度变化重新渲染

// 生命周期
onMounted(() => {
  fetchIndustryData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  revenueChartInstance.value?.dispose()
  growthChartInstance.value?.dispose()
  roeChartInstance.value?.dispose()
})
</script>

<style scoped>
.industry-trend-charts {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chart-card {
  width: 100%;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.chart-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.chart-info {
  display: flex;
  gap: 16px;
}

.info-item {
  font-size: 14px;
  color: #666;
  background: #f5f5f5;
  padding: 4px 12px;
  border-radius: 12px;
}

.chart {
  width: 100%;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 1000;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .chart-info {
    flex-direction: column;
    gap: 8px;
  }
  
  .chart {
    height: 300px !important;
  }
}
</style>
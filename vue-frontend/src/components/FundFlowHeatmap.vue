<template>
  <HeatmapChart 
    :option="chartOption" 
    @chart-ready="handleChartReady"
    @chart-click="handleChartClick"
  />
</template>

<script setup lang="ts">
/**
 * 资金流热力图组件
 * 
 * 功能：
 * - 显示行业资金流热力图
 * - 支持多种资金流指标选择
 * - 支持搜索关键词过滤
 * - 支持按最后一列排序
 * 
 * Props:
 * - data: 行业资金流数据
 * - selectedMetric: 选择的资金流指标
 * - searchKeyword: 搜索关键词
 * - sortAscending: 是否升序排序
 * - valueFilter: 数值过滤（all/positive/negative）
 * 
 * Events:
 * - chartReady: 图表初始化完成
 * - chartClick: 图表点击事件
 */

import { computed } from 'vue'
import * as echarts from 'echarts'
import HeatmapChart from './HeatmapChart.vue'
import { FUND_FLOW_METRICS, FundFlowMetricType } from '@/services/industry-fund-flow'
import type { IndustryFundFlowData, IndustryFundFlowDataItem } from '@/services/industry-fund-flow'

// 定义组件名称
defineOptions({
  name: 'FundFlowHeatmap'
})

interface Props {
  /** 行业资金流数据 */
  data: IndustryFundFlowData | null
  /** 选择的资金流指标 */
  selectedMetric: FundFlowMetricType
  /** 搜索关键词 */
  searchKeyword?: string
  /** 是否升序排序 */
  sortAscending?: boolean
  /** 数值过滤 */
  valueFilter?: 'all' | 'positive' | 'negative'
}

const props = withDefaults(defineProps<Props>(), {
  searchKeyword: '',
  sortAscending: false,
  valueFilter: 'all'
})

// 为图表点击事件定义更明确的负载类型，避免父组件重复计算映射
interface ChartClickPayload {
  industry: { indexCode: string; indexName: string } | undefined
  date: string | undefined
  value: number | undefined
  metric: FundFlowMetricType
  rawParams: any
}

const emit = defineEmits<{
  'chart-ready': [chart: echarts.ECharts]
  'chart-click': [payload: ChartClickPayload]
}>()

// 过滤和排序后的行业数据
const processedIndustries = computed(() => {
  if (!props.data) return []

  const { swCodeNames: industries, congestions } = props.data

  // 根据搜索关键词过滤行业
  let filteredIndustries = industries
  if (props.searchKeyword?.trim()) {
    filteredIndustries = industries.filter(industry => 
      industry.indexName.toLowerCase().includes(props.searchKeyword!.toLowerCase())
    )
  }

  // 按最后一列数据排序
  return [...filteredIndustries].sort((a, b) => {
    // 兼容后端返回的congestions键：优先使用indexCode，其次尝试indexName
    const aData = congestions[a.indexCode] || congestions[a.indexName as any]
    const bData = congestions[b.indexCode] || congestions[b.indexName as any]
    
    if (!aData || !bData || aData.length === 0 || bData.length === 0) return 0
    
    const aLastValue = aData[aData.length - 1][props.selectedMetric as keyof IndustryFundFlowDataItem] as number
    const bLastValue = bData[bData.length - 1][props.selectedMetric as keyof IndustryFundFlowDataItem] as number
    
    return props.sortAscending ? aLastValue - bLastValue : bLastValue - aLastValue
  })
})

// 图表配置选项
const chartOption = computed((): echarts.EChartsOption => {
  if (!props.data) {
    return {
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'center',
        textStyle: {
          fontSize: 16,
          color: '#999'
        }
      }
    }
  }

  const { dates, congestions } = props.data
  const industries = processedIndustries.value

  // 构建热力图数据
  const heatmapData: [number, number, number][] = []
  let minValue = Infinity
  let maxValue = -Infinity
  
  industries.forEach((industry, industryIndex) => {
    // 兼容后端返回的congestions键：优先使用indexCode，其次尝试indexName
    const industryData = congestions[industry.indexCode] || congestions[industry.indexName as any]
    if (industryData) {
      industryData.forEach((item: IndustryFundFlowDataItem, dateIndex: number) => {
        const value = item[props.selectedMetric as keyof IndustryFundFlowDataItem] as number
        // 检查value是否为有效数字
        if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
          // 根据数值过滤条件筛选数据
          let shouldInclude = true
          if (props.valueFilter === 'positive' && value <= 0) {
            shouldInclude = false
          } else if (props.valueFilter === 'negative' && value >= 0) {
            shouldInclude = false
          }
          
          if (shouldInclude) {
            heatmapData.push([dateIndex, industryIndex, value])
            minValue = Math.min(minValue, value)
            maxValue = Math.max(maxValue, value)
          }
        }
      })
    }
  })
  
  // 如果没有有效数据，设置默认值
  if (minValue === Infinity || maxValue === -Infinity) {
    minValue = 0
    maxValue = 100
  }
  
  // 获取指标配置
  const metricConfig = FUND_FLOW_METRICS[props.selectedMetric]

  return {
    tooltip: {
      position: 'top',
      formatter: function (params: any) {
        const [dateIndex, industryIndex, value] = params.data
        const date = dates[dateIndex]
        const industry = industries[industryIndex].indexName
        const formattedValue = metricConfig.formatter ? metricConfig.formatter(value) : value.toFixed(2)
        return `${industry}<br/>${date}<br/>${metricConfig.name}: ${formattedValue}${metricConfig.unit}`
      }
    },
    grid: {
      height: Math.max(400, industries.length * 20) + 'px',
      top: '2%',
      left: '2%',
      right: '16%',
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
        data: industries.map(industry => industry.indexName),
        splitArea: { show: true },
        axisLabel: { fontSize: 11 }
      },
      {
        type: 'category',
        position: 'right',
        data: industries.map(industry => industry.indexName),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontSize: 11 },
        name: '行业',
        nameLocation: 'end',
        nameTextStyle: { fontSize: 12 }
      }
    ],
    visualMap: {
      min: minValue,
      max: maxValue,
      calculable: true,
      orient: 'vertical',
      right: '2%',
      top: '5%',
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      },
      text: ['高', '低'],
      textStyle: {
        fontSize: 12
      }
    },
    series: [{
      name: metricConfig.name,
      type: 'heatmap',
      data: heatmapData,
      label: {
        show: true,
        fontSize: 9,
        formatter: function (params: any) {
          const value = params.data[2]
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
})

// 处理图表就绪事件
const handleChartReady = (chart: echarts.ECharts) => {
  emit('chart-ready', chart)
}

// 处理图表点击事件
const handleChartClick = (params: any) => {
  const dataPoint = params?.data as [number, number, number] | undefined
  const [dateIndex, industryIndex, value] = dataPoint ?? []
  const industry = typeof industryIndex === 'number' ? processedIndustries.value[industryIndex] : undefined
  const date = typeof dateIndex === 'number' ? props.data?.dates[dateIndex] : undefined
  emit('chart-click', {
    industry,
    date,
    value,
    metric: props.selectedMetric,
    rawParams: params
  })
}
</script>

<style scoped lang="scss">
// 样式继承自HeatmapChart组件
</style>
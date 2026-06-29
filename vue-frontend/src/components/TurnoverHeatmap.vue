<template>
  <HeatmapChart 
    :option="chartOption" 
    @chart-ready="handleChartReady"
    @chart-click="handleChartClick"
  />
</template>

<script setup lang="ts">
/**
 * 行业成交额热力图组件
 *
 * 功能：
 * - 根据页面选择的指标渲染行业成交额相关热力图
 * - 支持按最后一个交易日的指标值排序行业列表
 * - 统一处理板块成交额、占总额比例、成交额百分位排名三种展示
 *
 * Props:
 * - industries: 行业维度的热力图矩阵数据
 * - dates: 日期数组
 * - metric: 当前展示指标
 * - sortAscending: 是否按最后一列升序排序
 *
 * 返回值：无
 *
 * Events:
 * - chart-ready: 图表实例初始化完成时触发
 * - chart-click: 点击热力图单元格时触发，返回行业、日期、值和原始图表参数
 */

import { computed } from 'vue'
import * as echarts from 'echarts'
import HeatmapChart from './HeatmapChart.vue'

type TurnoverMetricType = 'amount' | 'amount_ratio' | 'amount_percentile'

interface IndustryMetricData {
  amount: number
  amountRatio: number
  amountPercentile: number
}

interface IndustryData {
  name: string
  sectorCode: string
  data: IndustryMetricData[]
}

interface Props {
  /** 行业数据 */
  industries: IndustryData[]
  /** 日期数组 */
  dates: string[]
  /** 当前热力图指标 */
  metric: TurnoverMetricType
  /** 是否升序排序 */
  sortAscending?: boolean
}

interface MetricConfig {
  title: string
  min: number
  max: number
  getValue: (item: IndustryMetricData) => number
  formatValue: (value: number) => string
  labelFormatter: (value: number) => string
}

const props = withDefaults(defineProps<Props>(), {
  sortAscending: false
})

const emit = defineEmits<{
  'chart-ready': [chart: echarts.ECharts]
  'chart-click': [payload: { industry?: { name: string; sectorCode: string }, date?: string, value?: number, metric: TurnoverMetricType, rawParams: any }]
}>()

const formatAmount = (value: number) => {
  const numericValue = Number.isFinite(value) ? value : 0

  if (Math.abs(numericValue) >= 100000000) {
    return `${(numericValue / 100000000).toFixed(2)}亿`
  }

  if (Math.abs(numericValue) >= 10000) {
    return `${(numericValue / 10000).toFixed(2)}万`
  }

  return `${numericValue.toFixed(0)}元`
}
const formatRatio = (value: number) => `${value.toFixed(2)}%`
const formatPercentile = (value: number) => `${value.toFixed(0)}`

const metricConfigs = computed<Record<TurnoverMetricType, MetricConfig>>(() => {
  const amountValues = props.industries.flatMap((industry) => industry.data.map((item) => item.amount))
  const ratioValues = props.industries.flatMap((industry) => industry.data.map((item) => item.amountRatio))
  const percentileValues = props.industries.flatMap((industry) => industry.data.map((item) => item.amountPercentile))

  const getMaxValue = (values: number[], fallback: number) => {
    const validValues = values.filter((value) => Number.isFinite(value))
    return validValues.length ? Math.max(...validValues) : fallback
  }

  return {
    amount: {
      title: '板块成交额热力图',
      min: 0,
      max: getMaxValue(amountValues, 1),
      getValue: (item) => item.amount,
      formatValue: formatAmount,
      labelFormatter: (value) => formatAmount(value)
    },
    amount_ratio: {
      title: '成交额占总额比例热力图',
      min: 0,
      max: Math.max(getMaxValue(ratioValues, 100), 100),
      getValue: (item) => item.amountRatio,
      formatValue: formatRatio,
      labelFormatter: (value) => value.toFixed(1)
    },
    amount_percentile: {
      title: '成交额百分位排名热力图',
      min: 0,
      max: Math.max(getMaxValue(percentileValues, 100), 100),
      getValue: (item) => item.amountPercentile,
      formatValue: formatPercentile,
      labelFormatter: (value) => value.toFixed(0)
    }
  }
})

const activeMetricConfig = computed(() => metricConfigs.value[props.metric])

const processedIndustries = computed(() => {
  return [...props.industries].sort((a, b) => {
    if (a.data.length === 0 || b.data.length === 0) {
      return 0
    }

    const aLastValue = activeMetricConfig.value.getValue(a.data[a.data.length - 1])
    const bLastValue = activeMetricConfig.value.getValue(b.data[b.data.length - 1])

    return props.sortAscending ? aLastValue - bLastValue : bLastValue - aLastValue
  })
})

const chartOption = computed((): echarts.EChartsOption => {
  const heatmapData: [number, number, number][] = []

  processedIndustries.value.forEach((industry, industryIndex) => {
    industry.data.forEach((item, dateIndex) => {
      const value = activeMetricConfig.value.getValue(item)
      if (Number.isFinite(value)) {
        heatmapData.push([dateIndex, industryIndex, value])
      }
    })
  })

  return {
    title: {
      text: activeMetricConfig.value.title,
      left: 'center',
      textStyle: {
        fontSize: 16
      }
    },
    tooltip: {
      position: 'top',
      triggerOn: 'mousemove|click',
      formatter: (params: any) => {
        const [dateIndex, industryIndex, value] = params.data
        const date = props.dates[dateIndex]
        const industry = processedIndustries.value[industryIndex]?.name ?? ''
        return `${industry}<br/>${date}<br/>${activeMetricConfig.value.formatValue(value)}`
      }
    },
    grid: {
      height: `${Math.max(400, processedIndustries.value.length * 20)}px`,
      top: '8%',
      left: '15%',
      right: '16%',
      bottom: '2%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: props.dates.map((date) => date.substring(5)),
        splitArea: { show: true },
        axisLabel: { rotate: 45, fontSize: 10 }
      },
      {
        type: 'category',
        position: 'top',
        data: props.dates.map((date) => date.substring(5)),
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
        data: processedIndustries.value.map((industry) => industry.name),
        splitArea: { show: true },
        axisLabel: { fontSize: 11 }
      },
      {
        type: 'category',
        position: 'right',
        data: processedIndustries.value.map((industry) => industry.name),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontSize: 11 },
        name: '行业',
        nameLocation: 'end',
        nameTextStyle: { fontSize: 12 }
      }
    ],
    visualMap: {
      min: activeMetricConfig.value.min,
      max: activeMetricConfig.value.max,
      calculable: true,
      orient: 'vertical',
      right: '2%',
      top: '10%',
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      },
      text: ['高', '低'],
      textStyle: {
        fontSize: 12
      }
    },
    series: [
      {
        name: activeMetricConfig.value.title,
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: props.metric !== 'amount',
          fontSize: 9,
          formatter: (params: any) => activeMetricConfig.value.labelFormatter(params.data[2])
        },
        emphasis: {
          label: {
            show: props.metric === 'amount',
            fontSize: 9,
            formatter: (params: any) => activeMetricConfig.value.labelFormatter(params.data[2])
          },
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
})

const handleChartReady = (chart: echarts.ECharts) => {
  emit('chart-ready', chart)
}

const handleChartClick = (params: any) => {
  const dataPoint = params?.data as [number, number, number] | undefined
  const [dateIndex, industryIndex, value] = dataPoint ?? []
  const industry = typeof industryIndex === 'number' ? processedIndustries.value[industryIndex] : undefined
  const date = typeof dateIndex === 'number' ? props.dates[dateIndex] : undefined

  emit('chart-click', {
    industry: industry ? { name: industry.name, sectorCode: industry.sectorCode } : undefined,
    date,
    value,
    metric: props.metric,
    rawParams: params
  })
}
</script>

<style scoped lang="scss">
// 样式继承自HeatmapChart组件
</style>

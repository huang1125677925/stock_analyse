<template>
  <HeatmapChart 
    :option="chartOption" 
    @chart-ready="handleChartReady"
    @chart-click="handleChartClick"
  />
</template>

<script setup lang="ts">
/**
 * 换手率热力图组件
 * 
 * 功能：
 * - 显示行业换手率热力图
 * - 支持搜索时显示趋势图
 * - 支持按最后一列排序
 * - 支持日期范围过滤
 * 
 * Props:
 * - industries: 行业数据
 * - dates: 日期数组
 * - searchKeyword: 搜索关键词
 * - sortMetric: 排序指标（turnover/amount）
 * - sortAscending: 是否升序排序
 * 
 * Events:
 * - chartReady: 图表初始化完成
 * - chartClick: 图表点击事件
 */

import { computed } from 'vue'
import * as echarts from 'echarts'
import HeatmapChart from './HeatmapChart.vue'

interface CongestionData {
  turnoverRateFQuantile: number
  amountCongestionQuantile: number
}

interface IndustryData {
  name: string
  data: CongestionData[]
}

interface Props {
  /** 行业数据 */
  industries: IndustryData[]
  /** 日期数组 */
  dates: string[]
  /** 搜索关键词 */
  searchKeyword?: string
  /** 排序指标 */
  sortMetric?: 'turnover' | 'amount'
  /** 是否升序排序 */
  sortAscending?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  searchKeyword: '',
  sortMetric: 'amount',
  sortAscending: false
})

const emit = defineEmits<{
  'chart-ready': [chart: echarts.ECharts]
  'chart-click': [payload: { industry?: { name: string }, date?: string, value?: number, metric: 'turnover' | 'amount', rawParams: any }]
}>()

// 过滤和排序后的行业数据
const processedIndustries = computed(() => {
  let filteredIndustries = props.industries

  // 根据搜索关键词过滤行业
  if (props.searchKeyword?.trim()) {
    filteredIndustries = props.industries.filter(industry => 
      industry.name.toLowerCase().includes(props.searchKeyword!.toLowerCase())
    )
  }

  // 按最后一列数据排序
  return [...filteredIndustries].sort((a, b) => {
    if (a.data.length === 0 || b.data.length === 0) return 0
    
    const aLastValue = a.data[a.data.length - 1][
      props.sortMetric === 'turnover' ? 'turnoverRateFQuantile' : 'amountCongestionQuantile'
    ]
    const bLastValue = b.data[b.data.length - 1][
      props.sortMetric === 'turnover' ? 'turnoverRateFQuantile' : 'amountCongestionQuantile'
    ]
    
    return props.sortAscending ? aLastValue - bLastValue : bLastValue - aLastValue
  })
})

// 图表配置选项
const chartOption = computed((): echarts.EChartsOption => {
  if (props.searchKeyword?.trim()) {
    // 显示趋势图
    return getTrendChartOption()
  } else {
    // 显示热力图
    return getHeatmapOption()
  }
})

// 获取热力图配置
const getHeatmapOption = (): echarts.EChartsOption => {
  const heatmapData: [number, number, number][] = []
  
  processedIndustries.value.forEach((industry, industryIndex) => {
    industry.data.forEach((item, dateIndex) => {
      const value = props.sortMetric === 'turnover' 
        ? item.turnoverRateFQuantile 
        : item.amountCongestionQuantile
      
      // 检查value是否为有效数字
      if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
        heatmapData.push([dateIndex, industryIndex, value])
      }
    })
  })

  const metricName = props.sortMetric === 'turnover' ? '等权换手率分位数' : '成交金额占比分位数'

  return {
    tooltip: {
      position: 'top',
      formatter: function (params: any) {
        const [dateIndex, industryIndex, value] = params.data
        const date = props.dates[dateIndex]
        const industry = processedIndustries.value[industryIndex].name
        return `${industry}<br/>${date}<br/>${metricName}: ${value}`
      }
    },
    grid: {
      height: Math.max(400, processedIndustries.value.length * 20) + 'px',
      top: '2%',
      left: '15%',
      right: '16%',
      bottom: '2%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: props.dates.map(date => date.substring(5)),
        splitArea: { show: true },
        axisLabel: { rotate: 45, fontSize: 10 }
      },
      {
        type: 'category',
        position: 'top',
        data: props.dates.map(date => date.substring(5)),
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
        data: processedIndustries.value.map(industry => industry.name),
        splitArea: { show: true },
        axisLabel: { fontSize: 11 }
      },
      {
        type: 'category',
        position: 'right',
        data: processedIndustries.value.map(industry => industry.name),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontSize: 11 },
        name: '行业',
        nameLocation: 'end',
        nameTextStyle: { fontSize: 12 }
      }
    ],
    visualMap: {
      min: 0,
      max: 100,
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
      name: metricName,
      type: 'heatmap',
      data: heatmapData,
      label: {
        show: true,
        fontSize: 9,
        formatter: function (params: any) {
          return params.data[2]
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
}

// 获取趋势图配置
const getTrendChartOption = (): echarts.EChartsOption => {
  const palette = ['#5470C6','#91CC75','#EE6666','#FAC858','#73C0DE','#3BA272','#FC8452','#9A60B4','#EA7CCC','#2f4554','#61a0a8','#d48265','#749f83','#ca8622','#bda29a','#6e7074','#546570','#c4ccd3']
  
  const hashColor = (name: string) => {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0
    }
    return palette[hash % palette.length]
  }

  const series = processedIndustries.value.map((industry) => {
    const color = hashColor(industry.name)
    return {
      name: industry.name,
      type: 'line' as const,
      data: industry.data.map((item) => 
        props.sortMetric === 'turnover' ? item.turnoverRateFQuantile : item.amountCongestionQuantile
      ),
      smooth: true,
      symbol: 'circle' as const,
      symbolSize: 6,
      lineStyle: {
        width: 2,
        color
      },
      itemStyle: {
        color
      }
    }
  })

  const metricName = props.sortMetric === 'turnover' ? '等权换手率分位数' : '成交金额占比分位数'

  return {
    title: {
      text: `${props.searchKeyword} - ${metricName}趋势`,
      left: 'center',
      textStyle: {
        fontSize: 16
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: processedIndustries.value.map(industry => industry.name),
      top: '8%',
      type: 'scroll'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.dates.map(date => date.substring(5)),
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: metricName,
      nameLocation: 'middle',
      nameGap: 50
    },
    series
  }
}

// 处理图表就绪事件
const handleChartReady = (chart: echarts.ECharts) => {
  emit('chart-ready', chart)
}

// 处理图表点击事件
const handleChartClick = (params: any) => {
  const dataPoint = params?.data as [number, number, number] | undefined
  const [dateIndex, industryIndex, value] = dataPoint ?? []
  const industry = typeof industryIndex === 'number' ? processedIndustries.value[industryIndex] : undefined
  const date = typeof dateIndex === 'number' ? props.dates[dateIndex] : undefined
  emit('chart-click', {
    industry: industry ? { name: industry.name } : undefined,
    date,
    value,
    metric: props.sortMetric ?? 'amount',
    rawParams: params
  })
}
</script>

<style scoped lang="scss">
// 样式继承自HeatmapChart组件
</style>
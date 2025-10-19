<template>
  <div class="market-fund-flow-heatmaps">
    <div class="heatmap-toolbar">
      <el-button-group>
        <el-button type="primary" plain :class="{ active: activeHeatmap==='amount' }" @click="activeHeatmap='amount'">金额热力图</el-button>
        <el-button type="primary" plain :class="{ active: activeHeatmap==='ratio' }" @click="activeHeatmap='ratio'">比例热力图</el-button>
      </el-button-group>
    </div>
    <div class="heatmap-section" v-show="activeHeatmap==='amount'">
      <HeatmapChart 
        ref="amountChartRef"
        :option="amountHeatmapOption" 
        @chart-ready="handleAmountChartReady"
        @chart-click="handleAmountChartClick"
      />
    </div>
    <div class="heatmap-section" v-show="activeHeatmap==='ratio'">
      <HeatmapChart 
        ref="ratioChartRef"
        :option="ratioHeatmapOption" 
        @chart-ready="handleRatioChartReady"
        @chart-click="handleRatioChartClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">

/**
 * 大盘资金流热力图组件（优化版）
 * 
 * 功能：
 * - 将资金流热力图分为两部分展示：金额相关与比例相关
 * - 在热力图下方展示上证收盘价与涨跌幅趋势图
 * - 保留搜索与排序过滤逻辑
 * 
 * Props:
 * - data: 大盘资金流数据
 * - selectedMetric: 选择的资金流指标（用于排序优先级，缺省为主力净流入金额）
 * - searchKeyword: 搜索关键词
 * - sortAscending: 是否升序排序
 * - valueFilter: 数值过滤（all/positive/negative）
 * 
 * Events:
 * - chartReady: 图表初始化完成（两张热力图各触发一次）
 * - chartClick: 图表点击事件（包含所属指标）
 */

import { computed, ref, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import HeatmapChart from './HeatmapChart.vue'
import TrendChart from './TrendChart.vue'
import { FUND_FLOW_METRICS } from '@/services/marketFundFlowApi'
import type { MarketFundFlowDataItem, FundFlowMetricType } from '@/services/marketFundFlowApi'

// 定义组件名称
defineOptions({
  name: 'MarketFundFlowHeatmap'
})

// 切换状态：amount/ratio
const activeHeatmap = ref<'amount' | 'ratio'>('amount')

// 通过 ref 获取子组件实例，便于在切换显示时手动触发 resize
const amountChartRef = ref<InstanceType<typeof HeatmapChart> | null>(null)
const ratioChartRef = ref<InstanceType<typeof HeatmapChart> | null>(null)

// 在切换热力图显示时，手动触发对应图表的 resize，
// 解决 v-show 隐藏状态下初始化导致的容器尺寸为 0 而显示异常的问题。
watch(activeHeatmap, async (val) => {
  await nextTick()
  // 立即 resize 一次
  if (val === 'amount') {
    amountChartRef.value?.resize()
  } else {
    ratioChartRef.value?.resize()
  }
  // 再次延迟触发，确保可能的过渡/布局完成
  setTimeout(() => {
    if (val === 'amount') {
      amountChartRef.value?.resize()
    } else {
      ratioChartRef.value?.resize()
    }
  }, 50)
})

interface Props {
  /** 大盘资金流数据 */
  data: MarketFundFlowDataItem[] | null
  /** 选择的资金流指标（用于排序优先级） */
  selectedMetric?: FundFlowMetricType
  /** 搜索关键词 */
  searchKeyword?: string
  /** 是否升序排序 */
  sortAscending?: boolean
  /** 数值过滤 */
  valueFilter?: 'all' | 'positive' | 'negative'
}

const props = withDefaults(defineProps<Props>(), {
  selectedMetric: 'main_net_inflow_amount',
  searchKeyword: '',
  sortAscending: false,
  valueFilter: 'all'
})

// 为图表点击事件定义更明确的负载类型
interface ChartClickPayload {
  date: string | undefined
  value: number | undefined
  metric: FundFlowMetricType
  rawParams: any
}

const emit = defineEmits<{
  'chart-ready': [chart: echarts.ECharts]
  'chart-click': [payload: ChartClickPayload]
}>()

// 过滤和排序后的数据
const processedData = computed<MarketFundFlowDataItem[]>(() => {
  if (!props.data) return []

  let filteredData = props.data
  // 关键词过滤（按日期）
  if (props.searchKeyword?.trim()) {
    filteredData = props.data.filter(item => 
      item.date.toLowerCase().includes(props.searchKeyword!.toLowerCase())
    )
  }

  // 按日期升序排序，确保 X 轴有序
  return [...filteredData].sort((a, b) => {
    const tA = new Date(a.date).getTime()
    const tB = new Date(b.date).getTime()
    if (Number.isNaN(tA) || Number.isNaN(tB)) {
      return a.date.localeCompare(b.date)
    }
    return tA - tB
  })
})

// 指标分组
const amountMetricKeys = computed<FundFlowMetricType[]>(() => {
  return Object.keys(FUND_FLOW_METRICS)
    .filter(k => k.endsWith('_amount')) as FundFlowMetricType[]
})

const ratioMetricKeys = computed<FundFlowMetricType[]>(() => {
  return Object.keys(FUND_FLOW_METRICS)
    .filter(k => k.endsWith('_ratio')) as FundFlowMetricType[]
})

// 构建热力图配置（x轴为日期，y轴为类别）
const buildHeatmapOption = (metrics: FundFlowMetricType[], title: string, labelShow: boolean): echarts.EChartsOption => {
  const data = processedData.value
  if (!data || data.length === 0) {
    return {
      title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { fontSize: 16, color: '#999' } }
    }
  }

  const yLabels = metrics.map(m => FUND_FLOW_METRICS[m].name)
  const xLabels = data.map(item => item.date)
  const heatmapData: [number, number, number][] = []
  let minValue = Infinity
  let maxValue = -Infinity

  // x 轴是日期，y 轴是类别
  data.forEach((item, xIndex) => {
    metrics.forEach((metric, yIndex) => {
      const value = item[metric as keyof MarketFundFlowDataItem] as number
      if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
        let shouldInclude = true
        if (props.valueFilter === 'positive' && value <= 0) shouldInclude = false
        else if (props.valueFilter === 'negative' && value >= 0) shouldInclude = false
        if (shouldInclude) {
          heatmapData.push([xIndex, yIndex, value])
          minValue = Math.min(minValue, value)
          maxValue = Math.max(maxValue, value)
        }
      }
    })
  })

  if (minValue === Infinity || maxValue === -Infinity) {
    minValue = 0
    maxValue = 100
  }

  return {
    title: { text: title, left: 'center' },
    tooltip: {
      position: 'top',
      formatter: function (params: any) {
        const [xIndex, yIndex, value] = params.data
        const item = data[xIndex]
        const metric = metrics[yIndex]
        const metricConfig = FUND_FLOW_METRICS[metric]
        const formattedValue = metricConfig.formatter ? metricConfig.formatter(value) : Number(value).toFixed(2)
        return `${item.date}<br/>${metricConfig.name}: ${formattedValue}${metricConfig.unit}`
      }
    },
    grid: {
      // 高度按类别数量自适应
      height: Math.max(240, metrics.length * 24) + 'px',
      top: '8%', left: '2%', right: '16%', bottom: '6%', containLabel: true
    },
    xAxis: [{ type: 'category', data: xLabels, splitArea: { show: true }, axisLabel: { fontSize: 12 } }],
    yAxis: [{ type: 'category', data: yLabels, splitArea: { show: true }, axisLabel: { fontSize: 11 } }],
    visualMap: {
      min: minValue,
      max: maxValue,
      calculable: true,
      orient: 'vertical',
      right: '2%',
      top: '5%',
      inRange: { color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'] },
      text: ['高', '低'],
      textStyle: { fontSize: 12 }
    },
    series: [{
      name: title,
      type: 'heatmap',
      data: heatmapData,
      label: {
        show: labelShow,
        fontSize: 9,
        formatter: function (params: any) {
          const value = params.data[2]
          const metric = metrics[params.data[1]]
          const metricConfig = FUND_FLOW_METRICS[metric]
          return metricConfig.formatter ? metricConfig.formatter(value) : Number(value).toFixed(1)
        }
      },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
    }]
  }
}

// 两组热力图配置（金额热力图关闭标签，比例热力图保留标签）
const amountHeatmapOption = computed(() => buildHeatmapOption(amountMetricKeys.value, '金额热力图', false))
const ratioHeatmapOption = computed(() => buildHeatmapOption(ratioMetricKeys.value, '比例热力图', true))

// 趋势图字段配置
const trendFields = computed(() => [
  { key: 'shanghai_close_price', label: '上证收盘价', color: '#409EFF', yAxisIndex: 0 },
  { key: 'shanghai_change_rate', label: '上证涨跌幅(%)', color: '#67C23A', yAxisIndex: 1 }
])

// 处理图表就绪事件（分别触发）
const handleAmountChartReady = (chart: echarts.ECharts) => emit('chart-ready', chart)
const handleRatioChartReady = (chart: echarts.ECharts) => emit('chart-ready', chart)

// 处理图表点击事件（包含所属指标）
const handleAmountChartClick = (params: any) => {
  const dataPoint = params?.data as [number, number, number] | undefined
  if (!dataPoint) return
  const [xIndex, yIndex, value] = dataPoint
  if (typeof xIndex !== 'number' || typeof yIndex !== 'number') return
  const list = processedData.value
  if (xIndex < 0 || xIndex >= list.length) return
  if (yIndex < 0 || yIndex >= amountMetricKeys.value.length) return
  const item = list[xIndex]
  const metric = amountMetricKeys.value[yIndex] as FundFlowMetricType
  const date = item?.date
  emit('chart-click', { date, value, metric, rawParams: params })
}

const handleRatioChartClick = (params: any) => {
  const dataPoint = params?.data as [number, number, number] | undefined
  if (!dataPoint) return
  const [xIndex, yIndex, value] = dataPoint
  if (typeof xIndex !== 'number' || typeof yIndex !== 'number') return
  const list = processedData.value
  if (xIndex < 0 || xIndex >= list.length) return
  if (yIndex < 0 || yIndex >= ratioMetricKeys.value.length) return
  const item = list[xIndex]
  const metric = ratioMetricKeys.value[yIndex] as FundFlowMetricType
  const date = item?.date
  emit('chart-click', { date, value, metric, rawParams: params })
}
</script>

<style scoped lang="scss">
.market-fund-flow-heatmaps {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.heatmap-toolbar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
.heatmap-toolbar .el-button.active {
  background-color: #409EFF;
  color: #fff;
}
.heatmap-section {
  background: #fff;
}
.section-title { /* 已不再使用 */
  display: none;
}
.trend-section { /* 已移除趋势图块 */
  display: none;
}
</style>

<template>
  <div class="industry-trend-heatmap">
    <div class="toolbar">
      <el-select v-model="selectedMetric" class="metric-select" placeholder="选择展示指标">
        <el-option
          v-for="option in metricOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-button @click="toggleSortOrder">
        当前：按末列{{ sortAscending ? '升序' : '降序' }}
      </el-button>
      <span class="toolbar-tip">{{ activeMetricConfig.description }}</span>
    </div>

    <HeatmapChart
      v-if="processedIndustries.length && sortedDates.length"
      :option="chartOption"
      @chart-ready="handleChartReady"
      @chart-click="handleChartClick"
    />
    <el-empty v-else description="暂无行业趋势热力图数据" />
  </div>
</template>

<script setup lang="ts">
/**
 * 涨停行业趋势热力图组件
 * 功能：
 * - 将行业日度趋势强度明细转换为“日期 x 行业”的热力图矩阵
 * - 支持按不同趋势强度指标切换热力图视角
 * - 支持按最后一个交易日的指标值对行业排序，便于观察轮动强弱
 * 参数：
 * @param {IndustryTrendStrengthItem[]} records 行业日度趋势强度明细列表
 * 返回值：无
 * 事件：
 * @event chart-ready 热力图实例初始化完成时触发
 * @event chart-click 点击热力图单元格时触发，返回行业、日期、指标和值
 */
import { computed, ref } from 'vue'
import * as echarts from 'echarts'
import HeatmapChart from './HeatmapChart.vue'
import type { IndustryTrendStrengthItem } from '@/services/limitBoardStrategyApi'

type IndustryTrendMetricKey =
  | 'limit_up_count'
  | 'avg_turnover_ratio'
  | 'avg_first_limit_minutes'
  | 'avg_open_times'
  | 'avg_limit_times'
  | 'avg_up_stat_ratio_pct'

interface Props {
  /** 行业日度趋势强度明细 */
  records: IndustryTrendStrengthItem[]
}

interface MetricConfig {
  label: string
  description: string
  min: number
  max: number
  suffix?: string
  decimals: number
  formatter: (value: number) => string
}

interface HeatmapIndustryRow {
  industry: string
  values: Record<string, number | null>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'chart-ready': [chart: echarts.ECharts]
  'chart-click': [payload: { industry?: string; date?: string; value?: number; metric: IndustryTrendMetricKey; rawParams: any }]
}>()

const selectedMetric = ref<IndustryTrendMetricKey>('limit_up_count')
const sortAscending = ref(false)

const metricOptions: Array<{ label: string; value: IndustryTrendMetricKey }> = [
  { label: '涨停家数', value: 'limit_up_count' },
  { label: '平均换手率', value: 'avg_turnover_ratio' },
  { label: '首封耗时', value: 'avg_first_limit_minutes' },
  { label: '平均开板次数', value: 'avg_open_times' },
  { label: '平均连板数', value: 'avg_limit_times' },
  { label: '涨停统计比', value: 'avg_up_stat_ratio_pct' }
]

const sortedDates = computed(() => {
  return Array.from(
    new Set(
      props.records
        .map((item) => item.trade_date)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b))
})

const baseIndustries = computed<HeatmapIndustryRow[]>(() => {
  const industryMap = new Map<string, HeatmapIndustryRow>()

  props.records.forEach((item) => {
    const industryName = item.industry?.trim()
    const tradeDate = item.trade_date
    if (!industryName || !tradeDate) return

    if (!industryMap.has(industryName)) {
      industryMap.set(industryName, {
        industry: industryName,
        values: Object.fromEntries(sortedDates.value.map((date) => [date, null]))
      })
    }

    const numericValue = item[selectedMetric.value]
    industryMap.get(industryName)!.values[tradeDate] =
      typeof numericValue === 'number' && Number.isFinite(numericValue) ? numericValue : null
  })

  return Array.from(industryMap.values())
})

const metricValues = computed(() => {
  return props.records
    .map((item) => item[selectedMetric.value])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
})

const activeMetricConfig = computed<MetricConfig>(() => {
  const values = metricValues.value
  const rawMin = values.length ? Math.min(...values) : 0
  const rawMax = values.length ? Math.max(...values) : 1
  const normalizedMax = rawMax === rawMin ? rawMax + 1 : rawMax

  const formatByDecimals = (value: number, decimals: number, suffix = '') => {
    return `${value.toFixed(decimals)}${suffix}`
  }

  const configs: Record<IndustryTrendMetricKey, MetricConfig> = {
    limit_up_count: {
      label: '行业涨停家数热力图',
      description: '观察行业日内涨停聚集强度',
      min: Math.min(0, rawMin),
      max: Math.max(1, normalizedMax),
      decimals: 0,
      formatter: (value) => formatByDecimals(value, 0)
    },
    avg_turnover_ratio: {
      label: '行业平均换手率热力图',
      description: '观察行业涨停股的资金换手活跃度',
      min: Math.min(0, rawMin),
      max: Math.max(1, normalizedMax),
      suffix: '%',
      decimals: 2,
      formatter: (value) => formatByDecimals(value, 2, '%')
    },
    avg_first_limit_minutes: {
      label: '行业平均首封耗时热力图',
      description: '观察行业内个股从开盘到首次封板的平均速度',
      min: Math.min(0, rawMin),
      max: Math.max(1, normalizedMax),
      suffix: ' 分钟',
      decimals: 1,
      formatter: (value) => formatByDecimals(value, 1, ' 分钟')
    },
    avg_open_times: {
      label: '行业平均开板次数热力图',
      description: '观察行业涨停股封板稳定性',
      min: Math.min(0, rawMin),
      max: Math.max(1, normalizedMax),
      decimals: 2,
      formatter: (value) => formatByDecimals(value, 2)
    },
    avg_limit_times: {
      label: '行业平均连板数热力图',
      description: '观察行业中高位股强度和持续性',
      min: Math.min(0, rawMin),
      max: Math.max(1, normalizedMax),
      decimals: 2,
      formatter: (value) => formatByDecimals(value, 2)
    },
    avg_up_stat_ratio_pct: {
      label: '行业平均涨停统计比热力图',
      description: '观察行业近期涨停出现频率',
      min: Math.min(0, rawMin),
      max: Math.max(1, normalizedMax),
      suffix: '%',
      decimals: 2,
      formatter: (value) => formatByDecimals(value, 2, '%')
    }
  }

  return configs[selectedMetric.value]
})

const processedIndustries = computed(() => {
  const lastDate = sortedDates.value[sortedDates.value.length - 1]

  return [...baseIndustries.value].sort((a, b) => {
    const aLastValue = a.values[lastDate] ?? Number.NEGATIVE_INFINITY
    const bLastValue = b.values[lastDate] ?? Number.NEGATIVE_INFINITY
    return sortAscending.value ? aLastValue - bLastValue : bLastValue - aLastValue
  })
})

const chartOption = computed((): echarts.EChartsOption => {
  const heatmapData: Array<[number, number, number]> = []

  processedIndustries.value.forEach((industryRow, industryIndex) => {
    sortedDates.value.forEach((date, dateIndex) => {
      const value = industryRow.values[date]
      if (typeof value === 'number' && Number.isFinite(value)) {
        heatmapData.push([dateIndex, industryIndex, value])
      }
    })
  })

  return {
    title: {
      text: activeMetricConfig.value.label,
      left: 'center',
      textStyle: {
        fontSize: 16
      }
    },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [dateIndex, industryIndex, value] = params.data as [number, number, number]
        const date = sortedDates.value[dateIndex]
        const industry = processedIndustries.value[industryIndex]?.industry ?? '-'
        return `${industry}<br/>${formatDisplayDate(date)}<br/>${activeMetricConfig.value.formatter(value)}`
      }
    },
    grid: {
      top: '8%',
      left: '14%',
      right: '16%',
      bottom: '4%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: sortedDates.value.map((date) => formatAxisDate(date)),
        splitArea: { show: true },
        axisLabel: { rotate: 45, fontSize: 10 }
      },
      {
        type: 'category',
        position: 'top',
        data: sortedDates.value.map((date) => formatAxisDate(date)),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { rotate: 45, fontSize: 10, margin: 6 }
      }
    ],
    yAxis: [
      {
        type: 'category',
        inverse: true,
        data: processedIndustries.value.map((item) => item.industry),
        splitArea: { show: true },
        axisLabel: { fontSize: 11 }
      },
      {
        type: 'category',
        position: 'right',
        inverse: true,
        data: processedIndustries.value.map((item) => item.industry),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontSize: 11 }
      }
    ],
    visualMap: {
      min: activeMetricConfig.value.min,
      max: activeMetricConfig.value.max,
      calculable: true,
      orient: 'vertical',
      right: '2%',
      top: '10%',
      text: ['高', '低'],
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      }
    },
    series: [
      {
        name: activeMetricConfig.value.label,
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          fontSize: 9,
          formatter: (params: any) => {
            const value = params.data?.[2]
            return typeof value === 'number' ? value.toFixed(activeMetricConfig.value.decimals) : ''
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.35)'
          }
        }
      }
    ]
  }
})

function toggleSortOrder() {
  sortAscending.value = !sortAscending.value
}

function formatAxisDate(value: string): string {
  if (value.length === 8) {
    return `${value.slice(4, 6)}-${value.slice(6, 8)}`
  }
  return value
}

function formatDisplayDate(value: string): string {
  if (value.length === 8) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
  }
  return value
}

function handleChartReady(chart: echarts.ECharts) {
  emit('chart-ready', chart)
}

function handleChartClick(params: any) {
  const dataPoint = params?.data as [number, number, number] | undefined
  const [dateIndex, industryIndex, value] = dataPoint ?? []
  const date = typeof dateIndex === 'number' ? sortedDates.value[dateIndex] : undefined
  const industry = typeof industryIndex === 'number' ? processedIndustries.value[industryIndex]?.industry : undefined

  emit('chart-click', {
    industry,
    date,
    value,
    metric: selectedMetric.value,
    rawParams: params
  })
}
</script>

<style scoped>
.industry-trend-heatmap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.metric-select {
  width: 220px;
}

.toolbar-tip {
  color: #606266;
  font-size: 13px;
}
</style>

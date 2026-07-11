<template>
  <div class="index-dailybasic-view">
    <el-card class="page-header" shadow="hover">
      <template #header>
        <div class="header-content">
          <h2>大盘指数估值</h2>
        </div>
      </template>
      <div class="search-section">
        <el-form :inline="true" class="query-form">
          <el-form-item label="指标">
            <el-select v-model="selectedMetric" placeholder="请选择展示指标" style="width: 200px" @change="updateChart">
              <el-option
                v-for="item in metricOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="截止日期">
            <el-date-picker
              v-model="endDate"
              type="date"
              placeholder="请选择截止日期"
              value-format="YYYYMMDD"
            />
            <el-button-group class="range-buttons">
              <el-button @click="setYearRange(1)">最近一年</el-button>
              <el-button @click="setYearRange(3)">最近三年</el-button>
              <el-button @click="setYearRange(5)">最近五年</el-button>
            </el-button-group>
            <span class="range-text">当前范围：{{ dateRangeText }}</span>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <el-card class="table-section" shadow="hover">
      <template #header>
        <div class="header-content">
          <span>{{ metricLabel }} 最新估值与分位数对比</span>
          <el-tag type="info" effect="plain">共 {{ comparisonRows.length }} 个指数</el-tag>
        </div>
      </template>
      <el-table :data="comparisonRows" border stripe style="width: 100%" empty-text="暂无指数估值对比数据">
        <el-table-column prop="label" label="指数" :min-width="isMobile ? 96 : 160" :fixed="isMobile ? false : 'left'" align="center" />
        <el-table-column prop="latestTradeDate" label="最新日期" min-width="120" align="center" />
        <el-table-column label="最新估值" min-width="140" align="center">
          <template #default="{ row }">
            {{ formatMetricValue(row.latestValue) }}
          </template>
        </el-table-column>
        <el-table-column label="历史分位" min-width="140" align="center">
          <template #default="{ row }">
            <span v-if="row.percentile !== null">{{ row.percentile.toFixed(2) }}%</span>
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column label="估值状态" min-width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status" :type="row.type" effect="dark">{{ row.status }}</el-tag>
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalCount" label="样本数" min-width="100" align="center" />
      </el-table>
    </el-card>

    <div class="chart-section" v-loading="loading">
      <div class="chart-carousel-toolbar">
        <div class="chart-carousel-summary">
          <span class="chart-carousel-title">指数趋势图</span>
          <span v-if="activeDataset" class="chart-carousel-counter">
            {{ activeChartIndex + 1 }} / {{ datasets.length }} · {{ activeDataset.label }}
          </span>
        </div>
        <div class="chart-carousel-actions">
          <el-button :disabled="activeChartIndex === 0" @click="showPrevChart">上一张</el-button>
          <el-button type="primary" :disabled="activeChartIndex === datasets.length - 1" @click="showNextChart">下一张</el-button>
        </div>
      </div>

      <div class="chart-carousel-viewport">
        <div class="chart-carousel-track" :style="carouselTrackStyle">
          <el-card v-for="dataset in datasets" :key="dataset.value" class="index-card chart-slide">
            <template #header>
              <div class="card-header">
                <div class="header-title">
                  <span>{{ dataset.label }}（{{ dataset.totalCount }} 条数据）</span>
                  <el-tag v-if="dataset.valuation" :type="dataset.valuation.type" effect="dark" class="valuation-tag">
                    当前{{ metricLabel }}分位: {{ dataset.valuation.percentile.toFixed(2) }}% - {{ dataset.valuation.status }}
                  </el-tag>
                </div>
              </div>
            </template>
            <div :ref="el => setChartRef(dataset.value, el)" class="chart-container"></div>
          </el-card>
        </div>
      </div>

      <div class="chart-carousel-dots">
        <button
          v-for="(dataset, index) in datasets"
          :key="dataset.value"
          type="button"
          class="chart-dot"
          :class="{ 'is-active': index === activeChartIndex }"
          @click="goToChart(index)"
        >
          {{ dataset.label }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：IndexDailybasicView
 * 功能：
 * - 查询并展示 `/django/api/index/index-dailybasic/` 的指数每日基础指标数据
 * - 固定展示常用指数的估值趋势
 * - 使用 ECharts 展示数据趋势
 * 参数（props）：无
 * 返回值：无
 * 事件（emits）：
 * - loaded: 数据加载完成时触发，传递记录数
 */
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchIndexDailybasic, fetchMarketCombinedDailybasic, type IndexDailybasicItem } from '@/services/indexDailybasicApi'
import * as echarts from 'echarts'
import { useIsMobile } from '@/composables/useIsMobile'

const { isMobile } = useIsMobile()

// emits：对外发出 loaded 事件
const emit = defineEmits<{ (e: 'loaded', count: number): void }>()

// 加载状态
const loading = ref(false)

// 指数代码选项
const indexOptions = [
  { label: '全市场综指', value: 'all_market' },
  { label: '沪深300', value: '000300.SH' },
  { label: '中证500', value: '000905.SH' },
  { label: '深证成指', value: '399001.SZ' },
  { label: '中小板指', value: '399005.SZ' },
  { label: '创业板指', value: '399006.SZ' },
  { label: '深证创新', value: '399016.SZ' },
  { label: '沪深300(深)', value: '399300.SZ' },
  { label: '上证综指', value: '000001.SH' },
]

// 指标选项
const metricOptions = [
  { label: 'PE (市盈率)', value: 'pe' },
  { label: 'PE TTM (滚动市盈率)', value: 'pe_ttm' },
  { label: 'PB (市净率)', value: 'pb' },
  { label: '总市值', value: 'total_mv' },
  { label: '流通市值', value: 'float_mv' },
  { label: '总股本', value: 'total_share' },
  { label: '流通股本', value: 'float_share' },
  { label: '自由流通股本', value: 'free_share' },
  { label: '换手率', value: 'turnover_rate' },
  { label: '换手率(自由流通)', value: 'turnover_rate_f' },
]

// 当前选中的指标
const selectedMetric = ref('pe')
const metricLabel = computed(() => metricOptions.find(opt => opt.value === selectedMetric.value)?.label || selectedMetric.value)

// 查询时间范围：以截止日期为基准，向前回溯指定年数
const endDate = ref<string>('')
const lookbackYears = ref<number>(3)
const dateRange = computed<[string, string]>(() => buildYearDateRange(lookbackYears.value, endDate.value))
const dateRangeText = computed(() => {
  const [startDate, finalDate] = dateRange.value
  return `${formatDisplayDate(startDate)} 至 ${formatDisplayDate(finalDate)}`
})

// 数据
const totalCount = ref<number>(0)
interface IndexValuationStatus {
  value: number
  percentile: number
  status: string
  type: 'success' | 'warning' | 'danger' | 'info' | 'primary'
}

interface IndexDataset {
  label: string
  value: string
  records: IndexDailybasicItem[]
  totalCount: number
  valuation: IndexValuationStatus | null
}

interface ComparisonRow {
  label: string
  latestTradeDate: string
  latestValue: number | null
  percentile: number | null
  status: string
  type: IndexValuationStatus['type']
  totalCount: number
}

const datasets = ref<IndexDataset[]>(indexOptions.map(item => ({
  ...item,
  records: [],
  totalCount: 0,
  valuation: null,
})))
const activeChartIndex = ref(0)
const activeDataset = computed(() => datasets.value[activeChartIndex.value] ?? null)
const carouselTrackStyle = computed(() => ({
  transform: `translateX(-${activeChartIndex.value * 100}%)`
}))

const comparisonRows = computed<ComparisonRow[]>(() => datasets.value.map(dataset => {
  const latestRecord = dataset.records[dataset.records.length - 1]
  const rawMetricValue = latestRecord?.[selectedMetric.value]
  const latestValue = rawMetricValue == null ? null : Number(rawMetricValue)

  return {
    label: dataset.label,
    latestTradeDate: String(latestRecord?.trade_date || '--'),
    latestValue: Number.isFinite(latestValue) ? latestValue : null,
    percentile: dataset.valuation?.percentile ?? null,
    status: dataset.valuation?.status ?? '',
    type: dataset.valuation?.type ?? 'info',
    totalCount: dataset.totalCount,
  }
}).sort((a, b) => {
  // 按历史分位从低到高排列，无分位数据的排在最后
  if (a.percentile === null) return 1
  if (b.percentile === null) return -1
  return a.percentile - b.percentile
}))

// ECharts 相关
const chartRefs = new Map<string, HTMLElement>()
const chartInstances = new Map<string, echarts.ECharts>()

// 计算分位值
function calculatePercentileRank(values: number[], target: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const rank = sorted.findIndex(v => v >= target)
  // 如果没找到（target比所有值都大），rank为-1，但逻辑上应该是100%
  if (rank === -1) return 100
  return (rank / sorted.length) * 100
}

function getValuationStatus(values: number[]): IndexValuationStatus | null {
  if (values.length === 0) {
    return null
  }

  // 获取最新值（records已按日期排序，取最后一个）
  const latestValue = values[values.length - 1]
  
  // 计算在历史数据中的分位
  const percentile = calculatePercentileRank(values, latestValue)
  
  let status = '适中'
  let type: 'success' | 'warning' | 'danger' | 'info' | 'primary' = 'info'

  if (percentile >= 90) {
    status = '极高'
    type = 'danger'
  } else if (percentile >= 70) {
    status = '较高'
    type = 'warning'
  } else if (percentile <= 10) {
    status = '极低'
    type = 'success' // 机会
  } else if (percentile <= 30) {
    status = '较低'
    type = 'primary'
  }

  return {
    value: latestValue,
    percentile,
    status,
    type
  }
}

function buildDefaultDateRange(days = 365): [string, string] {
  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return [formatDateValue(start), formatDateValue(end)]
}

function formatDateValue(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}

function parseDateValue(value?: string): Date {
  if (!value || value.length !== 8) {
    return new Date()
  }

  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6)) - 1
  const day = Number(value.slice(6, 8))
  return new Date(year, month, day)
}

function formatDisplayDate(value: string): string {
  if (!value || value.length !== 8) {
    return '--'
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function buildYearDateRange(years: number, endDateValue?: string): [string, string] {
  const end = parseDateValue(endDateValue)
  const start = new Date(end)
  start.setFullYear(start.getFullYear() - years)
  return [formatDateValue(start), formatDateValue(end)]
}

function setYearRange(years: number) {
  lookbackYears.value = years
}

function goToChart(index: number) {
  if (index < 0 || index >= datasets.value.length) return
  activeChartIndex.value = index
}

function showPrevChart() {
  goToChart(activeChartIndex.value - 1)
}

function showNextChart() {
  goToChart(activeChartIndex.value + 1)
}

function formatMetricValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '--'
  }

  if (Math.abs(value) >= 1000) {
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return value.toFixed(2)
}

async function fetchData() {
  try {
    loading.value = true
    chartInstances.forEach(chart => chart.showLoading())
    
    const [startDate, endDateValue] = dateRange.value
    const loaded = await Promise.all(indexOptions.map(async option => {
      const res = option.value === 'all_market'
        ? await fetchMarketCombinedDailybasic({ startDate, endDate: endDateValue })
        : await fetchIndexDailybasic({ tsCode: option.value, startDate, endDate: endDateValue })

      const records = (res.records || []).sort((a, b) => {
        const dateA = String(a.trade_date || '')
        const dateB = String(b.trade_date || '')
        return dateA.localeCompare(dateB)
      })
      const values = records.map(item => Number(item[selectedMetric.value])).filter(v => !isNaN(v))
      return {
        ...option,
        records,
        totalCount: res.count || records.length,
        valuation: getValuationStatus(values)
      }
    }))

    datasets.value = loaded
    if (activeChartIndex.value > loaded.length - 1) {
      activeChartIndex.value = Math.max(loaded.length - 1, 0)
    }
    totalCount.value = loaded.reduce((sum, item) => sum + item.totalCount, 0)
    emit('loaded', totalCount.value)
    await nextTick()
    initCharts()
    updateChart()
    handleResize()
  } catch (e: any) {
    ElMessage.error(e?.message || '数据加载失败')
  } finally {
    loading.value = false
    chartInstances.forEach(chart => chart.hideLoading())
  }
}

function setChartRef(key: string, el: unknown) {
  if (el instanceof HTMLElement) {
    chartRefs.set(key, el)
  }
}

function initCharts() {
  datasets.value.forEach(dataset => {
    const el = chartRefs.get(dataset.value)
    if (el && !chartInstances.has(dataset.value)) {
      chartInstances.set(dataset.value, echarts.init(el))
    }
  })
}

function calculatePercentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0
  const index = (p / 100) * (sortedValues.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

function updateChart() {
  datasets.value = datasets.value.map(dataset => {
    const values = dataset.records.map(item => Number(item[selectedMetric.value])).filter(v => !isNaN(v))
    return {
      ...dataset,
      valuation: getValuationStatus(values)
    }
  })

  datasets.value.forEach(dataset => {
    const chartInstance = chartInstances.get(dataset.value)
    if (!chartInstance) return

    const dates = dataset.records.map(item => item.trade_date)
    const values = dataset.records.map(item => Number(item[selectedMetric.value]))

    // 计算分位数
    const validValues = values.filter(v => !isNaN(v)).sort((a, b) => a - b)

    const p10 = calculatePercentile(validValues, 10)
    const p30 = calculatePercentile(validValues, 30)
    const p50 = calculatePercentile(validValues, 50)
    const p70 = calculatePercentile(validValues, 70)
    const p90 = calculatePercentile(validValues, 90)

    const option = {
      title: {
        text: `${dataset.label} - ${metricLabel.value} 趋势`,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        right: '15%' // 留出右侧空间显示 markLine 标签
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: {
        type: 'value',
        scale: true // 让坐标轴自适应数据范围，而不是从0开始
      },
      series: [
        {
          name: metricLabel.value,
          type: 'line',
          data: values,
          smooth: true,
          showSymbol: false,
          markLine: {
            symbol: 'none',
            data: [
              { yAxis: p90, name: '90%分位', label: { formatter: '90%: {c}' }, lineStyle: { color: '#FF4500', type: 'dashed' } },
              { yAxis: p70, name: '70%分位', label: { formatter: '70%: {c}' }, lineStyle: { color: '#FFA500', type: 'dashed' } },
              { yAxis: p50, name: '50%分位', label: { formatter: '50%: {c}' }, lineStyle: { color: '#32CD32', width: 2 } }, // 中位数加粗
              { yAxis: p30, name: '30%分位', label: { formatter: '30%: {c}' }, lineStyle: { color: '#1E90FF', type: 'dashed' } },
              { yAxis: p10, name: '10%分位', label: { formatter: '10%: {c}' }, lineStyle: { color: '#0000FF', type: 'dashed' } },
            ]
          }
        }
      ]
    }

    chartInstance.setOption(option)
  })
}

function handleResize() {
  chartInstances.forEach(chart => chart.resize())
}

// 监听截止日期与回溯年限变化，自动刷新数据
watch([endDate, lookbackYears], () => {
  fetchData()
})

watch(activeChartIndex, async () => {
  await nextTick()
  handleResize()
})

onMounted(() => {
  const [, defaultEndDate] = buildDefaultDateRange()
  endDate.value = defaultEndDate
  window.addEventListener('resize', handleResize)
  fetchData()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstances.forEach(chart => chart.dispose())
  chartInstances.clear()
})
</script>

<style scoped>
.index-dailybasic-view { padding: 20px; }
.page-header, .search-section, .table-section { margin-bottom: 20px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-title { display: flex; align-items: center; gap: 10px; }
.valuation-tag { margin-left: 10px; font-weight: bold; }
.chart-section { display: flex; flex-direction: column; gap: 16px; }
.chart-carousel-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.chart-carousel-summary { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.chart-carousel-title { font-size: 18px; font-weight: 600; }
.chart-carousel-counter { color: var(--el-text-color-secondary); }
.chart-carousel-actions { display: flex; gap: 12px; }
.chart-carousel-viewport { overflow: hidden; }
.chart-carousel-track { display: flex; transition: transform 0.3s ease; will-change: transform; }
.index-card { width: 100%; min-width: 100%; flex: 0 0 100%; box-sizing: border-box; }
.chart-slide { scroll-snap-align: start; }
.chart-container { width: 100%; height: 420px; }
.chart-carousel-dots { display: flex; gap: 10px; flex-wrap: wrap; }
.chart-dot {
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.chart-dot.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
.range-buttons { margin-left: 8px; }
.range-text { margin-left: 12px; color: var(--el-text-color-secondary); white-space: nowrap; }
@media (max-width: 768px) {
  .index-dailybasic-view { padding: 0; }
  .page-header, .search-section, .table-section { margin-bottom: 12px; }
  .chart-carousel-toolbar { flex-direction: column; align-items: flex-start; }
  .chart-carousel-actions { width: 100%; }
  .chart-carousel-actions :deep(.el-button) { flex: 1; }
  .chart-container { height: 300px; }
  /* 指标下拉、日期、快捷范围按钮在窄屏占满整宽、整齐换行 */
  .query-form :deep(.el-select) { width: 100% !important; }
  .query-form :deep(.el-date-editor) { width: 100% !important; }
  .range-buttons { margin-left: 0; margin-top: 8px; width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); }
  .range-buttons :deep(.el-button) { width: 100%; }
  .range-text { margin-left: 0; margin-top: 8px; display: block; white-space: normal; }
}
</style>

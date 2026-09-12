<template>
  <div class="index-dailybasic-view" :class="{ 'is-embedded': props.embedded }">
    <el-card v-loading="loading" class="valuation-panel" shadow="hover">
      <template #header>
        <div class="panel-header">
          <div class="panel-title-row">
            <span class="panel-title">大盘指数估值</span>
            <el-tag type="info" effect="plain" size="small">
              {{ comparisonRows.length }} 个指数
            </el-tag>
          </div>
          <div class="panel-subtitle">
            {{ metricLabel }} · {{ dateRangeText }} · 按历史分位从低到高
          </div>
        </div>
      </template>

      <el-form :inline="true" size="small" class="query-form">
        <el-form-item label="指标">
          <el-select
            v-model="selectedMetric"
            placeholder="请选择展示指标"
            class="metric-select"
            @change="updateChart"
          >
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
            class="date-input"
          />
          <el-button-group class="range-buttons">
            <el-button @click="setYearRange(1)">近一年</el-button>
            <el-button @click="setYearRange(3)">近三年</el-button>
            <el-button @click="setYearRange(5)">近五年</el-button>
          </el-button-group>
        </el-form-item>
      </el-form>

      <el-table
        :data="comparisonRows"
        border
        stripe
        size="small"
        class="valuation-table"
        :row-class-name="rowClassName"
        style="width: 100%"
        empty-text="暂无指数估值对比数据"
        @row-click="handleRowClick"
      >
        <el-table-column label="指数" :min-width="isMobile ? 104 : 124">
          <template #default="{ row }">
            <div class="index-cell">
              <span class="index-cell-name">{{ row.label }}</span>
              <span class="index-cell-code">{{ row.code }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :min-width="isMobile ? 96 : 116" align="center">
          <template #header>
            <span>最新估值（{{ metricShortLabel }}）</span>
          </template>
          <template #default="{ row }">
            <span class="latest-value">{{ formatMetricValue(row.latestValue) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="历史分位" :min-width="isMobile ? 132 : 170">
          <template #default="{ row }">
            <div v-if="row.percentile !== null" class="percentile-cell">
              <el-progress
                class="percentile-bar"
                :percentage="row.percentile"
                :color="percentileColor(row.type)"
                :stroke-width="10"
                :show-text="false"
              />
              <span class="percentile-text" :style="{ color: percentileColor(row.type) }">
                {{ row.percentile.toFixed(1) }}%
              </span>
            </div>
            <span v-else class="empty-text">--</span>
          </template>
        </el-table-column>
        <el-table-column label="估值状态" :min-width="isMobile ? 88 : 100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status" :type="row.type" effect="dark" size="small">
              {{ row.status }}
            </el-tag>
            <span v-else class="empty-text">--</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="chart-section">
        <div class="chart-toolbar">
          <div class="chart-toolbar-left">
            <span class="chart-toolbar-title">指数趋势图</span>
            <span v-if="activeDataset" class="chart-toolbar-hint">
              点击表格行可切换 · {{ activeChartIndex + 1 }}/{{ datasets.length }} · 图中标注 10/30/50/70/90
              分位线
            </span>
          </div>
          <div class="chart-toolbar-actions">
            <el-button size="small" :disabled="activeChartIndex === 0" @click="showPrevChart">
              上一张
            </el-button>
            <el-button
              size="small"
              type="primary"
              :disabled="activeChartIndex === datasets.length - 1"
              @click="showNextChart"
            >
              下一张
            </el-button>
          </div>
        </div>

        <div class="chart-carousel-viewport">
          <div class="chart-carousel-track" :style="carouselTrackStyle">
            <div v-for="dataset in datasets" :key="dataset.value" class="chart-slide">
              <div class="chart-slide-header">
                <span class="chart-slide-title">{{ dataset.label }}</span>
                <el-tag
                  v-if="dataset.valuation"
                  :type="dataset.valuation.type"
                  effect="dark"
                  size="small"
                >
                  当前{{ metricShortLabel }}分位 {{ dataset.valuation.percentile.toFixed(1) }}% ·
                  {{ dataset.valuation.status }}
                </el-tag>
              </div>
              <div :ref="(el) => setChartRef(dataset.value, el)" class="chart-container"></div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
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
import { fetchIndexDailybasic, type IndexDailybasicItem } from '@/services/indexDailybasicApi'
import * as echarts from 'echarts'
import { useIsMobile } from '@/composables/useIsMobile'

const { isMobile } = useIsMobile()
const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})

// emits：对外发出 loaded 事件
const emit = defineEmits<{ (e: 'loaded', count: number): void }>()

// 加载状态
const loading = ref(false)

// 指数代码选项（科创50 接口长期无数据，已移除）
const indexOptions = [
  { label: '上证综指', value: '000001.SH' },
  { label: '上证50', value: '000016.SH' },
  { label: '中证500', value: '000905.SH' },
  { label: '沪深300', value: '000300.SH' },
  { label: '深证成指', value: '399001.SZ' },
  { label: '创业板指', value: '399006.SZ' },
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
const metricLabel = computed(
  () =>
    metricOptions.find((opt) => opt.value === selectedMetric.value)?.label || selectedMetric.value,
)
// 表头展示用的短指标名，例如 “PE TTM (滚动市盈率)” -> “PE TTM”
const metricShortLabel = computed(() => metricLabel.value.split(' (')[0])

// 查询时间范围：以截止日期为基准，向前回溯指定年数
const endDate = ref<string>('')
const lookbackYears = ref<number>(3)
const dateRange = computed<[string, string]>(() =>
  buildYearDateRange(lookbackYears.value, endDate.value),
)
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
  code: string
  latestValue: number | null
  percentile: number | null
  status: string
  type: IndexValuationStatus['type']
}

// 分位进度条配色：沿用估值状态的语义色，保持与图表卡片标签一致
const VALUATION_BAR_COLORS: Record<IndexValuationStatus['type'], string> = {
  success: '#67c23a',
  primary: '#409eff',
  info: '#909399',
  warning: '#e6a23c',
  danger: '#f56c6c',
}

function percentileColor(type: IndexValuationStatus['type']): string {
  return VALUATION_BAR_COLORS[type] ?? VALUATION_BAR_COLORS.info
}

const datasets = ref<IndexDataset[]>(
  indexOptions.map((item) => ({
    ...item,
    records: [],
    totalCount: 0,
    valuation: null,
  })),
)
const activeChartIndex = ref(0)
const activeDataset = computed(() => datasets.value[activeChartIndex.value] ?? null)
const carouselTrackStyle = computed(() => ({
  transform: `translateX(-${activeChartIndex.value * 100}%)`,
}))

const comparisonRows = computed<ComparisonRow[]>(() =>
  datasets.value
    .map((dataset) => {
      const latestRecord = dataset.records[dataset.records.length - 1]
      const rawMetricValue = latestRecord?.[selectedMetric.value]
      const latestValue = rawMetricValue == null ? null : Number(rawMetricValue)

      return {
        label: dataset.label,
        code: dataset.value,
        latestValue: Number.isFinite(latestValue) ? latestValue : null,
        percentile: dataset.valuation?.percentile ?? null,
        status: dataset.valuation?.status ?? '',
        type: dataset.valuation?.type ?? 'info',
      }
    })
    .sort((a, b) => {
      // 按历史分位从低到高排列，无分位数据的排在最后
      if (a.percentile === null) return 1
      if (b.percentile === null) return -1
      return a.percentile - b.percentile
    }),
)

// ECharts 相关
const chartRefs = new Map<string, HTMLElement>()
const chartInstances = new Map<string, echarts.ECharts>()

// 计算分位值
function calculatePercentileRank(values: number[], target: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const rank = sorted.findIndex((v) => v >= target)
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
    type,
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

// 表格行与趋势图联动：点击某一行切换到对应指数的趋势图，当前行高亮
function handleRowClick(row: ComparisonRow) {
  const index = datasets.value.findIndex((dataset) => dataset.value === row.code)
  if (index >= 0) goToChart(index)
}

function rowClassName({ row }: { row: ComparisonRow }): string {
  return row.code === activeDataset.value?.value ? 'is-chart-active' : ''
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
    chartInstances.forEach((chart) => chart.showLoading())

    const [startDate, endDateValue] = dateRange.value
    const loaded = await Promise.all(
      indexOptions.map(async (option) => {
        const res = await fetchIndexDailybasic({
          tsCode: option.value,
          startDate,
          endDate: endDateValue,
        })

        const records = (res.records || []).sort((a, b) => {
          const dateA = String(a.trade_date || '')
          const dateB = String(b.trade_date || '')
          return dateA.localeCompare(dateB)
        })
        const values = records
          .map((item) => Number(item[selectedMetric.value]))
          .filter((v) => !isNaN(v))
        return {
          ...option,
          records,
          totalCount: res.count || records.length,
          valuation: getValuationStatus(values),
        }
      }),
    )

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
    chartInstances.forEach((chart) => chart.hideLoading())
  }
}

function setChartRef(key: string, el: unknown) {
  if (el instanceof HTMLElement) {
    chartRefs.set(key, el)
  }
}

function initCharts() {
  datasets.value.forEach((dataset) => {
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
  datasets.value = datasets.value.map((dataset) => {
    const values = dataset.records
      .map((item) => Number(item[selectedMetric.value]))
      .filter((v) => !isNaN(v))
    return {
      ...dataset,
      valuation: getValuationStatus(values),
    }
  })

  datasets.value.forEach((dataset) => {
    const chartInstance = chartInstances.get(dataset.value)
    if (!chartInstance) return

    const dates = dataset.records.map((item) => item.trade_date)
    const values = dataset.records.map((item) => Number(item[selectedMetric.value]))

    // 计算分位数
    const validValues = values.filter((v) => !isNaN(v)).sort((a, b) => a - b)

    const p10 = calculatePercentile(validValues, 10)
    const p30 = calculatePercentile(validValues, 30)
    const p50 = calculatePercentile(validValues, 50)
    const p70 = calculatePercentile(validValues, 70)
    const p90 = calculatePercentile(validValues, 90)

    const option = {
      // 指数名与分位标签由卡片内的图表标题行展示，图内不再重复 title，节省纵向空间
      tooltip: {
        trigger: 'axis',
      },
      grid: {
        top: 24,
        bottom: 8,
        left: 8,
        right: 24, // 分位标签改为网格内绘制，右侧只需少量留白
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        scale: true, // 让坐标轴自适应数据范围，而不是从0开始
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
            // 标签绘制在网格内右端，窄卡片下不会被容器裁掉
            label: { position: 'insideEndTop', fontSize: 11 },
            data: [
              {
                yAxis: p90,
                name: '90%分位',
                label: { formatter: '90%: {c}' },
                lineStyle: { color: '#FF4500', type: 'dashed' },
              },
              {
                yAxis: p70,
                name: '70%分位',
                label: { formatter: '70%: {c}' },
                lineStyle: { color: '#FFA500', type: 'dashed' },
              },
              {
                yAxis: p50,
                name: '50%分位',
                label: { formatter: '50%: {c}' },
                lineStyle: { color: '#32CD32', width: 2 },
              }, // 中位数加粗
              {
                yAxis: p30,
                name: '30%分位',
                label: { formatter: '30%: {c}' },
                lineStyle: { color: '#1E90FF', type: 'dashed' },
              },
              {
                yAxis: p10,
                name: '10%分位',
                label: { formatter: '10%: {c}' },
                lineStyle: { color: '#0000FF', type: 'dashed' },
              },
            ],
          },
        },
      ],
    }

    chartInstance.setOption(option)
  })
}

function handleResize() {
  chartInstances.forEach((chart) => chart.resize())
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
  chartInstances.forEach((chart) => chart.dispose())
  chartInstances.clear()
})
</script>

<style scoped>
.index-dailybasic-view {
  padding: 20px;
}
.index-dailybasic-view.is-embedded {
  padding: 0;
}
/* 单卡片容器：筛选 + 表格 + 趋势图合并，内边距压缩以适应半宽布局 */
:deep(.valuation-panel .el-card__header) {
  padding: 10px 14px;
}
:deep(.valuation-panel .el-card__body) {
  padding: 12px 14px 14px;
}
.panel-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.panel-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.panel-title {
  font-size: 17px;
  font-weight: 600;
  color: #172033;
}
.panel-subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.query-form {
  margin-bottom: 0;
}
.query-form :deep(.el-form-item) {
  margin-right: 12px;
  margin-bottom: 10px;
}
.query-form :deep(.el-form-item__label) {
  color: #5f6876;
  font-weight: 500;
}
.metric-select {
  width: 144px;
}
.date-input {
  width: 150px;
}
/* 点击表格行切换趋势图：当前行高亮并给出可点击反馈 */
:deep(.valuation-table tbody tr) {
  cursor: pointer;
}
:deep(.valuation-table .is-chart-active td.el-table__cell) {
  background-color: #eef5ff !important;
}
/* 精简后的估值速览表：压缩行高，让表格不再占满首屏 */
:deep(.valuation-table th.el-table__cell) {
  padding: 6px 0;
  color: #475467;
  font-weight: 600;
  background: #f8fafc;
}
:deep(.valuation-table td.el-table__cell) {
  padding: 6px 0;
}
:deep(.valuation-table .cell) {
  padding: 0 8px;
  line-height: 1.35;
}
:deep(.valuation-table .el-progress-bar__outer) {
  background-color: #edf1f6;
  border-radius: 3px;
}
:deep(.valuation-table .el-progress-bar__inner) {
  border-radius: 3px;
}
.index-cell {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.index-cell-name {
  font-weight: 600;
}
.index-cell-code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.latest-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
/* 分位meter：细条 + 右侧数值，低分位时数字也不会被裁掉 */
.percentile-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.percentile-bar {
  flex: 1;
  min-width: 0;
}
.percentile-text {
  flex: 0 0 auto;
  min-width: 46px;
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.empty-text {
  color: var(--el-text-color-secondary);
}
.chart-section {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chart-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.chart-toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.chart-toolbar-title {
  font-size: 15px;
  font-weight: 600;
  color: #172033;
}
.chart-toolbar-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.chart-toolbar-actions {
  display: flex;
  gap: 8px;
}
.chart-carousel-viewport {
  overflow: hidden;
}
.chart-carousel-track {
  display: flex;
  transition: transform 0.3s ease;
  will-change: transform;
}
.chart-slide {
  width: 100%;
  min-width: 100%;
  flex: 0 0 100%;
  box-sizing: border-box;
}
.chart-slide-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.chart-slide-title {
  font-size: 14px;
  font-weight: 600;
  color: #172033;
}
.chart-container {
  width: 100%;
  height: 280px;
}
.range-buttons {
  margin-left: 8px;
}
@media (max-width: 768px) {
  .index-dailybasic-view {
    padding: 0;
  }
  .chart-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  .chart-toolbar-actions {
    width: 100%;
  }
  .chart-toolbar-actions :deep(.el-button) {
    flex: 1;
  }
  .chart-container {
    height: 240px;
  }
  /* 指标下拉、日期、快捷范围按钮在窄屏占满整宽、整齐换行 */
  .query-form :deep(.el-select) {
    width: 100% !important;
  }
  .query-form :deep(.el-date-editor) {
    width: 100% !important;
  }
  .range-buttons {
    margin-left: 0;
    margin-top: 8px;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
  .range-buttons :deep(.el-button) {
    width: 100%;
  }
}
</style>

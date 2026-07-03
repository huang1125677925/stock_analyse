<template>
  <div class="industry-up-down-ratio-analysis">
    <el-card class="control-card" shadow="hover">
      <div class="controls">
        <div class="control-group">
          <span class="control-label">板块类型：</span>
          <el-select
            v-model="selectedIdxType"
            placeholder="选择板块类型"
            :disabled="loading"
            style="width: 160px"
            @change="handleIdxTypeChange"
          >
            <el-option label="行业板块" value="行业板块" />
            <el-option label="概念板块" value="概念板块" />
            <el-option label="地域板块" value="地域板块" />
          </el-select>
        </div>
        <div v-if="selectedIdxType === '行业板块'" class="control-group">
          <span class="control-label">行业层级：</span>
          <el-select
            v-model="selectedLevel"
            placeholder="选择行业层级"
            :disabled="loading"
            style="width: 160px"
            @change="handleParamsChange"
          >
            <el-option
              v-for="option in levelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="control-group">
          <span class="control-label">时间范围：</span>
          <el-select
            v-model="selectedDateRange"
            placeholder="选择时间范围"
            :disabled="loading"
            style="width: 160px"
            @change="handleParamsChange"
          >
            <el-option
              v-for="option in dateRangeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="control-group">
          <span class="control-label">结束日期：</span>
          <el-date-picker
            v-model="endDate"
            type="date"
            placeholder="选择结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :clearable="false"
            :disabled="loading"
            :disabled-date="disableFutureDate"
            style="width: 160px"
            @change="handleParamsChange"
          />
        </div>
        <div class="control-group">
          <span class="control-label">展示指标：</span>
          <el-select
            v-model="selectedMetric"
            placeholder="选择展示指标"
            :disabled="loading"
            style="width: 180px"
            @change="handleMetricChange"
          >
            <el-option
              v-for="option in metricOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="control-group">
          <el-button type="primary" :loading="loading" @click="fetchData">刷新</el-button>
        </div>
        <div class="control-group">
          <el-button type="default" :disabled="loading || !filteredRawData.length" @click="toggleLastColumnSort">
            {{ sortByLastColumn ? '取消排序' : '按最后一列排序' }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="chart-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>行业涨跌比热力图（{{ selectedBoardLabel }} / {{ selectedMetricLabel }}）</span>
          <span class="tips">数据来源：板块涨跌比接口</span>
        </div>
      </template>

      <div class="methodology">
        <p>
          统计口径：基于东方财富{{ selectedIdxType === '行业板块' ? '行业板块' : selectedIdxType }}每日快照中的上涨家数与下跌家数计算，不是逐只成分股回溯重算结果。
        </p>
        <p>{{ metricDescription }}</p>
      </div>

      <HeatmapChart
        v-if="heatmapOption"
        :option="heatmapOption"
        @chart-ready="onChartReady"
        @chart-click="onChartClick"
      />

      <div v-else class="empty-tip">暂无数据</div>
    </el-card>

    <el-dialog
      v-model="trendDialogVisible"
      width="88%"
      top="6vh"
      :close-on-click-modal="false"
      destroy-on-close
      append-to-body
    >
      <template #header>
        <div class="trend-dialog-header">
          <div class="trend-dialog-title">
            {{ trendBoard.name || trendBoard.code }} 趋势看板K线图
          </div>
          <div class="trend-dialog-subtitle">
            {{ trendDateRange.start || '-' }} 至 {{ trendDateRange.end || '-' }}
          </div>
        </div>
      </template>

      <div class="trend-dialog-body">
        <div class="toolbar-row">
          <div class="table-summary">
            <el-tag v-if="trendBoard.code" type="info" effect="plain">
              板块代码 {{ trendBoard.code }}
            </el-tag>
            <el-tag v-if="trendBoard.idxType" type="warning" effect="light">
              板块类型 {{ trendBoard.idxType }}
            </el-tag>
            <el-tag v-if="latestTrendData" type="success" effect="light">
              最新收盘 {{ latestTrendData.close_price.toFixed(2) }}
            </el-tag>
            <el-tag
              v-if="latestTrendData"
              :type="latestTrendData.change_percent > 0 ? 'danger' : latestTrendData.change_percent < 0 ? 'success' : 'info'"
              effect="light"
            >
              最新涨跌幅 {{ formatPercent(latestTrendData.change_percent) }}
            </el-tag>
            <el-tag v-if="latestTrendData" type="info" effect="light">
              最新成交额 {{ formatAmount(latestTrendData.amount) }}
            </el-tag>
          </div>
          <div class="trend-shortcuts">
            <el-radio-group v-model="trendShortcut" @change="handleTrendShortcutChange">
              <el-radio-button label="1y">最近1年</el-radio-button>
              <el-radio-button label="3y">最近3年</el-radio-button>
              <el-radio-button label="5y">最近5年</el-radio-button>
              <el-radio-button label="10y">最近10年</el-radio-button>
              <el-radio-button label="20y">最近20年</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <el-card class="trend-preview-card" v-loading="trendLoading">
          <StockKLineChart
            v-if="trendData.length"
            :stock-code="trendBoard.code"
            :stock-name="trendBoard.name"
            :kline-data="trendData"
            height="420px"
          />
          <el-empty
            v-else-if="!trendLoading"
            :description="trendEmptyText"
            :image-size="80"
          />
        </el-card>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 行业涨跌比分析组件
 * 功能：
 * - 使用行业涨跌比接口渲染板块涨跌比例热力图
 * - 支持行业板块、概念板块、地域板块切换，以及行业层级筛选
 * - 支持点击热力图单元格后打开对应东财板块趋势看板弹窗
 * 参数：无
 * 返回值：无
 * 事件（Emits）：
 * - chartReady(chart): 图表初始化完成
 * - chartClick(payload): 图表点击事件，包含 { industry, sectorCode, date, value, idxType, metric }
 */
import { computed, onMounted, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import HeatmapChart from '@/components/HeatmapChart.vue'
import StockKLineChart from '@/components/StockKLineChart.vue'
import { fetchDcDaily } from '@/services/dcDailyApi'
import type { StockHistoryDataItem } from '@/services/stockHistoryApi'
import {
  fetchIndustryUpDownRatio,
  type EastMoneyIndustryLevel,
  type IndustryMaBreadthIdxType,
  type IndustryUpDownRatioItem
} from '@/services/strategyBreadthApi'

type TrendShortcut = '1y' | '3y' | '5y' | '10y' | '20y'
type UpDownMetric = 'up_ratio' | 'down_ratio' | 'net_ratio'

interface MetricOption {
  label: string
  value: UpDownMetric
}

const emit = defineEmits<{
  chartReady: [chart: echarts.ECharts]
  chartClick: [payload: {
    industry: string
    sectorCode: string
    date: string
    value: number
    idxType: IndustryMaBreadthIdxType
    metric: UpDownMetric
  }]
}>()

type DateRangeOption = 20 | 60 | 120

const loading = ref(false)
const endDate = ref<string>(formatDate(new Date()))
const sortByLastColumn = ref(true)
const selectedIdxType = ref<IndustryMaBreadthIdxType>('行业板块')
const selectedLevel = ref<EastMoneyIndustryLevel>('东财二级行业')
const selectedDateRange = ref<DateRangeOption>(20)
const selectedMetric = ref<UpDownMetric>('up_ratio')
const rawData = ref<IndustryUpDownRatioItem[]>([])

interface Props {
  selectedIndustries: string[]
}

const props = defineProps<Props>()

/**
 * 过滤后的原始数据：当selectedIndustries为空时显示全部，否则只显示选中的行业
 */
const filteredRawData = computed(() => {
  if (!props.selectedIndustries || props.selectedIndustries.length === 0) {
    return rawData.value
  }
  const selectedSet = new Set(props.selectedIndustries)
  return rawData.value.filter(item => selectedSet.has(item.sector_name))
})
const dateRangeOptions: Array<{ label: string; value: DateRangeOption }> = [
  { label: '最近20天', value: 20 },
  { label: '最近60天', value: 60 },
  { label: '最近120天', value: 120 }
]
const metricOptions: MetricOption[] = [
  { label: '上涨比例热力图', value: 'up_ratio' },
  { label: '下跌比例热力图', value: 'down_ratio' },
  { label: '涨跌差热力图', value: 'net_ratio' }
]
const levelOptions: Array<{ label: EastMoneyIndustryLevel; value: EastMoneyIndustryLevel }> = [
  { label: '东财一级行业', value: '东财一级行业' },
  { label: '东财二级行业', value: '东财二级行业' },
  { label: '东财三级行业', value: '东财三级行业' }
]
const trendDialogVisible = ref(false)
const trendLoading = ref(false)
const trendShortcut = ref<TrendShortcut>('1y')
const trendData = ref<StockHistoryDataItem[]>([])
const trendBoard = reactive({
  code: '',
  name: '',
  idxType: '行业板块' as IndustryMaBreadthIdxType
})
const trendDateRange = reactive({
  start: '',
  end: ''
})
let trendRequestId = 0

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDate(dateText: string): Date {
  const [year, month, day] = dateText.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function computeDateRangeByEndDate(endDateText: string, days: number): [string, string] {
  const end = parseDate(endDateText)
  const start = new Date(end.getTime())
  start.setDate(end.getDate() - days)
  return [formatDate(start), formatDate(end)]
}

function disableFutureDate(date: Date): boolean {
  return date.getTime() > Date.now()
}

function formatDateForApi(dateText: string): string {
  return dateText.replace(/-/g, '')
}

function getNumericValue(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function formatPercent(value: unknown): string {
  const numericValue = getNumericValue(value)
  const sign = numericValue > 0 ? '+' : ''
  return `${sign}${numericValue.toFixed(2)}%`
}

function formatRatioPercent(value: unknown): string {
  return `${(getNumericValue(value) * 100).toFixed(2)}%`
}

function formatAmount(value: unknown): string {
  const numericValue = getNumericValue(value)
  if (!Number.isFinite(numericValue) || numericValue === 0) return '0'
  if (numericValue >= 100000000) return `${(numericValue / 100000000).toFixed(2)}亿`
  if (numericValue >= 10000) return `${(numericValue / 10000).toFixed(2)}万`
  return numericValue.toFixed(2)
}

function getMetricValue(item: IndustryUpDownRatioItem): number {
  if (selectedMetric.value === 'down_ratio') {
    return getNumericValue(item.down_ratio)
  }
  if (selectedMetric.value === 'net_ratio') {
    return getNumericValue(item.up_ratio) - getNumericValue(item.down_ratio)
  }
  return getNumericValue(item.up_ratio)
}

function getMetricDisplayText(value: number): string {
  if (selectedMetric.value === 'net_ratio') {
    return formatPercent(value * 100)
  }
  return formatRatioPercent(value)
}

function getVisualRange(): { min: number; max: number } {
  if (selectedMetric.value === 'net_ratio') {
    return { min: -1, max: 1 }
  }
  return { min: 0, max: 1 }
}

/**
 * 工具：应用板块趋势快捷时间范围
 * 功能：根据最近1年、3年、5年、10年、20年的快捷选项计算东财板块K线查询区间
 * 参数：range(TrendShortcut) 快捷时间范围
 * 返回值：无
 * 事件：更新 trendDateRange
 */
const applyTrendShortcut = (range: TrendShortcut) => {
  const yearMap: Record<TrendShortcut, number> = {
    '1y': 1,
    '3y': 3,
    '5y': 5,
    '10y': 10,
    '20y': 20
  }
  const end = new Date()
  const start = new Date()
  start.setFullYear(end.getFullYear() - yearMap[range])
  trendDateRange.start = formatDate(start)
  trendDateRange.end = formatDate(end)
}

/**
 * 工具：加载东财板块趋势K线数据
 * 功能：调用 /django/api/tasks/dc-daily/ 获取当前选中板块日线，并转换为K线组件需要的数据结构
 * 参数：无
 * 返回值：Promise<void>
 * 事件：更新 trendData、trendLoading
 */
const loadTrendData = async () => {
  const requestId = ++trendRequestId

  if (!trendBoard.code || !trendDateRange.start || !trendDateRange.end) {
    trendData.value = []
    return
  }

  trendLoading.value = true
  try {
    const response = await fetchDcDaily({
      ts_code: trendBoard.code,
      idx_type: trendBoard.idxType,
      start_date: formatDateForApi(trendDateRange.start),
      end_date: formatDateForApi(trendDateRange.end),
      fields: 'ts_code,trade_date,open,high,low,close,change,pct_change,vol,amount,swing,turnover_rate'
    })

    if (requestId !== trendRequestId) return

    trendData.value = [...(response.records || [])]
      .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
      .map((item) => ({
        stock_code: item.ts_code,
        stock_name: trendBoard.name,
        date: item.trade_date,
        open_price: getNumericValue(item.open),
        close_price: getNumericValue(item.close),
        high_price: getNumericValue(item.high),
        low_price: getNumericValue(item.low),
        change_percent: getNumericValue(item.pct_change),
        change_amount: getNumericValue(item.change),
        volume: getNumericValue(item.vol),
        amount: getNumericValue(item.amount),
        amplitude: getNumericValue(item.swing),
        turnover_rate: getNumericValue(item.turnover_rate),
        created_at: ''
      }))
  } catch (error) {
    if (requestId !== trendRequestId) return
    console.error('获取东财板块趋势K线失败:', error)
    trendData.value = []
    ElMessage.error('获取东财板块趋势K线失败，请稍后重试')
  } finally {
    if (requestId === trendRequestId) {
      trendLoading.value = false
    }
  }
}

/**
 * 事件：切换板块趋势快捷范围
 * 功能：响应最近1年、3年、5年、10年、20年快捷范围切换并重新加载K线数据
 * 参数：range(TrendShortcut) 快捷时间范围
 * 返回值：无
 * 事件：更新趋势查询区间并刷新图表
 */
const handleTrendShortcutChange = (range: TrendShortcut) => {
  applyTrendShortcut(range)
  loadTrendData()
}

/**
 * 事件：打开板块趋势弹窗
 * 功能：点击热力图板块单元格时打开东财板块K线趋势弹窗
 * 参数：
 * - sectorCode(string): 板块代码
 * - sectorName(string): 板块名称
 * - idxType(IndustryMaBreadthIdxType): 板块类型
 * 返回值：无
 * 事件：更新趋势弹窗状态并触发日线请求
 */
const openTrendDialog = (sectorCode: string, sectorName: string, idxType: IndustryMaBreadthIdxType) => {
  if (!sectorCode) {
    ElMessage.warning('未找到该板块代码，暂时无法打开K线趋势图')
    return
  }
  trendBoard.code = sectorCode
  trendBoard.name = sectorName
  trendBoard.idxType = idxType
  trendShortcut.value = '1y'
  trendData.value = []
  applyTrendShortcut('1y')
  trendDialogVisible.value = true
  loadTrendData()
}

const selectedBoardLabel = computed(() => {
  return selectedIdxType.value === '行业板块'
    ? selectedLevel.value
    : selectedIdxType.value
})

const selectedMetricLabel = computed(() => {
  return metricOptions.find((option) => option.value === selectedMetric.value)?.label || '上涨比例热力图'
})

const metricDescription = computed(() => {
  if (selectedMetric.value === 'down_ratio') {
    return '计算方式：下跌比例 = down_count / total_count。数值越高，表示该板块当日下跌家数占比越高，短线承压越明显。'
  }
  if (selectedMetric.value === 'net_ratio') {
    return '计算方式：涨跌差 = up_ratio - down_ratio。数值越高，表示上涨家数相对下跌家数更占优，板块内部强度更强。'
  }
  return '计算方式：上涨比例 = up_count / total_count。数值越高，表示该板块当日上涨家数占比越高，板块内部强度越强。'
})

const latestTrendData = computed(() => {
  return trendData.value.length > 0
    ? trendData.value[trendData.value.length - 1]
    : null
})

const trendEmptyText = computed(() => {
  return trendBoard.code
    ? '暂无该东财板块区间K线数据'
    : '请选择板块查看趋势看板'
})

const dates = computed<string[]>(() => {
  return Array.from(new Set(filteredRawData.value.map((item) => item.date))).sort()
})

const industries = computed<string[]>(() => {
  const names = Array.from(new Set(filteredRawData.value.map((item) => item.sector_name)))

  if (sortByLastColumn.value && dates.value.length > 0) {
    const lastDate = dates.value[dates.value.length - 1]
    const metricMap = new Map<string, number>()
    filteredRawData.value.forEach((item) => {
      if (item.date === lastDate) {
        metricMap.set(item.sector_name, getMetricValue(item))
      }
    })
    names.sort((a, b) => (metricMap.get(a) || 0) - (metricMap.get(b) || 0))
  }

  return names
})

const heatmapData = computed<[number, number, number][]>(() => {
  const dateIndex = new Map(dates.value.map((item, index) => [item, index]))
  const industryIndex = new Map(industries.value.map((item, index) => [item, index]))
  const points: [number, number, number][] = []

  filteredRawData.value.forEach((item) => {
    const x = dateIndex.get(item.date)
    const y = industryIndex.get(item.sector_name)
    if (x !== undefined && y !== undefined) {
      points.push([x, y, getMetricValue(item)])
    }
  })

  return points
})

const heatmapOption = computed<echarts.EChartsOption | null>(() => {
  if (!dates.value.length || !industries.value.length || !heatmapData.value.length) {
    return null
  }

  const { min, max } = getVisualRange()

  return {
    animation: false,
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [x, y, value] = params?.data ?? []
        const date = typeof x === 'number' ? dates.value[x] : ''
        const industry = typeof y === 'number' ? industries.value[y] : ''
        const matchedRecord = filteredRawData.value.find((item) => item.date === date && item.sector_name === industry)
        if (!matchedRecord) return `${date}<br/>${industry}`

        return [
          `${date}`,
          `${industry}`,
          `上涨家数: ${matchedRecord.up_count}`,
          `下跌家数: ${matchedRecord.down_count}`,
          `统计总数: ${matchedRecord.total_count}`,
          `${selectedMetricLabel.value}: ${getMetricDisplayText(value)}`
        ].join('<br/>')
      }
    },
    grid: { left: 140, right: 80, top: 80, bottom: 20 },
    xAxis: {
      type: 'category',
      data: dates.value,
      position: 'top',
      axisLabel: { rotate: 0, hideOverlap: true, interval: 'auto' }
    },
    yAxis: {
      type: 'category',
      data: industries.value
    },
    visualMap: {
      min,
      max,
      calculable: true,
      orient: 'vertical',
      right: 10,
      top: 40,
      bottom: 40,
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      }
    },
    series: [{
      type: 'heatmap',
      data: heatmapData.value,
      itemStyle: { borderColor: '#fff', borderWidth: 1 },
      emphasis: { itemStyle: { shadowBlur: 5, shadowColor: 'rgba(0, 0, 0, 0.3)' } }
    }]
  }
})

const toggleLastColumnSort = () => {
  sortByLastColumn.value = !sortByLastColumn.value
}

const fetchData = async () => {
  loading.value = true
  try {
    const [start, end] = computeDateRangeByEndDate(endDate.value, selectedDateRange.value)
    const data = await fetchIndustryUpDownRatio({
      startDate: start,
      endDate: end,
      idxType: selectedIdxType.value,
      level: selectedIdxType.value === '行业板块' ? selectedLevel.value : undefined
    })
    rawData.value = data.data ?? []
  } catch (error) {
    console.error('获取行业涨跌比数据失败:', error)
  } finally {
    loading.value = false
  }
}

const handleParamsChange = () => {
  fetchData()
}

const handleMetricChange = () => {
  if (!filteredRawData.value.length) return
}

const handleIdxTypeChange = () => {
  fetchData()
}

const onChartReady = (chart: echarts.ECharts) => {
  emit('chartReady', chart)
}

const onChartClick = (params: any) => {
  const [x, y, value] = (params?.data ?? []) as [number, number, number]
  const date = typeof x === 'number' ? dates.value[x] : ''
  const industry = typeof y === 'number' ? industries.value[y] : ''
  const matchedRecord = filteredRawData.value.find((item) => item.date === date && item.sector_name === industry)
  const payload = {
    date,
    industry,
    sectorCode: matchedRecord?.sector_code || '',
    value: typeof value === 'number' ? value : 0,
    idxType: selectedIdxType.value,
    metric: selectedMetric.value
  }

  emit('chartClick', payload)
  if (payload.sectorCode && payload.industry) {
    openTrendDialog(payload.sectorCode, payload.industry, payload.idxType)
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.industry-up-down-ratio-analysis {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-card {
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .control-label {
    color: #666;
  }
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.table-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.trend-dialog-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trend-dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.trend-dialog-subtitle {
  font-size: 13px;
  color: #909399;
}

.trend-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trend-shortcuts {
  display: flex;
  justify-content: flex-end;
}

.trend-preview-card {
  min-height: 220px;
}

.chart-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .methodology {
    margin-bottom: 16px;
    padding: 12px 14px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #f7f8fa;
    color: #606266;
    font-size: 13px;
    line-height: 1.7;
  }

  .methodology p {
    margin: 0;
  }

  .methodology p + p {
    margin-top: 6px;
  }

  .tips {
    color: #999;
    font-size: 12px;
  }

  .empty-tip {
    color: #999;
    padding: 24px;
    text-align: center;
  }
}
</style>

<template>
  <div class="potential-stock-view" v-loading="loading" element-loading-text="正在筛选潜力股票...">
    <el-card shadow="never" class="filter-card">
      <template #header>
        <div class="panel-header">
          <div>
            <h2>潜力股票筛选</h2>
            <p>{{ selectedExchangeLabel }}主板 · 突破前高 · 放量 · RPS强势</p>
          </div>
          <el-button type="primary" :icon="Search" :loading="loading" @click="loadCandidates">查询</el-button>
        </div>
      </template>

      <el-form :model="filters" label-width="110px">
        <el-row :gutter="16">
          <el-col :xs="24" :md="12" :lg="6">
            <el-form-item label="主板范围">
              <el-segmented
                v-model="filters.exchange"
                :options="exchangeOptions"
                class="full-width"
                @change="loadCandidates"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12" :lg="6">
            <el-form-item label="交易日">
              <div class="trade-date-switcher">
                <el-button circle :icon="ArrowLeft" @click="changeTradeDate(-1)" />
                <el-button class="trade-date-display" @click="resetTradeDateToLatest">
                  {{ formatCompactDate(filters.tradeDate) }}
                </el-button>
                <el-button
                  circle
                  :icon="ArrowRight"
                  :disabled="filters.tradeDate >= latestSelectableTradeDate"
                  @click="changeTradeDate(1)"
                />
              </div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12" :lg="6">
            <el-form-item label="前高窗口">
              <el-input-number v-model="filters.lookbackDays" :min="20" :max="120" :step="5" class="full-width" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12" :lg="6">
            <el-form-item label="返回数量">
              <el-input-number v-model="filters.limit" :min="20" :max="300" :step="10" class="full-width" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12" :lg="6">
            <el-form-item label="RPS20下限">
              <el-input-number v-model="filters.minRps20" :min="0" :max="100" :step="5" class="full-width" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12" :lg="6">
            <el-form-item label="RPS60下限">
              <el-input-number v-model="filters.minRps60" :min="0" :max="100" :step="5" class="full-width" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12" :lg="6">
            <el-form-item label="量比下限">
              <el-input-number v-model="filters.minVolumeRatio" :min="0.5" :max="5" :step="0.1" :precision="1" class="full-width" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12" :lg="6">
            <el-form-item label="突破上限">
              <el-input-number v-model="filters.maxBreakoutPct" :min="1" :max="30" :step="1" class="full-width">
                <template #suffix>%</template>
              </el-input-number>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12" :lg="6">
            <el-form-item label="最高股价">
              <el-input-number v-model="filters.maxPrice" :min="1" :max="300" :step="1" class="full-width">
                <template #suffix>元</template>
              </el-input-number>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12" :lg="6">
            <el-form-item label="最大流通市值">
              <el-input-number v-model="filters.maxCircMvYi" :min="10" :max="5000" :step="50" class="full-width">
                <template #suffix>亿</template>
              </el-input-number>
            </el-form-item>
          </el-col>

          <el-col :xs="24">
            <el-form-item label="RPS周期">
              <el-checkbox-group v-model="filters.periods">
                <el-checkbox v-for="period in periodOptions" :key="period" :label="period">
                  {{ period }}日
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div class="action-row">
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        <el-tag type="info" effect="plain">实际交易日 {{ formatCompactDate(data?.trade_date) }}</el-tag>
        <el-tag type="success" effect="plain">{{ selectedExchangeLabel }}主板</el-tag>
      </div>
    </el-card>

    <el-alert
      v-if="warningMessages.length"
      type="warning"
      :closable="false"
      show-icon
      class="warning-alert"
    >
      <template #title>接口提示</template>
      <div class="warning-list">
        <div v-for="item in warningMessages" :key="item">{{ item }}</div>
      </div>
    </el-alert>

    <div class="summary-grid">
      <div class="summary-item">
        <span>入选股票</span>
        <strong>{{ data?.matched_total ?? 0 }}</strong>
      </div>
      <div class="summary-item">
        <span>基础股票池</span>
        <strong>{{ data?.universe_total ?? data?.rps_total ?? 0 }}</strong>
      </div>
      <div class="summary-item">
        <span>预过滤后</span>
        <strong>{{ data?.prefiltered_total ?? 0 }}</strong>
      </div>
      <div class="summary-item">
        <span>扫描股票</span>
        <strong>{{ data?.scanned_total ?? 0 }}</strong>
      </div>
      <div class="summary-item">
        <span>历史区间</span>
        <strong>{{ formatCompactDate(data?.history_start_date) }} - {{ formatCompactDate(data?.history_end_date) }}</strong>
      </div>
      <div class="summary-item">
        <span>更新时间</span>
        <strong>{{ formatDateTime(data?.query_time) }}</strong>
      </div>
    </div>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="table-header">
          <div class="table-title">候选列表</div>
          <el-tag type="info" effect="plain">{{ rows.length }} 条</el-tag>
        </div>
      </template>

      <el-table :data="rows" border stripe height="64vh" size="small">
        <el-table-column label="评分" prop="setup_score" width="82" align="center" fixed sortable>
          <template #default="{ row }">
            <span class="score-pill">{{ formatNumber(row.setup_score, 0) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="股票" min-width="150" fixed show-overflow-tooltip>
          <template #default="{ row }">
            <el-button type="primary" link @click="openTrendDialog(row)">{{ row.name || row.ts_code }}</el-button>
            <div class="stock-code">{{ row.ts_code }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="industry" label="行业" min-width="120" show-overflow-tooltip />
        <el-table-column prop="signal" label="信号" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_limit_up_like ? 'danger' : 'warning'" effect="light">{{ row.signal }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="220">
          <template #default="{ row }">
            <div class="tag-list">
              <el-tag v-for="tag in row.setup_tags || []" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="收盘价" prop="latest_close" min-width="100" align="right" sortable>
          <template #default="{ row }">{{ formatNumber(row.latest_close) }}</template>
        </el-table-column>
        <el-table-column label="当日涨跌" prop="pct_change" min-width="100" align="right" sortable>
          <template #default="{ row }">
            <span :class="numberClass(row.pct_change)">{{ formatPercent(row.pct_change) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="突破幅度" prop="breakout_pct" min-width="108" align="right" sortable>
          <template #default="{ row }">
            <span :class="numberClass(row.breakout_pct)">{{ formatPercent(row.breakout_pct) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="前高" prop="prev_high" min-width="90" align="right" sortable>
          <template #default="{ row }">{{ formatNumber(row.prev_high) }}</template>
        </el-table-column>
        <el-table-column label="5日量比" prop="volume_ratio_5" min-width="100" align="right" sortable>
          <template #default="{ row }">{{ formatRatio(row.volume_ratio_5) }}</template>
        </el-table-column>
        <el-table-column label="RPS20" prop="RPS_20" min-width="90" align="right" sortable>
          <template #default="{ row }">{{ formatNumber(row.RPS_20, 1) }}</template>
        </el-table-column>
        <el-table-column label="RPS60" prop="RPS_60" min-width="90" align="right" sortable>
          <template #default="{ row }">{{ formatNumber(row.RPS_60, 1) }}</template>
        </el-table-column>
        <el-table-column label="平台深度" prop="base_depth_pct" min-width="108" align="right" sortable>
          <template #default="{ row }">{{ formatPercent(row.base_depth_pct) }}</template>
        </el-table-column>
        <el-table-column label="距20日线" prop="distance_ma20_pct" min-width="108" align="right" sortable>
          <template #default="{ row }">
            <span :class="numberClass(row.distance_ma20_pct)">{{ formatPercent(row.distance_ma20_pct) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="20日线斜率" prop="ma20_slope_pct" min-width="116" align="right" sortable>
          <template #default="{ row }">
            <span :class="numberClass(row.ma20_slope_pct)">{{ formatPercent(row.ma20_slope_pct) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="流通市值" prop="circ_mv" min-width="110" align="right" sortable>
          <template #default="{ row }">{{ formatMoney(row.circ_mv) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="trendDialogVisible"
      width="88%"
      top="6vh"
      destroy-on-close
      append-to-body
      :close-on-click-modal="false"
    >
      <template #header>
        <div class="trend-dialog-header">
          <div class="trend-dialog-title">{{ trendDialogTitle }}</div>
          <div class="trend-dialog-subtitle">{{ trendDateRange.start || '-' }} 至 {{ trendDateRange.end || '-' }}</div>
        </div>
      </template>

      <div class="trend-dialog-body">
        <div class="trend-toolbar">
          <div class="trend-toolbar-left">
            <div class="trend-nav">
              <el-button
                size="small"
                :icon="ArrowLeft"
                :disabled="!hasPrevTrendStock"
                @click="stepTrendStock(-1)"
              >
                上一个
              </el-button>
              <span v-if="trendNavPositionText" class="trend-nav-position">{{ trendNavPositionText }}</span>
              <el-button
                size="small"
                :disabled="!hasNextTrendStock"
                @click="stepTrendStock(1)"
              >
                下一个
                <el-icon class="el-icon--right"><ArrowRight /></el-icon>
              </el-button>
            </div>
            <div class="trend-tags">
              <el-tag v-if="selectedStock.tsCode" type="info" effect="plain">{{ selectedStock.tsCode }}</el-tag>
              <el-tag v-if="selectedStock.industry" type="warning" effect="light">{{ selectedStock.industry }}</el-tag>
              <el-tag v-if="selectedStock.signal" type="danger" effect="light">{{ selectedStock.signal }}</el-tag>
            </div>
          </div>
          <el-radio-group v-model="trendShortcut" size="small" @change="handleTrendShortcutChange">
            <el-radio-button label="3m">最近3月</el-radio-button>
            <el-radio-button label="6m">最近6月</el-radio-button>
            <el-radio-button label="1y">最近1年</el-radio-button>
            <el-radio-button label="3y">最近3年</el-radio-button>
          </el-radio-group>
        </div>

        <el-card class="trend-chart-card" shadow="never" v-loading="trendLoading">
          <StockKLineChart
            v-if="trendData.length"
            :stock-code="selectedStock.tsCode"
            :stock-name="selectedStock.name"
            :kline-data="trendData"
            height="420px"
          />
          <el-empty v-else-if="!trendLoading" description="当前区间暂无K线数据" :image-size="80" />
        </el-card>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Refresh, Search } from '@element-plus/icons-vue'
import StockKLineChart from '@/components/StockKLineChart.vue'
import { fetchStockHistoryData, type StockHistoryDataItem } from '@/services/stockHistoryApi'
import {
  getPotentialStocks,
  type PotentialStockItem,
  type PotentialStocksData,
  type PotentialStocksParams
} from '@/services/strategyApi'

type MainBoardExchange = 'SSE' | 'SZSE'
type TrendShortcut = '3m' | '6m' | '1y' | '3y'

interface Filters {
  tradeDate: string
  exchange: MainBoardExchange
  lookbackDays: number
  minRps20: number
  minRps60: number
  minVolumeRatio: number
  maxBreakoutPct: number
  maxPrice: number
  maxCircMvYi: number
  limit: number
  periods: number[]
}

const defaultFilters: Filters = {
  tradeDate: getRecentTradeDate(),
  exchange: 'SSE',
  lookbackDays: 60,
  minRps20: 80,
  minRps60: 70,
  minVolumeRatio: 1.3,
  maxBreakoutPct: 12,
  maxPrice: 30,
  maxCircMvYi: 500,
  limit: 100,
  periods: [5, 20, 60]
}

const latestSelectableTradeDate = getRecentTradeDate()
const periodOptions = [5, 10, 20, 60, 120, 250]
const exchangeOptions = [
  { label: '上交所主板', value: 'SSE' },
  { label: '深交所主板', value: 'SZSE' }
] as const

const filters = reactive<Filters>({ ...defaultFilters, periods: [...defaultFilters.periods] })
const loading = ref(false)
const data = ref<PotentialStocksData | null>(null)
let requestId = 0

const trendDialogVisible = ref(false)
const trendLoading = ref(false)
const trendData = ref<StockHistoryDataItem[]>([])
const trendShortcut = ref<TrendShortcut>('3m')
const trendDateRange = reactive({ start: '', end: '' })
const selectedStock = reactive({
  tsCode: '',
  name: '',
  industry: '',
  signal: ''
})
const currentTrendIndex = ref(-1)
let trendRequestId = 0

const rows = computed(() => data.value?.data || [])
const warningMessages = computed(() => data.value?.errors?.filter(Boolean) || [])
const selectedExchangeLabel = computed(() => exchangeOptions.find(item => item.value === filters.exchange)?.label || '')
const hasPrevTrendStock = computed(() => currentTrendIndex.value > 0)
const hasNextTrendStock = computed(() => currentTrendIndex.value >= 0 && currentTrendIndex.value < rows.value.length - 1)
const trendNavPositionText = computed(() => {
  if (currentTrendIndex.value < 0 || rows.value.length <= 0) return ''
  return `${currentTrendIndex.value + 1}/${rows.value.length}`
})
const trendDialogTitle = computed(() => {
  const label = selectedStock.name || selectedStock.tsCode
  return label ? `${label} 趋势图` : '个股趋势图'
})

async function loadCandidates() {
  const currentRequestId = ++requestId
  loading.value = true
  try {
    const params: PotentialStocksParams = {
      trade_date: filters.tradeDate,
      exchange: filters.exchange,
      periods: buildPeriodsParam(),
      lookback_days: filters.lookbackDays,
      min_rps_20: filters.minRps20,
      min_rps_60: filters.minRps60,
      min_volume_ratio: filters.minVolumeRatio,
      max_breakout_pct: filters.maxBreakoutPct,
      max_price: filters.maxPrice,
      max_circ_mv: filters.maxCircMvYi * 1e8,
      limit: filters.limit
    }
    const response = await getPotentialStocks(params)
    if (currentRequestId !== requestId) return
    data.value = response
  } catch (error) {
    if (currentRequestId !== requestId) return
    console.error('加载潜力股票失败:', error)
    data.value = null
    ElMessage.error('加载潜力股票失败，请稍后重试')
  } finally {
    if (currentRequestId === requestId) {
      loading.value = false
    }
  }
}

function resetFilters() {
  Object.assign(filters, { ...defaultFilters, periods: [...defaultFilters.periods] })
  loadCandidates()
}

function buildPeriodsParam(): string {
  const periods = [...new Set(filters.periods.map(Number).filter(period => period > 0))]
  if (!periods.includes(20)) periods.push(20)
  if (!periods.includes(60)) periods.push(60)
  return periods.sort((a, b) => a - b).join(',')
}

function openTrendDialog(row: PotentialStockItem) {
  if (!row.ts_code) {
    ElMessage.warning('该股票缺少代码，无法查看趋势图')
    return
  }
  currentTrendIndex.value = rows.value.findIndex(item => item.ts_code === row.ts_code)
  trendShortcut.value = '3m'
  applyTrendShortcut('3m')
  showTrendStock(row)
  trendDialogVisible.value = true
}

function showTrendStock(row: PotentialStockItem) {
  selectedStock.tsCode = row.ts_code
  selectedStock.name = row.name || ''
  selectedStock.industry = row.industry || ''
  selectedStock.signal = row.signal || ''
  trendData.value = []
  loadTrendData()
}

function stepTrendStock(step: -1 | 1) {
  const nextIndex = currentTrendIndex.value + step
  const targetRow = rows.value[nextIndex]
  if (!targetRow) return
  currentTrendIndex.value = nextIndex
  showTrendStock(targetRow)
}

async function loadTrendData() {
  const currentRequestId = ++trendRequestId
  if (!selectedStock.tsCode) return
  trendLoading.value = true
  try {
    const response = await fetchStockHistoryData(
      selectedStock.tsCode,
      trendDateRange.start.replace(/-/g, ''),
      trendDateRange.end.replace(/-/g, ''),
      'qfq'
    )
    if (currentRequestId !== trendRequestId) return
    trendData.value = [...response].sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    if (currentRequestId !== trendRequestId) return
    console.error('加载股票趋势图失败:', error)
    trendData.value = []
    ElMessage.error('加载股票趋势图失败，请稍后重试')
  } finally {
    if (currentRequestId === trendRequestId) {
      trendLoading.value = false
    }
  }
}

function handleTrendShortcutChange(value: string | number | boolean | undefined) {
  applyTrendShortcut(value as TrendShortcut)
  loadTrendData()
}

function applyTrendShortcut(range: TrendShortcut) {
  const monthMap: Record<TrendShortcut, number> = { '3m': 3, '6m': 6, '1y': 12, '3y': 36 }
  const end = new Date()
  const start = new Date()
  start.setMonth(end.getMonth() - monthMap[range])
  trendDateRange.start = formatDateWithDash(start)
  trendDateRange.end = formatDateWithDash(end)
}

function changeTradeDate(step: -1 | 1) {
  const nextDate = parseCompactDate(filters.tradeDate)
  do {
    nextDate.setDate(nextDate.getDate() + step)
  } while ([0, 6].includes(nextDate.getDay()))

  const nextValue = formatDateCompact(nextDate)
  filters.tradeDate = nextValue > latestSelectableTradeDate ? latestSelectableTradeDate : nextValue
  loadCandidates()
}

function resetTradeDateToLatest() {
  filters.tradeDate = latestSelectableTradeDate
  loadCandidates()
}

function getRecentTradeDate(): string {
  const date = new Date()
  const day = date.getDay()
  if (day === 0) date.setDate(date.getDate() - 2)
  if (day === 6) date.setDate(date.getDate() - 1)
  return formatDateCompact(date)
}

function parseCompactDate(value: string): Date {
  const normalized = String(value || '').replace(/[^0-9]/g, '')
  if (normalized.length !== 8) return new Date()
  return new Date(Number(normalized.slice(0, 4)), Number(normalized.slice(4, 6)) - 1, Number(normalized.slice(6, 8)))
}

function formatDateCompact(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}

function formatDateWithDash(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatCompactDate(value?: string | null): string {
  const text = String(value || '').replace(/[^0-9]/g, '')
  return text.length === 8 ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}` : '--'
}

function formatDateTime(value?: string | null): string {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return `${formatDateWithDash(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function formatNumber(value: unknown, digits = 2): string {
  const n = numberOrNull(value)
  if (n === null) return '-'
  return digits === 0 ? String(Math.round(n)) : n.toFixed(digits)
}

function formatPercent(value: unknown): string {
  const n = numberOrNull(value)
  if (n === null) return '-'
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`
}

function formatRatio(value: unknown): string {
  const n = numberOrNull(value)
  if (n === null) return '-'
  return `${n.toFixed(2)}x`
}

function formatMoney(value: unknown): string {
  const n = numberOrNull(value)
  if (n === null) return '-'
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(2)}亿`
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(2)}万`
  return n.toFixed(2)
}

function numberClass(value: unknown): string {
  const n = numberOrNull(value)
  if (n === null) return ''
  if (n > 0) return 'text-red'
  if (n < 0) return 'text-green'
  return ''
}

onMounted(() => {
  loadCandidates()
})
</script>

<style scoped>
.potential-stock-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.filter-card,
.table-card,
.trend-chart-card {
  border-radius: 4px;
}

.panel-header,
.table-header,
.trend-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.4;
  color: #303133;
}

.panel-header p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #606266;
}

.full-width {
  width: 100%;
}

.trade-date-switcher {
  display: grid;
  grid-template-columns: 32px minmax(112px, 1fr) 32px;
  gap: 8px;
  width: 100%;
}

.trade-date-display {
  width: 100%;
  font-weight: 600;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.warning-alert {
  border-radius: 4px;
}

.warning-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fff;
}

.summary-item span {
  font-size: 12px;
  color: #909399;
}

.summary-item strong {
  font-size: 16px;
  color: #303133;
}

.table-title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.score-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 24px;
  border-radius: 3px;
  background: #fef0f0;
  color: #d9001b;
  font-weight: 700;
}

.stock-code {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}

.tag-list,
.trend-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.trend-toolbar-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.trend-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trend-nav-position {
  min-width: 46px;
  text-align: center;
  font-size: 12px;
  color: #606266;
}

.text-red {
  color: #d9001b;
  font-weight: 600;
}

.text-green {
  color: #138a36;
  font-weight: 600;
}

.trend-dialog-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trend-dialog-title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.trend-dialog-subtitle {
  font-size: 12px;
  color: #909399;
}

.trend-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 768px) {
  .potential-stock-view {
    padding: 8px;
  }

  .panel-header,
  .table-header,
  .trend-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .trend-toolbar-left,
  .trend-nav {
    align-items: stretch;
    flex-direction: column;
  }

  .trend-nav-position {
    min-width: 0;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

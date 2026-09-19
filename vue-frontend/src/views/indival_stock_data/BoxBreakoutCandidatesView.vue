<template>
  <div class="box-breakout-page">
    <section class="toolbar">
      <div class="toolbar-main">
        <div class="control">
          <span class="control-label">观察日期</span>
          <el-date-picker
            v-model="query.trade_date"
            type="date"
            value-format="YYYYMMDD"
            format="YYYY-MM-DD"
            clearable
            placeholder="默认最新交易日"
            :disabled-date="disableFutureDate"
            class="date-picker"
          />
        </div>
        <div class="control compact">
          <span class="control-label">命中数</span>
          <el-input-number v-model="query.min_match_count" :min="1" :max="8" />
        </div>
        <div class="control compact">
          <span class="control-label">箱体天数</span>
          <el-input-number v-model="query.min_box_days" :min="10" :max="70" />
        </div>
        <div class="control compact">
          <span class="control-label">返回数</span>
          <el-input-number v-model="query.limit" :min="1" :max="500" />
        </div>
        <div class="control codes">
          <span class="control-label">股票代码</span>
          <el-input v-model="query.codes" clearable placeholder="可选，逗号分隔" />
        </div>
        <el-switch v-model="query.include_failed" active-text="包含失效" />
      </div>
      <el-button type="primary" :loading="loading" @click="loadData"> 开始筛选 </el-button>
    </section>

    <section class="summary-strip">
      <div class="summary-item">
        <span>交易日</span>
        <strong>{{ data?.trade_date || '-' }}</strong>
      </div>
      <div class="summary-item">
        <span>命中</span>
        <strong>{{ data?.matched_total ?? '-' }}</strong>
      </div>
      <div class="summary-item">
        <span>精核</span>
        <strong>{{ data?.scanned_total ?? '-' }}</strong>
      </div>
      <div class="summary-item">
        <span>股票池</span>
        <strong>{{ data?.pool_total ?? '-' }}</strong>
      </div>
      <div class="summary-item wide">
        <span>粗筛剔除</span>
        <strong>{{ skippedText }}</strong>
      </div>
    </section>

    <section v-if="data?.errors?.length" class="notice">
      <span v-for="error in data.errors" :key="error">{{ error }}</span>
    </section>

    <section class="table-section">
      <el-table
        v-loading="loading"
        :data="rows"
        border
        stripe
        row-key="stock_code"
        class="candidate-table"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expanded">
              <div class="expanded-grid">
                <div>
                  <span>箱体区间</span>
                  <strong>{{ row.box.start_date }} ~ {{ row.box.end_date }}</strong>
                </div>
                <div>
                  <span>箱体上下沿</span>
                  <strong
                    >{{ formatNumber(row.box.high_close) }} /
                    {{ formatNumber(row.box.low_close) }}</strong
                  >
                </div>
                <div>
                  <span>放量倍数</span>
                  <strong>{{ formatNumber(row.condition_metrics.volume_ratio) }}x</strong>
                </div>
                <div>
                  <span>失效状态</span>
                  <strong>{{
                    row.failure_status.invalid ? row.failure_status.reasons.join('；') : '未触发'
                  }}</strong>
                </div>
                <div>
                  <span>后验买入</span>
                  <strong v-if="row.post_performance?.buy_date">
                    {{ row.post_performance.buy_date }} 开盘
                    {{ formatNumber(row.post_performance.buy_price, 3) }}
                  </strong>
                  <strong v-else>{{ row.post_performance?.message || '待观察' }}</strong>
                </div>
              </div>
              <el-table :data="row.conditions" border size="small" class="condition-detail-table">
                <el-table-column prop="name" label="条件" min-width="120" />
                <el-table-column label="状态" width="90">
                  <template #default="{ row: condition }">
                    <el-tag :type="condition.passed ? 'success' : 'danger'" effect="plain">
                      {{ condition.passed ? '满足' : '未满足' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="threshold" label="阈值" min-width="170" />
                <el-table-column label="指标值" min-width="140">
                  <template #default="{ row: condition }">
                    {{ formatConditionValue(condition.value) }}
                  </template>
                </el-table-column>
                <el-table-column prop="description" label="说明" min-width="320" />
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="stock_code" label="代码" width="92" fixed />
        <el-table-column prop="stock_name" label="名称" width="120" fixed>
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :aria-label="`查看${row.stock_name || row.stock_code}趋势图`"
              @click="openTrendDialog(row)"
            >
              {{ row.stock_name || row.stock_code }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="industry" label="行业" min-width="120" />
        <el-table-column label="命中" width="96" align="center">
          <template #default="{ row }">
            <el-tag :type="row.match_count >= 8 ? 'success' : 'warning'" effect="dark">
              {{ row.match_count }}/8
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="突破日" width="120">
          <template #default="{ row }">
            <div class="date-cell">
              <span>{{ row.breakout_date }}</span>
              <em v-if="!row.breakout_is_latest">首板回溯</em>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="价格/市值" width="130">
          <template #default="{ row }">
            <div class="metric-cell">
              <strong>{{ formatNumber(row.latest_close) }}</strong>
              <span>{{ formatNumber(row.total_market_cap_yi) }} 亿</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="箱体" width="132">
          <template #default="{ row }">
            <div class="metric-cell">
              <strong>{{ row.box.days }}日</strong>
              <span>振幅 {{ formatNumber(row.box.amplitude_pct) }}%</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="关键指标" width="170">
          <template #default="{ row }">
            <div class="metric-cell">
              <span>涨幅 {{ formatNumber(row.condition_metrics.breakout_gain_pct) }}%</span>
              <span>量比 {{ formatNumber(row.condition_metrics.volume_ratio) }}x</span>
              <span>分位 {{ formatNumber(row.condition_metrics.position_80d_pct) }}%</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="持有涨幅" width="210">
          <template #default="{ row }">
            <div class="holding-return-cell">
              <span v-if="row.post_performance?.buy_date" class="holding-buy-line">
                {{ row.post_performance.buy_date }} 开盘
                {{ formatNumber(row.post_performance.buy_price, 3) }}
              </span>
              <span v-else class="holding-pending">
                {{ row.post_performance?.message || '待观察' }}
              </span>
              <div class="holding-return-values">
                <span
                  v-for="item in row.post_performance?.returns || []"
                  :key="item.holding_days"
                >
                  <em>{{ item.holding_days }}日</em>
                  <strong :class="holdingReturnClass(item.return_pct)">
                    {{ formatHoldingReturn(item.return_pct) }}
                  </strong>
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="8 条条件" min-width="360">
          <template #default="{ row }">
            <div class="condition-tags">
              <el-tooltip
                v-for="condition in row.conditions"
                :key="condition.key"
                :content="`${condition.threshold}；${condition.description}`"
                placement="top"
              >
                <el-tag :type="condition.passed ? 'success' : 'danger'" effect="plain">
                  {{ condition.key.toUpperCase() }} {{ condition.passed ? '✓' : '×' }}
                </el-tag>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="失效" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.failure_status.invalid" type="danger">已触发</el-tag>
            <el-tag v-else-if="row.failure_status.warnings.length" type="warning">预警</el-tag>
            <el-tag v-else type="info">未触发</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog
      v-model="trendDialogVisible"
      width="88%"
      top="6vh"
      destroy-on-close
      append-to-body
      :close-on-click-modal="false"
      @closed="handleTrendDialogClosed"
    >
      <template #header>
        <div class="trend-dialog-header">
          <div class="trend-dialog-title">
            {{ selectedTrendStock.name || selectedTrendStock.code }} 趋势图
          </div>
          <div class="trend-dialog-subtitle">
            {{ trendDateRange.start || '-' }} 至 {{ trendDateRange.end || '-' }}
          </div>
        </div>
      </template>

      <div class="trend-dialog-body">
        <div class="trend-toolbar">
          <div class="trend-meta">
            <el-tag type="info" effect="plain">代码 {{ selectedTrendStock.code }}</el-tag>
            <el-tag v-if="selectedTrendStock.industry" type="warning" effect="light">
              {{ selectedTrendStock.industry }}
            </el-tag>
            <el-tag type="danger" effect="light">
              观察日 {{ formatDisplayDate(selectedTrendStock.observationDate) }}
            </el-tag>
            <el-tag v-if="latestTrendPoint" type="info" effect="light">
              区间末收盘 {{ formatNumber(latestTrendPoint.close_price) }}
            </el-tag>
          </div>

          <div class="trend-nav" aria-label="切换观察日筛选股票">
            <el-button :icon="ArrowLeft" :disabled="!hasPrevTrendStock" @click="stepTrendStock(-1)">
              上一只
            </el-button>
            <span class="trend-nav-position">{{ trendNavPositionText }}</span>
            <el-button :disabled="!hasNextTrendStock" @click="stepTrendStock(1)">
              下一只
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>

        <div class="trend-preview" v-loading="trendLoading">
          <StockKLineChart
            v-if="trendData.length"
            :stock-code="selectedTrendStock.tsCode || selectedTrendStock.code"
            :stock-name="selectedTrendStock.name"
            :kline-data="trendData"
            :event-lines="trendEventLines"
            :price-ranges="trendPriceRanges"
            show-volume
            height="500px"
          />
          <el-empty
            v-else-if="!trendLoading"
            description="箱体起点前30天至观察日后1个月区间暂无K线数据"
            :image-size="80"
          />
        </div>

        <section v-if="selectedTrendConditions.length" class="trend-condition-panel">
          <div class="trend-condition-heading">
            <div>
              <h3>条件状态</h3>
              <p>观察日对应的箱体突破条件</p>
            </div>
            <strong>
              {{ selectedTrendCandidate?.match_count ?? 0 }}/{{ selectedTrendConditions.length }}
              条满足
            </strong>
          </div>

          <div class="trend-condition-grid">
            <article
              v-for="condition in selectedTrendConditions"
              :key="condition.key"
              class="trend-condition-item"
              :class="condition.passed ? 'is-passed' : 'is-failed'"
            >
              <div class="trend-condition-topline">
                <span class="trend-condition-key">{{ condition.key.toUpperCase() }}</span>
                <el-tag :type="condition.passed ? 'success' : 'danger'" effect="plain" size="small">
                  {{ condition.passed ? '满足' : '未满足' }}
                </el-tag>
              </div>
              <strong class="trend-condition-name">{{ condition.name }}</strong>
              <dl class="trend-condition-values">
                <div>
                  <dt>指标值</dt>
                  <dd>{{ formatConditionValue(condition.value) }}</dd>
                </div>
                <div>
                  <dt>判定阈值</dt>
                  <dd>{{ condition.threshold || '-' }}</dd>
                </div>
              </dl>
              <p v-if="condition.description" class="trend-condition-description">
                {{ condition.description }}
              </p>
            </article>
          </div>
        </section>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import StockKLineChart from '@/components/StockKLineChart.vue'
import { useAiPageData } from '@/composables/useAiPageData'
import { fetchStockHistoryData, type StockHistoryDataItem } from '@/services/stockHistoryApi'
import {
  getBoxBreakoutCandidates,
  type BoxBreakoutCandidateItem,
  type BoxBreakoutCandidatesData,
  type BoxBreakoutCandidatesParams,
} from '@/services/strategyApi'

const loading = ref(false)
const data = ref<BoxBreakoutCandidatesData | null>(null)
let latestRequestId = 0
let trendRequestId = 0
const query = reactive<
  Required<
    Pick<
      BoxBreakoutCandidatesParams,
      'min_match_count' | 'limit' | 'include_failed' | 'min_box_days'
    >
  > & {
    trade_date: string
    codes: string
  }
>({
  trade_date: '',
  min_match_count: 7,
  limit: 100,
  codes: '',
  include_failed: false,
  min_box_days: 20,
})

const rows = computed<BoxBreakoutCandidateItem[]>(() => data.value?.data ?? [])
const trendDialogVisible = ref(false)
const trendLoading = ref(false)
const trendData = ref<StockHistoryDataItem[]>([])
const trendDateRange = reactive({ start: '', end: '' })
const selectedTrendCandidate = ref<BoxBreakoutCandidateItem | null>(null)
const currentTrendIndex = ref(-1)
const selectedTrendStock = reactive({
  code: '',
  tsCode: '',
  name: '',
  industry: '',
  observationDate: '',
})
const trendEventLines = computed(() =>
  selectedTrendStock.observationDate
    ? [{ date: selectedTrendStock.observationDate, label: '观察日', color: '#dc2626' }]
    : [],
)
const trendPriceRanges = computed(() => {
  const box = selectedTrendCandidate.value?.box
  if (!box?.start_date || !box?.end_date) return []
  return [{
    startDate: box.start_date,
    endDate: box.end_date,
    label: `箱体 ${box.days}个交易日`,
    low: box.low_close,
    high: box.high_close,
    color: '#2563eb',
  }]
})
const latestTrendPoint = computed(() =>
  trendData.value.length ? trendData.value[trendData.value.length - 1] : null,
)
const selectedTrendConditions = computed(() => selectedTrendCandidate.value?.conditions ?? [])
const hasPrevTrendStock = computed(() => currentTrendIndex.value > 0)
const hasNextTrendStock = computed(
  () => currentTrendIndex.value >= 0 && currentTrendIndex.value < rows.value.length - 1,
)
const trendNavPositionText = computed(() => {
  if (currentTrendIndex.value < 0 || !rows.value.length) return '- / -'
  return `${currentTrendIndex.value + 1} / ${rows.value.length}`
})
const skippedText = computed(() => {
  const skipped = data.value?.skipped
  if (!skipped) return '-'
  return [
    `市值门槛 ${skipped.pool_gate ?? 0}`,
    `涨幅粗筛 ${skipped.latest_strength_gate ?? 0}`,
    `条件不足 ${skipped.condition_miss ?? 0}`,
  ].join(' / ')
})

useAiPageData(() => ({
  title: '箱体整理放量突破选股',
  summary: `按主板、低价、小市值股票池筛选，至少命中 ${query.min_match_count}/8 条形态条件。`,
  data: data.value,
}))

function buildParams(): BoxBreakoutCandidatesParams {
  return {
    trade_date: query.trade_date || undefined,
    min_match_count: query.min_match_count,
    limit: query.limit,
    codes: query.codes || undefined,
    include_failed: query.include_failed,
    min_box_days: query.min_box_days,
  }
}

async function loadData() {
  const requestId = ++latestRequestId
  loading.value = true
  try {
    const result = await getBoxBreakoutCandidates(buildParams())
    if (requestId === latestRequestId) {
      data.value = result
    }
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function disableFutureDate(date: Date) {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date.getTime() > today.getTime()
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return Number(value).toFixed(digits)
}

function formatHoldingReturn(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  const number = Number(value)
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}

function holdingReturnClass(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'is-pending'
  if (Number(value) > 0) return 'is-positive'
  if (Number(value) < 0) return 'is-negative'
  return 'is-flat'
}

function formatConditionValue(value: unknown) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'string' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${item ?? '-'}`)
      .join('；')
  }
  return String(value)
}

function parseCompactDate(dateText: string): Date | null {
  const digits = String(dateText || '').replace(/[^0-9]/g, '')
  if (digits.length !== 8) return null
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

function formatDate(date: Date, separator = '-') {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return [year, month, day].join(separator)
}

function formatDisplayDate(dateText: string) {
  const date = parseCompactDate(dateText)
  return date ? formatDate(date) : dateText || '-'
}

function shiftCalendarMonths(date: Date, months: number) {
  const shifted = new Date(date.getFullYear(), date.getMonth(), 1)
  shifted.setMonth(shifted.getMonth() + months)
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate()
  shifted.setDate(Math.min(date.getDate(), lastDay))
  return shifted
}

function shiftCalendarDays(date: Date, days: number) {
  const shifted = new Date(date)
  shifted.setDate(shifted.getDate() + days)
  return shifted
}

function shiftWeekdays(date: Date, tradingDays: number) {
  const shifted = new Date(date)
  let remainingDays = Math.max(0, Math.trunc(tradingDays))
  while (remainingDays > 0) {
    shifted.setDate(shifted.getDate() - 1)
    const weekday = shifted.getDay()
    if (weekday !== 0 && weekday !== 6) remainingDays -= 1
  }
  return shifted
}

function setTrendDateRange(row: BoxBreakoutCandidateItem, observationDate: string) {
  const observedAt = parseCompactDate(observationDate)
  if (!observedAt) {
    trendDateRange.start = ''
    trendDateRange.end = ''
    return false
  }
  // 后端返回的箱体起点来自真实交易日序列，优先使用它以准确跨过周末和休市日。
  // 旧数据缺少起点时，按工作日回推箱体大小作为兼容兜底。
  const boxStartedAt = parseCompactDate(row.box?.start_date)
    ?? shiftWeekdays(observedAt, row.box?.days ?? 0)
  trendDateRange.start = formatDate(shiftCalendarDays(boxStartedAt, -30))
  trendDateRange.end = formatDate(shiftCalendarMonths(observedAt, 1))
  return true
}

async function requestTrendHistoryData() {
  const candidateCodes = [selectedTrendStock.tsCode, selectedTrendStock.code].filter(
    (value, index, array): value is string => Boolean(value) && array.indexOf(value) === index,
  )
  let lastError: unknown = null

  for (const code of candidateCodes) {
    try {
      return await fetchStockHistoryData(
        code,
        trendDateRange.start.replace(/-/g, ''),
        trendDateRange.end.replace(/-/g, ''),
        'qfq',
      )
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

async function loadTrendData() {
  const requestId = ++trendRequestId
  trendLoading.value = true
  try {
    const result = await requestTrendHistoryData()
    if (requestId !== trendRequestId) return
    trendData.value = [...result].sort((left, right) => left.date.localeCompare(right.date))
  } catch (error) {
    if (requestId !== trendRequestId) return
    console.error('加载箱体突破股票趋势图失败:', error)
    trendData.value = []
    ElMessage.error('加载股票趋势图失败，请稍后重试')
  } finally {
    if (requestId === trendRequestId) trendLoading.value = false
  }
}

function showTrendStock(row: BoxBreakoutCandidateItem) {
  const observationDate = row.trade_date || data.value?.trade_date || query.trade_date
  if (!observationDate || !setTrendDateRange(row, observationDate)) {
    ElMessage.warning('当前记录缺少有效的观察日期，无法加载趋势图')
    return false
  }

  selectedTrendCandidate.value = row
  selectedTrendStock.code = row.stock_code
  selectedTrendStock.tsCode = row.ts_code
  selectedTrendStock.name = row.stock_name
  selectedTrendStock.industry = row.industry || ''
  selectedTrendStock.observationDate = observationDate
  trendData.value = []
  loadTrendData()
  return true
}

function openTrendDialog(row: BoxBreakoutCandidateItem) {
  const rowIndex = rows.value.findIndex((item) => item.stock_code === row.stock_code)
  if (!showTrendStock(row)) return
  currentTrendIndex.value = rowIndex
  trendDialogVisible.value = true
}

function stepTrendStock(step: -1 | 1) {
  const nextIndex = currentTrendIndex.value + step
  const targetRow = rows.value[nextIndex]
  if (!targetRow || !showTrendStock(targetRow)) return
  currentTrendIndex.value = nextIndex
}

function handleTrendDialogClosed() {
  trendRequestId += 1
  trendLoading.value = false
  trendData.value = []
  selectedTrendCandidate.value = null
  currentTrendIndex.value = -1
}

onMounted(() => {
  loadData()
})

watch(
  () => query.trade_date,
  () => {
    loadData()
  },
)
</script>

<style scoped>
.box-breakout-page {
  min-height: 100%;
  padding: 18px;
  background: #f5f7fb;
  color: #1f2937;
}

.toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
}

.toolbar-main {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}

.control {
  display: grid;
  gap: 6px;
  width: 150px;
}

.control.compact {
  width: 118px;
}

.control.codes {
  width: 220px;
}

.date-picker {
  width: 100%;
}

.control-label {
  font-size: 12px;
  color: #64748b;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr)) minmax(260px, 2fr);
  gap: 10px;
  margin: 14px 0;
}

.summary-item {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
}

.summary-item span {
  font-size: 12px;
  color: #64748b;
}

.summary-item strong {
  font-size: 18px;
  color: #111827;
}

.summary-item.wide strong {
  font-size: 14px;
}

.notice {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
  padding: 10px 12px;
  border-left: 4px solid #d97706;
  background: #fff7ed;
  color: #9a3412;
  font-size: 13px;
}

.table-section {
  border: 1px solid #d8dee9;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
}

.candidate-table {
  width: 100%;
}

.date-cell,
.metric-cell {
  display: grid;
  gap: 3px;
  line-height: 1.35;
}

.date-cell em,
.metric-cell span {
  font-style: normal;
  font-size: 12px;
  color: #64748b;
}

.condition-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.holding-return-cell {
  display: grid;
  gap: 5px;
  line-height: 1.3;
}

.holding-buy-line,
.holding-pending {
  color: #64748b;
  font-size: 11px;
}

.holding-return-values {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
}

.holding-return-values > span {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.holding-return-values em {
  color: #94a3b8;
  font-size: 10px;
  font-style: normal;
}

.holding-return-values strong {
  font-size: 12px;
  white-space: nowrap;
}

.holding-return-values .is-positive {
  color: #dc2626;
}

.holding-return-values .is-negative {
  color: #16a34a;
}

.holding-return-values .is-flat,
.holding-return-values .is-pending {
  color: #64748b;
}

.expanded {
  display: grid;
  gap: 12px;
  padding: 10px 18px 16px;
  background: #f8fafc;
}

.expanded-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 10px;
}

.expanded-grid > div {
  display: grid;
  gap: 4px;
  padding: 10px;
  border-left: 3px solid #2563eb;
  background: #ffffff;
}

.expanded-grid span {
  font-size: 12px;
  color: #64748b;
}

.expanded-grid strong {
  font-size: 13px;
  color: #111827;
}

.condition-detail-table {
  width: 100%;
}

.trend-dialog-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trend-dialog-title {
  color: #111827;
  font-size: 18px;
  font-weight: 600;
}

.trend-dialog-subtitle {
  color: #64748b;
  font-size: 13px;
}

.trend-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trend-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.trend-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trend-nav {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 8px;
}

.trend-nav-position {
  min-width: 58px;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

.trend-preview {
  min-height: 420px;
}

.trend-condition-panel {
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

.trend-condition-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.trend-condition-heading h3,
.trend-condition-heading p {
  margin: 0;
}

.trend-condition-heading h3 {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
}

.trend-condition-heading p {
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
}

.trend-condition-heading > strong {
  color: #1d4ed8;
  font-size: 14px;
}

.trend-condition-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.trend-condition-item {
  min-width: 0;
  padding: 11px 12px 12px;
  border: 1px solid #e2e8f0;
  border-left-width: 3px;
  background: #ffffff;
}

.trend-condition-item.is-passed {
  border-left-color: #16a34a;
}

.trend-condition-item.is-failed {
  border-left-color: #dc2626;
}

.trend-condition-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.trend-condition-key {
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}

.trend-condition-name {
  display: block;
  margin-top: 8px;
  color: #1f2937;
  font-size: 14px;
  line-height: 1.35;
}

.trend-condition-values {
  display: grid;
  gap: 5px;
  margin: 10px 0 0;
}

.trend-condition-values > div {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 8px;
}

.trend-condition-values dt,
.trend-condition-values dd {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
}

.trend-condition-values dt {
  color: #94a3b8;
}

.trend-condition-values dd {
  overflow-wrap: anywhere;
  color: #475569;
}

.trend-condition-description {
  margin: 9px 0 0;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .box-breakout-page {
    padding: 12px;
  }

  .toolbar {
    display: grid;
  }

  .control,
  .control.compact,
  .control.codes {
    width: 100%;
  }

  .toolbar-main,
  .summary-strip,
  .expanded-grid {
    grid-template-columns: 1fr;
  }

  .summary-strip {
    display: grid;
  }

  .trend-preview {
    min-height: 300px;
  }

  .trend-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .trend-nav {
    justify-content: space-between;
    width: 100%;
  }

  .trend-condition-grid {
    grid-template-columns: 1fr;
  }
}
</style>

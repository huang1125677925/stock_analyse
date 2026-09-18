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

        <div class="trend-preview" v-loading="trendLoading">
          <StockKLineChart
            v-if="trendData.length"
            :stock-code="selectedTrendStock.tsCode || selectedTrendStock.code"
            :stock-name="selectedTrendStock.name"
            :kline-data="trendData"
            :event-lines="trendEventLines"
            height="420px"
          />
          <el-empty
            v-else-if="!trendLoading"
            description="观察日前3个月至后1个月区间暂无K线数据"
            :image-size="80"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
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
const latestTrendPoint = computed(() =>
  trendData.value.length ? trendData.value[trendData.value.length - 1] : null,
)
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

function setTrendDateRange(observationDate: string) {
  const observedAt = parseCompactDate(observationDate)
  if (!observedAt) {
    trendDateRange.start = ''
    trendDateRange.end = ''
    return false
  }
  trendDateRange.start = formatDate(shiftCalendarMonths(observedAt, -3))
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

function openTrendDialog(row: BoxBreakoutCandidateItem) {
  const observationDate = row.trade_date || data.value?.trade_date || query.trade_date
  if (!observationDate || !setTrendDateRange(observationDate)) {
    ElMessage.warning('当前记录缺少有效的观察日期，无法加载趋势图')
    return
  }

  selectedTrendStock.code = row.stock_code
  selectedTrendStock.tsCode = row.ts_code
  selectedTrendStock.name = row.stock_name
  selectedTrendStock.industry = row.industry || ''
  selectedTrendStock.observationDate = observationDate
  trendData.value = []
  trendDialogVisible.value = true
  loadTrendData()
}

function handleTrendDialogClosed() {
  trendRequestId += 1
  trendLoading.value = false
  trendData.value = []
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

.trend-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trend-preview {
  min-height: 420px;
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
}
</style>

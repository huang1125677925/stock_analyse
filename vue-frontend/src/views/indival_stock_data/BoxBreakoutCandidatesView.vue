<template>
  <div class="box-breakout-page">
    <section class="toolbar">
      <div class="toolbar-main">
        <div class="control category-control">
          <span class="control-label">市场类别</span>
          <el-segmented v-model="query.market_category" :options="marketCategoryOptions" />
        </div>
        <div class="control trade-date-control">
          <span class="control-label">观察日期</span>
          <div class="trade-date-selector">
            <el-button
              :icon="ArrowLeft"
              :loading="dateShiftLoading === -1"
              :disabled="loading || dateShiftLoading !== 0 || !effectiveTradeDate"
              title="上一个交易日"
              aria-label="切换到上一个交易日"
              @click="shiftObservationDate(-1)"
            >
              <span class="date-nav-label">上一日</span>
            </el-button>
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
            <el-button
              :loading="dateShiftLoading === 1"
              :disabled="loading || dateShiftLoading !== 0 || !effectiveTradeDate"
              title="下一个交易日"
              aria-label="切换到下一个交易日"
              @click="shiftObservationDate(1)"
            >
              <span class="date-nav-label">下一日</span>
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
        <div class="control compact">
          <span class="control-label">箱体天数</span>
          <el-input-number v-model="query.min_box_days" :min="10" :max="70" />
        </div>
        <div class="control compact">
          <span class="control-label">信号回看</span>
          <el-input-number v-model="query.signal_lookback_days" :min="1" :max="10" />
        </div>
        <div class="control compact">
          <span class="control-label">返回数</span>
          <el-input-number v-model="query.limit" :min="1" :max="500" />
        </div>
        <el-switch v-model="query.include_failed" active-text="包含失效" />
      </div>
      <el-button type="primary" :loading="loading" @click="loadData"> 开始筛选 </el-button>
    </section>

    <section class="summary-strip">
      <div class="summary-item">
        <span>观察日</span>
        <strong>{{ data?.trade_date || '-' }}</strong>
      </div>
      <div class="summary-item compact-value">
        <span>信号窗口</span>
        <strong>{{ signalWindowText }}</strong>
      </div>
      <div class="summary-item">
        <span>筛选通过</span>
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
                  <span>观察日 / 突破日</span>
                  <strong>{{ row.observation_date }} / {{ row.breakout_date }}</strong>
                </div>
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
                  <span>突破 / 观察收盘</span>
                  <strong>
                    {{ formatNumber(row.breakout_close) }} /
                    {{ formatNumber(row.latest_close) }}
                  </strong>
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
        <el-table-column label="市场类别" width="120">
          <template #default="{ row }">
            <div class="market-cell">
              <strong>{{ row.board_name }}</strong>
              <span>{{ row.exchange }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="东财二级行业" min-width="150">
          <template #default="{ row }">
            <div v-if="row.industry" class="industry-cell">
              <strong>{{ row.industry }}</strong>
              <span>{{ row.industry_code || '代码未匹配' }}</span>
            </div>
            <span v-else class="industry-unmapped">未匹配</span>
          </template>
        </el-table-column>
        <el-table-column label="命中" width="96" align="center">
          <template #default="{ row }">
            <el-tag :type="row.match_count >= 8 ? 'success' : 'warning'" effect="dark">
              {{ row.match_count }}/8
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="突破信号" width="150">
          <template #default="{ row }">
            <div class="signal-cell">
              <strong>{{ row.breakout_date }}</strong>
              <el-tag :type="signalStatusType(row.signal_status)" effect="plain" size="small">
                {{ row.signal_status_label }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="买入判断" width="130" align="center">
          <template #default="{ row }">
            <div class="buy-status-cell">
              <el-tag
                v-if="buyAnalysisState(row)?.data"
                :type="buyStatusTagType(buyAnalysisState(row)?.data?.status)"
                effect="dark"
              >
                {{ buyAnalysisState(row)?.data?.status_label }}
              </el-tag>
              <el-tag v-else-if="buyAnalysisState(row)?.loading" type="info" effect="plain">
                分析中
              </el-tag>
              <el-tag v-else-if="buyAnalysisState(row)?.error" type="danger" effect="plain">
                分析失败
              </el-tag>
              <span v-if="buyAnalysisState(row)?.data?.score != null">
                {{ buyAnalysisState(row)?.data?.score ?? '-' }}/100
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="观察收盘/市值" width="140">
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
                <span v-for="item in row.post_performance?.returns || []" :key="item.holding_days">
                  <em>{{ item.holding_days }}日</em>
                  <strong :class="holdingReturnClass(item.return_pct)">
                    {{ formatHoldingReturn(item.return_pct) }}
                  </strong>
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="8 条条件（全部满足）" min-width="380">
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
            <el-tag type="success" effect="light">
              {{ selectedTrendStock.boardName }}
            </el-tag>
            <el-tag v-if="selectedTrendStock.industry" type="warning" effect="light">
              {{ selectedTrendStock.industry }} {{ selectedTrendStock.industryCode }}
            </el-tag>
            <el-tag type="danger" effect="light">
              突破日 {{ formatDisplayDate(selectedTrendStock.breakoutDate) }}
            </el-tag>
            <el-tag
              v-if="selectedTrendStock.observationDate !== selectedTrendStock.breakoutDate"
              type="primary"
              effect="light"
            >
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

        <section class="buy-analysis-panel" v-loading="selectedBuyAnalysisState?.loading">
          <div class="buy-analysis-heading">
            <div>
              <h3>观察日买入判断</h3>
              <p>个股 60 分、行业 20 分、大盘 20 分，达到 65 分且无硬性拒绝项</p>
            </div>
            <el-tag
              v-if="selectedBuyAnalysisState?.data"
              :type="buyStatusTagType(selectedBuyAnalysisState.data.status)"
              effect="dark"
              size="large"
            >
              {{ selectedBuyAnalysisState.data.status_label }}
              <template v-if="selectedBuyAnalysisState.data.score !== null">
                {{ selectedBuyAnalysisState.data.score }}/100
              </template>
            </el-tag>
          </div>

          <template v-if="selectedBuyAnalysisState?.data">
            <p class="buy-analysis-summary">{{ selectedBuyAnalysisState.data.summary }}</p>
            <div v-if="buyAnalysisDimensions.length" class="buy-dimension-strip">
              <div v-for="dimension in buyAnalysisDimensions" :key="dimension.name">
                <span>{{ dimension.name }}</span>
                <strong>{{ dimension.score }}/{{ dimension.max_score }}</strong>
              </div>
            </div>
            <div class="buy-reason-grid">
              <div class="buy-reason-group is-support">
                <h4>支持理由</h4>
                <p
                  v-for="reason in selectedBuyAnalysisState.data.support_reasons"
                  :key="`support-${reason}`"
                >
                  {{ reason }}
                </p>
                <span v-if="!selectedBuyAnalysisState.data.support_reasons.length">暂无</span>
              </div>
              <div class="buy-reason-group is-reject">
                <h4>拒绝与风险理由</h4>
                <p
                  v-for="reason in selectedBuyAnalysisState.data.reject_reasons"
                  :key="`reject-${reason}`"
                  :class="{
                    'is-hard-reject':
                      selectedBuyAnalysisState.data.hard_reject_reasons.includes(reason),
                  }"
                >
                  {{ reason }}
                </p>
                <span v-if="!selectedBuyAnalysisState.data.reject_reasons.length">暂无</span>
              </div>
            </div>
          </template>
          <el-empty
            v-else-if="selectedBuyAnalysisState?.error"
            :description="selectedBuyAnalysisState.error"
            :image-size="64"
          />
          <p v-else class="buy-analysis-pending">买入判断正在排队分析</p>
        </section>

        <section class="trend-chart-section">
          <div class="trend-chart-heading">
            <div>
              <h3>个股走势</h3>
              <p>{{ selectedTrendStock.name }} · {{ selectedTrendStock.code }}</p>
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
        </section>

        <section class="trend-chart-section market-trend-section">
          <div class="trend-chart-heading">
            <div>
              <h3>对应大盘走势</h3>
              <p>
                {{ selectedTrendStock.marketIndexName }} · {{ selectedTrendStock.marketIndexCode }}
              </p>
            </div>
          </div>
          <div class="trend-preview market-trend-preview" v-loading="marketTrendLoading">
            <StockKLineChart
              v-if="marketTrendData.length"
              :stock-code="selectedTrendStock.marketIndexCode"
              :stock-name="selectedTrendStock.marketIndexName"
              :kline-data="marketTrendData"
              :event-lines="trendEventLines"
              show-volume
              height="420px"
            />
            <el-empty
              v-else-if="!marketTrendLoading"
              description="该日期区间暂无对应大盘K线数据"
              :image-size="80"
            />
          </div>
        </section>

        <section class="trend-chart-section industry-trend-section">
          <div class="trend-chart-heading">
            <div>
              <h3>所属东财二级行业走势</h3>
              <p v-if="selectedTrendStock.industry">
                {{ selectedTrendStock.industry }} · {{ selectedTrendStock.industryCode }}
              </p>
              <p v-else>当前股票未匹配到本地东财二级行业</p>
            </div>
          </div>
          <div class="trend-preview industry-trend-preview" v-loading="industryTrendLoading">
            <StockKLineChart
              v-if="industryTrendData.length"
              :stock-code="selectedTrendStock.industryCode"
              :stock-name="selectedTrendStock.industry"
              :kline-data="industryTrendData"
              :event-lines="trendEventLines"
              show-volume
              height="420px"
            />
            <el-empty
              v-else-if="!industryTrendLoading"
              :description="
                selectedTrendStock.industryCode
                  ? '该日期区间暂无行业K线数据'
                  : '未匹配到东财二级行业代码'
              "
              :image-size="80"
            />
          </div>
        </section>

        <section v-if="selectedTrendConditions.length" class="trend-condition-panel">
          <div class="trend-condition-heading">
            <div>
              <h3>条件状态</h3>
              <p>突破日 C1-C8 全部满足后通过筛选</p>
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
                <span class="trend-condition-key">
                  {{ condition.key.toUpperCase() }}
                </span>
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
import { fetchDcDaily } from '@/services/dcDailyApi'
import { fetchIndexDailyKline } from '@/services/indexDailyApi'
import { fetchStockHistoryData, type StockHistoryDataItem } from '@/services/stockHistoryApi'
import {
  getBoxBreakoutBuyAnalysis,
  getBoxBreakoutCandidates,
  type BoxBreakoutBuyAnalysis,
  type BoxBreakoutBuyStatus,
  type BoxBreakoutCandidateItem,
  type BoxBreakoutCandidatesData,
  type BoxBreakoutMarketCategory,
  type BoxBreakoutCandidatesParams,
} from '@/services/strategyApi'

const loading = ref(false)
const dateShiftLoading = ref<-1 | 0 | 1>(0)
const data = ref<BoxBreakoutCandidatesData | null>(null)
let latestRequestId = 0
let trendRequestId = 0
let industryTrendRequestId = 0
let marketTrendRequestId = 0
let buyAnalysisBatchId = 0

interface BuyAnalysisState {
  loading: boolean
  data: BoxBreakoutBuyAnalysis | null
  error: string
}

const buyAnalysisStates = ref<Record<string, BuyAnalysisState>>({})
const query = reactive<
  Required<
    Pick<
      BoxBreakoutCandidatesParams,
      'limit' | 'include_failed' | 'min_box_days' | 'signal_lookback_days' | 'market_category'
    >
  > & {
    trade_date: string
  }
>({
  trade_date: '',
  market_category: 'main_board',
  limit: 100,
  include_failed: false,
  min_box_days: 20,
  signal_lookback_days: 3,
})
const marketCategoryOptions: Array<{ label: string; value: BoxBreakoutMarketCategory }> = [
  { label: '主板', value: 'main_board' },
  { label: '科创板', value: 'star_market' },
  { label: '创业板', value: 'chinext' },
]

const rows = computed<BoxBreakoutCandidateItem[]>(() => data.value?.data ?? [])
const effectiveTradeDate = computed(() => query.trade_date || data.value?.trade_date || '')
const trendDialogVisible = ref(false)
const trendLoading = ref(false)
const trendData = ref<StockHistoryDataItem[]>([])
const industryTrendLoading = ref(false)
const industryTrendData = ref<StockHistoryDataItem[]>([])
const marketTrendLoading = ref(false)
const marketTrendData = ref<StockHistoryDataItem[]>([])
const trendDateRange = reactive({ start: '', end: '' })
const selectedTrendCandidate = ref<BoxBreakoutCandidateItem | null>(null)
const currentTrendIndex = ref(-1)
const selectedTrendStock = reactive({
  code: '',
  tsCode: '',
  name: '',
  boardName: '',
  marketIndexCode: '',
  marketIndexName: '',
  industry: '',
  industryCode: '',
  breakoutDate: '',
  observationDate: '',
})
const trendEventLines = computed(() => {
  const lines = []
  if (selectedTrendStock.breakoutDate) {
    lines.push({ date: selectedTrendStock.breakoutDate, label: '突破日', color: '#dc2626' })
  }
  if (
    selectedTrendStock.observationDate &&
    selectedTrendStock.observationDate !== selectedTrendStock.breakoutDate
  ) {
    lines.push({ date: selectedTrendStock.observationDate, label: '观察日', color: '#2563eb' })
  }
  return lines
})
const trendPriceRanges = computed(() => {
  const box = selectedTrendCandidate.value?.box
  if (!box?.start_date || !box?.end_date) return []
  return [
    {
      startDate: box.start_date,
      endDate: box.end_date,
      label: `箱体 ${box.days}个交易日`,
      low: box.low_close,
      high: box.high_close,
      color: '#2563eb',
    },
  ]
})
const latestTrendPoint = computed(() =>
  trendData.value.length ? trendData.value[trendData.value.length - 1] : null,
)
const selectedTrendConditions = computed(() => selectedTrendCandidate.value?.conditions ?? [])
const selectedBuyAnalysisState = computed(() => {
  const candidate = selectedTrendCandidate.value
  return candidate ? buyAnalysisStates.value[buyAnalysisKey(candidate)] : undefined
})
const buyAnalysisDimensions = computed(() => {
  const dimensions = selectedBuyAnalysisState.value?.data?.dimensions
  if (!dimensions) return []
  return [dimensions.stock, dimensions.industry, dimensions.market].filter(
    (dimension): dimension is NonNullable<typeof dimension> => Boolean(dimension),
  )
})
const hasPrevTrendStock = computed(() => currentTrendIndex.value > 0)
const hasNextTrendStock = computed(
  () => currentTrendIndex.value >= 0 && currentTrendIndex.value < rows.value.length - 1,
)
const trendNavPositionText = computed(() => {
  if (currentTrendIndex.value < 0 || !rows.value.length) return '- / -'
  return `${currentTrendIndex.value + 1} / ${rows.value.length}`
})
const signalWindowText = computed(() => {
  const dates = data.value?.signal_window?.trade_dates ?? []
  if (!dates.length) return `${query.signal_lookback_days} 个交易日`
  const newest = dates[0]
  const oldest = dates[dates.length - 1]
  return dates.length === 1 ? newest : `${oldest} ~ ${newest}`
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
  summary: `按${data.value?.market_category_name || '主板'}、低价、小市值股票池筛选，C1-C8 全部满足后输出。`,
  data: data.value,
}))

function buildParams(): BoxBreakoutCandidatesParams {
  return {
    trade_date: query.trade_date || undefined,
    market_category: query.market_category,
    limit: query.limit,
    include_failed: query.include_failed,
    min_box_days: query.min_box_days,
    signal_lookback_days: query.signal_lookback_days,
  }
}

function buyAnalysisKey(row: BoxBreakoutCandidateItem) {
  return `${row.ts_code}:${row.observation_date || row.trade_date}:${row.breakout_date}`
}

function buyAnalysisState(row: BoxBreakoutCandidateItem) {
  return buyAnalysisStates.value[buyAnalysisKey(row)]
}

function buyStatusTagType(status: BoxBreakoutBuyStatus | undefined) {
  if (status === 'supported') return 'success'
  if (status === 'rejected') return 'danger'
  return 'info'
}

async function loadBuyAnalyses(candidates: BoxBreakoutCandidateItem[]) {
  const batchId = ++buyAnalysisBatchId
  buyAnalysisStates.value = Object.fromEntries(
    candidates.map((row) => [
      buyAnalysisKey(row),
      { loading: true, data: null, error: '' } satisfies BuyAnalysisState,
    ]),
  )

  for (const row of candidates) {
    if (batchId !== buyAnalysisBatchId) return
    const key = buyAnalysisKey(row)
    try {
      const result = await getBoxBreakoutBuyAnalysis({
        ts_code: row.ts_code,
        observation_date: row.observation_date || row.trade_date,
        breakout_date: row.breakout_date,
        industry_code: row.industry_code || undefined,
        market_index_code: row.market_index_code,
        market_category: row.market_category,
      })
      if (batchId !== buyAnalysisBatchId) return
      buyAnalysisStates.value[key] = { loading: false, data: result, error: '' }
    } catch (error) {
      if (batchId !== buyAnalysisBatchId) return
      console.error(`加载 ${row.ts_code} 买入判断失败:`, error)
      buyAnalysisStates.value[key] = {
        loading: false,
        data: null,
        error: '买入判断加载失败，请稍后重新筛选',
      }
    }
  }
}

async function loadData() {
  const requestId = ++latestRequestId
  buyAnalysisBatchId += 1
  buyAnalysisStates.value = {}
  loading.value = true
  try {
    const result = await getBoxBreakoutCandidates(buildParams())
    if (requestId === latestRequestId) {
      data.value = result
      void loadBuyAnalyses(result.data || [])
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

async function shiftObservationDate(direction: -1 | 1) {
  const baseDate = parseCompactDate(effectiveTradeDate.value)
  if (!baseDate || dateShiftLoading.value !== 0) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const rangeStart = shiftCalendarDays(baseDate, -20)
  const rangeEnd =
    direction === 1
      ? new Date(Math.min(shiftCalendarDays(baseDate, 20).getTime(), today.getTime()))
      : baseDate

  dateShiftLoading.value = direction
  try {
    const calendarRows = await fetchIndexDailyKline(
      '000001.SH',
      formatDate(rangeStart, ''),
      formatDate(rangeEnd, ''),
    )
    const baseDateText = formatDate(baseDate, '')
    const tradeDates = [
      ...new Set(
        calendarRows
          .map((item) => String(item.date || '').replace(/[^0-9]/g, ''))
          .filter((date) => date.length === 8),
      ),
    ].sort()
    const earlierTradeDates = tradeDates.filter((date) => date < baseDateText)
    const targetDate =
      direction === -1
        ? earlierTradeDates[earlierTradeDates.length - 1]
        : tradeDates.find((date) => date > baseDateText)

    if (!targetDate) {
      ElMessage.info(direction === 1 ? '已经是最新交易日' : '未找到上一个交易日')
      return
    }
    query.trade_date = targetDate
  } catch (error) {
    console.error('切换箱体突破观察日期失败:', error)
    ElMessage.error('获取相邻交易日失败，请稍后重试')
  } finally {
    dateShiftLoading.value = 0
  }
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

function signalStatusType(status: BoxBreakoutCandidateItem['signal_status']) {
  if (status === 'new_breakout') return 'danger'
  if (status === 'valid_follow_up') return 'success'
  if (status === 'warning') return 'warning'
  return 'info'
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
  const boxStartedAt =
    parseCompactDate(row.box?.start_date) ?? shiftWeekdays(observedAt, row.box?.days ?? 0)
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

function numericValue(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

async function loadIndustryTrendData() {
  const requestId = ++industryTrendRequestId
  industryTrendData.value = []
  if (!selectedTrendStock.industryCode || !trendDateRange.start || !trendDateRange.end) {
    industryTrendLoading.value = false
    return
  }

  industryTrendLoading.value = true
  try {
    const result = await fetchDcDaily({
      ts_code: selectedTrendStock.industryCode,
      idx_type: '行业板块',
      start_date: trendDateRange.start.replace(/-/g, ''),
      end_date: trendDateRange.end.replace(/-/g, ''),
      fields:
        'ts_code,trade_date,open,high,low,close,change,pct_change,vol,amount,swing,turnover_rate',
    })
    if (requestId !== industryTrendRequestId) return
    industryTrendData.value = [...(result.records || [])]
      .sort((left, right) => left.trade_date.localeCompare(right.trade_date))
      .map((item) => ({
        stock_code: item.ts_code,
        stock_name: selectedTrendStock.industry,
        date: item.trade_date,
        open_price: numericValue(item.open),
        close_price: numericValue(item.close),
        high_price: numericValue(item.high),
        low_price: numericValue(item.low),
        change_percent: numericValue(item.pct_change),
        change_amount: numericValue(item.change),
        volume: numericValue(item.vol),
        amount: numericValue(item.amount),
        amplitude: numericValue(item.swing),
        turnover_rate: numericValue(item.turnover_rate),
        created_at: '',
      }))
  } catch (error) {
    if (requestId !== industryTrendRequestId) return
    console.error('加载东财二级行业趋势图失败:', error)
    industryTrendData.value = []
    ElMessage.error('加载行业趋势图失败，请稍后重试')
  } finally {
    if (requestId === industryTrendRequestId) industryTrendLoading.value = false
  }
}

async function loadMarketTrendData() {
  const requestId = ++marketTrendRequestId
  marketTrendData.value = []
  if (!selectedTrendStock.marketIndexCode || !trendDateRange.start || !trendDateRange.end) {
    marketTrendLoading.value = false
    return
  }

  marketTrendLoading.value = true
  try {
    const result = await fetchIndexDailyKline(
      selectedTrendStock.marketIndexCode,
      trendDateRange.start.replace(/-/g, ''),
      trendDateRange.end.replace(/-/g, ''),
    )
    if (requestId !== marketTrendRequestId) return
    const sorted = [...result].sort((left, right) => left.date.localeCompare(right.date))
    marketTrendData.value = sorted.map((item, index) => {
      const previousClose = index > 0 ? numericValue(sorted[index - 1]?.close) : 0
      const close = numericValue(item.close)
      const changeAmount = previousClose > 0 ? close - previousClose : 0
      return {
        stock_code: selectedTrendStock.marketIndexCode,
        stock_name: selectedTrendStock.marketIndexName,
        date: item.date,
        open_price: numericValue(item.open),
        close_price: close,
        high_price: numericValue(item.high),
        low_price: numericValue(item.low),
        change_percent: previousClose > 0 ? (changeAmount / previousClose) * 100 : 0,
        change_amount: changeAmount,
        volume: numericValue(item.vol),
        amount: numericValue(item.amount),
        amplitude:
          previousClose > 0
            ? ((numericValue(item.high) - numericValue(item.low)) / previousClose) * 100
            : 0,
        turnover_rate: 0,
        created_at: '',
      }
    })
  } catch (error) {
    if (requestId !== marketTrendRequestId) return
    console.error('加载对应大盘趋势图失败:', error)
    marketTrendData.value = []
    ElMessage.error('加载大盘趋势图失败，请稍后重试')
  } finally {
    if (requestId === marketTrendRequestId) marketTrendLoading.value = false
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
  selectedTrendStock.boardName = row.board_name
  selectedTrendStock.marketIndexCode = row.market_index_code
  selectedTrendStock.marketIndexName = row.market_index_name
  selectedTrendStock.industry = row.industry || ''
  selectedTrendStock.industryCode = row.industry_code || ''
  selectedTrendStock.breakoutDate = row.breakout_date
  selectedTrendStock.observationDate = observationDate
  trendData.value = []
  industryTrendData.value = []
  marketTrendData.value = []
  loadTrendData()
  loadMarketTrendData()
  loadIndustryTrendData()
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
  industryTrendRequestId += 1
  marketTrendRequestId += 1
  trendLoading.value = false
  industryTrendLoading.value = false
  marketTrendLoading.value = false
  trendData.value = []
  industryTrendData.value = []
  marketTrendData.value = []
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

watch(
  () => query.market_category,
  () => {
    trendDialogVisible.value = false
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

.control.category-control {
  width: 270px;
}

.control.trade-date-control {
  width: 404px;
}

.trade-date-selector {
  display: grid;
  grid-template-columns: auto minmax(150px, 1fr) auto;
  gap: 6px;
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
  grid-template-columns: repeat(5, minmax(120px, 1fr)) minmax(260px, 2fr);
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

.summary-item.compact-value strong {
  font-size: 13px;
  line-height: 1.4;
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

.metric-cell {
  display: grid;
  gap: 3px;
  line-height: 1.35;
}

.signal-cell {
  display: grid;
  justify-items: start;
  gap: 5px;
  line-height: 1.35;
}

.signal-cell strong {
  color: #1f2937;
  font-size: 13px;
}

.buy-status-cell {
  display: grid;
  justify-items: center;
  gap: 4px;
}

.buy-status-cell span {
  color: #64748b;
  font-size: 11px;
}

.industry-cell,
.market-cell {
  display: grid;
  gap: 3px;
  min-width: 0;
  line-height: 1.35;
}

.industry-cell strong,
.market-cell strong {
  overflow: hidden;
  color: #1f2937;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.industry-cell span,
.market-cell span,
.industry-unmapped {
  color: #64748b;
  font-size: 11px;
}

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

.buy-analysis-panel {
  min-height: 108px;
  padding: 14px 16px;
  border: 1px solid #cbd5e1;
  border-left: 4px solid #2563eb;
  border-radius: 4px;
  background: #f8fafc;
}

.buy-analysis-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.buy-analysis-heading h3,
.buy-analysis-heading p,
.buy-analysis-summary,
.buy-reason-group h4,
.buy-reason-group p {
  margin: 0;
}

.buy-analysis-heading h3 {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
}

.buy-analysis-heading p {
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
}

.buy-analysis-summary {
  margin-top: 12px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.buy-dimension-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #e2e8f0;
}

.buy-dimension-strip > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  background: #ffffff;
}

.buy-dimension-strip span {
  color: #64748b;
  font-size: 12px;
}

.buy-dimension-strip strong {
  color: #1f2937;
  font-size: 13px;
}

.buy-reason-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 14px;
}

.buy-reason-group {
  min-width: 0;
  padding-left: 12px;
  border-left: 3px solid #94a3b8;
}

.buy-reason-group.is-support {
  border-left-color: #16a34a;
}

.buy-reason-group.is-reject {
  border-left-color: #dc2626;
}

.buy-reason-group h4 {
  margin-bottom: 7px;
  color: #1f2937;
  font-size: 13px;
}

.buy-reason-group p,
.buy-reason-group > span {
  display: block;
  color: #475569;
  font-size: 12px;
  line-height: 1.55;
}

.buy-reason-group p::before {
  content: '·';
  margin-right: 6px;
  font-weight: 700;
}

.buy-reason-group p.is-hard-reject {
  color: #b91c1c;
  font-weight: 600;
}

.buy-analysis-pending {
  margin: 18px 0 0;
  color: #64748b;
  font-size: 13px;
}

.trend-preview {
  min-height: 420px;
}

.trend-chart-section {
  min-width: 0;
}

.trend-chart-section + .trend-chart-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

.trend-chart-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.trend-chart-heading h3,
.trend-chart-heading p {
  margin: 0;
}

.trend-chart-heading h3 {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
}

.trend-chart-heading p {
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
}

.industry-trend-preview,
.market-trend-preview {
  min-height: 360px;
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
  .control.trade-date-control {
    width: 100%;
  }

  @media (max-width: 480px) {
    .trade-date-selector {
      grid-template-columns: auto minmax(120px, 1fr) auto;
    }

    .date-nav-label {
      display: none;
    }
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

  .buy-analysis-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .buy-dimension-strip,
  .buy-reason-grid {
    grid-template-columns: 1fr;
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

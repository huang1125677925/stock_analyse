<template>
  <div class="stock-swing-practice-view">
    <el-card shadow="hover" class="config-card">
      <template #header>
        <div class="card-header">
          <div>
            <h2>波段交易参考</h2>
            <p>基于波段分析接口生成趋势、位置、量能、波动和风险提示。</p>
          </div>
          <el-button type="primary" :loading="analysisLoading || klineLoading" :disabled="!canAnalyze" @click="refreshAnalysis">
            刷新参考
          </el-button>
        </div>
      </template>

      <el-form :model="form" label-width="96px">
        <el-row :gutter="16">
          <el-col :xs="24" :md="6">
            <el-form-item label="数据源">
              <el-select v-model="form.dataSource" class="full-width" @change="handleDataSourceChange">
                <el-option label="股票" value="stock" />
                <el-option label="ETF" value="etf" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="10">
            <el-form-item :label="symbolLabel">
              <el-select
                v-model="form.symbol"
                :placeholder="symbolPlaceholder"
                filterable
                remote
                clearable
                class="full-width"
                :loading="symbolLoading"
                :remote-method="handleSymbolInputChange"
                @change="handleSymbolSelect"
              >
                <el-option
                  v-for="item in symbolOptions"
                  :key="item.code"
                  :label="`${item.code} - ${item.name}`"
                  :value="item.code"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="8">
            <el-form-item label="分析区间">
              <div class="range-picker">
                <el-radio-group v-model="dateRangeShortcut" @change="handleDateRangeShortcutChange">
                  <el-radio-button label="1y">最近1年</el-radio-button>
                  <el-radio-button label="3y">最近3年</el-radio-button>
                  <el-radio-button label="5y">最近5年</el-radio-button>
                </el-radio-group>
                <span class="range-text">{{ form.startDate }} 至 {{ form.endDate }}</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="hint-row">
          <el-tag v-if="form.dataSource === 'stock'" type="danger" effect="plain">股票走势使用前复权数据</el-tag>
          <el-tag v-else type="info" effect="plain">ETF 使用原始日线数据</el-tag>
          <span class="hint-text">该页面提供波段交易参考与风险提示，不直接构成买卖建议。</span>
        </div>
      </el-form>
    </el-card>

    <el-empty
      v-if="!form.symbol"
      description="选择股票或 ETF 后，会在这里展示波段交易参考数据"
      :image-size="92"
      class="page-empty"
    />

    <template v-else>
      <el-card shadow="hover" class="preview-card" v-loading="klineLoading">
        <template #header>
          <div class="card-header compact-header">
            <span>{{ klineTitle }}</span>
            <span class="meta-text">{{ form.startDate }} 至 {{ form.endDate }}</span>
          </div>
        </template>

        <StockKLineChart
          v-if="klineData.length"
          :stock-code="form.symbol"
          :stock-name="form.symbolName"
          :kline-data="klineData"
          height="420px"
        />
        <el-empty
          v-else-if="!klineLoading"
          :description="klineError || '当前区间暂无走势图数据'"
          :image-size="80"
        />
      </el-card>

      <el-card shadow="hover" class="reference-card" v-loading="analysisLoading">
        <template #header>
          <div class="card-header compact-header">
            <span>波段参考数据</span>
            <span class="meta-text">{{ analysisMetaText }}</span>
          </div>
        </template>

        <el-empty
          v-if="!analysisData?.analysis && !analysisLoading"
          :description="analysisError || '当前标的暂无波段分析结果'"
          :image-size="80"
        />

        <template v-else-if="analysisSnapshot">
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">波段阶段</span>
              <strong class="summary-value">{{ waveStageLabel }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">交易倾向</span>
              <strong class="summary-value">{{ biasLabel }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">区间涨跌幅</span>
              <strong class="summary-value" :class="valueClass(analysisSnapshot.period_return_pct)">
                {{ formatSignedPercent(analysisSnapshot.period_return_pct) }}
              </strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">当前位置百分位</span>
              <strong class="summary-value">{{ formatPercent(analysisSnapshot.position_percentile) }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">高点回撤</span>
              <strong class="summary-value" :class="valueClass(analysisSnapshot.pullback_from_high_pct)">
                {{ formatSignedPercent(analysisSnapshot.pullback_from_high_pct) }}
              </strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">低点反弹</span>
              <strong class="summary-value" :class="valueClass(analysisSnapshot.rebound_from_low_pct)">
                {{ formatSignedPercent(analysisSnapshot.rebound_from_low_pct) }}
              </strong>
            </div>
          </div>

          <div class="detail-grid">
            <el-card shadow="never" class="detail-item">
              <template #header><span>趋势结构</span></template>
              <div class="kv-grid">
                <div class="kv-item"><span>最新收盘</span><strong>{{ formatPrice(analysisSnapshot.latest_close) }}</strong></div>
                <div class="kv-item"><span>最新交易日</span><strong>{{ analysisSnapshot.latest_trade_date || '-' }}</strong></div>
                <div class="kv-item"><span>MA5</span><strong>{{ formatPrice(analysisSnapshot.ma.ma5) }}</strong></div>
                <div class="kv-item"><span>MA10</span><strong>{{ formatPrice(analysisSnapshot.ma.ma10) }}</strong></div>
                <div class="kv-item"><span>MA20</span><strong>{{ formatPrice(analysisSnapshot.ma.ma20) }}</strong></div>
                <div class="kv-item"><span>MA60</span><strong>{{ formatPrice(analysisSnapshot.ma.ma60) }}</strong></div>
              </div>
            </el-card>

            <el-card shadow="never" class="detail-item">
              <template #header><span>位置与关键价位</span></template>
              <div class="kv-grid">
                <div class="kv-item"><span>区间最高</span><strong>{{ formatPrice(analysisSnapshot.period_high) }}</strong></div>
                <div class="kv-item"><span>最高日期</span><strong>{{ analysisSnapshot.period_high_date || '-' }}</strong></div>
                <div class="kv-item"><span>区间最低</span><strong>{{ formatPrice(analysisSnapshot.period_low) }}</strong></div>
                <div class="kv-item"><span>最低日期</span><strong>{{ analysisSnapshot.period_low_date || '-' }}</strong></div>
                <div class="kv-item"><span>20日支撑</span><strong>{{ formatPrice(analysisSnapshot.levels.support_20d) }}</strong></div>
                <div class="kv-item"><span>20日压力</span><strong>{{ formatPrice(analysisSnapshot.levels.resistance_20d) }}</strong></div>
              </div>
            </el-card>

            <el-card shadow="never" class="detail-item">
              <template #header><span>动量与风险</span></template>
              <div class="kv-grid">
                <div class="kv-item"><span>5日动量</span><strong :class="valueClass(analysisSnapshot.momentum.momentum_5d_pct)">{{ formatSignedPercent(analysisSnapshot.momentum.momentum_5d_pct) }}</strong></div>
                <div class="kv-item"><span>20日动量</span><strong :class="valueClass(analysisSnapshot.momentum.momentum_20d_pct)">{{ formatSignedPercent(analysisSnapshot.momentum.momentum_20d_pct) }}</strong></div>
                <div class="kv-item"><span>ATR14</span><strong>{{ formatPrice(analysisSnapshot.volatility.atr14) }}</strong></div>
                <div class="kv-item"><span>ATR14占比</span><strong>{{ formatPercent(analysisSnapshot.volatility.atr14_pct) }}</strong></div>
                <div class="kv-item"><span>量比(20日)</span><strong>{{ formatNumber(analysisSnapshot.volume.volume_ratio_20) }}</strong></div>
                <div class="kv-item"><span>20日均量</span><strong>{{ formatVolume(analysisSnapshot.volume.avg_vol20) }}</strong></div>
              </div>
            </el-card>
          </div>

          <div class="insight-grid">
            <el-card shadow="never" class="insight-item">
              <template #header><span>交易参考</span></template>
              <div class="pill-row">
                <el-tag type="warning" effect="plain">{{ waveStageLabel }}</el-tag>
                <el-tag :type="biasTagType" effect="plain">{{ biasLabel }}</el-tag>
                <el-tag type="info" effect="plain">{{ analysisData?.data_interface || '-' }}</el-tag>
              </div>
              <ul class="insight-list">
                <li v-for="reason in analysisSnapshot.decision_hint.reasons" :key="reason">{{ reason }}</li>
              </ul>
            </el-card>

            <el-card shadow="never" class="insight-item">
              <template #header><span>风险提示</span></template>
              <ul v-if="analysisSnapshot.decision_hint.risk_flags.length" class="insight-list risk-list">
                <li v-for="risk in analysisSnapshot.decision_hint.risk_flags" :key="risk">{{ risk }}</li>
              </ul>
              <el-empty v-else description="当前接口未返回额外风险提示" :image-size="52" />
            </el-card>
          </div>

          <el-card v-if="analysisData?.theory?.length" shadow="never" class="theory-card">
            <template #header><span>理论依据</span></template>
            <div class="theory-list">
              <div v-for="item in analysisData.theory" :key="item.name" class="theory-item">
                <div class="theory-title">{{ item.name }}</div>
                <div class="theory-basis">{{ item.basis }}</div>
                <div v-if="item.related_fields?.length" class="theory-fields">
                  相关字段：{{ item.related_fields.join(' / ') }}
                </div>
              </div>
            </div>
          </el-card>
        </template>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import StockKLineChart from '@/components/StockKLineChart.vue'
import { getStockList, type StockListParams } from '@/services/individualStockApi'
import { getEtfBasic, getEtfDaily, type EtfBasicItem, type EtfDailyItem } from '@/services/etfApi'
import { fetchStockHistoryData, type StockHistoryDataItem } from '@/services/stockHistoryApi'
import { getSwingAnalysis, type SwingAnalysisData, type SwingAnalysisSnapshot, type SwingTargetType } from '@/services/strategyApi'

type DateRangeShortcut = '1y' | '3y' | '5y'

interface SymbolOption {
  code: string
  name: string
}

interface SwingForm {
  dataSource: SwingTargetType
  symbol: string
  symbolName: string
  startDate: string
  endDate: string
}

const form = reactive<SwingForm>({
  dataSource: 'stock',
  symbol: '',
  symbolName: '',
  startDate: '',
  endDate: ''
})

const symbolOptions = ref<SymbolOption[]>([])
const symbolLoading = ref(false)
const dateRangeShortcut = ref<DateRangeShortcut>('1y')
const klineData = ref<StockHistoryDataItem[]>([])
const klineLoading = ref(false)
const klineError = ref('')
const analysisData = ref<SwingAnalysisData | null>(null)
const analysisLoading = ref(false)
const analysisError = ref('')
let klineRequestId = 0
let analysisRequestId = 0

const canAnalyze = computed(() => Boolean(form.symbol && form.startDate && form.endDate))
const symbolLabel = computed(() => form.dataSource === 'stock' ? '股票' : 'ETF')
const symbolPlaceholder = computed(() => form.dataSource === 'stock' ? '请选择股票代码或名称' : '请选择 ETF 代码或名称')
const klineTitle = computed(() => `走势预览 - ${form.symbolName || form.symbol}`)
const analysisSnapshot = computed<SwingAnalysisSnapshot | null>(() => analysisData.value?.analysis ?? null)
const analysisMetaText = computed(() => {
  if (!analysisData.value) return ''
  const source = analysisData.value.data_source || '-'
  const api = analysisData.value.data_interface || '-'
  const points = analysisData.value.data_points ?? 0
  return `${source} / ${api} / ${points} 个交易日样本`
})

const formatDateToDash = (date: Date) => date.toISOString().split('T')[0]
const formatDateToCompact = (date: string) => date.replace(/-/g, '')

const formatPrice = (value: number | null) => value === null ? '-' : value.toFixed(2)
const formatNumber = (value: number | null) => value === null ? '-' : value.toFixed(2)
const formatPercent = (value: number | null) => value === null ? '-' : `${value.toFixed(2)}%`
const formatSignedPercent = (value: number | null) => value === null ? '-' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
const formatVolume = (value: number | null) => {
  if (value === null) return '-'
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`
  return value.toFixed(0)
}

const valueClass = (value: number | null) => {
  if (value === null || value === 0) return ''
  return value > 0 ? 'text-up' : 'text-down'
}

const waveStageMap: Record<string, string> = {
  uptrend: '上升趋势',
  downtrend: '下降趋势',
  high_zone_with_volume: '高位放量',
  low_zone_repair: '低位修复',
  range_bound: '区间震荡'
}

const biasMap: Record<string, string> = {
  trend_follow: '顺势跟随',
  range_trade: '区间交易',
  reversal_watch: '观察反转',
  avoid_chasing: '避免追高',
  wait_and_see: '等待观察',
  risk_control: '风险控制'
}

const waveStageLabel = computed(() => {
  const value = analysisSnapshot.value?.wave_stage || ''
  return waveStageMap[value] || value || '-'
})

const biasLabel = computed(() => {
  const value = analysisSnapshot.value?.decision_hint?.bias || ''
  return biasMap[value] || value || '-'
})

const biasTagType = computed(() => {
  const value = analysisSnapshot.value?.decision_hint?.bias || ''
  if (value === 'trend_follow') return 'success'
  if (value === 'range_trade' || value === 'reversal_watch') return 'warning'
  return 'info'
})

const debounce = (func: Function, delay: number) => {
  let timeoutId: number
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => func.apply(null, args), delay)
  }
}

const applyDateRangeShortcut = (range: DateRangeShortcut) => {
  const yearMap = { '1y': 1, '3y': 3, '5y': 5 }
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - yearMap[range])
  form.startDate = formatDateToDash(startDate)
  form.endDate = formatDateToDash(endDate)
}

const normalizeEtfDailyToKLine = (items: EtfDailyItem[]): StockHistoryDataItem[] => {
  return items.map(item => ({
    stock_code: item.ts_code,
    stock_name: item.csname || form.symbolName || item.ts_code,
    date: item.trade_date,
    open_price: item.open,
    close_price: item.close,
    high_price: item.high,
    low_price: item.low,
    change_percent: item.pct_chg ?? 0,
    change_amount: item.change ?? 0,
    volume: item.vol,
    amount: item.amount,
    amplitude: 0,
    turnover_rate: 0,
    created_at: item.created_at
  }))
}

const loadStockOptions = async (keyword: string = '') => {
  try {
    symbolLoading.value = true
    const params: StockListParams = {
      page: 1,
      page_size: 50,
      keyword: keyword.trim() || undefined
    }
    const response = await getStockList(params)
    symbolOptions.value = response.data.map(item => ({
      code: item.code,
      name: item.name
    }))
  } catch (error) {
    console.error('加载股票列表失败:', error)
  } finally {
    symbolLoading.value = false
  }
}

const loadEtfOptions = async (keyword: string = '') => {
  try {
    symbolLoading.value = true
    const response = await getEtfBasic({
      page: 1,
      page_size: 50,
      name: keyword.trim() || undefined
    })
    symbolOptions.value = (response.data || []).map((item: EtfBasicItem) => ({
      code: item.ts_code,
      name: item.extname || item.csname || item.cname || item.ts_code
    }))
  } catch (error) {
    console.error('加载ETF列表失败:', error)
  } finally {
    symbolLoading.value = false
  }
}

const debouncedLoadStockOptions = debounce(loadStockOptions, 300)
const debouncedLoadEtfOptions = debounce(loadEtfOptions, 300)

const handleSymbolInputChange = (value: string) => {
  const keyword = (value ?? '').trim()
  if (!keyword) {
    if (form.dataSource === 'stock') {
      loadStockOptions()
    } else {
      loadEtfOptions()
    }
    return
  }

  if (form.dataSource === 'stock') {
    debouncedLoadStockOptions(keyword)
  } else {
    debouncedLoadEtfOptions(keyword)
  }
}

const loadKlinePreview = async () => {
  const requestId = ++klineRequestId
  klineError.value = ''

  if (!canAnalyze.value) {
    klineData.value = []
    return
  }

  klineLoading.value = true
  try {
    const data = form.dataSource === 'etf'
      ? normalizeEtfDailyToKLine(await getEtfDaily({
          ts_code: form.symbol,
          start_date: form.startDate,
          end_date: form.endDate
        }))
      : await fetchStockHistoryData(
          form.symbol,
          formatDateToCompact(form.startDate),
          formatDateToCompact(form.endDate),
          'qfq'
        )

    if (requestId !== klineRequestId) return
    klineData.value = [...data].sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    if (requestId !== klineRequestId) return
    console.error('加载波段K线预览失败:', error)
    klineData.value = []
    klineError.value = '走势预览加载失败'
  } finally {
    if (requestId === klineRequestId) {
      klineLoading.value = false
    }
  }
}

const loadSwingReference = async () => {
  const requestId = ++analysisRequestId
  analysisError.value = ''

  if (!canAnalyze.value) {
    analysisData.value = null
    return
  }

  analysisLoading.value = true
  try {
    const data = await getSwingAnalysis({
      target_type: form.dataSource,
      code: form.symbol,
      start_date: formatDateToCompact(form.startDate),
      end_date: formatDateToCompact(form.endDate),
      adjust: form.dataSource === 'stock' ? 'qfq' : undefined
    })
    if (requestId !== analysisRequestId) return
    analysisData.value = data
  } catch (error) {
    if (requestId !== analysisRequestId) return
    console.error('加载波段分析失败:', error)
    analysisData.value = null
    analysisError.value = '波段分析数据加载失败'
  } finally {
    if (requestId === analysisRequestId) {
      analysisLoading.value = false
    }
  }
}

const refreshAnalysis = async () => {
  if (!canAnalyze.value) {
    ElMessage.warning('请先选择标的')
    return
  }
  await Promise.all([loadKlinePreview(), loadSwingReference()])
}

const handleDataSourceChange = async (value: SwingTargetType) => {
  form.dataSource = value
  form.symbol = ''
  form.symbolName = ''
  klineData.value = []
  analysisData.value = null
  klineError.value = ''
  analysisError.value = ''
  if (value === 'stock') {
    await loadStockOptions()
  } else {
    await loadEtfOptions()
  }
}

const handleSymbolSelect = async (value: string) => {
  if (!value) {
    form.symbolName = ''
    klineData.value = []
    analysisData.value = null
    return
  }

  const current = symbolOptions.value.find(item => item.code === value)
  form.symbolName = current?.name || value
  await refreshAnalysis()
}

const handleDateRangeShortcutChange = async (value: DateRangeShortcut) => {
  applyDateRangeShortcut(value)
  if (form.symbol) {
    await refreshAnalysis()
  }
}

onMounted(async () => {
  applyDateRangeShortcut('1y')
  await loadStockOptions()
})
</script>

<style scoped lang="scss">
.stock-swing-practice-view {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-card,
.preview-card,
.reference-card {
  border-radius: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.compact-header {
  align-items: center;
}

.card-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
  color: #1f2937;
}

.card-header p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.full-width {
  width: 100%;
}

.range-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.range-text,
.meta-text,
.hint-text {
  color: #6b7280;
  font-size: 13px;
}

.hint-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.page-empty {
  padding: 40px 0 20px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-item,
.kv-item {
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px 16px;
}

.summary-label,
.kv-item span {
  display: block;
  color: #6b7280;
  font-size: 12px;
  margin-bottom: 6px;
}

.summary-value,
.kv-item strong {
  color: #111827;
  font-size: 20px;
  line-height: 1.2;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.detail-item,
.insight-item,
.theory-card {
  border-radius: 10px;
}

.kv-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.insight-list {
  margin: 0;
  padding-left: 18px;
  color: #374151;
  line-height: 1.7;
}

.risk-list li {
  color: #b42318;
}

.theory-list {
  display: grid;
  gap: 12px;
}

.theory-item {
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafafa;
}

.theory-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 6px;
}

.theory-basis,
.theory-fields {
  color: #4b5563;
  line-height: 1.7;
  font-size: 13px;
}

.theory-fields {
  margin-top: 8px;
}

.text-up {
  color: #c2410c;
}

.text-down {
  color: #1d4ed8;
}

@media (max-width: 768px) {
  .stock-swing-practice-view {
    padding: 16px;
  }

  .card-header {
    flex-direction: column;
  }

  .kv-grid {
    grid-template-columns: 1fr;
  }
}
</style>

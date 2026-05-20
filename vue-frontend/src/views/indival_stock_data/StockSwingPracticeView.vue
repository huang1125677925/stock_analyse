<template>
  <div class="stock-swing-practice-view">
    <el-tabs v-model="activeTab" class="swing-tabs">
      <el-tab-pane label="交易参考" name="reference">
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
      <el-card shadow="hover" class="preview-card" v-loading="klineLoading || patternLoading">
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
          :overlay-lines="channelOverlayLines"
          :pattern-markers="candlestickPatternMarkers"
          height="420px"
        />
        <div v-if="klineData.length && channelOverlayLines.length" class="channel-guide">
          <div class="channel-guide-title">通道线参考</div>
          <div class="channel-guide-items">
            <span><i class="line-dot upper"></i>上轨：观察阶段性偏高区域，靠近时关注追高风险或强势突破。</span>
            <span><i class="line-dot middle"></i>中轨：代表当前拟合趋势方向，可辅助判断趋势强弱。</span>
            <span><i class="line-dot lower"></i>下轨：观察阶段性偏低区域，靠近时关注回调支撑或趋势走弱。</span>
            <span><i class="pattern-dot"></i>形态：仅标注波段高低点或区间极端位置附近的高优先级信号。</span>
          </div>
        </div>
        <div v-if="activePatternDefinitions.length" class="pattern-definition-panel">
          <div class="channel-guide-title">K线形态说明</div>
          <div class="pattern-definition-grid">
            <div v-for="item in activePatternDefinitions" :key="item.label" class="pattern-definition-item">
              <div class="pattern-definition-head">
                <span>{{ item.label }}</span>
                <el-tag size="small" :type="item.tagType" effect="plain">{{ item.directionLabel }}</el-tag>
              </div>
              <p>{{ item.definition }}</p>
            </div>
          </div>
        </div>
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
      </el-tab-pane>

      <el-tab-pane label="波段选股" name="candidates">
        <el-card shadow="hover" class="config-card">
          <template #header>
            <div class="card-header">
              <div>
                <h2>波段选股</h2>
                <p>筛选上升通道中靠近下轨的 ETF 或股票，适合进一步做波段观察。</p>
              </div>
              <el-button type="primary" :loading="candidateLoading" @click="loadChannelCandidates">查询候选</el-button>
            </div>
          </template>

          <el-form :model="candidateFilters" label-width="120px">
            <el-row :gutter="16">
              <el-col :xs="24" :sm="12" :md="6">
                <el-form-item label="标的类型">
                  <el-radio-group v-model="candidateFilters.targetType">
                    <el-radio-button label="etf">ETF</el-radio-button>
                    <el-radio-button label="stock">股票</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="6">
                <el-form-item label="通道窗口">
                  <el-input-number v-model="candidateFilters.channelWindow" :min="20" :max="180" :step="10" class="full-width" />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="6">
                <el-form-item label="距下轨上限">
                  <el-input-number v-model="candidateFilters.maxDistancePct" :min="0" :max="20" :step="0.5" :precision="1" class="full-width" />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="6">
                <el-form-item label="通道位置上限">
                  <el-input-number v-model="candidateFilters.maxChannelPositionPct" :min="0" :max="100" :step="5" :precision="1" class="full-width" />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="6">
                <el-form-item label="最小下轨斜率">
                  <el-input-number v-model="candidateFilters.minSlopePct" :min="0" :max="5" :step="0.01" :precision="3" class="full-width" />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="6">
                <el-form-item label="扫描数量">
                  <el-input-number v-model="candidateFilters.universeLimit" :min="10" :max="2000" :step="50" :precision="0" class="full-width" />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="6">
                <el-form-item label="返回数量">
                  <el-input-number v-model="candidateFilters.limit" :min="10" :max="500" :step="10" :precision="0" class="full-width" />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="6">
                <el-form-item label="行情区间">
                  <div class="range-picker">
                    <el-radio-group v-model="candidateRangeShortcut" @change="handleCandidateRangeChange">
                      <el-radio-button label="1y">1年</el-radio-button>
                      <el-radio-button label="3y">3年</el-radio-button>
                      <el-radio-button label="5y">5年</el-radio-button>
                    </el-radio-group>
                    <span class="range-text">{{ candidateFilters.startDate }} 至 {{ candidateFilters.endDate }}</span>
                  </div>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :md="18">
                <el-form-item label="指定代码">
                  <el-input
                    v-model="candidateFilters.codes"
                    clearable
                    placeholder="可选，多个代码用英文逗号分隔；留空时按默认候选池扫描"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :md="6">
                <el-form-item label="复权">
                  <el-tag v-if="candidateFilters.targetType === 'stock'" type="danger" effect="plain">股票使用前复权 qfq</el-tag>
                  <el-tag v-else type="info" effect="plain">ETF 忽略复权参数</el-tag>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>

        <el-card shadow="hover" class="candidate-card" v-loading="candidateLoading">
          <template #header>
            <div class="card-header compact-header">
              <span>候选结果</span>
              <span class="meta-text">{{ candidateMetaText }}</span>
            </div>
          </template>

          <div v-if="candidateData" class="candidate-summary-grid">
            <div class="summary-item">
              <span class="summary-label">返回数量</span>
              <strong class="summary-value">{{ candidateData.total }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">匹配总数</span>
              <strong class="summary-value">{{ candidateData.matched_total }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">扫描数量</span>
              <strong class="summary-value">{{ candidateData.scanned_total }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">跳过数量</span>
              <strong class="summary-value">{{ candidateData.skipped_total }}</strong>
            </div>
          </div>

          <el-table
            v-if="candidateRows.length"
            :data="candidateRows"
            border
            stripe
            style="width: 100%"
            empty-text="暂无波段候选"
            @row-click="openCandidateReference"
          >
            <el-table-column label="标的" min-width="180" fixed="left">
              <template #default="{ row }">
                <div class="candidate-symbol">
                  <el-button type="primary" link @click.stop="openCandidateReference(row)">{{ row.name || row.code }}</el-button>
                  <span>{{ row.code }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="score" label="评分" min-width="90" align="right" sortable>
              <template #default="{ row }">{{ formatNumber(row.score) }}</template>
            </el-table-column>
            <el-table-column label="最新价" min-width="100" align="right">
              <template #default="{ row }">{{ formatPrice(row.analysis.latest_close) }}</template>
            </el-table-column>
            <el-table-column label="距下轨" min-width="100" align="right" sortable>
              <template #default="{ row }">{{ formatPercent(row.analysis.distance_to_lower_pct) }}</template>
            </el-table-column>
            <el-table-column label="通道位置" min-width="110" align="right" sortable>
              <template #default="{ row }">{{ formatPercent(row.analysis.channel_position_pct) }}</template>
            </el-table-column>
            <el-table-column label="下轨斜率/日" min-width="120" align="right" sortable>
              <template #default="{ row }">{{ formatPercent(row.analysis.lower_slope_pct_per_day) }}</template>
            </el-table-column>
            <el-table-column label="通道宽度" min-width="110" align="right">
              <template #default="{ row }">{{ formatPercent(row.analysis.channel_width_pct) }}</template>
            </el-table-column>
            <el-table-column label="下轨" min-width="100" align="right">
              <template #default="{ row }">{{ formatPrice(row.analysis.lower_line_latest) }}</template>
            </el-table-column>
            <el-table-column label="上轨" min-width="100" align="right">
              <template #default="{ row }">{{ formatPrice(row.analysis.upper_line_latest) }}</template>
            </el-table-column>
            <el-table-column prop="analysis.latest_trade_date" label="交易日" min-width="110" align="center" />
            <el-table-column v-if="candidateFilters.targetType === 'etf'" prop="index_name" label="跟踪指数" min-width="160" show-overflow-tooltip />
            <el-table-column v-if="candidateFilters.targetType === 'etf'" prop="amount" label="成交额" min-width="120" align="right">
              <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
            </el-table-column>
          </el-table>

          <el-empty v-else-if="!candidateLoading" :description="candidateError || '点击查询后展示波段候选结果'" :image-size="80" />

          <div v-if="candidateData?.theory?.length" class="candidate-theory">
            <div class="channel-guide-title">筛选口径</div>
            <ul class="insight-list">
              <li v-for="item in candidateData.theory" :key="item">{{ item }}</li>
            </ul>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import StockKLineChart from '@/components/StockKLineChart.vue'
import { getStockList, type StockListParams } from '@/services/individualStockApi'
import { getEtfBasic, getEtfDaily, type EtfBasicItem, type EtfDailyItem } from '@/services/etfApi'
import { fetchStockHistoryData, type StockHistoryDataItem } from '@/services/stockHistoryApi'
import {
  getCandlestickPatterns,
  getSwingAnalysis,
  getSwingChannelCandidates,
  type CandlestickPatternItem,
  type SwingAnalysisData,
  type SwingAnalysisSnapshot,
  type SwingChannelCandidatesData,
  type SwingChannelCandidateItem,
  type SwingTargetType
} from '@/services/strategyApi'

type DateRangeShortcut = '1y' | '3y' | '5y'

interface SymbolOption {
  code: string
  name: string
}

interface ChannelOverlayLine {
  name: string
  points: Array<{ date: string; value: number }>
  color: string
  width?: number
  type?: 'solid' | 'dashed' | 'dotted'
}

interface CandlestickPatternMarker {
  date: string
  label: string
  direction: 'bullish' | 'bearish' | 'neutral'
  description?: string
  priority?: number
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

const activeTab = ref<'reference' | 'candidates'>('reference')
const symbolOptions = ref<SymbolOption[]>([])
const symbolLoading = ref(false)
const dateRangeShortcut = ref<DateRangeShortcut>('1y')
const candidateRangeShortcut = ref<DateRangeShortcut>('1y')
const klineData = ref<StockHistoryDataItem[]>([])
const klineLoading = ref(false)
const klineError = ref('')
const candlestickPatternMarkers = ref<CandlestickPatternMarker[]>([])
const patternLoading = ref(false)
const analysisData = ref<SwingAnalysisData | null>(null)
const analysisLoading = ref(false)
const analysisError = ref('')
const candidateData = ref<SwingChannelCandidatesData | null>(null)
const candidateLoading = ref(false)
const candidateError = ref('')
let klineRequestId = 0
let analysisRequestId = 0
let patternRequestId = 0

const candidateFilters = reactive({
  targetType: 'etf' as SwingTargetType,
  codes: '',
  startDate: '',
  endDate: '',
  channelWindow: 60,
  maxDistancePct: 3,
  maxChannelPositionPct: 35,
  minSlopePct: 0,
  universeLimit: 300,
  limit: 50
})

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
const channelOverlayLines = computed<ChannelOverlayLine[]>(() => buildTrendChannelLines(klineData.value))
const activePatternDefinitions = computed(() => {
  const uniqueLabels = [...new Set(candlestickPatternMarkers.value.map(marker => marker.label))]
  return uniqueLabels.map(label => {
    const marker = candlestickPatternMarkers.value.find(item => item.label === label)
    const direction = marker?.direction || 'neutral'
    return {
      label,
      definition: candlestickPatternDefinitions[label] || '价格行为出现异常波动或多空转换信号，需要结合所处趋势、通道位置和后续确认观察。',
      directionLabel: direction === 'bullish' ? '偏看涨' : direction === 'bearish' ? '偏看跌' : '中性',
      tagType: direction === 'bullish' ? 'danger' : direction === 'bearish' ? 'primary' : 'info'
    }
  })
})
const candidateRows = computed<SwingChannelCandidateItem[]>(() => candidateData.value?.data || [])
const candidateMetaText = computed(() => {
  if (!candidateData.value) return '上升通道且靠近下轨'
  return `${candidateData.value.universe_trade_date || '-'} / ${candidateData.value.data_source || '-'} / ${candidateData.value.start_date} 至 ${candidateData.value.end_date}`
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
const formatMoney = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-'
  if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(2)}亿`
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(2)}万`
  return value.toFixed(2)
}

const bullishPatternKeys = new Set([
  'hammer',
  'morning_star',
  'piercing',
  'inverted_hammer',
  'three_white_soldiers',
  'ladder_bottom',
  'matching_low',
  'mat_hold',
  'morning_doji_star',
  'homing_pigeon',
  'stick_sandwich',
  'takuri',
  'unique_three_river'
])

const bearishPatternKeys = new Set([
  'hanging_man',
  'evening_star',
  'dark_cloud_cover',
  'three_black_crows',
  'identical_three_crows',
  'two_crows',
  'advance_block',
  'evening_doji_star',
  'in_neck',
  'on_neck',
  'shooting_star',
  'stalled_pattern',
  'thrusting',
  'upside_gap_two_crows',
  'conceal_baby_swallow'
])

const candlestickPatternLabels: Record<string, string> = {
  hammer: '锤子线',
  morning_star: '晨星',
  piercing: '刺透',
  inverted_hammer: '倒锤头',
  three_white_soldiers: '三个白兵',
  ladder_bottom: '梯底',
  matching_low: '相同低价',
  mat_hold: '垫脚石',
  morning_doji_star: '十字晨星',
  homing_pigeon: '家鸽',
  stick_sandwich: '三明治',
  takuri: '探水杆',
  unique_three_river: '独特三河',
  hanging_man: '上吊线',
  evening_star: '黄昏星',
  dark_cloud_cover: '乌云盖顶',
  three_black_crows: '三黑鸦',
  identical_three_crows: '同三鸦',
  two_crows: '两只乌鸦',
  advance_block: '大敌当前',
  evening_doji_star: '十字暮星',
  in_neck: '颈内线',
  on_neck: '颈上线',
  shooting_star: '射击星',
  stalled_pattern: '停顿形态',
  thrusting: '插入形态',
  upside_gap_two_crows: '跳空两鸦',
  conceal_baby_swallow: '藏婴吞没',
  doji: '十字星',
  long_legged_doji: '长腿十字',
  gravestone_doji: '墓碑十字',
  dragonfly_doji: '蜻蜓十字',
  spinning_top: '纺锤线',
  marubozu: '秃线',
  engulfing: '吞没',
  harami: '孕线',
  kicking: '反冲',
  breakaway: '脱离',
  counterattack: '反击线'
}

const candlestickPatternDefinitions: Record<string, string> = {
  锤子线: '下跌或回调后出现长下影小实体，表示低位有承接，常作为回调止跌观察信号。',
  晨星: '三根K线组成的底部反转结构，先弱后企稳再转强，常用于观察下跌后的反弹确认。',
  十字晨星: '晨星的强化形态，中间为十字星，表示空方动能明显犹豫，后续阳线确认更重要。',
  刺透: '下跌后低开高走并深入前一根阴线实体，表示买盘开始反击。',
  倒锤头: '低位出现长上影小实体，说明有资金尝试上攻，需要后续阳线确认。',
  三个白兵: '连续三根较强阳线，通常表示底部或整理区后买盘持续增强。',
  梯底: '下跌末端出现逐步衰竭后转阳，偏底部修复信号。',
  相同低价: '连续两日收盘低位相近，表示空方继续下压失败，可能出现短线支撑。',
  垫脚石: '上升趋势中的短暂停顿后再转强，偏趋势延续信号。',
  家鸽: '下跌中出现类似孕线的收敛结构，说明卖压减弱。',
  三明治: '两根阴线夹一根阳线且低位接近，常表示低位承接增强。',
  探水杆: '长下影的底部探底形态，表示盘中大幅下探后被拉回。',
  独特三河: '复杂底部反转结构，表示下跌动能逐步衰竭。',
  上吊线: '上涨后出现长下影小实体，说明高位开始出现分歧，需警惕回落。',
  黄昏星: '三根K线组成的顶部反转结构，先强后犹豫再转弱，常用于观察上涨后的见顶风险。',
  十字暮星: '黄昏星的强化形态，中间为十字星，表示高位多空犹豫后转弱。',
  乌云盖顶: '上涨后高开低走并跌入前一根阳线实体，表示空方反击增强。',
  三黑鸦: '连续三根较强阴线，通常表示顶部或反弹后卖压持续增强。',
  同三鸦: '三黑鸦的更强弱势版本，连续阴线结构更一致。',
  两只乌鸦: '上涨后连续阴线压制，表示高位卖压开始占优。',
  大敌当前: '连续阳线实体变短且上影加重，表示上涨动能衰竭。',
  颈内线: '下跌趋势中的弱反弹结构，通常偏空方延续。',
  颈上线: '下跌趋势中的弱反弹到前低附近，反弹力度不足时偏弱。',
  射击星: '上涨后出现长上影小实体，表示冲高回落，常用于观察压力位。',
  停顿形态: '上涨末端连续推进乏力，表示多头动能开始放缓。',
  插入形态: '下跌中反弹未能有效收复前阴线实体，通常偏弱势延续。',
  跳空两鸦: '上涨中跳空后出现两根阴线，表示高位抛压加重。',
  藏婴吞没: '下跌末端的复杂反转结构，表示极端弱势后可能出现底部转折。',
  十字星: '开收盘接近，表示多空犹豫；在波段高低点附近更有参考价值。',
  长腿十字: '上下影线都较长，表示盘中分歧剧烈，常用于观察转折。',
  墓碑十字: '长上影且收在低位，高位出现时偏看跌。',
  蜻蜓十字: '长下影且收在高位，低位出现时偏看涨。',
  纺锤线: '小实体伴随上下影，表示趋势暂缓和多空拉锯。',
  秃线: '几乎没有影线，表示当日单边力量较强。',
  吞没: '后一根实体吞没前一根实体，常表示短线力量切换。',
  孕线: '后一根小实体被前一根包含，表示波动收敛和趋势犹豫。',
  反冲: '两根方向相反且跳空的强K线，常表示力量突然切换。',
  脱离: '多根K线组成的趋势衰竭后转向结构。',
  反击线: '两根相反方向K线收盘接近，表示多空在关键价位重新平衡。'
}

const patternPriority: Record<string, number> = {
  morning_star: 100,
  evening_star: 100,
  morning_doji_star: 96,
  evening_doji_star: 96,
  three_white_soldiers: 94,
  three_black_crows: 94,
  piercing: 90,
  dark_cloud_cover: 90,
  engulfing: 88,
  hammer: 84,
  hanging_man: 84,
  shooting_star: 82,
  inverted_hammer: 80,
  dragonfly_doji: 76,
  gravestone_doji: 76,
  harami: 72,
  doji: 58,
  long_legged_doji: 56,
  spinning_top: 45
}

const getPatternDirection = (key: string, value: number): CandlestickPatternMarker['direction'] => {
  if (bullishPatternKeys.has(key)) return 'bullish'
  if (bearishPatternKeys.has(key)) return 'bearish'
  if (value > 0) return 'bullish'
  if (value < 0) return 'bearish'
  return 'neutral'
}

const normalizePatternDate = (date: string) => /^\d{8}$/.test(date)
  ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
  : date

const normalizeDateKey = (date: string) => date ? date.replace(/[^0-9]/g, '') : ''

const getPatternPriceContext = (date: string, direction: CandlestickPatternMarker['direction'], items: StockHistoryDataItem[]) => {
  const patternDateKey = normalizeDateKey(date)
  const idx = items.findIndex(item => normalizeDateKey(item.date) === patternDateKey)
  if (idx === -1) return { accepted: false, reason: '不在当前K线区间' }

  const lookback = 3
  const localStart = Math.max(0, idx - lookback)
  const localEnd = Math.min(items.length - 1, idx + lookback)
  const localItems = items.slice(localStart, localEnd + 1)
  const item = items[idx]
  const isSwingLow = item.low_price <= Math.min(...localItems.map(v => v.low_price))
  const isSwingHigh = item.high_price >= Math.max(...localItems.map(v => v.high_price))

  const rangeStart = Math.max(0, idx - 60)
  const rangeItems = items.slice(rangeStart, idx + 1)
  const rangeLow = Math.min(...rangeItems.map(v => v.low_price))
  const rangeHigh = Math.max(...rangeItems.map(v => v.high_price))
  const position = rangeHigh === rangeLow ? 50 : ((item.close_price - rangeLow) / (rangeHigh - rangeLow)) * 100

  if (direction === 'bullish') {
    return {
      accepted: isSwingLow || position <= 38,
      reason: isSwingLow ? '波段低点附近' : `区间位置 ${position.toFixed(1)}%`
    }
  }
  if (direction === 'bearish') {
    return {
      accepted: isSwingHigh || position >= 62,
      reason: isSwingHigh ? '波段高点附近' : `区间位置 ${position.toFixed(1)}%`
    }
  }

  return {
    accepted: isSwingLow || isSwingHigh || position <= 25 || position >= 75,
    reason: isSwingLow ? '波段低点附近' : isSwingHigh ? '波段高点附近' : `区间位置 ${position.toFixed(1)}%`
  }
}

const buildCandlestickPatternMarkers = (
  patterns: CandlestickPatternItem[],
  items: StockHistoryDataItem[]
): CandlestickPatternMarker[] => {
  const rawMarkers: CandlestickPatternMarker[] = []
  const markerMap = new Map<string, CandlestickPatternMarker>()
  patterns.forEach(pattern => {
    const date = normalizePatternDate(pattern.date)
    const entries = Object.entries(pattern as unknown as Record<string, unknown>)
      .filter(([key, value]) => key !== 'date' && typeof value === 'number' && value !== 0)

    entries.forEach(([key, rawValue]) => {
      const value = Number(rawValue)
      const label = candlestickPatternLabels[key] || key
      const direction = getPatternDirection(key, value)
      const rawMarker = {
        date,
        label,
        direction,
        priority: patternPriority[key] || 50,
        description: `形态信号值: ${value}`
      } satisfies CandlestickPatternMarker
      rawMarkers.push(rawMarker)

      const context = getPatternPriceContext(date, direction, items)
      if (!context.accepted) return

      const marker = {
        date,
        label,
        direction,
        priority: patternPriority[key] || 50,
        description: `${context.reason}，形态信号值: ${value}`
      } satisfies CandlestickPatternMarker
      const current = markerMap.get(date)
      if (!current || (marker.priority || 0) > (current.priority || 0)) {
        markerMap.set(date, marker)
      }
    })
  })

  const filteredMarkers = [...markerMap.values()]
  const sourceMarkers = filteredMarkers.length > 0
    ? filteredMarkers
    : rawMarkers.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, Math.min(12, rawMarkers.length))
  const sortedMarkers = sourceMarkers.sort((a, b) => a.date.localeCompare(b.date))
  const maxMarkers = Math.min(26, Math.max(10, Math.floor(items.length / 18)))
  const minGap = Math.max(4, Math.floor(items.length / 80))
  const dateIndexMap = new Map(items.map((item, index) => [normalizeDateKey(item.date), index]))
  const selected: CandlestickPatternMarker[] = []

  sortedMarkers
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .forEach(marker => {
      const idx = dateIndexMap.get(normalizeDateKey(marker.date))
      if (selected.length >= maxMarkers) return
      if (idx === undefined && filteredMarkers.length > 0) return
      const tooClose = selected.some(item => {
        const selectedIdx = dateIndexMap.get(normalizeDateKey(item.date))
        return idx !== undefined && selectedIdx !== undefined && Math.abs(selectedIdx - idx) < minGap
      })
      if (!tooClose) selected.push(marker)
    })

  return selected.sort((a, b) => a.date.localeCompare(b.date))
}

const buildTrendChannelLines = (items: StockHistoryDataItem[]): ChannelOverlayLine[] => {
  const validItems = items.filter(item =>
    Number.isFinite(item.close_price) &&
    Number.isFinite(item.high_price) &&
    Number.isFinite(item.low_price)
  )

  if (validItems.length < 30) return []

  const sample = validItems.slice(-Math.min(validItems.length, 120))
  const n = sample.length
  const sumX = sample.reduce((sum, _item, index) => sum + index, 0)
  const sumY = sample.reduce((sum, item) => sum + item.close_price, 0)
  const sumXX = sample.reduce((sum, _item, index) => sum + index * index, 0)
  const sumXY = sample.reduce((sum, item, index) => sum + index * item.close_price, 0)
  const denominator = n * sumXX - sumX * sumX
  if (denominator === 0) return []

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n
  const fittedValues = sample.map((_item, index) => intercept + slope * index)
  const upperOffset = Math.max(...sample.map((item, index) => item.high_price - fittedValues[index]))
  const lowerOffset = Math.max(...sample.map((item, index) => fittedValues[index] - item.low_price))

  if (!Number.isFinite(upperOffset) || !Number.isFinite(lowerOffset)) return []

  const makePoints = (offset: number) => sample.map((item, index) => ({
    date: item.date,
    value: fittedValues[index] + offset
  }))

  return [
    {
      name: '通道上轨',
      points: makePoints(upperOffset),
      color: '#ef4444',
      width: 1.4,
      type: 'dashed'
    },
    {
      name: '趋势中轨',
      points: makePoints(0),
      color: '#2563eb',
      width: 1.6,
      type: 'solid'
    },
    {
      name: '通道下轨',
      points: makePoints(-lowerOffset),
      color: '#16a34a',
      width: 1.4,
      type: 'dashed'
    }
  ]
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

const applyCandidateRangeShortcut = (range: DateRangeShortcut) => {
  const yearMap = { '1y': 1, '3y': 3, '5y': 5 }
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - yearMap[range])
  candidateFilters.startDate = formatDateToDash(startDate)
  candidateFilters.endDate = formatDateToDash(endDate)
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

const loadCandlestickPatterns = async () => {
  const requestId = ++patternRequestId
  candlestickPatternMarkers.value = []

  if (!canAnalyze.value) return

  patternLoading.value = true
  try {
    const data = await getCandlestickPatterns(form.symbol, {
      start_date: form.startDate,
      end_date: form.endDate,
      type: form.dataSource
    })
    if (requestId !== patternRequestId) return
    candlestickPatternMarkers.value = buildCandlestickPatternMarkers(data.patterns || [], klineData.value)
  } catch (error) {
    if (requestId !== patternRequestId) return
    console.error('加载K线形态标注失败:', error)
    candlestickPatternMarkers.value = []
  } finally {
    if (requestId === patternRequestId) {
      patternLoading.value = false
    }
  }
}

const refreshAnalysis = async () => {
  if (!canAnalyze.value) {
    ElMessage.warning('请先选择标的')
    return
  }
  await Promise.all([loadKlinePreview(), loadSwingReference()])
  await loadCandlestickPatterns()
}

const loadChannelCandidates = async () => {
  candidateLoading.value = true
  candidateError.value = ''
  try {
    candidateData.value = await getSwingChannelCandidates({
      target_type: candidateFilters.targetType,
      codes: candidateFilters.codes.trim() || undefined,
      start_date: formatDateToCompact(candidateFilters.startDate),
      end_date: formatDateToCompact(candidateFilters.endDate),
      channel_window: candidateFilters.channelWindow,
      max_distance_pct: candidateFilters.maxDistancePct,
      max_channel_position_pct: candidateFilters.maxChannelPositionPct,
      min_slope_pct: candidateFilters.minSlopePct,
      universe_limit: candidateFilters.universeLimit,
      limit: candidateFilters.limit,
      adjust: candidateFilters.targetType === 'stock' ? 'qfq' : undefined
    })
  } catch (error) {
    console.error('加载波段选股候选失败:', error)
    candidateData.value = null
    candidateError.value = '波段选股候选加载失败'
    ElMessage.error('波段选股候选加载失败')
  } finally {
    candidateLoading.value = false
  }
}

const openCandidateReference = async (row: SwingChannelCandidateItem) => {
  activeTab.value = 'reference'
  if (form.dataSource !== row.target_type) {
    await handleDataSourceChange(row.target_type)
  }
  form.symbol = row.code || row.ts_code
  form.symbolName = row.name || row.code || row.ts_code
  form.startDate = candidateFilters.startDate
  form.endDate = candidateFilters.endDate
  await refreshAnalysis()
}

const handleDataSourceChange = async (value: SwingTargetType) => {
  form.dataSource = value
  form.symbol = ''
  form.symbolName = ''
  klineData.value = []
  candlestickPatternMarkers.value = []
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
    candlestickPatternMarkers.value = []
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

const handleCandidateRangeChange = (value: DateRangeShortcut) => {
  applyCandidateRangeShortcut(value)
}

onMounted(async () => {
  applyDateRangeShortcut('1y')
  applyCandidateRangeShortcut('1y')
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
.reference-card,
.candidate-card {
  border-radius: 10px;
}

.swing-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
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

.channel-guide {
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.channel-guide-title {
  margin-bottom: 8px;
  color: #111827;
  font-size: 13px;
  font-weight: 600;
}

.channel-guide-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px 14px;
  color: #4b5563;
  font-size: 12px;
  line-height: 1.6;
}

.line-dot {
  display: inline-block;
  width: 18px;
  height: 0;
  margin-right: 6px;
  border-top: 2px dashed currentColor;
  vertical-align: middle;
}

.line-dot.upper {
  color: #ef4444;
}

.line-dot.middle {
  color: #2563eb;
  border-top-style: solid;
}

.line-dot.lower {
  color: #16a34a;
}

.pattern-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #dc2626 0%, #1d4ed8 100%);
  vertical-align: middle;
}

.pattern-definition-panel {
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.pattern-definition-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.pattern-definition-item {
  padding: 10px 12px;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  background: #f9fafb;
}

.pattern-definition-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  color: #111827;
  font-size: 13px;
  font-weight: 600;
}

.pattern-definition-item p {
  margin: 0;
  color: #4b5563;
  font-size: 12px;
  line-height: 1.6;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.candidate-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.candidate-symbol {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.candidate-symbol span {
  color: #6b7280;
  font-size: 12px;
}

.candidate-theory {
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
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

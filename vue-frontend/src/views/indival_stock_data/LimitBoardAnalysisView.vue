<template>
  <div class="limit-board-page">
    <el-card class="query-card" shadow="never">
      <el-form :inline="true" class="query-form">
        <el-form-item v-if="activeTab !== 'industryTrend'" label="交易日期">
          <el-date-picker
            v-model="tradeDate"
            type="date"
            value-format="YYYYMMDD"
            placeholder="选择交易日"
            :clearable="false"
          />
        </el-form-item>
        <el-form-item v-if="activeTab === 'industryTrend'" label="时间范围">
          <el-radio-group v-model="trendRange" @change="onTrendRangeChange">
            <el-radio-button
              v-for="option in trendRangeOptions"
              :key="option.value"
              :label="option.value"
            >
              {{ option.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="activeTab === 'industryTrend'" label="行业映射">
          <el-select v-model="industryMapping" style="width: 160px" @change="onIndustryMappingChange">
            <el-option
              v-for="option in industryMappingOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="activeTab !== 'industryTrend'" label="返回数量">
          <el-input-number v-model="topN" :min="5" :max="100" :step="5" controls-position="right" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="activeLoading" @click="loadActiveTab">查询</el-button>
          <el-button :loading="loadingAll" @click="loadAllTabs">刷新全部</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-tabs v-model="activeTab" class="analysis-tabs" @tab-change="onTabChange">
      <el-tab-pane label="情绪总览" name="sentiment">
        <section v-loading="loading.sentiment" class="tab-panel">
          <div v-if="sentimentData" class="summary-grid">
            <div v-for="item in sentimentSummaryCards" :key="item.key" class="metric-card">
              <div class="metric-label">{{ item.label }}</div>
              <div class="metric-value" :class="item.className">{{ formatValue(item.value, item.suffix) }}</div>
            </div>
          </div>

          <el-alert
            v-if="sentimentData?.summary?.conclusion"
            class="panel-alert"
            :title="sentimentData.summary.conclusion"
            type="info"
            show-icon
            :closable="false"
          />

          <div class="content-grid two-col">
            <el-card shadow="never">
              <template #header>连板分布</template>
              <el-table :data="sentimentData?.board_distribution || []" border stripe empty-text="暂无连板分布">
                <el-table-column prop="board" label="连板高度" min-width="100" align="center">
                  <template #default="{ row }">{{ row.board }}板</template>
                </el-table-column>
                <el-table-column prop="count" label="数量" min-width="100" align="center" />
              </el-table>
            </el-card>
            <el-card shadow="never">
              <template #header>最强题材</template>
              <el-table :data="sentimentData?.top_concepts || []" border stripe empty-text="暂无题材数据">
                <el-table-column prop="rank" label="排名" min-width="70" align="center" />
                <el-table-column label="题材" min-width="150" show-overflow-tooltip>
                  <template #default="{ row }">{{ row.name || row.concept_name || '-' }}</template>
                </el-table-column>
                <el-table-column prop="ts_code" label="代码" min-width="110" align="center" />
                <el-table-column label="涨停数" min-width="90" align="center">
                  <template #default="{ row }">{{ row.up_nums ?? row.limit_up_count ?? '-' }}</template>
                </el-table-column>
                <el-table-column prop="up_stat" label="涨停统计" min-width="110" align="center" />
                <el-table-column label="连板数" min-width="90" align="center">
                  <template #default="{ row }">{{ row.cons_nums ?? '-' }}</template>
                </el-table-column>
                <el-table-column label="涨跌幅" min-width="100" align="right">
                  <template #default="{ row }">
                    <span :class="pctClass(row.pct_chg)">{{ formatValue(row.pct_chg, '%') }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="days" label="持续天数" min-width="90" align="center" />
              </el-table>
            </el-card>
          </div>
          <SourceCounts :counts="sentimentData?.source_counts" />
          <el-empty v-if="!loading.sentiment && !sentimentData" description="请选择交易日查询" />
        </section>
      </el-tab-pane>

      <el-tab-pane label="连板天梯" name="ladder">
        <section v-loading="loading.ladder" class="tab-panel">
          <div v-if="ladderLevels.length" class="ladder-container">
            <div class="ladder-row" v-for="level in ladderLevels" :key="level.nums">
              <div class="ladder-label">
                <div class="board-count">{{ level.nums }}板</div>
                <div class="stock-count">{{ level.stocks.length }}只</div>
              </div>
              <div class="ladder-stocks">
                <el-tag
                  v-for="stock in level.stocks"
                  :key="stock.ts_code || stock.name"
                  class="ladder-stock-tag"
                  :type="getBoardColorType(level.nums)"
                  effect="plain"
                >
                  {{ stock.name || '-' }}
                  <span class="stock-code" v-if="stock.ts_code">({{ stock.ts_code }})</span>
                </el-tag>
              </div>
            </div>
          </div>
          <el-empty v-else-if="!loading.ladder" description="该交易日暂无连板天梯数据" />
        </section>
      </el-tab-pane>

      <el-tab-pane label="题材梯队" name="theme">
        <section v-loading="loading.theme" class="tab-panel">
          <div class="theme-list" v-if="themeRows.length">
            <el-card v-for="theme in themeRows" :key="theme.concept_code || theme.concept_name" shadow="never" class="theme-card">
              <template #header>
                <div class="theme-header">
                  <span>{{ theme.concept_name || theme.concept_code || '-' }}</span>
                  <div class="theme-stats">
                    <el-tag type="danger" effect="plain">{{ theme.limit_up_count || 0 }} 涨停</el-tag>
                    <el-tag type="warning" effect="plain">最高 {{ theme.max_board || 0 }} 板</el-tag>
                    <el-tag type="success" effect="plain">热度 {{ formatValue(theme.heat_score) }}</el-tag>
                  </div>
                </div>
              </template>
              <div class="stock-tags">
                <el-tag v-for="stock in theme.core_stocks || []" :key="stock.ts_code || stock.name" class="stock-tag" effect="plain">
                  {{ stock.name || stock.ts_code }}<span v-if="stock.board"> {{ stock.board }}板</span>
                </el-tag>
              </div>
            </el-card>
          </div>
          <el-empty v-else-if="!loading.theme" description="暂无题材梯队" />
          <el-pagination
            class="pagination"
            v-model:current-page="pagination.theme.page"
            v-model:page-size="pagination.theme.pageSize"
            :page-sizes="[5, 10, 20, 50]"
            :total="themeList.length"
            layout="total, sizes, prev, pager, next, jumper"
          />
          <SourceCounts :counts="themeData?.source_counts" />
        </section>
      </el-tab-pane>

      <el-tab-pane label="炸板回封" name="break">
        <section v-loading="loading.break" class="tab-panel">
          <div v-if="breakData" class="summary-grid compact">
            <div v-for="item in breakSummaryCards" :key="item.key" class="metric-card">
              <div class="metric-label">{{ item.label }}</div>
              <div class="metric-value">{{ formatValue(item.value, item.suffix) }}</div>
            </div>
          </div>
          <div class="content-grid two-col">
            <el-card shadow="never">
              <template #header>开板后回封</template>
              <el-table :data="breakData?.resealed || []" border stripe empty-text="暂无回封数据" height="520">
                <el-table-column prop="ts_code" label="代码" min-width="120" fixed />
                <el-table-column prop="name" label="名称" min-width="110" fixed />
                <el-table-column prop="open_times" label="开板次数" min-width="90" align="center" sortable />
                <el-table-column prop="limit_times" label="连板" min-width="80" align="center" sortable />
                <el-table-column prop="seal_ratio_pct" label="封单比" min-width="100" align="right" sortable>
                  <template #default="{ row }">{{ formatValue(row.seal_ratio_pct, '%') }}</template>
                </el-table-column>
                <el-table-column prop="break_strength_score" label="强度分" min-width="100" align="right" sortable />
                <el-table-column prop="reason" label="原因" min-width="180" show-overflow-tooltip />
              </el-table>
            </el-card>
            <el-card shadow="never">
              <template #header>最终炸板</template>
              <el-table :data="breakData?.failed || []" border stripe empty-text="暂无炸板数据" height="520">
                <el-table-column prop="ts_code" label="代码" min-width="120" fixed />
                <el-table-column prop="name" label="名称" min-width="110" fixed />
                <el-table-column prop="pct_chg" label="涨跌幅" min-width="100" align="right" sortable>
                  <template #default="{ row }">
                    <span :class="pctClass(row.pct_chg)">{{ formatValue(row.pct_chg, '%') }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="amount" label="成交额" min-width="120" align="right">
                  <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
                </el-table-column>
                <el-table-column prop="first_time" label="首次封板" min-width="100" align="center" />
                <el-table-column prop="reason" label="原因" min-width="180" show-overflow-tooltip />
              </el-table>
            </el-card>
          </div>
          <SourceCounts :counts="breakData?.source_counts" />
        </section>
      </el-tab-pane>

      <el-tab-pane label="游资复盘" name="hotMoney">
        <section v-loading="loading.hotMoney" class="tab-panel">
          <div class="content-grid hot-money-grid">
            <el-card shadow="never">
              <template #header>活跃游资</template>
              <el-table :data="hotMoneyData?.active_hot_money || []" border stripe empty-text="暂无游资数据" height="520">
                <el-table-column prop="hm_name" label="游资" min-width="180" show-overflow-tooltip />
                <el-table-column prop="appear_count" label="出现次数" min-width="110" align="center" sortable />
                <el-table-column prop="estimated_net_buy" label="估算净买额" min-width="160" align="right" sortable>
                  <template #default="{ row }">{{ formatMoney(row.estimated_net_buy) }}</template>
                </el-table-column>
              </el-table>
            </el-card>
            <el-card shadow="never">
              <template #header>龙虎榜打板复盘</template>
              <el-table :data="hotMoneyRows" border stripe empty-text="暂无复盘数据" height="520">
                <el-table-column prop="ts_code" label="代码" min-width="120" fixed />
                <el-table-column prop="name" label="名称" min-width="120" fixed />
                <el-table-column prop="board_status" label="状态" min-width="110" align="center">
                  <template #default="{ row }">
                    <el-tag :type="boardStatusType(row.board_status)" effect="plain">
                      {{ boardStatusLabel(row.board_status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="hot_money_count" label="游资明细数" min-width="110" align="center" sortable />
                <el-table-column label="龙虎榜原因" min-width="220" show-overflow-tooltip>
                  <template #default="{ row }">{{ row.top_list?.explain || row.top_list?.reason || '-' }}</template>
                </el-table-column>
              </el-table>
              <el-pagination
                class="pagination"
                v-model:current-page="pagination.hotMoney.page"
                v-model:page-size="pagination.hotMoney.pageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="hotMoneyRecords.length"
                layout="total, sizes, prev, pager, next, jumper"
              />
            </el-card>
          </div>
          <SourceCounts :counts="hotMoneyData?.source_counts" />
        </section>
      </el-tab-pane>

      <el-tab-pane label="涨停趋势" name="industryTrend">
        <section v-loading="loading.industryTrend" class="tab-panel">
          <div v-if="industryTrendData" class="summary-grid compact">
            <div v-for="item in industryTrendSummaryCards" :key="item.key" class="metric-card">
              <div class="metric-label">{{ item.label }}</div>
              <div class="metric-value">{{ formatValue(item.value, item.suffix) }}</div>
            </div>
          </div>

          <el-card shadow="never" class="trend-card" v-if="hasIndustryTrendDaily">
            <template #header>行业涨停趋势矩阵</template>
            <LimitBoardIndustryTrendMatrix :daily="industryTrendDaily" />
          </el-card>

          <SourceCounts :counts="industryTrendData?.source_counts" />
          <el-empty
            v-if="!loading.industryTrend && (!industryTrendData || !hasIndustryTrendDaily)"
            description="请选择日期区间查询涨停趋势"
          />
        </section>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
/**
 * 打板分析选股页面
 * 功能：
 * - 汇总展示打板策略相关的情绪总览、连板天梯、题材梯队、炸板回封、游资复盘和涨停趋势分析
 * - 支持按交易日查询单日打板结果，并对涨停趋势模块提供区间查询
 * - 复用统一格式化方法展示金融数据和统计指标
 * 参数：无
 * 返回值：无
 * 事件：
 * - tab-change: 切换分析 tab 时按需加载对应数据
 * - click: 点击查询或刷新按钮时重新拉取当前或全部 tab 数据
 */
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import LimitBoardIndustryTrendMatrix from '@/components/LimitBoardIndustryTrendMatrix.vue'
import {
  fetchBreakReseal,
  fetchDailySentiment,
  fetchHotMoneyReview,
  fetchIndustryTrendStrength,
  fetchThemeLadder,
  type BreakResealData,
  type DailySentimentData,
  type HotMoneyReviewData,
  type IndustryMapping,
  type IndustryTrendStrengthData,
  type ThemeLadderData
} from '@/services/limitBoardStrategyApi'
import { fetchLimitStep, type LimitStepData } from '@/services/limitStepApi'

type TabName = 'sentiment' | 'ladder' | 'theme' | 'break' | 'hotMoney' | 'industryTrend'

interface SummaryCardItem {
  key: string
  label: string
  value: unknown
  suffix?: string
  className?: string
}

/**
 * 数据来源计数组件
 * 功能：
 * - 以标签形式展示接口返回的各数据源记录数
 * - 在多个 tab 中复用统一的来源统计样式
 * 参数：
 * @param {Record<string, number> | undefined} counts 数据源记录数字典
 * 返回值：VNode | null
 * 事件：无
 */
const SourceCounts = defineComponent({
  name: 'SourceCounts',
  props: {
    counts: {
      type: Object,
      default: undefined
    }
  },
  setup(props) {
    return () => {
      const counts = props.counts as Record<string, number> | undefined
      if (!counts || Object.keys(counts).length === 0) return null
      return h(
        'div',
        { class: 'source-counts' },
        Object.entries(counts).map(([key, value]) =>
          h('span', { class: 'source-count' }, `${key}: ${value}`)
        )
      )
    }
  }
})

type TrendRange = '2w' | '1m' | '3m'

const trendRangeOptions: Array<{ label: string; value: TrendRange }> = [
  { label: '最近2周', value: '2w' },
  { label: '最近一个月', value: '1m' },
  { label: '最近三个月', value: '3m' }
]

/** 行业趋势的行业映射方式选项，取值对应接口 industry_mapping 参数 */
const industryMappingOptions: Array<{ label: string; value: IndustryMapping }> = [
  { label: '默认（按日动态）', value: 'default' },
  { label: '东财概念', value: 'dc_concept' },
  { label: '东财地域', value: 'dc_region' },
  { label: '东财一级行业', value: 'dc_l1' },
  { label: '东财二级行业', value: 'dc_l2' },
  { label: '东财三级行业', value: 'dc_l3' }
]

const activeTab = ref<TabName>('sentiment')
const tradeDate = ref(getRecentTradeDate())
const trendRange = ref<TrendRange>('2w')
const industryMapping = ref<IndustryMapping>('default')
const trendEndDate = ref(getRecentTradeDate())
const trendStartDate = ref(getRangeStartDate(trendEndDate.value, trendRange.value))
const topN = ref(20)
const loadingAll = ref(false)
const lastQueryTime = ref('')

const loading = reactive<Record<TabName, boolean>>({
  sentiment: false,
  ladder: false,
  theme: false,
  break: false,
  hotMoney: false,
  industryTrend: false
})

const loaded = reactive<Record<TabName, boolean>>({
  sentiment: false,
  ladder: false,
  theme: false,
  break: false,
  hotMoney: false,
  industryTrend: false
})

const pagination = reactive({
  theme: { page: 1, pageSize: 10 },
  hotMoney: { page: 1, pageSize: 20 }
})

const sentimentData = ref<DailySentimentData | null>(null)
const ladderData = ref<Record<string, any>[]>([])
const themeData = ref<ThemeLadderData | null>(null)
const breakData = ref<BreakResealData | null>(null)
const hotMoneyData = ref<HotMoneyReviewData | null>(null)
const industryTrendData = ref<IndustryTrendStrengthData | null>(null)

const activeLoading = computed(() => loading[activeTab.value])

const sentimentSummaryCards = computed<SummaryCardItem[]>(() => {
  const s = sentimentData.value?.summary || {}
  return [
    { key: 'limit_up_count', label: '涨停家数', value: s.limit_up_count, className: 'text-red' },
    { key: 'limit_down_count', label: '跌停家数', value: s.limit_down_count, className: 'text-green' },
    { key: 'broken_limit_count', label: '炸板家数', value: s.broken_limit_count },
    { key: 'sealed_rate', label: '封板率', value: s.sealed_rate, suffix: '%' },
    { key: 'max_board', label: '最高连板', value: s.max_board, suffix: '板' },
    { key: 'sentiment_score', label: '情绪分', value: s.sentiment_score },
    { key: 'phase_label', label: '阶段', value: s.phase_label },
    { key: 'high_board_count', label: '3板以上', value: s.high_board_count }
  ]
})

const breakSummaryCards = computed<SummaryCardItem[]>(() => {
  const s = breakData.value?.summary || {}
  return [
    { key: 'limit_up_count', label: '最终涨停', value: s.limit_up_count },
    { key: 'resealed_count', label: '回封家数', value: s.resealed_count },
    { key: 'failed_break_count', label: '炸板家数', value: s.failed_break_count },
    { key: 'failed_break_rate', label: '炸板率', value: s.failed_break_rate, suffix: '%' },
    { key: 'reseal_rate_after_break', label: '回封率', value: s.reseal_rate_after_break, suffix: '%' }
  ]
})

const industryTrendSummaryCards = computed<SummaryCardItem[]>(() => {
  const s = industryTrendData.value?.summary || {}
  return [
    { key: 'industry_mapping_label', label: '行业映射', value: s.industry_mapping_label },
    { key: 'trade_day_count', label: '交易日数量', value: s.trade_day_count },
    { key: 'industry_count', label: '行业数量', value: s.industry_count },
    { key: 'total_limit_up_count', label: '累计涨停家数', value: s.total_limit_up_count },
    { key: 'industry_matched_count', label: '匹配行业记录', value: s.industry_matched_count }
  ]
})

const themeList = computed(() => themeData.value?.themes || [])
const themeRows = computed(() => paginateRows(themeList.value, pagination.theme.page, pagination.theme.pageSize))
const hotMoneyRecords = computed(() => hotMoneyData.value?.records || [])
const hotMoneyRows = computed(() => paginateRows(hotMoneyRecords.value, pagination.hotMoney.page, pagination.hotMoney.pageSize))
const industryTrendDaily = computed(() => industryTrendData.value?.data || {})
const hasIndustryTrendDaily = computed(() => Object.keys(industryTrendDaily.value).length > 0)
const ladderLevels = computed(() => {
  const groups = new Map<number, Record<string, any>[]>()
  ladderData.value.forEach(stock => {
    const nums = Number(stock.nums || stock.limit_times || 0)
    if (!nums) return
    if (!groups.has(nums)) groups.set(nums, [])
    groups.get(nums)!.push(stock)
  })
  return Array.from(groups.entries())
    .map(([nums, stocks]) => ({ nums, stocks }))
    .sort((a, b) => b.nums - a.nums)
})

function paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}

async function loadActiveTab() {
  await loadTab(activeTab.value, true)
}

async function onTabChange(name: string | number) {
  const tabName = name as TabName
  if (!loaded[tabName]) {
    await loadTab(tabName)
  }
}

async function loadAllTabs() {
  if (!tradeDate.value) return
  loadingAll.value = true
  try {
    await Promise.all([
      loadTab('sentiment', true),
      loadTab('ladder', true),
      loadTab('theme', true),
      loadTab('break', true),
      loadTab('hotMoney', true),
      loadTab('industryTrend', true)
    ])
  } finally {
    loadingAll.value = false
  }
}

async function loadTab(tab: TabName, force = false) {
  if (loading[tab]) return
  if (loaded[tab] && !force) return
  if (tab === 'industryTrend') {
    if (!trendStartDate.value || !trendEndDate.value) return
    if (trendStartDate.value > trendEndDate.value) {
      ElMessage.warning('开始日期不能晚于结束日期')
      return
    }
  } else if (!tradeDate.value) {
    return
  }

  loading[tab] = true
  try {
    if (tab === 'sentiment') {
      sentimentData.value = await fetchDailySentiment({ trade_date: tradeDate.value })
      lastQueryTime.value = sentimentData.value.query_time || ''
    } else if (tab === 'ladder') {
      const data = await fetchLimitStep({ trade_date: tradeDate.value })
      ladderData.value = normalizeLimitStepRows(data).filter(row => row.trade_date === tradeDate.value)
    } else if (tab === 'theme') {
      themeData.value = await fetchThemeLadder({ trade_date: tradeDate.value, top_n: topN.value })
      pagination.theme.page = 1
      lastQueryTime.value = themeData.value.query_time || lastQueryTime.value
    } else if (tab === 'break') {
      breakData.value = await fetchBreakReseal({ trade_date: tradeDate.value, top_n: topN.value })
      lastQueryTime.value = breakData.value.query_time || lastQueryTime.value
    } else if (tab === 'hotMoney') {
      hotMoneyData.value = await fetchHotMoneyReview({ trade_date: tradeDate.value, top_n: topN.value })
      pagination.hotMoney.page = 1
      lastQueryTime.value = hotMoneyData.value.query_time || lastQueryTime.value
    } else if (tab === 'industryTrend') {
      industryTrendData.value = await fetchIndustryTrendStrength({
        start_date: trendStartDate.value,
        end_date: trendEndDate.value,
        industry_mapping: industryMapping.value
      })
      lastQueryTime.value = industryTrendData.value.query_time || lastQueryTime.value
    }
    loaded[tab] = true
  } finally {
    loading[tab] = false
  }
}

function normalizeLimitStepRows(data: LimitStepData): Record<string, any>[] {
  if (Array.isArray(data.records)) return data.records
  if (Array.isArray(data.items) && Array.isArray(data.fields)) {
    return data.items.map(item => {
      const row: Record<string, any> = {}
      data.fields?.forEach((field, index) => {
        row[field] = item[index]
      })
      return row
    })
  }
  return []
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function getRecentTradeDate(): string {
  const date = new Date()
  const day = date.getDay()
  if (day === 0) {
    date.setDate(date.getDate() - 2)
  } else if (day === 6) {
    date.setDate(date.getDate() - 1)
  }
  return formatDate(date)
}

function parseDateString(value: string): Date {
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))
  return new Date(year, month - 1, day)
}

function getShiftedDate(value: string, offsetDays: number): string {
  const date = parseDateString(value)
  date.setDate(date.getDate() + offsetDays)
  return formatDate(date)
}

/**
 * 工具：按时间范围快捷键计算起始日期。
 * 参数：
 *  - endValue 为区间结束日期 YYYYMMDD；
 *  - range 为快捷范围，2周/1个月/3个月。
 * 返回值：区间起始日期 YYYYMMDD。
 */
function getRangeStartDate(endValue: string, range: TrendRange): string {
  const date = parseDateString(endValue)
  if (range === '2w') {
    date.setDate(date.getDate() - 14)
  } else if (range === '1m') {
    date.setMonth(date.getMonth() - 1)
  } else {
    date.setMonth(date.getMonth() - 3)
  }
  return formatDate(date)
}

/**
 * 事件：切换涨停趋势时间范围。
 * 参数：range 为选中的快捷范围。
 * 返回值：void，重算起始日期并刷新涨停趋势数据。
 */
function onTrendRangeChange(range: string | number | boolean | undefined) {
  const value = range as TrendRange
  trendEndDate.value = getRecentTradeDate()
  trendStartDate.value = getRangeStartDate(trendEndDate.value, value)
  loadTab('industryTrend', true)
}

/**
 * 事件：切换涨停趋势行业映射方式。
 * 参数：mapping 为选中的行业映射方式。
 * 返回值：void，按新映射方式刷新涨停趋势数据。
 */
function onIndustryMappingChange(mapping: string | number | boolean | undefined) {
  industryMapping.value = mapping as IndustryMapping
  loadTab('industryTrend', true)
}

function formatValue(value: unknown, suffix = ''): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return `${Number.isInteger(value) ? value : value.toFixed(2)}${suffix}`
  return `${value}${suffix}`
}

function formatMoney(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  if (Math.abs(n) >= 100000000) return `${(n / 100000000).toFixed(2)}亿`
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(2)}万`
  return n.toFixed(2)
}

function pctClass(value: unknown): string {
  const n = Number(value)
  if (n > 0) return 'text-red'
  if (n < 0) return 'text-green'
  return ''
}

function boardStatusLabel(status: string): string {
  const map: Record<string, string> = {
    limit_up: '涨停',
    broken: '炸板',
    other: '其他'
  }
  return map[status] || status || '-'
}

function boardStatusType(status: string): 'success' | 'warning' | 'info' | 'danger' {
  if (status === 'limit_up') return 'danger'
  if (status === 'broken') return 'warning'
  return 'info'
}

function getBoardColorType(nums: number): 'success' | 'warning' | 'danger' | 'primary' | 'info' {
  if (nums >= 5) return 'danger'
  if (nums >= 3) return 'warning'
  if (nums === 2) return 'primary'
  return 'info'
}

onMounted(() => {
  loadTab('sentiment')
})
</script>

<style scoped>
.limit-board-page {
  padding: 12px;
}

.query-card {
  margin-bottom: 12px;
}

.theme-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.query-form {
  margin-bottom: -18px;
}

.analysis-tabs {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 0 16px 16px;
}

.tab-panel {
  min-height: 360px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.summary-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.metric-card {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 12px;
  background: #fafafa;
}

.metric-label {
  color: #606266;
  font-size: 13px;
  margin-bottom: 8px;
}

.metric-value {
  color: #303133;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.panel-alert {
  margin-bottom: 12px;
}

.content-grid {
  display: grid;
  gap: 12px;
}

.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.hot-money-grid {
  grid-template-columns: minmax(480px, 560px) minmax(0, 1fr);
}

.tag-item,
.stock-tag {
  margin: 2px 4px 2px 0;
}

.theme-list {
  display: grid;
  gap: 12px;
}

.theme-stats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.stock-tags {
  min-height: 28px;
}

.ladder-container {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 16px;
  background: #fff;
}

.ladder-row {
  display: flex;
  align-items: flex-start;
  border-bottom: 1px dashed #ebeef5;
  gap: 16px;
  padding: 12px 0;
}

.ladder-row:first-child {
  padding-top: 0;
}

.ladder-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.ladder-label {
  width: 88px;
  flex-shrink: 0;
  text-align: center;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px 0;
}

.board-count {
  color: #d9001b;
  font-size: 18px;
  font-weight: 700;
}

.stock-count {
  color: #909399;
  font-size: 12px;
  margin-top: 2px;
}

.ladder-stocks {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.ladder-stock-tag {
  max-width: 220px;
}

.stock-code {
  margin-left: 4px;
  opacity: 0.75;
}

.source-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  color: #606266;
  font-size: 12px;
}

.source-count {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 3px 8px;
  background: #fafafa;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.trend-card {
  margin-bottom: 12px;
}

.text-red {
  color: #d9001b;
}

.text-green {
  color: #138a36;
}

@media (max-width: 960px) {
  .two-col,
  .hot-money-grid {
    grid-template-columns: 1fr;
  }

  .card-header,
  .theme-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

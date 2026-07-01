<template>
  <div class="limit-board-page">
    <el-card class="query-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>打板分析选股</span>
          <el-tag v-if="lastQueryTime" type="info" effect="plain">更新时间 {{ lastQueryTime }}</el-tag>
        </div>
      </template>

      <el-form :inline="true" class="query-form">
        <el-form-item label="交易日期">
          <el-date-picker
            v-model="tradeDate"
            type="date"
            value-format="YYYYMMDD"
            placeholder="选择交易日"
            :clearable="false"
          />
        </el-form-item>
        <el-form-item label="返回数量">
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

      <el-tab-pane label="竞价候选" name="auction">
        <section v-loading="loading.auction" class="tab-panel">
          <el-table :data="auctionRows" border stripe empty-text="暂无竞价候选" height="620">
            <el-table-column prop="code" label="代码" min-width="120" fixed />
            <el-table-column prop="name" label="名称" min-width="120" fixed />
            <el-table-column prop="enhanced_score" label="增强分" min-width="100" align="right" sortable />
            <el-table-column prop="score" label="基础分" min-width="100" align="right" sortable />
            <el-table-column prop="hot_score" label="热榜分" min-width="100" align="right" sortable />
            <el-table-column prop="gap_pct" label="竞价涨幅" min-width="110" align="right" sortable>
              <template #default="{ row }">
                <span :class="pctClass(row.gap_pct)">{{ formatValue(row.gap_pct, '%') }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="auction_price" label="竞价价" min-width="100" align="right" />
            <el-table-column prop="auction_amount" label="竞价额" min-width="120" align="right">
              <template #default="{ row }">{{ formatMoney(row.auction_amount) }}</template>
            </el-table-column>
            <el-table-column prop="limit_times" label="昨日连板" min-width="100" align="center" />
            <el-table-column prop="reason" label="涨停原因" min-width="220" show-overflow-tooltip />
            <el-table-column label="题材标签" min-width="220">
              <template #default="{ row }">
                <el-tag v-for="tag in normalizeTags(row.tags)" :key="tag" class="tag-item" size="small" effect="plain">
                  {{ tag }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            class="pagination"
            v-model:current-page="pagination.auction.page"
            v-model:page-size="pagination.auction.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="auctionCandidates.length"
            layout="total, sizes, prev, pager, next, jumper"
          />
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
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import {
  fetchAuctionCandidates,
  fetchBreakReseal,
  fetchDailySentiment,
  fetchHotMoneyReview,
  fetchThemeLadder,
  type AuctionCandidatesData,
  type BreakResealData,
  type DailySentimentData,
  type HotMoneyReviewData,
  type ThemeLadderData
} from '@/services/limitBoardStrategyApi'
import { fetchLimitStep, type LimitStepData } from '@/services/limitStepApi'

type TabName = 'sentiment' | 'ladder' | 'auction' | 'theme' | 'break' | 'hotMoney'

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

const activeTab = ref<TabName>('sentiment')
const tradeDate = ref(getRecentTradeDate())
const topN = ref(20)
const loadingAll = ref(false)
const lastQueryTime = ref('')

const loading = reactive<Record<TabName, boolean>>({
  sentiment: false,
  ladder: false,
  auction: false,
  theme: false,
  break: false,
  hotMoney: false
})

const loaded = reactive<Record<TabName, boolean>>({
  sentiment: false,
  ladder: false,
  auction: false,
  theme: false,
  break: false,
  hotMoney: false
})

const pagination = reactive({
  auction: { page: 1, pageSize: 20 },
  theme: { page: 1, pageSize: 10 },
  hotMoney: { page: 1, pageSize: 20 }
})

const sentimentData = ref<DailySentimentData | null>(null)
const ladderData = ref<Record<string, any>[]>([])
const auctionData = ref<AuctionCandidatesData | null>(null)
const themeData = ref<ThemeLadderData | null>(null)
const breakData = ref<BreakResealData | null>(null)
const hotMoneyData = ref<HotMoneyReviewData | null>(null)

const activeLoading = computed(() => loading[activeTab.value])

const sentimentSummaryCards = computed(() => {
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

const breakSummaryCards = computed(() => {
  const s = breakData.value?.summary || {}
  return [
    { key: 'limit_up_count', label: '最终涨停', value: s.limit_up_count },
    { key: 'resealed_count', label: '回封家数', value: s.resealed_count },
    { key: 'failed_break_count', label: '炸板家数', value: s.failed_break_count },
    { key: 'failed_break_rate', label: '炸板率', value: s.failed_break_rate, suffix: '%' },
    { key: 'reseal_rate_after_break', label: '回封率', value: s.reseal_rate_after_break, suffix: '%' }
  ]
})

const auctionCandidates = computed(() => auctionData.value?.top_candidates || auctionData.value?.candidates || [])
const auctionRows = computed(() => paginateRows(auctionCandidates.value, pagination.auction.page, pagination.auction.pageSize))
const themeList = computed(() => themeData.value?.themes || [])
const themeRows = computed(() => paginateRows(themeList.value, pagination.theme.page, pagination.theme.pageSize))
const hotMoneyRecords = computed(() => hotMoneyData.value?.records || [])
const hotMoneyRows = computed(() => paginateRows(hotMoneyRecords.value, pagination.hotMoney.page, pagination.hotMoney.pageSize))
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
      loadTab('auction', true),
      loadTab('theme', true),
      loadTab('break', true),
      loadTab('hotMoney', true)
    ])
  } finally {
    loadingAll.value = false
  }
}

async function loadTab(tab: TabName, force = false) {
  if (!tradeDate.value || loading[tab]) return
  if (loaded[tab] && !force) return

  loading[tab] = true
  try {
    if (tab === 'sentiment') {
      sentimentData.value = await fetchDailySentiment({ trade_date: tradeDate.value })
      lastQueryTime.value = sentimentData.value.query_time || ''
    } else if (tab === 'ladder') {
      const data = await fetchLimitStep({ trade_date: tradeDate.value })
      ladderData.value = normalizeLimitStepRows(data).filter(row => row.trade_date === tradeDate.value)
    } else if (tab === 'auction') {
      auctionData.value = await fetchAuctionCandidates({ trade_date: tradeDate.value, top_n: topN.value })
      pagination.auction.page = 1
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

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter(Boolean).map(String)
  if (typeof tags === 'string') return tags.split(/[,\s，、]+/).filter(Boolean)
  return []
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

.card-header,
.theme-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-header {
  font-weight: 600;
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

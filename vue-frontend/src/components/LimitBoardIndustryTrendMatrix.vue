<template>
  <div class="trend-matrix-view">
    <div v-if="!dates.length" class="matrix-empty">
      <el-empty description="暂无涨停趋势数据" />
    </div>

    <template v-else>
      <div class="matrix-legend">
        <span class="legend-label">纵轴按最近交易日（{{ formatDisplayDate(lastDate) }}）行业涨停数量倒序排列</span>
        <span class="legend-tip">点击单元格顶部涨停数量查看当日行业涨停详情，点击个股标签查看该股趋势图</span>
        <el-switch
          v-model="showStockList"
          class="legend-switch"
          active-text="展示个股列表"
        />
      </div>

      <div class="matrix-scroll">
        <table class="trend-matrix">
          <thead>
            <tr>
              <th class="corner-cell">
                <div class="corner-industry">行业</div>
                <div class="corner-date">日期 →</div>
              </th>
              <th v-for="date in dates" :key="date" class="date-head">
                <div class="date-text">{{ formatAxisDate(date) }}</div>
                <div class="overall-count" :title="`当日全市场涨停 ${overallCount(date)} 家`">
                  {{ overallCount(date) }}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="industry in industries" :key="industry">
              <th class="industry-head" :title="industry">
                <span class="industry-name">{{ industry }}</span>
                <span class="industry-total">{{ industryRangeTotal(industry) }}</span>
              </th>
              <td
                v-for="date in dates"
                :key="date"
                class="matrix-cell"
                :class="{ 'is-empty': cellCount(date, industry) === 0 }"
              >
                <template v-if="cellCount(date, industry) > 0">
                  <button
                    type="button"
                    class="cell-count"
                    :style="countStyle(date, industry)"
                    @click="openDetail(date, industry)"
                  >
                    <span class="count-total">{{ cellCount(date, industry) }}</span>
                    <span class="count-status">
                      <span
                        v-for="stat in cellStatusList(date, industry)"
                        :key="stat.key"
                        class="status-item"
                        :title="stat.label"
                      >{{ stat.symbol }}{{ stat.count }}</span>
                    </span>
                  </button>
                  <div v-if="showStockList" class="cell-stocks">
                    <button
                      v-for="stock in cellStocks(date, industry)"
                      :key="stock.ts_code || stock.name"
                      type="button"
                      class="stock-chip"
                      :class="tagClass(stock)"
                      :title="stockTooltip(stock)"
                      @click="openTrendDialog(stock)"
                    >
                      <span class="chip-name">{{ stock.name || stock.ts_code || '-' }}</span>
                      <span
                        v-if="stock.market_type && stock.market_type !== 'HS'"
                        class="chip-market"
                        :class="`chip-market-${stock.market_type.toLowerCase()}`"
                        :title="marketTypeLabel(stock.market_type)"
                      >{{ marketTypeShort(stock.market_type) }}</span>
                      <span v-if="stock.tag" class="chip-tag">{{ stock.tag }}</span>
                    </button>
                  </div>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <el-dialog
      v-model="detailVisible"
      :title="detailTitle"
      width="80%"
      top="6vh"
      destroy-on-close
    >
      <el-table :data="detailStocks" border stripe height="60vh" size="small">
        <el-table-column type="index" label="#" width="52" align="center" fixed />
        <el-table-column prop="name" label="名称" min-width="120" fixed show-overflow-tooltip>
          <template #default="{ row }">
            <el-button type="primary" link @click="openTrendDialog(row)">{{ row.name || row.ts_code || '-' }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="ts_code" label="代码" min-width="110" fixed />
        <el-table-column label="涨停标签" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.tag" :type="tagElType(row)" effect="plain">{{ row.tag }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="涨停状态" min-width="100" align="center" />
        <el-table-column label="市场类型" min-width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.market_type" :type="marketTypeElType(row.market_type)" effect="plain" size="small">
              {{ marketTypeLabel(row.market_type) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="lu_desc" label="涨停原因" min-width="200" show-overflow-tooltip />
        <el-table-column prop="limit_times" label="连板数" min-width="90" align="center" sortable
          :sort-method="(a: IndustryTrendStock, b: IndustryTrendStock) => numberOr(a.limit_times) - numberOr(b.limit_times)" />
        <el-table-column label="最新价" min-width="100" align="right" sortable
          :sort-method="(a: IndustryTrendStock, b: IndustryTrendStock) => numberOr(a.price) - numberOr(b.price)">
          <template #default="{ row }">{{ formatNumber(row.price) }}</template>
        </el-table-column>
        <el-table-column label="涨跌幅" min-width="100" align="right" sortable
          :sort-method="(a: IndustryTrendStock, b: IndustryTrendStock) => numberOr(a.pct_chg) - numberOr(b.pct_chg)">
          <template #default="{ row }">
            <span :class="pctClass(row.pct_chg)">{{ formatNumber(row.pct_chg, '%') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="流通市值" min-width="120" align="right" sortable
          :sort-method="(a: IndustryTrendStock, b: IndustryTrendStock) => numberOr(a.free_float) - numberOr(b.free_float)">
          <template #default="{ row }">{{ formatMoney(row.free_float) }}</template>
        </el-table-column>
        <el-table-column label="封单额" min-width="120" align="right" sortable
          :sort-method="(a: IndustryTrendStock, b: IndustryTrendStock) => numberOr(a.limit_amount) - numberOr(b.limit_amount)">
          <template #default="{ row }">{{ formatMoney(row.limit_amount) }}</template>
        </el-table-column>
        <el-table-column label="封单量" min-width="110" align="right" sortable
          :sort-method="(a: IndustryTrendStock, b: IndustryTrendStock) => numberOr(a.limit_order) - numberOr(b.limit_order)">
          <template #default="{ row }">{{ formatShares(row.limit_order) }}</template>
        </el-table-column>
        <el-table-column label="封成率" min-width="100" align="right" sortable
          :sort-method="(a: IndustryTrendStock, b: IndustryTrendStock) => numberOr(a.limit_up_suc_rate) - numberOr(b.limit_up_suc_rate)">
          <template #default="{ row }">{{ formatRate(row.limit_up_suc_rate) }}</template>
        </el-table-column>
        <el-table-column label="换手率" min-width="100" align="right" sortable
          :sort-method="(a: IndustryTrendStock, b: IndustryTrendStock) => turnoverOf(a) - turnoverOf(b)">
          <template #default="{ row }">{{ formatNumber(turnoverOf(row), '%') }}</template>
        </el-table-column>
        <el-table-column label="涨速" min-width="100" align="right" sortable
          :sort-method="(a: IndustryTrendStock, b: IndustryTrendStock) => numberOr(a.rise_rate) - numberOr(b.rise_rate)">
          <template #default="{ row }">{{ formatNumber(row.rise_rate, '%') }}</template>
        </el-table-column>
        <el-table-column prop="open_num" label="开板次数" min-width="100" align="center" sortable />
        <el-table-column label="首次封板时间" min-width="120" align="center">
          <template #default="{ row }">{{ row.first_lu_time || row.lu_time || '-' }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>

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
        <div class="toolbar-row">
          <div class="trend-tags">
            <el-tag v-if="selectedTrendStock.tsCode" type="info" effect="plain">{{ selectedTrendStock.tsCode }}</el-tag>
            <el-tag v-if="selectedTrendStock.industry" type="warning" effect="light">{{ selectedTrendStock.industry }}</el-tag>
            <el-tag v-if="selectedTrendStock.tag" type="danger" effect="light">{{ selectedTrendStock.tag }}</el-tag>
            <el-tag v-if="latestTrendPoint" type="info" effect="light">最新收盘 {{ latestTrendPoint.close_price.toFixed(2) }}</el-tag>
            <el-tag
              v-if="latestTrendPoint"
              :type="numberOr(latestTrendPoint.change_percent) >= 0 ? 'danger' : 'success'"
              effect="light"
            >
              涨跌幅 {{ formatNumber(latestTrendPoint.change_percent, '%') }}
            </el-tag>
          </div>

          <div class="trend-shortcuts">
            <el-radio-group v-model="trendShortcut" @change="handleTrendShortcutChange">
              <el-radio-button label="1y">最近1年</el-radio-button>
              <el-radio-button label="3y">最近3年</el-radio-button>
              <el-radio-button label="5y">最近5年</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <el-card class="trend-preview-card" v-loading="trendLoading">
          <StockKLineChart
            v-if="trendData.length"
            :stock-code="selectedTrendStock.tsCode"
            :stock-name="selectedTrendStock.name"
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
/**
 * 涨停行业趋势矩阵视图组件
 * 功能：
 * - 以「日期 x 行业」矩阵表格全面展示行业涨停趋势强度接口数据
 * - 横轴为交易日，最上方展示每日全市场整体涨停数量
 * - 纵轴为行业，按最近一个交易日的行业涨停数量从上往下倒序排列
 * - 交叉单元格顶部展示该日该行业涨停家数，下方以标签形式呈现个股涨停列表
 * - 点击单元格顶部涨停数量弹窗展示该日该行业个股涨停详情
 * 参数：
 * @param {Record<string, IndustryTrendDaily>} daily 以交易日 YYYYMMDD 为 key 的日度明细
 * 返回值：无
 * 事件：无
 */
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import StockKLineChart from '@/components/StockKLineChart.vue'
import { fetchStockHistoryData, type StockHistoryDataItem } from '@/services/stockHistoryApi'
import type {
  IndustryTrendDaily,
  IndustryTrendStatusCounts,
  IndustryTrendStock
} from '@/services/limitBoardStrategyApi'

type TrendShortcut = '1y' | '3y' | '5y'

/** 涨停状态展示配置：符号 + 全称，用于矩阵单元格节省空间 */
const STATUS_META: Array<{ key: keyof IndustryTrendStatusCounts; symbol: string; label: string }> = [
  { key: '一字板', symbol: '一', label: '一字板' },
  { key: 'T字板', symbol: 'T', label: 'T字板' },
  { key: '换手板', symbol: '换', label: '换手板' }
]

interface Props {
  /** 以交易日 YYYYMMDD 为 key 的日度三维明细 */
  daily: Record<string, IndustryTrendDaily>
}

const props = defineProps<Props>()

/** 是否在交叉块中展示个股涨停列表，默认开启 */
const showStockList = ref(true)

/** 升序排列的交易日列表（左旧右新） */
const dates = computed<string[]>(() =>
  Object.keys(props.daily || {})
    .filter(key => key && /^\d{8}$/.test(key))
    .sort((a, b) => a.localeCompare(b))
)

/** 最近一个交易日 */
const lastDate = computed(() => dates.value[dates.value.length - 1] || '')

/** 每个交易日 -> (行业 -> 涨停家数) 的快速查表 */
const dailyIndustryCount = computed(() => {
  const map = new Map<string, Map<string, number>>()
  dates.value.forEach(date => {
    const day = props.daily[date]
    const industryMap = new Map<string, number>()
    day?.industries?.forEach(item => {
      if (item?.industry) {
        industryMap.set(item.industry, Number(item.limit_up_count) || 0)
      }
    })
    // 兜底：若行业维度缺失，用个股列表长度补齐
    if (day?.stocks) {
      Object.entries(day.stocks).forEach(([industry, stocks]) => {
        if (!industryMap.has(industry)) {
          industryMap.set(industry, Array.isArray(stocks) ? stocks.length : 0)
        }
      })
    }
    map.set(date, industryMap)
  })
  return map
})

/** 区间累计每个行业的涨停家数，用于排序 tiebreak 及副标 */
const industryRangeTotals = computed(() => {
  const totals = new Map<string, number>()
  dailyIndustryCount.value.forEach(industryMap => {
    industryMap.forEach((count, industry) => {
      totals.set(industry, (totals.get(industry) || 0) + count)
    })
  })
  return totals
})

/**
 * 行业排序：按最近一个交易日的涨停家数倒序，
 * 最近日无数据的行业按区间累计倒序，最后按名称升序。
 */
const industries = computed<string[]>(() => {
  const lastDayMap = dailyIndustryCount.value.get(lastDate.value) || new Map<string, number>()
  const all = Array.from(industryRangeTotals.value.keys())
  return all.sort((a, b) => {
    const lastDiff = (lastDayMap.get(b) || 0) - (lastDayMap.get(a) || 0)
    if (lastDiff !== 0) return lastDiff
    const totalDiff = (industryRangeTotals.value.get(b) || 0) - (industryRangeTotals.value.get(a) || 0)
    if (totalDiff !== 0) return totalDiff
    return a.localeCompare(b)
  })
})

/** 单元格数值热度归一化用的最大值 */
const maxCellCount = computed(() => {
  let max = 0
  dailyIndustryCount.value.forEach(industryMap => {
    industryMap.forEach(count => {
      if (count > max) max = count
    })
  })
  return max
})

function overallCount(date: string): number {
  return Number(props.daily[date]?.overall?.limit_up_count) || 0
}

function industryRangeTotal(industry: string): number {
  return industryRangeTotals.value.get(industry) || 0
}

function cellCount(date: string, industry: string): number {
  return dailyIndustryCount.value.get(date)?.get(industry) || 0
}

/** 每个交易日 -> (行业 -> 涨停状态统计) 的快速查表 */
const dailyIndustryStatus = computed(() => {
  const map = new Map<string, Map<string, IndustryTrendStatusCounts>>()
  dates.value.forEach(date => {
    const statusMap = new Map<string, IndustryTrendStatusCounts>()
    props.daily[date]?.industries?.forEach(item => {
      if (item?.industry && item.status_counts) {
        statusMap.set(item.industry, item.status_counts)
      }
    })
    map.set(date, statusMap)
  })
  return map
})

/**
 * 单元格顶部涨停状态列表：以符号表示 T字板/一字板/换手板，
 * 仅展示数量大于 0 的状态以节省空间。
 */
function cellStatusList(date: string, industry: string) {
  const counts = dailyIndustryStatus.value.get(date)?.get(industry)
  if (!counts) return []
  return STATUS_META
    .map(meta => ({
      key: meta.key,
      symbol: meta.symbol,
      label: meta.label,
      count: numberOr(counts[meta.key])
    }))
    .filter(item => item.count > 0)
}

function cellStocks(date: string, industry: string): IndustryTrendStock[] {
  const stocks = props.daily[date]?.stocks?.[industry]
  if (!Array.isArray(stocks)) return []
  // 连板数高者优先，其次按换手率
  return [...stocks].sort((a, b) => {
    const boardDiff = boardOfStock(b) - boardOfStock(a)
    if (boardDiff !== 0) return boardDiff
    return numberOr(b.turnover_rate) - numberOr(a.turnover_rate)
  })
}

/** 单元格顶部涨停数量按热度着色 */
function countStyle(date: string, industry: string) {
  const count = cellCount(date, industry)
  const max = maxCellCount.value || 1
  const ratio = Math.min(1, count / max)
  const alpha = 0.15 + ratio * 0.7
  return {
    background: `rgba(217, 0, 27, ${alpha.toFixed(3)})`,
    color: ratio > 0.5 ? '#fff' : '#a30014'
  }
}

/** 个股标签样式：依据连板数或标签着色 */
function tagClass(stock: IndustryTrendStock): string {
  const board = boardOfStock(stock)
  if (board >= 5) return 'chip-hot-5'
  if (board >= 3) return 'chip-hot-3'
  if (board >= 2) return 'chip-hot-2'
  return 'chip-hot-1'
}

function tagElType(stock: IndustryTrendStock): 'success' | 'warning' | 'danger' | 'info' {
  const board = boardOfStock(stock)
  if (board >= 5) return 'danger'
  if (board >= 3) return 'warning'
  if (board >= 2) return 'success'
  return 'info'
}

function boardOfStock(stock: IndustryTrendStock): number {
  const times = numberOr(stock.limit_times)
  if (times > 0) return times
  // 兜底：从标签解析「N天N板」或「首板」
  const tag = stock.tag || ''
  if (tag.includes('首板')) return 1
  const match = tag.match(/(\d+)\s*板/)
  return match ? Number(match[1]) : 1
}

function stockTooltip(stock: IndustryTrendStock): string {
  const parts = [stock.name || stock.ts_code || '']
  if (stock.tag) parts.push(stock.tag)
  if (stock.lu_desc) parts.push(stock.lu_desc)
  return parts.filter(Boolean).join(' · ')
}

// -------- 详情弹窗 --------
const detailVisible = ref(false)
const detailDate = ref('')
const detailIndustry = ref('')

const detailStocks = computed<IndustryTrendStock[]>(() =>
  detailDate.value && detailIndustry.value ? cellStocks(detailDate.value, detailIndustry.value) : []
)

const detailTitle = computed(() => {
  if (!detailDate.value) return ''
  return `${formatDisplayDate(detailDate.value)} · ${detailIndustry.value} · 涨停 ${detailStocks.value.length} 家`
})

function openDetail(date: string, industry: string) {
  detailDate.value = date
  detailIndustry.value = industry
  detailVisible.value = true
}

// -------- 个股趋势图弹窗 --------
const trendDialogVisible = ref(false)
const trendLoading = ref(false)
const trendData = ref<StockHistoryDataItem[]>([])
const trendShortcut = ref<TrendShortcut>('1y')
const trendDateRange = reactive({ start: '', end: '' })
const selectedTrendStock = reactive({
  tsCode: '',
  name: '',
  industry: '',
  tag: ''
})
let trendRequestId = 0

const latestTrendPoint = computed(() =>
  trendData.value.length ? trendData.value[trendData.value.length - 1] : null
)

const trendDialogTitle = computed(() => {
  const label = selectedTrendStock.name || selectedTrendStock.tsCode
  return label ? `${label} 趋势图` : '个股趋势图'
})

/** 根据快捷区间计算起止日期（YYYY-MM-DD） */
function applyTrendShortcut(range: TrendShortcut) {
  const yearMap: Record<TrendShortcut, number> = { '1y': 1, '3y': 3, '5y': 5 }
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - yearMap[range])

  const fmt = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  trendDateRange.start = fmt(startDate)
  trendDateRange.end = fmt(endDate)
}

/** 加载趋势弹窗中的个股 K 线数据 */
async function loadTrendData() {
  const requestId = ++trendRequestId
  if (!selectedTrendStock.tsCode) {
    trendData.value = []
    return
  }

  trendLoading.value = true
  try {
    const response = await fetchStockHistoryData(
      selectedTrendStock.tsCode,
      trendDateRange.start.replace(/-/g, ''),
      trendDateRange.end.replace(/-/g, ''),
      'qfq'
    )
    if (requestId !== trendRequestId) return
    trendData.value = [...response].sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    if (requestId !== trendRequestId) return
    console.error('加载股票趋势图失败:', error)
    trendData.value = []
    ElMessage.error('加载股票趋势图失败，请稍后重试')
  } finally {
    if (requestId === trendRequestId) {
      trendLoading.value = false
    }
  }
}

/** 打开个股趋势弹窗 */
function openTrendDialog(stock: IndustryTrendStock) {
  const tsCode = stock.ts_code || ''
  if (!tsCode) {
    ElMessage.warning('该个股缺少股票代码，无法查看趋势图')
    return
  }
  selectedTrendStock.tsCode = tsCode
  selectedTrendStock.name = stock.name || ''
  selectedTrendStock.industry = stock.industry || detailIndustry.value || ''
  selectedTrendStock.tag = stock.tag || ''
  trendShortcut.value = '1y'
  trendData.value = []
  applyTrendShortcut('1y')
  trendDialogVisible.value = true
  loadTrendData()
}

/** 切换趋势弹窗快捷区间 */
function handleTrendShortcutChange(range: TrendShortcut) {
  applyTrendShortcut(range)
  loadTrendData()
}

// -------- 格式化 --------
function numberOr(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatNumber(value: unknown, suffix = ''): string {
  if (value === null || value === undefined || value === '') return '-'
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return `${Number.isInteger(n) ? n : n.toFixed(2)}${suffix}`
}

function pctClass(value: unknown): string {
  const n = Number(value)
  if (n > 0) return 'text-red'
  if (n < 0) return 'text-green'
  return ''
}

/** 格式化金额（元）：按亿/万换算 */
function formatMoney(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(2)}亿`
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(2)}万`
  return n.toFixed(2)
}

/** 格式化股数（股）：按亿/万手换算 */
function formatShares(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(2)}亿股`
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(2)}万股`
  return `${n.toFixed(0)}股`
}

/** 格式化比率（0-1 小数）为百分比 */
function formatRate(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return `${(n * 100).toFixed(1)}%`
}

/** 市场类型代码转中文标签 */
function marketTypeLabel(value: unknown): string {
  const map: Record<string, string> = {
    HS: '沪深主板',
    GEM: '创业板',
    STAR: '科创板'
  }
  const key = String(value ?? '').trim()
  if (!key) return '-'
  return map[key] || key
}

/** 市场类型代码转矩阵芯片用的极简标记 */
function marketTypeShort(value: unknown): string {
  const map: Record<string, string> = {
    HS: '主',
    GEM: '创',
    STAR: '科'
  }
  const key = String(value ?? '').trim()
  if (!key) return ''
  return map[key] || key
}

/** 市场类型代码转标签颜色 */
function marketTypeElType(value: unknown): 'success' | 'warning' | 'danger' | 'info' {
  const key = String(value ?? '').trim()
  if (key === 'GEM') return 'warning'
  if (key === 'STAR') return 'danger'
  return 'info'
}

/** 读取换手率：兼容 turnover_rate 与 turnover_ratio 两种字段 */
function turnoverOf(stock: IndustryTrendStock): number {
  const rate = stock.turnover_rate ?? stock.turnover_ratio
  return numberOr(rate)
}

function formatAxisDate(value: string): string {
  return value.length === 8 ? `${value.slice(4, 6)}-${value.slice(6, 8)}` : value
}

function formatDisplayDate(value: string): string {
  return value.length === 8
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    : value
}
</script>

<style scoped>
.trend-matrix-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.matrix-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  font-size: 12px;
  color: #606266;
}

.legend-label {
  font-weight: 600;
  color: #303133;
}

.legend-switch {
  margin-left: auto;
}

.matrix-scroll {
  overflow: auto;
  max-height: 72vh;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.trend-matrix {
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.trend-matrix th,
.trend-matrix td {
  border-right: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
}

/* 表头行 */
.trend-matrix thead th {
  position: sticky;
  top: 0;
  z-index: 3;
  background: #f5f7fa;
}

.date-head {
  width: 168px;
  min-width: 168px;
  padding: 6px 4px;
  text-align: center;
}

.date-text {
  font-size: 12px;
  color: #606266;
}

.overall-count {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 700;
  color: #d9001b;
}

/* 左上角 */
.corner-cell {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 5;
  width: 120px;
  min-width: 120px;
  background: #eef1f6;
  padding: 6px 8px;
  text-align: left;
}

.corner-industry {
  font-weight: 700;
  color: #303133;
}

.corner-date {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 行业列（左侧固定） */
.industry-head {
  position: sticky;
  left: 0;
  z-index: 2;
  width: 120px;
  min-width: 120px;
  background: #fafbfc;
  padding: 8px;
  text-align: left;
  vertical-align: top;
}

.industry-name {
  display: block;
  font-weight: 600;
  color: #303133;
  font-size: 13px;
  word-break: break-all;
}

.industry-total {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  color: #909399;
}

.industry-total::before {
  content: '区间 ';
}

/* 数据单元格 */
.matrix-cell {
  vertical-align: top;
  padding: 4px;
  background: #fff;
}

.matrix-cell.is-empty {
  background: #fbfbfb;
}

.cell-count {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  border: none;
  border-radius: 3px;
  padding: 2px 4px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: filter 0.15s ease;
}

.cell-count:hover {
  filter: brightness(0.92);
}

.count-total {
  font-size: 14px;
  font-weight: 700;
}

.count-status {
  display: inline-flex;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  opacity: 0.92;
}

.status-item {
  white-space: nowrap;
}

.cell-stocks {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stock-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  width: 100%;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  line-height: 1.5;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: filter 0.15s ease;
}

.stock-chip:hover {
  filter: brightness(0.94);
}

.chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-tag {
  flex-shrink: 0;
  font-size: 10px;
  opacity: 0.85;
}

.chip-market {
  flex-shrink: 0;
  padding: 0 3px;
  border-radius: 2px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
}

/* 创业板 */
.chip-market-gem {
  background: #fff7e6;
  color: #d48806;
  border: 1px solid #ffe1b0;
}

/* 科创板 */
.chip-market-star {
  background: #fff1f0;
  color: #cf1322;
  border: 1px solid #ffccc7;
}

.chip-hot-1 {
  background: #f0f9ff;
  border-color: #d6ebff;
  color: #3178c6;
}

.chip-hot-2 {
  background: #fff7e6;
  border-color: #ffe1b0;
  color: #d48806;
}

.chip-hot-3 {
  background: #fff1f0;
  border-color: #ffccc7;
  color: #d4380d;
}

.chip-hot-5 {
  background: #d9001b;
  border-color: #d9001b;
  color: #fff;
}

.text-red {
  color: #d9001b;
}

.text-green {
  color: #138a36;
}

/* 趋势图弹窗 */
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

.toolbar-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.trend-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.trend-shortcuts {
  display: flex;
  justify-content: flex-end;
}

.trend-preview-card {
  min-height: 220px;
}
</style>

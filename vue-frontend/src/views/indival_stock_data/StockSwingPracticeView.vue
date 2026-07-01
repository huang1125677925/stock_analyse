<template>
  <div class="stock-swing-practice-view" v-loading="loading" element-loading-text="正在加载股票RPS数据...">
    <el-card shadow="hover" class="filter-card">
      <template #header>
        <div class="card-header">
          <div>
            <h2>波段趋势选股</h2>
            <p>基于全市场股票 RPS 接口展示强势股榜单，支持按交易所、市场板块与周期筛选。</p>
          </div>
          <div class="header-actions">
            <el-button @click="resetFilters">重置条件</el-button>
            <el-button type="primary" :loading="loading" @click="loadStockRpsData">刷新榜单</el-button>
          </div>
        </div>
      </template>

      <el-form :model="filters" label-width="96px">
        <el-row :gutter="16">
          <el-col :xs="24" :md="8" :lg="6">
            <el-form-item label="搜索">
              <el-input
                v-model="filters.searchKeyword"
                clearable
                :prefix-icon="Search"
                placeholder="搜索股票名称、代码或行业"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="8" :lg="6">
            <el-form-item label="交易日">
              <el-date-picker
                v-model="filters.tradeDate"
                type="date"
                clearable
                format="YYYY-MM-DD"
                value-format="YYYYMMDD"
                placeholder="默认最近可用交易日"
                class="full-width"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="8" :lg="6">
            <el-form-item label="交易所">
              <el-select v-model="filters.exchange" clearable placeholder="全部交易所" class="full-width">
                <el-option
                  v-for="item in exchangeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="8" :lg="6">
            <el-form-item label="市场板块">
              <el-select v-model="filters.market" clearable placeholder="全部市场板块" class="full-width">
                <el-option
                  v-for="item in marketOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24">
            <el-form-item label="RPS 周期">
              <el-checkbox-group v-model="filters.periods">
                <el-checkbox
                  v-for="period in periodOptions"
                  :key="period"
                  :label="period"
                >
                  {{ period }}日
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div class="hint-row">
        <el-tag type="danger" effect="plain">默认按首个周期的 RPS 倒序展示</el-tag>
        <el-tag type="info" effect="plain">点击股票名称可查看前复权趋势图</el-tag>
        <span class="hint-text">RPS 越高，表示该股票在当前股票池中相对更强。</span>
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
        <span class="summary-label">返回记录数</span>
        <strong class="summary-value">{{ stockRpsData?.total ?? 0 }}</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">筛选后记录数</span>
        <strong class="summary-value">{{ filteredRows.length }}</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">实际交易日</span>
        <strong class="summary-value">{{ formatCompactDate(stockRpsData?.trade_date) }}</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">实际周期</span>
        <strong class="summary-value">{{ currentPeriodsText }}</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">交易所</span>
        <strong class="summary-value">{{ stockRpsData?.exchange || '全市场' }}</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">更新时间</span>
        <strong class="summary-value summary-time">{{ formatDateTime(stockRpsData?.query_time) }}</strong>
      </div>
    </div>

    <el-card shadow="hover" class="table-card">
      <template #header>
        <div class="table-header">
          <div>
            <div class="table-title">全市场股票 RPS 榜单</div>
            <p class="table-desc">支持查看当日强弱、各周期区间涨跌幅以及对应 RPS 强度。</p>
          </div>
          <div class="table-summary">
            <el-tag type="info" effect="plain">共 {{ filteredRows.length }} 条</el-tag>
            <el-tag v-if="stockRpsData?.market" type="success" effect="light">{{ stockRpsData.market }}</el-tag>
          </div>
        </div>
      </template>

      <div class="methodology">
        <p>RPS（Relative Price Strength）用于衡量股票在同一股票池中的相对强弱。系统会基于目标交易日横向计算当日涨跌幅和多个回看周期收益率，并生成对应排名。</p>
        <p>计算公式：`RPS = (1 - rank / total) * 100`。数值越高，说明该股票在当前筛选范围内越强。</p>
      </div>

      <el-table
        :data="filteredRows"
        stripe
        border
        height="640"
        style="width: 100%"
        empty-text="暂无股票RPS数据"
        highlight-current-row
        :default-sort="{ prop: defaultSortProp, order: 'descending' }"
        :row-class-name="tableRowClassName"
        @sort-change="handleSortChange"
      >
        <el-table-column type="index" label="#" width="56" fixed="left" align="center" />

        <el-table-column prop="ts_code" label="Tushare代码" min-width="128" sortable="custom" fixed="left" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.ts_code }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="股票名称" min-width="170" sortable="custom" prop="name" fixed="left" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="stock-name-cell">
              <el-button type="primary" link @click="openTrendDialog(row)">{{ row.name }}</el-button>
              <span>{{ row.symbol }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="industry" label="行业" min-width="140" show-overflow-tooltip sortable="custom" />
        <el-table-column prop="market" label="市场板块" min-width="110" align="center" sortable="custom" />
        <el-table-column prop="list_date" label="上市日期" min-width="110" align="center" sortable="custom">
          <template #default="{ row }">{{ formatCompactDate(row.list_date) }}</template>
        </el-table-column>

        <el-table-column prop="pct_change" label="当日涨跌幅" min-width="120" align="center" sortable="custom">
          <template #default="{ row }">
            <span :class="getChangeClass(row.pct_change)">{{ formatPercent(row.pct_change) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="RPS_today" label="RPS_today" min-width="140" align="center" sortable="custom">
          <template #default="{ row }">
            <div class="rps-cell">
              <el-progress
                :percentage="getNumericValue(row.RPS_today)"
                :color="getRpsColor(getNumericValue(row.RPS_today))"
                :format="() => formatRpsValue(row.RPS_today)"
                :stroke-width="16"
                :text-inside="true"
              />
              <div class="rps-rank" :class="getRpsRankClass(getNumericValue(row.RPS_today))">
                {{ getRpsRankText(getNumericValue(row.RPS_today)) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <template v-for="period in currentPeriods" :key="period">
          <el-table-column
            :prop="getReturnProp(period)"
            :label="`${period}日涨跌幅`"
            min-width="120"
            align="center"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="getChangeClass(row[getReturnProp(period)])">
                {{ formatPercent(row[getReturnProp(period)]) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column
            :prop="getRpsProp(period)"
            :label="`RPS_${period}`"
            min-width="140"
            align="center"
            sortable="custom"
          >
            <template #default="{ row }">
              <div class="rps-cell">
                <el-progress
                  :percentage="getNumericValue(row[getRpsProp(period)])"
                  :color="getRpsColor(getNumericValue(row[getRpsProp(period)]))"
                  :format="() => formatRpsValue(row[getRpsProp(period)])"
                  :stroke-width="16"
                  :text-inside="true"
                />
                <div class="rps-rank" :class="getRpsRankClass(getNumericValue(row[getRpsProp(period)]))">
                  {{ getRpsRankText(getNumericValue(row[getRpsProp(period)])) }}
                </div>
              </div>
            </template>
          </el-table-column>
        </template>
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
          <div class="trend-dialog-title">{{ selectedTrendStock.name || selectedTrendStock.tsCode }} 趋势图</div>
          <div class="trend-dialog-subtitle">{{ trendDateRange.start || '-' }} 至 {{ trendDateRange.end || '-' }}</div>
        </div>
      </template>

      <div class="trend-dialog-body">
        <div class="toolbar-row">
          <div class="table-summary">
            <el-tag v-if="selectedTrendStock.symbol" type="info" effect="plain">代码 {{ selectedTrendStock.symbol }}</el-tag>
            <el-tag v-if="selectedTrendStock.industry" type="warning" effect="light">{{ selectedTrendStock.industry }}</el-tag>
            <el-tag v-if="selectedTrendStock.market" type="success" effect="light">{{ selectedTrendStock.market }}</el-tag>
            <el-tag v-if="latestTrendPoint" type="info" effect="light">最新收盘 {{ latestTrendPoint.close_price.toFixed(2) }}</el-tag>
            <el-tag
              v-if="latestTrendPoint"
              :type="getNumericValue(latestTrendPoint.change_percent) >= 0 ? 'danger' : 'success'"
              effect="light"
            >
              涨跌幅 {{ formatPercent(latestTrendPoint.change_percent) }}
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
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import StockKLineChart from '@/components/StockKLineChart.vue'
import { fetchStockHistoryData, type StockHistoryDataItem } from '@/services/stockHistoryApi'
import { getStockRps, type StockRpsData, type StockRpsItem } from '@/services/strategyApi'

type StockRpsValue = number | string | null | undefined
type TrendShortcut = '1y' | '3y' | '5y'
type DynamicReturnField = `return_${number}`
type DynamicRpsField = `RPS_${number}`

interface StockRpsFilters {
  searchKeyword: string
  periods: number[]
  tradeDate: string
  exchange: string
  market: string
}

/**
 * 组件：波段趋势选股页面（StockSwingPracticeView）
 * 功能：基于 `/django/api/strategy/stock-rps/` 展示全市场股票 RPS 榜单，并支持点击个股查看前复权趋势图。
 * 参数：无。
 * 返回值：无，组件返回股票 RPS 筛选面板、汇总卡片、数据表格和趋势弹窗。
 * 事件：
 *  - 点击“刷新榜单”时重新请求股票 RPS 数据；
 *  - 点击“重置条件”时恢复默认筛选条件并重新加载；
 *  - 点击股票名称时打开趋势弹窗并请求对应股票历史 K 线数据。
 */

const defaultPeriods = [5, 20, 60]
const periodOptions = [5, 10, 20, 60, 120, 250]
const exchangeOptions = [
  { label: '上交所', value: 'SSE' },
  { label: '深交所', value: 'SZSE' },
  { label: '北交所', value: 'BSE' }
]
const marketOptions = [
  { label: '主板', value: '主板' },
  { label: '创业板', value: '创业板' },
  { label: '科创板', value: '科创板' },
  { label: '北交所', value: '北交所' }
]

const filters = reactive<StockRpsFilters>({
  searchKeyword: '',
  periods: [...defaultPeriods],
  tradeDate: '',
  exchange: '',
  market: ''
})

const loading = ref(false)
const stockRpsData = ref<StockRpsData | null>(null)
const stockRpsRows = ref<StockRpsItem[]>([])

const trendDialogVisible = ref(false)
const trendLoading = ref(false)
const trendData = ref<StockHistoryDataItem[]>([])
const trendShortcut = ref<TrendShortcut>('1y')
const trendDateRange = reactive({
  start: '',
  end: ''
})
const selectedTrendStock = reactive({
  tsCode: '',
  symbol: '',
  name: '',
  industry: '',
  market: ''
})
let trendRequestId = 0

/**
 * 工具：将任意接口值安全转换为数字。
 * 参数：value 为接口原始字段。
 * 返回值：有效数值返回数字，无效值返回 0。
 * 事件：无。
 */
const getNumericValue = (value: StockRpsValue): number => {
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(numericValue) ? numericValue : 0
}

/**
 * 工具：格式化百分比文本。
 * 参数：value 为接口原始字段。
 * 返回值：带符号的百分比字符串；无效值返回 `-`。
 * 事件：无。
 */
const formatPercent = (value: StockRpsValue): string => {
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(numericValue)) return '-'
  const sign = numericValue > 0 ? '+' : ''
  return `${sign}${numericValue.toFixed(2)}%`
}

/**
 * 工具：格式化 RPS 文本。
 * 参数：value 为接口原始 RPS 字段。
 * 返回值：一位小数的字符串；无效值返回 `-`。
 * 事件：无。
 */
const formatRpsValue = (value: StockRpsValue): string => {
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(numericValue)) return '-'
  return numericValue.toFixed(1)
}

/**
 * 工具：格式化 YYYYMMDD 日期文本。
 * 参数：value 为接口返回的日期字符串。
 * 返回值：`YYYY-MM-DD`；无效值返回 `-`。
 * 事件：无。
 */
const formatCompactDate = (value?: string | null): string => {
  if (!value) return '-'
  const normalizedValue = String(value).trim()
  if (!/^\d{8}$/.test(normalizedValue)) return normalizedValue
  return `${normalizedValue.slice(0, 4)}-${normalizedValue.slice(4, 6)}-${normalizedValue.slice(6, 8)}`
}

/**
 * 工具：格式化查询时间。
 * 参数：value 为 ISO 时间字符串。
 * 返回值：本地可读时间；无效值返回 `-`。
 * 事件：无。
 */
const formatDateTime = (value?: string | null): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

/**
 * 工具：根据涨跌幅返回颜色类名。
 * 参数：value 为涨跌幅字段。
 * 返回值：上涨返回 `text-up`，下跌返回 `text-down`，其余返回空字符串。
 * 事件：无。
 */
const getChangeClass = (value: StockRpsValue): string => {
  const numericValue = getNumericValue(value)
  if (numericValue > 0) return 'text-up'
  if (numericValue < 0) return 'text-down'
  return ''
}

/**
 * 工具：读取股票 RPS 记录中的动态字段值。
 * 参数：
 *  - item 为单条股票 RPS 记录；
 *  - field 为动态字段名，如 `RPS_20`、`return_60`。
 * 返回值：字段原始值。
 * 事件：无。
 */
const getRowFieldValue = (item: StockRpsItem, field: string): StockRpsValue => {
  return Reflect.get(item, field) as StockRpsValue
}

const getReturnProp = (period: number): DynamicReturnField => `return_${period}` as DynamicReturnField
const getRpsProp = (period: number): DynamicRpsField => `RPS_${period}` as DynamicRpsField

const getRpsColor = (rpsValue: number): string => {
  if (rpsValue >= 90) return '#ef4444'
  if (rpsValue >= 80) return '#f59e0b'
  if (rpsValue >= 70) return '#10b981'
  return '#9ca3af'
}

const getRpsRankText = (rpsValue: number): string => {
  if (rpsValue >= 90) return '极强'
  if (rpsValue >= 80) return '强势'
  if (rpsValue >= 70) return '良好'
  if (rpsValue >= 50) return '一般'
  return '弱势'
}

const getRpsRankClass = (rpsValue: number): string => {
  if (rpsValue >= 90) return 'rank-excellent'
  if (rpsValue >= 80) return 'rank-strong'
  if (rpsValue >= 70) return 'rank-good'
  if (rpsValue >= 50) return 'rank-normal'
  return 'rank-weak'
}

const currentPeriods = computed<number[]>(() => {
  return stockRpsData.value?.periods?.length ? stockRpsData.value.periods : filters.periods
})

const currentPeriodsText = computed(() => {
  if (!currentPeriods.value.length) return '-'
  return currentPeriods.value.join(' / ')
})

const defaultSortProp = computed(() => {
  const firstPeriod = currentPeriods.value[0]
  return firstPeriod ? getRpsProp(firstPeriod) : 'RPS_today'
})

const warningMessages = computed(() => stockRpsData.value?.errors || [])

const filteredRows = computed<StockRpsItem[]>(() => {
  const keyword = filters.searchKeyword.trim().toLowerCase()
  if (!keyword) {
    return stockRpsRows.value
  }

  return stockRpsRows.value.filter((item) => {
    return [
      item.name,
      item.symbol,
      item.ts_code,
      item.industry || '',
      item.market || ''
    ].some((field) => field.toLowerCase().includes(keyword))
  })
})

const latestTrendPoint = computed(() => {
  return trendData.value.length ? trendData.value[trendData.value.length - 1] : null
})

/**
 * 工具：生成 `stock-rps` 接口所需周期参数。
 * 参数：periods 为当前勾选的周期数组。
 * 返回值：逗号分隔的周期字符串。
 * 事件：无。
 */
const buildPeriodsParam = (periods: number[]): string => {
  return [...periods].sort((a, b) => a - b).join(',')
}

/**
 * 工具：格式化趋势弹窗的日期范围。
 * 参数：range 为快捷区间值。
 * 返回值：无。
 * 事件：更新 `trendDateRange.start` 和 `trendDateRange.end`。
 */
const applyTrendShortcut = (range: TrendShortcut) => {
  const yearMap: Record<TrendShortcut, number> = { '1y': 1, '3y': 3, '5y': 5 }
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - yearMap[range])

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  trendDateRange.start = formatDate(startDate)
  trendDateRange.end = formatDate(endDate)
}

const formatDateForHistoryApi = (dateText: string): string => dateText.replace(/-/g, '')

/**
 * 数据请求：加载股票 RPS 榜单。
 * 参数：无，直接读取当前筛选条件。
 * 返回值：Promise<void>。
 * 事件：更新 `stockRpsData`、`stockRpsRows`、`loading`。
 */
const loadStockRpsData = async () => {
  if (!filters.periods.length) {
    ElMessage.warning('请至少选择一个 RPS 周期')
    return
  }

  loading.value = true
  try {
    const response = await getStockRps({
      periods: buildPeriodsParam(filters.periods),
      trade_date: filters.tradeDate || undefined,
      exchange: filters.exchange || undefined,
      market: filters.market || undefined
    })
    stockRpsData.value = response
    stockRpsRows.value = response.data || []
  } catch (error) {
    console.error('加载股票RPS数据失败:', error)
    stockRpsData.value = null
    stockRpsRows.value = []
    ElMessage.error('加载股票RPS数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

/**
 * 事件：重置筛选条件。
 * 参数：无。
 * 返回值：Promise<void>。
 * 事件：恢复默认筛选后重新加载股票 RPS 榜单。
 */
const resetFilters = async () => {
  filters.searchKeyword = ''
  filters.periods = [...defaultPeriods]
  filters.tradeDate = ''
  filters.exchange = ''
  filters.market = ''
  await loadStockRpsData()
}

/**
 * 数据请求：按优先顺序请求个股历史 K 线。
 * 参数：无，使用当前弹窗中选中的股票代码。
 * 返回值：Promise<StockHistoryDataItem[]>。
 * 事件：无。
 */
const requestTrendHistoryData = async (): Promise<StockHistoryDataItem[]> => {
  const candidateCodes = [selectedTrendStock.tsCode, selectedTrendStock.symbol].filter(
    (value, index, array): value is string => Boolean(value) && array.indexOf(value) === index
  )
  let lastError: unknown = null

  for (const code of candidateCodes) {
    try {
      return await fetchStockHistoryData(
        code,
        formatDateForHistoryApi(trendDateRange.start),
        formatDateForHistoryApi(trendDateRange.end),
        'qfq'
      )
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

/**
 * 数据请求：加载趋势弹窗中的个股 K 线。
 * 参数：无，直接读取当前弹窗状态。
 * 返回值：Promise<void>。
 * 事件：更新 `trendData` 和 `trendLoading`。
 */
const loadTrendData = async () => {
  const requestId = ++trendRequestId

  if (!selectedTrendStock.tsCode && !selectedTrendStock.symbol) {
    trendData.value = []
    return
  }

  trendLoading.value = true
  try {
    const response = await requestTrendHistoryData()
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

/**
 * 事件：打开个股趋势弹窗。
 * 参数：row 为当前表格行对应的股票记录。
 * 返回值：void。
 * 事件：设置弹窗股票信息、默认区间并加载趋势数据。
 */
const openTrendDialog = (row: StockRpsItem) => {
  selectedTrendStock.tsCode = row.ts_code
  selectedTrendStock.symbol = row.symbol
  selectedTrendStock.name = row.name
  selectedTrendStock.industry = row.industry || ''
  selectedTrendStock.market = row.market || ''
  trendShortcut.value = '1y'
  trendData.value = []
  applyTrendShortcut('1y')
  trendDialogVisible.value = true
  loadTrendData()
}

/**
 * 事件：切换趋势弹窗快捷区间。
 * 参数：range 为快捷区间值。
 * 返回值：void。
 * 事件：更新查询区间并重新加载趋势数据。
 */
const handleTrendShortcutChange = (range: TrendShortcut) => {
  applyTrendShortcut(range)
  loadTrendData()
}

/**
 * 事件：表格排序变化。
 * 参数：sort 为 Element Plus 表格排序对象。
 * 返回值：void。
 * 事件：直接对原始股票 RPS 数组进行排序。
 */
const handleSortChange = (sort: { prop: string; order: string | null }) => {
  if (!sort.prop || !sort.order) return

  stockRpsRows.value.sort((left, right) => {
    const leftValue = getNumericValue(getRowFieldValue(left, sort.prop))
    const rightValue = getNumericValue(getRowFieldValue(right, sort.prop))
    return sort.order === 'ascending' ? leftValue - rightValue : rightValue - leftValue
  })
}

/**
 * 工具：根据首个周期的 RPS 返回表格行样式。
 * 参数：row 为当前表格行。
 * 返回值：行样式类名。
 * 事件：无。
 */
const tableRowClassName = ({ row }: { row: StockRpsItem }): string => {
  const firstPeriod = currentPeriods.value[0]
  const field = firstPeriod ? getRpsProp(firstPeriod) : 'RPS_today'
  const rpsValue = getNumericValue(getRowFieldValue(row, field))

  if (rpsValue >= 90) return 'row-excellent'
  if (rpsValue >= 80) return 'row-strong'
  if (rpsValue >= 70) return 'row-good'
  return ''
}

onMounted(() => {
  loadStockRpsData()
})
</script>

<style scoped>
.stock-swing-practice-view {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card,
.table-card,
.trend-preview-card {
  border-radius: 14px;
}

.card-header,
.table-header,
.toolbar-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.card-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
  color: #111827;
}

.card-header p,
.table-desc,
.hint-text {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.header-actions,
.table-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.full-width {
  width: 100%;
}

.hint-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.warning-alert {
  margin-top: -4px;
}

.warning-list {
  display: grid;
  gap: 4px;
  font-size: 13px;
  line-height: 1.6;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}

.summary-item {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
}

.summary-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  color: #6b7280;
}

.summary-value {
  display: block;
  color: #111827;
  font-size: 20px;
  line-height: 1.2;
}

.summary-time {
  font-size: 15px;
}

.table-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 6px;
}

.methodology {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #f8fafc;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.7;
}

.methodology p {
  margin: 0;
}

.methodology p + p {
  margin-top: 6px;
}

.stock-name-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.stock-name-cell span {
  color: #6b7280;
  font-size: 12px;
}

.text-up {
  color: #dc2626;
  font-weight: 600;
}

.text-down {
  color: #2563eb;
  font-weight: 600;
}

.rps-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rps-rank {
  align-self: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.4;
}

.rank-excellent {
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.rank-strong {
  color: #d97706;
  background: #fffbeb;
  border: 1px solid #fde68a;
}

.rank-good {
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.rank-normal {
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.rank-weak {
  color: #6b7280;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
}

.trend-dialog-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trend-dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.trend-dialog-subtitle {
  font-size: 13px;
  color: #6b7280;
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

:deep(.el-table) {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
}

:deep(.row-excellent) {
  background: rgba(239, 68, 68, 0.05);
}

:deep(.row-strong) {
  background: rgba(245, 158, 11, 0.06);
}

:deep(.row-good) {
  background: rgba(59, 130, 246, 0.06);
}

@media (max-width: 768px) {
  .stock-swing-practice-view {
    padding: 14px;
  }

  .trend-shortcuts {
    justify-content: flex-start;
  }
}
</style>

<template>
  <div
    class="stock-swing-practice-view"
    v-loading="loading"
    element-loading-text="正在加载股票RPS数据..."
  >
    <section class="filter-panel" aria-label="股票RPS筛选条件">
      <el-form :model="filters" class="compact-filter-form">
        <div class="compact-filter-row">
          <el-form-item label="搜索">
            <el-input
              v-model="filters.searchKeyword"
              clearable
              :prefix-icon="Search"
              placeholder="搜索股票名称、代码或行业"
            />
          </el-form-item>
          <el-form-item label="交易日">
            <el-date-picker
              v-model="filters.tradeDate"
              type="date"
              value-format="YYYYMMDD"
              format="YYYY-MM-DD"
              placeholder="选择交易日"
              :clearable="false"
              :disabled-date="isTradeDateDisabled"
              class="full-width"
            />
          </el-form-item>
          <el-form-item label="交易所">
            <el-select
              v-model="filters.exchange"
              clearable
              placeholder="全部交易所"
              class="full-width"
            >
              <el-option
                v-for="item in exchangeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="市场板块">
            <el-select v-model="filters.market" placeholder="请选择市场板块" class="full-width">
              <el-option
                v-for="item in marketOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="行业映射">
            <el-select
              v-model="filters.industryMapping"
              placeholder="请选择行业映射"
              class="full-width"
            >
              <el-option
                v-for="item in industryMappingOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
    </section>

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

    <section class="ranking-panel" aria-label="全市场股票RPS榜单">
      <div class="ranking-panel-header">
        <div class="table-header">
          <div class="table-title-row">
            <div class="table-title">全市场股票 RPS 榜单</div>
            <el-popover placement="bottom-start" trigger="click" width="420">
              <template #reference>
                <el-button
                  class="info-button"
                  circle
                  size="small"
                  :icon="InfoFilled"
                  aria-label="查看RPS说明"
                />
              </template>
              <div class="info-popover">
                <p>RPS（Relative Price Strength）用于衡量股票在同一股票池中的相对强弱。</p>
                <p>系统基于目标交易日横向计算当日涨跌幅和 5 / 20 / 60 日收益率，并生成对应排名。</p>
                <p>
                  计算公式：RPS = (1 - rank / total) *
                  100。数值越高，说明该股票在当前筛选范围内越强。
                </p>
                <p>条件变更后自动刷新；点击股票名称可查看前复权趋势图。</p>
              </div>
            </el-popover>
          </div>
          <div class="table-summary">
            <el-tag type="info" effect="plain">返回 {{ stockRpsData?.total ?? 0 }}</el-tag>
            <el-tag type="primary" effect="light">筛选 {{ filteredRows.length }}</el-tag>
            <el-tag effect="plain">{{ formatCompactDate(stockRpsData?.trade_date) }}</el-tag>
            <el-tag effect="plain">{{ currentPeriodsText }}</el-tag>
            <el-tag effect="plain">{{ stockRpsData?.exchange || '全市场' }}</el-tag>
            <el-tag v-if="stockRpsData?.market" type="success" effect="light">{{
              stockRpsData.market
            }}</el-tag>
            <el-tag effect="plain">{{ formatDateTime(stockRpsData?.query_time) }}</el-tag>
          </div>
        </div>
        <div class="table-filter-toolbar">
          <div
            v-for="filterGroup in rpsFilterGroups"
            :key="filterGroup.field"
            class="toolbar-filter"
          >
            <el-select
              v-model="selectedRpsRanks[filterGroup.field]"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              :placeholder="filterGroup.label"
            >
              <el-option
                v-for="tag in rpsRankOptions"
                :key="`${filterGroup.field}-${tag}`"
                :label="tag"
                :value="tag"
              />
            </el-select>
          </div>
          <div
            v-for="filterGroup in changeFilterGroups"
            :key="filterGroup.field"
            class="toolbar-filter"
          >
            <el-select
              v-model="selectedChangeDirections[filterGroup.field]"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              :placeholder="filterGroup.label"
            >
              <el-option
                v-for="tag in changeDirectionOptions"
                :key="`${filterGroup.field}-${tag}`"
                :label="tag"
                :value="tag"
              />
            </el-select>
          </div>
          <div
            v-for="filterGroup in valueFilterGroups"
            :key="filterGroup.field"
            class="toolbar-filter"
          >
            <el-select
              v-model="selectedValueRanges[filterGroup.field]"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              :placeholder="filterGroup.label"
            >
              <el-option
                v-for="option in filterGroup.options"
                :key="`${filterGroup.field}-${option.label}`"
                :label="option.label"
                :value="option.label"
              />
            </el-select>
          </div>
          <el-button
            v-if="hasAnyTableFilter"
            link
            type="primary"
            class="toolbar-filter-reset"
            @click="resetAllTableFilters"
          >
            清空筛选
          </el-button>
        </div>
      </div>

      <el-table
        class="ranking-table"
        :data="filteredRows"
        stripe
        :height="isMobile ? undefined : 'calc(100dvh - 300px)'"
        :max-height="isMobile ? 560 : undefined"
        style="width: 100%"
        empty-text="暂无股票RPS数据"
        highlight-current-row
        :default-sort="{ prop: defaultSortProp, order: 'descending' }"
        :row-class-name="tableRowClassName"
        @sort-change="handleSortChange"
      >
        <el-table-column
          type="index"
          label="#"
          :width="isMobile ? 34 : 56"
          :fixed="isMobile ? false : 'left'"
          align="center"
        />

        <el-table-column
          label="股票名称/代码"
          :min-width="isMobile ? 92 : 150"
          align="center"
          sortable="custom"
          prop="name"
          :fixed="isMobile ? false : 'left'"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div class="stock-name-cell">
              <el-button type="primary" link @click="openTrendDialog(row)">{{
                row.name
              }}</el-button>
              <span>{{ row.symbol }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          prop="industry"
          label="行业"
          :min-width="isMobile ? 78 : 140"
          align="center"
          show-overflow-tooltip
          sortable="custom"
        >
          <template #default="{ row }">
            <div class="industry-cell">
              <el-button
                v-if="isDcIndustryMapping && row.industry"
                type="primary"
                link
                @click="openIndustryLeadRise(row)"
              >
                {{ row.industry }}
              </el-button>
              <span v-else>{{ row.industry || '-' }}</span>
              <span v-if="row.industry_code" class="industry-code">{{ row.industry_code }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          prop="latest_price"
          label="最新股价"
          :min-width="isMobile ? 68 : 110"
          align="center"
          sortable="custom"
        >
          <template #default="{ row }">{{ formatPrice(row.latest_price) }}</template>
        </el-table-column>

        <el-table-column
          prop="circ_mv"
          label="流通市值"
          :min-width="isMobile ? 76 : 120"
          align="center"
          sortable="custom"
        >
          <template #default="{ row }">{{ formatMarketCap(row.circ_mv) }}</template>
        </el-table-column>

        <el-table-column
          prop="RPS_today"
          label="当日涨跌幅/RPS"
          :min-width="isMobile ? 116 : 160"
          align="center"
          sortable="custom"
        >
          <template #default="{ row }">
            <div class="rps-cell">
              <span :class="getChangeClass(row.pct_change)">{{
                formatPercent(row.pct_change)
              }}</span>
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
            :prop="getRpsProp(period)"
            :label="`${period}日涨跌幅/RPS`"
            :min-width="isMobile ? 116 : 160"
            align="center"
            sortable="custom"
          >
            <template #default="{ row }">
              <div class="rps-cell">
                <span :class="getChangeClass(row[getReturnProp(period)])">
                  {{ formatPercent(row[getReturnProp(period)]) }}
                </span>
                <el-progress
                  :percentage="getNumericValue(row[getRpsProp(period)])"
                  :color="getRpsColor(getNumericValue(row[getRpsProp(period)]))"
                  :format="() => formatRpsValue(row[getRpsProp(period)])"
                  :stroke-width="16"
                  :text-inside="true"
                />
                <div
                  class="rps-rank"
                  :class="getRpsRankClass(getNumericValue(row[getRpsProp(period)]))"
                >
                  {{ getRpsRankText(getNumericValue(row[getRpsProp(period)])) }}
                </div>
              </div>
            </template>
          </el-table-column>
        </template>
      </el-table>
    </section>

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
          <div class="trend-dialog-title">
            {{ selectedTrendStock.name || selectedTrendStock.tsCode }} 趋势图
          </div>
          <div class="trend-dialog-subtitle">
            {{ trendDateRange.start || '-' }} 至 {{ trendDateRange.end || '-' }}
          </div>
        </div>
      </template>

      <div class="trend-dialog-body">
        <div class="toolbar-row">
          <div class="table-summary">
            <el-tag v-if="selectedTrendStock.symbol" type="info" effect="plain"
              >代码 {{ selectedTrendStock.symbol }}</el-tag
            >
            <el-tag v-if="selectedTrendStock.industry" type="warning" effect="light">{{
              selectedTrendStock.industry
            }}</el-tag>
            <el-tag v-if="selectedTrendStock.market" type="success" effect="light">{{
              selectedTrendStock.market
            }}</el-tag>
            <el-tag v-if="latestTrendPoint" type="info" effect="light"
              >最新收盘 {{ latestTrendPoint.close_price.toFixed(2) }}</el-tag
            >
            <el-tag
              v-if="latestTrendPoint"
              :type="getNumericValue(latestTrendPoint.change_percent) >= 0 ? 'danger' : 'success'"
              effect="light"
            >
              涨跌幅 {{ formatPercent(latestTrendPoint.change_percent) }}
            </el-tag>
          </div>

          <div class="trend-toolbar-right">
            <div class="trend-nav">
              <el-button
                :icon="ArrowLeft"
                :disabled="!hasPrevTrendStock"
                @click="stepTrendStock(-1)"
              >
                上一只
              </el-button>
              <span v-if="trendNavPositionText" class="trend-nav-position">{{
                trendNavPositionText
              }}</span>
              <el-button :disabled="!hasNextTrendStock" @click="stepTrendStock(1)">
                下一只
                <el-icon class="el-icon--right"><ArrowRight /></el-icon>
              </el-button>
            </div>

            <div class="trend-shortcuts">
              <el-radio-group v-model="trendShortcut" @change="handleTrendShortcutChange">
                <el-radio-button label="2m">最近2月</el-radio-button>
                <el-radio-button label="1y">最近1年</el-radio-button>
                <el-radio-button label="3y">最近3年</el-radio-button>
                <el-radio-button label="5y">最近5年</el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </div>

        <div class="trend-preview-card" v-loading="trendLoading">
          <StockKLineChart
            v-if="trendData.length"
            :stock-code="selectedTrendStock.tsCode"
            :stock-name="selectedTrendStock.name"
            :kline-data="trendData"
            :height="isMobile ? '300px' : '420px'"
          />
          <el-empty v-else-if="!trendLoading" description="当前区间暂无K线数据" :image-size="80" />
        </div>
      </div>
    </el-dialog>

    <LeadRiseMatrixDialog
      v-model="leadRiseVisible"
      :ts-code="leadRiseTsCode"
      :idx-type="leadRiseIdxType"
      :name="leadRiseName"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, InfoFilled, Search } from '@element-plus/icons-vue'
import { useIsMobile } from '@/composables/useIsMobile'
import StockKLineChart from '@/components/StockKLineChart.vue'
import LeadRiseMatrixDialog from '@/components/LeadRiseMatrixDialog.vue'
import { fetchStockHistoryData, type StockHistoryDataItem } from '@/services/stockHistoryApi'
import {
  getStockRps,
  type StockRpsData,
  type StockRpsItem,
  type IndustryMapping,
} from '@/services/strategyApi'

const { isMobile } = useIsMobile()

type StockRpsValue = number | string | null | undefined
type TrendShortcut = '2m' | '1y' | '3y' | '5y'
type DynamicReturnField = `return_${number}`
type DynamicRpsField = `RPS_${number}`
type RpsRankLabel = '极强' | '强势' | '良好' | '一般' | '弱势'
type ChangeDirectionLabel = '上涨' | '平盘' | '下跌'
type ValueRangeField = 'latest_price' | 'circ_mv'

interface RangeOption {
  label: string
  min: number
  max: number | null
}

interface StockRpsFilters {
  searchKeyword: string
  periods: number[]
  tradeDate: string
  exchange: string
  market: string
  industryMapping: IndustryMapping
}

/**
 * 组件：波段趋势选股页面（StockSwingPracticeView）
 * 功能：基于 `/django/api/strategy/stock-rps/` 展示全市场股票 RPS 榜单，并支持点击个股查看前复权趋势图。
 * 参数：无。
 * 返回值：无，组件返回股票 RPS 筛选面板、汇总卡片、数据表格和趋势弹窗。
 * 事件：
 *  - 切换交易日、交易所或市场板块时自动请求最新榜单；
 *  - 点击股票名称时打开趋势弹窗并请求对应股票历史 K 线数据。
 */

const defaultPeriods = [5, 20, 60]
const latestSelectableTradeDate = getDefaultTradeDate()
const exchangeOptions = [
  { label: '上交所', value: 'SSE' },
  { label: '深交所', value: 'SZSE' },
  { label: '北交所', value: 'BSE' },
]
const exchangeMarketMap: Record<string, string[]> = {
  SSE: ['主板', '科创板'],
  SZSE: ['主板', '创业板'],
  BSE: ['北交所'],
}
const allMarketOptions = [
  { label: '主板', value: '主板' },
  { label: '创业板', value: '创业板' },
  { label: '科创板', value: '科创板' },
  { label: '北交所', value: '北交所' },
]
const industryMappingOptions = [
  { label: '默认行业', value: 'default' },
  { label: '东财概念板块', value: 'dc_concept' },
  { label: '东财地域板块', value: 'dc_region' },
  { label: '东财一级行业', value: 'dc_l1' },
  { label: '东财二级行业', value: 'dc_l2' },
  { label: '东财三级行业', value: 'dc_l3' },
]

/**
 * 计算属性：根据当前选择的交易所动态返回可用的市场板块选项。
 * 参数：无。
 * 返回值：市场板块选项数组。
 * 事件：无。
 */
const marketOptions = computed(() => {
  if (!filters.exchange) {
    return allMarketOptions
  }
  const availableMarkets = exchangeMarketMap[filters.exchange] || []
  return allMarketOptions.filter((option) => availableMarkets.includes(option.value))
})
const rpsRankOptions: RpsRankLabel[] = ['极强', '强势', '良好', '一般', '弱势']
const changeDirectionOptions: ChangeDirectionLabel[] = ['上涨', '平盘', '下跌']

const YI = 1e8
const priceRangeOptions: RangeOption[] = [
  { label: '0-10', min: 0, max: 10 },
  { label: '10-30', min: 10, max: 30 },
  { label: '30-50', min: 30, max: 50 },
  { label: '50-100', min: 50, max: 100 },
  { label: '100+', min: 100, max: null },
]
const valueFilterGroups: Array<{ field: ValueRangeField; label: string; options: RangeOption[] }> =
  [{ field: 'latest_price', label: '最新股价', options: priceRangeOptions }]

const filters = reactive<StockRpsFilters>({
  searchKeyword: '',
  periods: [...defaultPeriods],
  tradeDate: latestSelectableTradeDate,
  exchange: 'SSE',
  market: '主板',
  industryMapping: 'dc_l2',
})

const loading = ref(false)
const stockRpsData = ref<StockRpsData | null>(null)
const stockRpsRows = ref<StockRpsItem[]>([])
let stockRpsRequestId = 0
let autoRefreshTimer: ReturnType<typeof setTimeout> | null = null

const trendDialogVisible = ref(false)
const trendLoading = ref(false)
const trendData = ref<StockHistoryDataItem[]>([])
const trendShortcut = ref<TrendShortcut>('2m')
const trendDateRange = reactive({
  start: '',
  end: '',
})
const selectedTrendStock = reactive({
  tsCode: '',
  symbol: '',
  name: '',
  industry: '',
  market: '',
})
// 趋势弹窗当前展示的股票在筛选结果 `filteredRows` 中的索引，用于左右翻阅
const currentTrendIndex = ref(-1)
let trendRequestId = 0

// 领涨数据详情弹窗：点击“行业”列的行业名时，按板块代码打开该板块的领涨详情
const leadRiseVisible = ref(false)
const leadRiseTsCode = ref('')
const leadRiseName = ref('')
const leadRiseIdxType = ref('行业板块')

// 行业映射 -> 东财板块类型（供领涨详情的板块K线按 idx_type 拉取）；default 非东财板块，不可下钻
const dcIdxTypeByMapping: Partial<Record<IndustryMapping, string>> = {
  dc_concept: '概念板块',
  dc_region: '地域板块',
  dc_l1: '行业板块',
  dc_l2: '行业板块',
  dc_l3: '行业板块',
}

// 当前行业映射是否为东财板块（default 为个股默认行业，无对应板块领涨数据）
const isDcIndustryMapping = computed(() => filters.industryMapping !== 'default')

/**
 * 事件：打开行业领涨数据详情
 * 功能：点击表格“行业”列中的东财板块名时，按名称打开领涨数据详情弹窗
 * 参数：row(StockRpsItem) 当前行数据
 * 返回值：无
 */
const openIndustryLeadRise = (row: StockRpsItem) => {
  const name = row.industry || ''
  if (!name) {
    ElMessage.warning('该股票暂无所属板块信息')
    return
  }
  // 优先按板块代码寻址（更精确），无代码时回退为按名称寻址
  leadRiseTsCode.value = row.industry_code || ''
  leadRiseName.value = name
  leadRiseIdxType.value = dcIdxTypeByMapping[filters.industryMapping] || '行业板块'
  leadRiseVisible.value = true
}

/**
 * 工具：将 `Date` 对象格式化为 `YYYYMMDD`。
 * 参数：date 为待格式化日期。
 * 返回值：紧凑日期字符串。
 * 事件：无。
 */
function formatDateToCompact(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * 工具：判断日期是否为周末。
 * 参数：date 为待判断日期。
 * 返回值：周六或周日返回 true。
 * 事件：无。
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/**
 * 工具：获取指定日期之前最近一个工作日。
 * 参数：date 为基准日期。
 * 返回值：按工作日规则回退后的 `YYYYMMDD` 日期字符串。
 * 事件：无。
 */
function getPreviousWeekday(date: Date): string {
  const previousDate = new Date(date)
  do {
    previousDate.setDate(previousDate.getDate() - 1)
  } while (isWeekend(previousDate))
  return formatDateToCompact(previousDate)
}

/**
 * 工具：获取默认交易日。
 * 参数：无。
 * 返回值：工作日 16:00 后为当天，否则为前一个工作日。
 * 事件：无。
 */
function getDefaultTradeDate(): string {
  const date = new Date()
  if (!isWeekend(date) && date.getHours() >= 16) {
    return formatDateToCompact(date)
  }
  return getPreviousWeekday(date)
}

/**
 * 事件：限制交易日选择范围。
 * 参数：date 为日期选择器候选日期。
 * 返回值：周末或超过当前可用交易日时返回 true。
 * 事件：阻止选择不可用日期。
 */
function isTradeDateDisabled(date: Date): boolean {
  return isWeekend(date) || formatDateToCompact(date) > latestSelectableTradeDate
}

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
 * 工具：格式化最新股价文本。
 * 参数：value 为接口原始股价字段。
 * 返回值：两位小数的字符串；无效值返回 `-`。
 * 事件：无。
 */
const formatPrice = (value: StockRpsValue): string => {
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(numericValue)) return '-'
  return numericValue.toFixed(2)
}

/**
 * 工具：格式化市值文本（单位：元）。
 * 参数：value 为接口原始市值字段（单位元）。
 * 返回值：按亿/万元换算后的可读字符串；无效值返回 `-`。
 * 事件：无。
 */
const formatMarketCap = (value: StockRpsValue): string => {
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(numericValue)) return '-'
  if (Math.abs(numericValue) >= YI) return `${(numericValue / YI).toFixed(2)}亿`
  if (Math.abs(numericValue) >= 1e4) return `${(numericValue / 1e4).toFixed(2)}万`
  return numericValue.toFixed(2)
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

const getReturnProp = (period: number): DynamicReturnField =>
  `return_${period}` as DynamicReturnField
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

const rpsFilterGroups = computed<Array<{ field: DynamicRpsField; label: string }>>(() => {
  return currentPeriods.value.map((period) => ({
    field: getRpsProp(period),
    label: `RPS_${period}强度`,
  }))
})

const changeFilterGroups = computed<
  Array<{ field: 'pct_change' | DynamicReturnField; label: string }>
>(() => {
  return [
    { field: 'pct_change', label: '当日涨跌幅' },
    ...currentPeriods.value.map((period) => ({
      field: getReturnProp(period),
      label: `${period}日涨跌幅`,
    })),
  ]
})

const selectedRpsRanks = reactive<Record<string, RpsRankLabel[]>>({})
const selectedChangeDirections = reactive<Record<string, ChangeDirectionLabel[]>>({})
const selectedValueRanges = reactive<Record<ValueRangeField, string[]>>({
  latest_price: ['10-30', '30-50'],
  circ_mv: [],
})

const defaultSortProp = computed(() => {
  const firstPeriod = currentPeriods.value[0]
  return firstPeriod ? getRpsProp(firstPeriod) : 'RPS_today'
})

const warningMessages = computed(() => stockRpsData.value?.errors || [])

/**
 * 工具：根据涨跌幅数值返回方向标签。
 * 参数：value 为涨跌幅字段。
 * 返回值：上涨、平盘或下跌标签。
 * 事件：无。
 */
const getChangeDirection = (value: StockRpsValue): ChangeDirectionLabel => {
  const numericValue = getNumericValue(value)
  if (numericValue > 0) return '上涨'
  if (numericValue < 0) return '下跌'
  return '平盘'
}

/**
 * 工具：同步主表筛选字段。
 * 参数：无。
 * 返回值：无。
 * 事件：初始化并清理 `selectedRpsRanks`、`selectedChangeDirections` 中的动态字段。
 */
const syncFilterFields = (): void => {
  const activeRpsFields = new Set(rpsFilterGroups.value.map((item) => item.field))
  const activeChangeFields = new Set(changeFilterGroups.value.map((item) => item.field))

  Object.keys(selectedRpsRanks).forEach((field) => {
    if (!activeRpsFields.has(field as DynamicRpsField)) {
      delete selectedRpsRanks[field]
    }
  })
  rpsFilterGroups.value.forEach(({ field }) => {
    selectedRpsRanks[field] = selectedRpsRanks[field] || []
  })

  Object.keys(selectedChangeDirections).forEach((field) => {
    if (!activeChangeFields.has(field as 'pct_change' | DynamicReturnField)) {
      delete selectedChangeDirections[field]
    }
  })
  changeFilterGroups.value.forEach(({ field }) => {
    selectedChangeDirections[field] = selectedChangeDirections[field] || ['上涨']
  })
}

/**
 * 工具：清空 RPS 强度筛选。
 * 参数：无。
 * 返回值：void。
 * 事件：重置 `selectedRpsRanks`。
 */
const resetRpsFilters = (): void => {
  Object.keys(selectedRpsRanks).forEach((field) => {
    selectedRpsRanks[field] = []
  })
}

/**
 * 工具：清空涨跌幅方向筛选。
 * 参数：无。
 * 返回值：void。
 * 事件：重置 `selectedChangeDirections`。
 */
const resetChangeFilters = (): void => {
  Object.keys(selectedChangeDirections).forEach((field) => {
    selectedChangeDirections[field] = []
  })
}

/**
 * 工具：清空市值/股价区间筛选。
 * 参数：无。
 * 返回值：void。
 * 事件：重置 `selectedValueRanges`。
 */
const resetValueFilters = (): void => {
  ;(Object.keys(selectedValueRanges) as ValueRangeField[]).forEach((field) => {
    selectedValueRanges[field] = []
  })
}

const hasActiveRpsFilter = computed(() => {
  return Object.values(selectedRpsRanks).some((items) => items.length > 0)
})

const hasActiveChangeFilter = computed(() => {
  return Object.values(selectedChangeDirections).some((items) => items.length > 0)
})

const hasActiveValueFilter = computed(() => {
  return Object.values(selectedValueRanges).some((items) => items.length > 0)
})

const hasAnyTableFilter = computed(() => {
  return hasActiveRpsFilter.value || hasActiveChangeFilter.value || hasActiveValueFilter.value
})

const resetAllTableFilters = (): void => {
  resetRpsFilters()
  resetChangeFilters()
  resetValueFilters()
}

/**
 * 工具：判断单条记录是否满足 RPS 强度筛选。
 * 参数：item 为股票 RPS 记录。
 * 返回值：`true` 表示命中当前强度筛选。
 * 事件：无。
 */
const matchesRpsFilters = (item: StockRpsItem): boolean => {
  return rpsFilterGroups.value.every(({ field }) => {
    const selectedRanks = selectedRpsRanks[field] || []
    if (!selectedRanks.length) return true
    return selectedRanks.includes(
      getRpsRankText(getNumericValue(getRowFieldValue(item, field))) as RpsRankLabel,
    )
  })
}

/**
 * 工具：判断单条记录是否满足涨跌幅方向筛选。
 * 参数：item 为股票 RPS 记录。
 * 返回值：`true` 表示命中当前方向筛选。
 * 事件：无。
 */
const matchesChangeFilters = (item: StockRpsItem): boolean => {
  return changeFilterGroups.value.every(({ field }) => {
    const selectedDirections = selectedChangeDirections[field] || []
    if (!selectedDirections.length) return true
    return selectedDirections.includes(getChangeDirection(getRowFieldValue(item, field)))
  })
}

/**
 * 工具：判断单条记录是否满足股价/市值区间筛选。
 * 参数：item 为股票 RPS 记录。
 * 返回值：`true` 表示命中当前区间筛选。
 * 事件：无。
 */
const matchesValueFilters = (item: StockRpsItem): boolean => {
  return valueFilterGroups.every(({ field, options }) => {
    const selectedLabels = selectedValueRanges[field] || []
    if (!selectedLabels.length) return true
    const rawValue = Reflect.get(item, field) as StockRpsValue
    if (rawValue === null || rawValue === undefined || rawValue === '') return false
    const numericValue = getNumericValue(rawValue)
    return selectedLabels.some((label) => {
      const range = options.find((option) => option.label === label)
      if (!range) return false
      const aboveMin = numericValue >= range.min
      const belowMax = range.max === null || numericValue < range.max
      return aboveMin && belowMax
    })
  })
}

const filteredRows = computed<StockRpsItem[]>(() => {
  const keyword = filters.searchKeyword.trim().toLowerCase()
  let result = stockRpsRows.value

  if (keyword) {
    result = result.filter((item) => {
      return [item.name, item.symbol, item.ts_code, item.industry || '', item.market || ''].some(
        (field) => field.toLowerCase().includes(keyword),
      )
    })
  }

  result = result.filter(matchesRpsFilters)
  result = result.filter(matchesChangeFilters)
  result = result.filter(matchesValueFilters)
  return result
})

const latestTrendPoint = computed(() => {
  return trendData.value.length ? trendData.value[trendData.value.length - 1] : null
})

// 是否存在上一只/下一只可翻阅的股票（基于当前筛选结果 `filteredRows`）
const hasPrevTrendStock = computed(() => currentTrendIndex.value > 0)
const hasNextTrendStock = computed(
  () => currentTrendIndex.value >= 0 && currentTrendIndex.value < filteredRows.value.length - 1,
)

// 翻阅进度文本，如 “3 / 128”
const trendNavPositionText = computed(() => {
  if (currentTrendIndex.value < 0 || !filteredRows.value.length) return ''
  return `${currentTrendIndex.value + 1} / ${filteredRows.value.length}`
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
  const monthMap: Record<TrendShortcut, number> = { '2m': 2, '1y': 12, '3y': 36, '5y': 60 }
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(endDate.getMonth() - monthMap[range])

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
 * 事件：更新 `stockRpsData`、`stockRpsRows`、`loading`，并在多次请求并发时忽略过期响应。
 */
const loadStockRpsData = async () => {
  if (!filters.periods.length) {
    stockRpsData.value = null
    stockRpsRows.value = []
    return
  }

  const requestId = ++stockRpsRequestId
  loading.value = true
  try {
    const response = await getStockRps({
      periods: buildPeriodsParam(filters.periods),
      trade_date: filters.tradeDate || undefined,
      exchange: filters.exchange || undefined,
      market: filters.market,
      industry_mapping: filters.industryMapping,
    })
    if (requestId !== stockRpsRequestId) return
    stockRpsData.value = response
    stockRpsRows.value = response.data || []
    syncFilterFields()
  } catch (error) {
    if (requestId !== stockRpsRequestId) return
    console.error('加载股票RPS数据失败:', error)
    stockRpsData.value = null
    stockRpsRows.value = []
    ElMessage.error('加载股票RPS数据失败，请稍后重试')
  } finally {
    if (requestId === stockRpsRequestId) {
      loading.value = false
    }
  }
}

/**
 * 事件：根据核心筛选条件自动刷新榜单。
 * 参数：无。
 * 返回值：void。
 * 事件：在短暂防抖后请求最新股票 RPS 榜单，避免连续操作造成重复请求。
 */
const scheduleStockRpsReload = (): void => {
  if (autoRefreshTimer) {
    clearTimeout(autoRefreshTimer)
  }

  autoRefreshTimer = setTimeout(() => {
    loadStockRpsData()
  }, 250)
}

/**
 * 数据请求：按优先顺序请求个股历史 K 线。
 * 参数：无，使用当前弹窗中选中的股票代码。
 * 返回值：Promise<StockHistoryDataItem[]>。
 * 事件：无。
 */
const requestTrendHistoryData = async (): Promise<StockHistoryDataItem[]> => {
  const candidateCodes = [selectedTrendStock.tsCode, selectedTrendStock.symbol].filter(
    (value, index, array): value is string => Boolean(value) && array.indexOf(value) === index,
  )
  let lastError: unknown = null

  for (const code of candidateCodes) {
    try {
      return await fetchStockHistoryData(
        code,
        formatDateForHistoryApi(trendDateRange.start),
        formatDateForHistoryApi(trendDateRange.end),
        'qfq',
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
 * 工具：将指定股票记录载入趋势弹窗并请求其 K 线数据。
 * 参数：row 为目标股票记录。
 * 返回值：void。
 * 事件：更新 `selectedTrendStock`，重置区间为最近1年并加载趋势数据。
 */
const showTrendStock = (row: StockRpsItem) => {
  selectedTrendStock.tsCode = row.ts_code
  selectedTrendStock.symbol = row.symbol
  selectedTrendStock.name = row.name
  selectedTrendStock.industry = row.industry || ''
  selectedTrendStock.market = row.market || ''
  trendShortcut.value = '2m'
  trendData.value = []
  applyTrendShortcut('2m')
  loadTrendData()
}

/**
 * 事件：打开个股趋势弹窗。
 * 参数：row 为当前表格行对应的股票记录。
 * 返回值：void。
 * 事件：记录该股票在筛选结果中的位置、设置弹窗信息并加载趋势数据。
 */
const openTrendDialog = (row: StockRpsItem) => {
  currentTrendIndex.value = filteredRows.value.findIndex((item) => item.ts_code === row.ts_code)
  showTrendStock(row)
  trendDialogVisible.value = true
}

/**
 * 事件：翻阅到筛选结果中的上一只/下一只股票。
 * 参数：step 为方向，`-1` 表示上一只，`1` 表示下一只。
 * 返回值：void。
 * 事件：更新 `currentTrendIndex` 并加载对应股票的趋势数据。
 */
const stepTrendStock = (step: -1 | 1) => {
  const nextIndex = currentTrendIndex.value + step
  const targetRow = filteredRows.value[nextIndex]
  if (!targetRow) return
  currentTrendIndex.value = nextIndex
  showTrendStock(targetRow)
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

watch(
  () => [
    filters.tradeDate,
    filters.exchange,
    filters.market,
    filters.industryMapping,
    [...filters.periods].sort((a, b) => a - b).join(','),
  ],
  () => {
    scheduleStockRpsReload()
  },
  { immediate: true },
)

watch(
  () => filters.exchange,
  (newExchange) => {
    // 当交易所改变时，检查当前市场板块是否属于新交易所
    if (newExchange) {
      const availableMarkets = exchangeMarketMap[newExchange] || []
      if (!availableMarkets.includes(filters.market)) {
        // 如果当前市场板块不属于新交易所，重置为该交易所的第一个市场板块
        filters.market = availableMarkets[0] || ''
      }
    }
  },
)

watch(
  currentPeriods,
  () => {
    syncFilterFields()
  },
  { immediate: true },
)
</script>

<style scoped>
.stock-swing-practice-view {
  min-height: calc(100dvh - 104px);
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #f4f6f8;
}

.filter-panel,
.ranking-panel,
.trend-preview-card {
  border-radius: 6px;
}

.table-header,
.toolbar-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-panel {
  flex-shrink: 0;
  padding: 12px 14px 0;
  background: #ffffff;
  border: 1px solid #e5e9f0;
}

.compact-filter-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.compact-filter-form :deep(.el-form-item__label) {
  color: #5f6876;
  font-weight: 500;
}

.compact-filter-row {
  display: grid;
  grid-template-columns: minmax(280px, 1.6fr) repeat(4, minmax(148px, 1fr));
  gap: 10px 12px;
  align-items: start;
}

.table-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.full-width {
  width: 100%;
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

.ranking-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e1e6ee;
}

.table-title {
  font-size: 17px;
  font-weight: 600;
  color: #172033;
  letter-spacing: 0;
}

.table-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ranking-panel-header {
  flex-shrink: 0;
  padding: 12px 14px 10px;
  border-bottom: 1px solid #e8edf3;
  background: #ffffff;
}

.info-button {
  width: 22px;
  height: 22px;
  min-height: 22px;
  padding: 0;
  color: #6f7a89;
  border-color: #d8dee8;
}

.table-summary :deep(.el-tag) {
  height: 24px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  background: #f8fafc;
  border-color: #dce3ec;
}

.info-popover {
  display: grid;
  gap: 6px;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.6;
}

.info-popover p {
  margin: 0;
}

.table-filter-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.toolbar-filter {
  width: 136px;
}

.toolbar-filter :deep(.el-select) {
  width: 100%;
}

.toolbar-filter :deep(.el-select__wrapper),
.compact-filter-form :deep(.el-input__wrapper),
.compact-filter-form :deep(.el-select__wrapper) {
  border-radius: 4px;
  box-shadow: 0 0 0 1px #d8dee8 inset;
}

.toolbar-filter :deep(.el-select__wrapper) {
  min-height: 30px;
}

.toolbar-filter-reset {
  padding: 0;
}

.stock-name-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stock-name-cell span {
  color: #6b7280;
  font-size: 12px;
}

.industry-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.industry-code {
  color: #6b7280;
  font-size: 12px;
}

.text-up {
  color: #d92d20;
  font-weight: 600;
}

.text-down {
  color: #175cd3;
  font-weight: 600;
}

.rps-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rps-rank {
  align-self: center;
  min-width: 42px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.rank-excellent {
  color: #b42318;
  background: #fff1f3;
  border: 1px solid #ffd6dd;
}

.rank-strong {
  color: #b54708;
  background: #fff7ed;
  border: 1px solid #fed7aa;
}

.rank-good {
  color: #175cd3;
  background: #eff8ff;
  border: 1px solid #b9e6fe;
}

.rank-normal {
  color: #067647;
  background: #ecfdf3;
  border: 1px solid #abefc6;
}

.rank-weak {
  color: #667085;
  background: #f7f8fa;
  border: 1px solid #e4e7ec;
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

.trend-toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.trend-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trend-nav-position {
  min-width: 56px;
  text-align: center;
  font-size: 13px;
  color: #6b7280;
}

.trend-shortcuts {
  display: flex;
  justify-content: flex-end;
}

.trend-preview-card {
  min-height: 220px;
}

.ranking-table {
  flex: 1 1 auto;
  min-height: 0;
}

:deep(.ranking-table.el-table) {
  --el-table-border-color: #edf1f6;
  --el-table-header-bg-color: #f8fafc;
  --el-table-row-hover-bg-color: #f1f6ff;
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
}

:deep(.ranking-table.el-table::before),
:deep(.ranking-table .el-table__inner-wrapper::before) {
  display: none;
}

:deep(.ranking-table th.el-table__cell) {
  padding: 7px 0;
  color: #475467;
  font-weight: 600;
  background: #f8fafc;
}

:deep(.ranking-table td.el-table__cell) {
  padding: 7px 0;
}

:deep(.ranking-table .cell) {
  padding: 0 8px;
  line-height: 1.35;
}

:deep(.ranking-table .el-progress-bar__outer) {
  background-color: #edf1f6;
  border-radius: 3px;
}

:deep(.ranking-table .el-progress-bar__inner) {
  border-radius: 3px;
}

:deep(.row-excellent) {
  background: rgba(217, 45, 32, 0.04);
}

:deep(.row-strong) {
  background: rgba(247, 144, 9, 0.05);
}

:deep(.row-good) {
  background: rgba(46, 144, 250, 0.05);
}

@media (max-width: 768px) {
  .stock-swing-practice-view {
    min-height: auto;
    padding: 8px;
    gap: 8px;
  }

  .compact-filter-row {
    grid-template-columns: 1fr;
  }

  .filter-panel,
  .ranking-panel {
    border-radius: 0;
  }

  .filter-panel,
  .ranking-panel-header {
    padding-right: 10px;
    padding-left: 10px;
  }

  .table-header {
    align-items: flex-start;
  }

  .table-filter-toolbar,
  .toolbar-filter {
    width: 100%;
  }

  .trend-toolbar-right,
  .trend-shortcuts {
    justify-content: flex-start;
  }

  .trend-toolbar-right {
    width: 100%;
  }
}
</style>

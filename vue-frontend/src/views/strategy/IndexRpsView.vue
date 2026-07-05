<template>
  <div class="index-rps-view" v-loading="loading" element-loading-text="正在加载指数RPS数据...">
    <div class="rps-data-section" v-if="rpsData.length > 0">
      <el-card shadow="hover" class="rps-card">
        <template #header>
          <div class="table-header">
            <div class="toolbar-row">
              <div class="table-controls">
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索指数名称"
                  :prefix-icon="Search"
                  clearable
                  class="control-item control-search"
                />
                <el-select
                  v-model="idxType"
                  placeholder="选择板块类型"
                  class="control-item"
                >
                  <el-option label="行业板块" value="行业板块" />
                  <el-option label="概念板块" value="概念板块" />
                  <el-option label="地域板块" value="地域板块" />
                </el-select>
                <el-select
                  v-if="idxType === '行业板块'"
                  v-model="industryLevel"
                  placeholder="选择行业级别"
                  class="control-item"
                >
                  <el-option
                    v-for="level in industryLevelOptions"
                    :key="level"
                    :label="level"
                    :value="level"
                  />
                </el-select>
              </div>
              <div class="table-summary">
                <el-tag type="info" effect="plain">共 {{ filteredRpsData.length }} 条</el-tag>
                <el-tag v-if="queryTime" type="success" effect="light">更新时间 {{ queryTime }}</el-tag>
              </div>
            </div>
            <div class="simple-filter-panel">
              <div class="simple-filter-group">
                <span class="simple-filter-label">RPS强度项</span>
                <el-select
                  v-model="selectedStrengthFields"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
                  placeholder="选择一个或多个强度项"
                  class="simple-filter-select strength-filter-select"
                >
                  <el-option
                    v-for="option in strengthFieldOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
              <div class="simple-filter-group">
                <span class="simple-filter-label">最低强度</span>
                <el-select
                  v-model="minimumStrengthRank"
                  placeholder="选择强度下限"
                  class="simple-filter-select"
                >
                  <el-option
                    v-for="option in minimumStrengthOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
              <div class="simple-filter-group">
                <span class="simple-filter-label">涨跌幅关系</span>
                <el-select
                  v-model="changeRelationMode"
                  placeholder="选择关系"
                  class="simple-filter-select relation-filter-select"
                >
                  <el-option
                    v-for="option in changeRelationOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
              <el-button
                v-if="hasActiveSimpleFilter"
                link
                type="primary"
                class="simple-filter-reset"
                @click="resetSimpleFilters"
              >
                清空筛选
              </el-button>
            </div>
          </div>
        </template>

        <div class="methodology">
          <p>
            RPS（Relative Price Strength）用于衡量当前指数相对同组指数的价格强度。系统会计算各指数在 5、20、60、120、250 日周期内的涨跌幅，再按涨跌幅从高到低排序。
          </p>
          <p>
            计算方式：RPS = (1 - 排名 / 总板块数) × 100。数值越高，表示该指数在同组指数中的相对强度越靠前。
          </p>
        </div>
        
        <el-table
          :data="filteredRpsData"
          stripe
          border
          style="width: 100%"
          :default-sort="{ prop: getDefaultSortProp(), order: 'descending' }"
          height="600"
          :row-class-name="tableRowClassName"
          highlight-current-row
          @sort-change="handleSortChange"
        >
          <el-table-column type="index" label="#" width="50" fixed="left" align="center" />
          <el-table-column label="指数名称" min-width="180" sortable="custom" fixed="left" align="center">
            <template #header>
              <div class="custom-header">
                <span>指数名称</span>
                <el-tooltip content="点击指数名称可查看趋势看板K线图" placement="top">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <template #default="scope">
              <div style="display: flex; flex-direction: column; gap: 6px; align-items: center;">
                <el-tag size="small" effect="plain">{{ scope.row.ts_code }}</el-tag>
                <el-button type="text" @click="showIndexDetail(scope.row)" style="padding: 0;">
                  {{ scope.row.name }}
                </el-button>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            prop="RPS_today"
            label="当日涨跌幅 / RPS_today"
            min-width="150"
            sortable="custom"
            align="center"
          >
            <template #header>
              <div class="custom-header">
                <span>当日涨跌幅 / RPS_today</span>
                <el-tooltip content="上方为当日涨跌幅，下方为基于当天涨跌幅计算的 RPS 强度" placement="top">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <template #default="scope">
              <div class="rps-cell rps-cell-with-change">
                <span class="rps-change-text" :class="{ up: getNumericValue(scope.row.pct_change) > 0, down: getNumericValue(scope.row.pct_change) < 0 }">
                  {{ formatPercent(scope.row.pct_change) }}
                </span>
                <el-progress
                  :percentage="getNumericValue(scope.row.RPS_today)"
                  :color="getRpsColor(getNumericValue(scope.row.RPS_today))"
                  :format="() => formatRpsValue(scope.row.RPS_today)"
                  :stroke-width="18"
                  :text-inside="true"
                  :show-text="true"
                />
                <div class="rps-rank" :class="getRpsRankClass(getNumericValue(scope.row.RPS_today))">
                  {{ getRpsRankText(getNumericValue(scope.row.RPS_today)) }}
                </div>
              </div>
            </template>
          </el-table-column>
          
          <template v-for="period in rpsPeriods" :key="period">
            <el-table-column
              :label="`${period}日涨跌幅 / RPS_${period}`"
              min-width="150"
              sortable="custom"
              :prop="getRpsProp(period)"
              align="center"
            >
              <template #header>
                <div class="custom-header">
                  <span>{{ period }}日涨跌幅 / RPS_{{ period }}</span>
                  <el-tooltip :content="`上方为${period}日内价格变化百分比，下方为${period}日相对强度指标`" placement="top">
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
              </template>
              <template #default="scope">
                <div class="rps-cell rps-cell-with-change">
                  <span class="rps-change-text" :class="{ up: Number(scope.row[getReturnProp(period)]) > 0, down: Number(scope.row[getReturnProp(period)]) < 0 }">
                    {{ formatPercent(scope.row[getReturnProp(period)]) }}
                  </span>
                  <el-progress
                    :percentage="Number(scope.row[getRpsProp(period)])"
                    :color="getRpsColor(Number(scope.row[getRpsProp(period)]))"
                    :format="(val: number) => val.toFixed(1)"
                    :stroke-width="18"
                    :text-inside="true"
                    :show-text="true"
                  />
                  <div class="rps-rank" :class="getRpsRankClass(Number(scope.row[getRpsProp(period)]))">
                    {{ getRpsRankText(Number(scope.row[getRpsProp(period)])) }}
                  </div>
                </div>
              </template>
            </el-table-column>
          </template>
          
          <el-table-column label="操作" min-width="210" align="center" fixed="right">
            <template #default="scope">
              <div class="action-buttons">
                <el-button
                  type="primary"
                  size="small"
                  @click="openLeadRiseDetail(scope.row)"
                >
                  领涨数据详情
                </el-button>
                <el-button
                  type="success"
                  size="small"
                  @click="openBoardMemberRpsDialog(scope.row)"
                >
                  成分股RPS
                </el-button>
              </div>
            </template>
          </el-table-column>
          
        </el-table>
        <LeadRiseDetailDialog
          v-model="detailDialogVisible"
          :ts-code="currentTsCode"
          :idx-type="idxType"
          :name="currentIndexName"
        />

        <el-dialog
          v-model="indexTrendDialogVisible"
          width="88%"
          top="6vh"
          :close-on-click-modal="false"
          destroy-on-close
          append-to-body
        >
          <template #header>
            <div class="trend-dialog-header">
              <div class="trend-dialog-title">
                {{ indexTrendBoard.name || indexTrendBoard.code }} 趋势看板K线图
              </div>
              <div class="trend-dialog-subtitle">
                {{ indexTrendDateRange.start || '-' }} 至 {{ indexTrendDateRange.end || '-' }}
              </div>
            </div>
          </template>

          <div class="trend-dialog-body">
            <div class="toolbar-row">
              <div class="table-summary">
                <el-tag v-if="indexTrendBoard.code" type="info" effect="plain">
                  板块代码 {{ indexTrendBoard.code }}
                </el-tag>
                <el-tag type="warning" effect="light">板块类型 {{ idxType }}</el-tag>
                <el-tag v-if="latestIndexTrendData" type="success" effect="light">
                  最新收盘 {{ latestIndexTrendData.close_price.toFixed(2) }}
                </el-tag>
                <el-tag
                  v-if="latestIndexTrendData"
                  :type="latestIndexTrendData.change_percent > 0 ? 'danger' : latestIndexTrendData.change_percent < 0 ? 'success' : 'info'"
                  effect="light"
                >
                  最新涨跌幅 {{ formatPercent(latestIndexTrendData.change_percent) }}
                </el-tag>
                <el-tag v-if="latestIndexTrendData" type="info" effect="light">
                  最新成交额 {{ formatAmount(latestIndexTrendData.amount) }}
                </el-tag>
              </div>
              <div class="trend-shortcuts">
                <el-radio-group v-model="indexTrendShortcut" @change="handleIndexTrendShortcutChange">
                  <el-radio-button label="1y">最近1年</el-radio-button>
                  <el-radio-button label="3y">最近3年</el-radio-button>
                  <el-radio-button label="5y">最近5年</el-radio-button>
                  <el-radio-button label="10y">最近10年</el-radio-button>
                  <el-radio-button label="20y">最近20年</el-radio-button>
                </el-radio-group>
              </div>
            </div>

            <el-card class="trend-preview-card" v-loading="indexTrendLoading">
              <StockKLineChart
                v-if="indexTrendData.length"
                :stock-code="indexTrendBoard.code"
                :stock-name="indexTrendBoard.name"
                :kline-data="indexTrendData"
                height="420px"
              />
              <el-empty
                v-else-if="!indexTrendLoading"
                :description="indexTrendEmptyText"
                :image-size="80"
              />
            </el-card>
          </div>
        </el-dialog>

        <el-dialog
          v-model="memberRpsDialogVisible"
          :title="`成分股RPS强度 - ${memberRpsBoardName || memberRpsBoardTsCode}`"
          width="1400px"
          top="5vh"
          destroy-on-close
        >
          <div class="member-rps-dialog" v-loading="memberRpsLoading" element-loading-text="正在加载成分股RPS数据...">
            <div class="toolbar-row member-rps-toolbar">
              <div class="table-controls">
                <el-input
                  v-model="memberRpsSearchKeyword"
                  placeholder="搜索成分股名称或代码"
                  :prefix-icon="Search"
                  clearable
                  class="control-item control-search"
                />
                <el-date-picker
                  v-model="memberRpsSelectedDate"
                  type="date"
                  placeholder="选择交易日（默认最近交易日）"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  :disabled="memberRpsLoading"
                  :disabled-date="disableFutureDate"
                  @change="handleMemberRpsDateChange"
                  class="control-item member-rps-date"
                />
              </div>
              <div class="table-summary">
                <el-tag type="info" effect="plain">共 {{ filteredMemberRpsData.length }} 条</el-tag>
                <el-tag v-if="memberRpsTradeDate" type="warning" effect="light">交易日 {{ memberRpsTradeDate }}</el-tag>
                <el-tag v-if="memberRpsQueryTime" type="success" effect="light">更新时间 {{ memberRpsQueryTime }}</el-tag>
              </div>
            </div>

            <el-table
              :data="filteredMemberRpsData"
              stripe
              border
              style="width: 100%"
              height="620"
              :default-sort="{ prop: memberRpsDefaultSortProp, order: 'descending' }"
              highlight-current-row
              @sort-change="handleMemberRpsSortChange"
            >
              <el-table-column type="index" label="#" width="50" align="center" fixed="left" />
              <el-table-column prop="ts_code" label="ts_code" min-width="120" sortable="custom" fixed="left" align="center">
                <template #default="scope">
                  <el-tag size="small" effect="plain">{{ scope.row.ts_code }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="名称" min-width="150" sortable="custom" fixed="left">
                <template #default="scope">
                  <el-button
                    type="primary"
                    link
                    @click="openMemberStockTrendDialog(scope.row)"
                  >
                    {{ scope.row.name }}
                  </el-button>
                </template>
              </el-table-column>

              <el-table-column prop="RPS_today" label="当日涨跌幅 / RPS_today" min-width="150" sortable="custom" align="center">
                <template #default="scope">
                  <div class="rps-cell rps-cell-with-change">
                    <span class="rps-change-text" :class="{ up: getNumericValue(scope.row.pct_change) > 0, down: getNumericValue(scope.row.pct_change) < 0 }">
                      {{ formatPercent(scope.row.pct_change) }}
                    </span>
                    <el-progress
                      :percentage="getNumericValue(scope.row.RPS_today)"
                      :color="getRpsColor(getNumericValue(scope.row.RPS_today))"
                      :format="() => formatRpsValue(scope.row.RPS_today)"
                      :stroke-width="18"
                      :text-inside="true"
                      :show-text="true"
                    />
                    <div class="rps-rank" :class="getRpsRankClass(getNumericValue(scope.row.RPS_today))">
                      {{ getRpsRankText(getNumericValue(scope.row.RPS_today)) }}
                    </div>
                  </div>
                </template>
              </el-table-column>

              <template v-for="period in memberRpsPeriods" :key="period">
                <el-table-column
                  :prop="getDynamicRpsProp(period)"
                  :label="`${period}日涨跌幅 / RPS_${period}`"
                  min-width="150"
                  sortable="custom"
                  align="center"
                >
                  <template #default="scope">
                    <div class="rps-cell rps-cell-with-change">
                      <span class="rps-change-text" :class="{ up: getNumericValue(scope.row[getDynamicReturnProp(period)]) > 0, down: getNumericValue(scope.row[getDynamicReturnProp(period)]) < 0 }">
                        {{ formatPercent(scope.row[getDynamicReturnProp(period)]) }}
                      </span>
                      <el-progress
                        :percentage="getNumericValue(scope.row[getDynamicRpsProp(period)])"
                        :color="getRpsColor(getNumericValue(scope.row[getDynamicRpsProp(period)]))"
                        :format="() => formatRpsValue(scope.row[getDynamicRpsProp(period)])"
                        :stroke-width="18"
                        :text-inside="true"
                        :show-text="true"
                      />
                      <div class="rps-rank" :class="getRpsRankClass(getNumericValue(scope.row[getDynamicRpsProp(period)]))">
                        {{ getRpsRankText(getNumericValue(scope.row[getDynamicRpsProp(period)])) }}
                      </div>
                    </div>
                  </template>
                </el-table-column>
              </template>
            </el-table>
          </div>
        </el-dialog>

        <el-dialog
          v-model="memberStockTrendDialogVisible"
          width="88%"
          top="6vh"
          :close-on-click-modal="false"
          destroy-on-close
          append-to-body
        >
          <template #header>
            <div class="trend-dialog-header">
              <div class="trend-dialog-title">
                {{ memberStockTrendStock.name || memberStockTrendStock.code }} K线趋势图
              </div>
              <div class="trend-dialog-subtitle">
                {{ memberStockTrendDateRange.start || '-' }} 至 {{ memberStockTrendDateRange.end || '-' }}
              </div>
            </div>
          </template>

          <div class="trend-dialog-body">
            <div class="trend-shortcuts">
              <el-radio-group v-model="memberStockTrendShortcut" @change="handleMemberStockTrendShortcutChange">
                <el-radio-button label="1y">最近1年</el-radio-button>
                <el-radio-button label="3y">最近3年</el-radio-button>
                <el-radio-button label="5y">最近5年</el-radio-button>
                <el-radio-button label="10y">最近10年</el-radio-button>
                <el-radio-button label="20y">最近20年</el-radio-button>
              </el-radio-group>
            </div>

            <el-card class="trend-preview-card" v-loading="memberStockTrendLoading">
              <StockKLineChart
                v-if="memberStockTrendData.length"
                :stock-code="memberStockTrendStock.code"
                :stock-name="memberStockTrendStock.name"
                :kline-data="memberStockTrendData"
                height="420px"
              />
              <el-empty
                v-else-if="!memberStockTrendLoading"
                :description="memberStockTrendEmptyText"
                :image-size="80"
              />
            </el-card>
          </div>
        </el-dialog>
      </el-card>
    </div>

    <el-empty v-if="!loading && rpsData.length === 0" description="暂无RPS数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, defineComponent, h } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElDialog, ElTable, ElTableColumn, ElButton } from 'element-plus'
import { InfoFilled, CaretTop, CaretBottom, Minus, Search } from '@element-plus/icons-vue'
import { getDcBoardMemberRps, getIndexRps } from '@/services/strategyApi'
import type { DcBoardMemberRpsItem, DcIndustryLevel, IndexRpsIdxType, IndexRpsItem } from '@/services/strategyApi'
import { fetchDcIndexLastNDays, type DcIndexRecord } from '@/services/dcIndexApi'
import { fetchDcDaily } from '@/services/dcDailyApi'
import StockKLineChart from '@/components/StockKLineChart.vue'
import { fetchStockHistoryData, type StockHistoryDataItem } from '@/services/stockHistoryApi'

const industryLevelOptions: DcIndustryLevel[] = ['东财一级行业', '东财二级行业', '东财三级行业']

interface Props {
  level?: DcIndustryLevel
}

type RpsPeriod = 5 | 20 | 60 | 120 | 250
type RpsField = 'RPS_today' | `RPS_${RpsPeriod}`
type ReturnField = `return_${RpsPeriod}`
type DynamicRpsField = 'RPS_today' | `RPS_${number}`
type MemberTrendShortcut = '1y' | '3y' | '5y' | '10y' | '20y'
type StrengthRankThreshold = 'all' | 'excellent' | 'strong' | 'good' | 'normal'
type ChangeRelationMode = 'all' | 'ascending' | 'descending'

const props = defineProps<Props>()

const rpsPeriods: readonly RpsPeriod[] = [5, 20, 60, 120, 250]

function normalizeIndustryLevel(value: unknown): DcIndustryLevel {
  return industryLevelOptions.includes(value as DcIndustryLevel)
    ? value as DcIndustryLevel
    : '东财二级行业'
}

const loading = ref(false)
const route = useRoute()
const rpsData = ref<IndexRpsItem[]>([])
const queryTime = ref('')
const searchKeyword = ref('')
const indexTrendDialogVisible = ref(false)
const indexTrendLoading = ref(false)
const indexTrendShortcut = ref<MemberTrendShortcut>('1y')
const indexTrendData = ref<StockHistoryDataItem[]>([])
const indexTrendBoard = reactive({
  code: '',
  name: ''
})
const indexTrendDateRange = reactive({
  start: '',
  end: ''
})
let indexTrendRequestId = 0
const memberRpsDialogVisible = ref(false)
const memberRpsLoading = ref(false)
const memberRpsBoardTsCode = ref('')
const memberRpsBoardName = ref('')
const memberRpsTradeDate = ref('')
const memberRpsQueryTime = ref('')
const memberRpsSearchKeyword = ref('')
const memberRpsSelectedDate = ref('')
const memberRpsData = ref<DcBoardMemberRpsItem[]>([])
const memberRpsPeriods = ref<number[]>([])
let memberRpsRequestId = 0
const memberStockTrendDialogVisible = ref(false)
const memberStockTrendLoading = ref(false)
const memberStockTrendShortcut = ref<MemberTrendShortcut>('1y')
const memberStockTrendData = ref<StockHistoryDataItem[]>([])
const memberStockTrendStock = reactive({
  code: '',
  name: ''
})
const memberStockTrendDateRange = reactive({
  start: '',
  end: ''
})
let memberStockTrendRequestId = 0
const idxType = ref<IndexRpsIdxType>('行业板块')
const industryLevel = ref<DcIndustryLevel>(normalizeIndustryLevel(props.level || route.query.level))
const selectedStrengthFields = ref<RpsField[]>([])
const minimumStrengthRank = ref<StrengthRankThreshold>('all')
const changeRelationMode = ref<ChangeRelationMode>('all')

const strengthFieldOptions: Array<{ label: string; value: RpsField }> = [
  { label: 'RPS_today', value: 'RPS_today' },
  ...rpsPeriods.map((period) => ({
    label: `RPS_${period}`,
    value: `RPS_${period}` as RpsField
  }))
]

const minimumStrengthOptions: Array<{ label: string; value: StrengthRankThreshold }> = [
  { label: '不筛选', value: 'all' },
  { label: '一般及以上', value: 'normal' },
  { label: '良好及以上', value: 'good' },
  { label: '强势及以上', value: 'strong' },
  { label: '极强', value: 'excellent' }
]

const changeRelationOptions: Array<{ label: string; value: ChangeRelationMode }> = [
  { label: '不筛选', value: 'all' },
  { label: '递增', value: 'ascending' },
  { label: '递减', value: 'descending' }
]

const hasActiveSimpleFilter = computed(() => {
  return selectedStrengthFields.value.length > 0
    || minimumStrengthRank.value !== 'all'
    || changeRelationMode.value !== 'all'
})

const relationStrengthFields = computed(() => {
  if (selectedStrengthFields.value.length >= 2) {
    return selectedStrengthFields.value
  }
  return []
})

const formatPercent = (value: unknown): string => {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (!Number.isFinite(num)) return '-'
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

const getNumericValue = (value: unknown): number => {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(num) ? num : 0
}

const formatRpsValue = (value: unknown): string => {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (!Number.isFinite(num)) return '-'
  return num.toFixed(1)
}

const formatDateToYYYYMMDDWithDash = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateForStockApi = (dateText: string): string => dateText.replace(/-/g, '')

const disableFutureDate = (date: Date): boolean => date.getTime() > Date.now()

const formatAmount = (value: unknown): string => {
  const numericValue = getNumericValue(value)
  if (!Number.isFinite(numericValue) || numericValue === 0) {
    return '0'
  }
  if (numericValue >= 100000000) {
    return `${(numericValue / 100000000).toFixed(2)}亿`
  }
  if (numericValue >= 10000) {
    return `${(numericValue / 10000).toFixed(2)}万`
  }
  return numericValue.toFixed(2)
}

const getDynamicReturnProp = (period: number): `return_${number}` => `return_${period}` as `return_${number}`
const getDynamicRpsProp = (period: number): DynamicRpsField => `RPS_${period}` as DynamicRpsField
const getReturnProp = (period: RpsPeriod): ReturnField => `return_${period}`
const getRpsProp = (period: RpsPeriod): `RPS_${RpsPeriod}` => `RPS_${period}`

function getStrengthThresholdValue(rank: StrengthRankThreshold): number {
  switch (rank) {
    case 'excellent':
      return 90
    case 'strong':
      return 80
    case 'good':
      return 70
    case 'normal':
      return 50
    default:
      return 0
  }
}

function getReturnValueByStrengthField(item: IndexRpsItem, field: RpsField): number {
  if (field === 'RPS_today') {
    return getNumericValue(item.pct_change)
  }
  const period = Number(field.replace('RPS_', '')) as RpsPeriod
  return getNumericValue(item[getReturnProp(period)])
}

function matchesStrengthFilters(item: IndexRpsItem): boolean {
  if (selectedStrengthFields.value.length === 0 || minimumStrengthRank.value === 'all') {
    return true
  }
  const threshold = getStrengthThresholdValue(minimumStrengthRank.value)
  return selectedStrengthFields.value.every((field) => getNumericValue(item[field]) >= threshold)
}

function matchesChangeRelation(item: IndexRpsItem): boolean {
  if (changeRelationMode.value === 'all' || relationStrengthFields.value.length < 2) {
    return true
  }

  const values = relationStrengthFields.value.map((field) => getReturnValueByStrengthField(item, field))

  for (let i = 1; i < values.length; i++) {
    if (changeRelationMode.value === 'ascending' && values[i] <= values[i - 1]) {
      return false
    }
    if (changeRelationMode.value === 'descending' && values[i] >= values[i - 1]) {
      return false
    }
  }

  return true
}

function resetSimpleFilters() {
  selectedStrengthFields.value = []
  minimumStrengthRank.value = 'all'
  changeRelationMode.value = 'all'
}

const memberStockTrendEmptyText = computed(() => {
  return memberStockTrendStock.code
    ? '暂无该股票区间K线数据'
    : '请选择股票查看K线趋势'
})

const indexTrendEmptyText = computed(() => {
  return indexTrendBoard.code
    ? '暂无该东财指数区间K线数据'
    : '请选择指数查看趋势看板'
})

const latestIndexTrendData = computed(() => {
  return indexTrendData.value.length > 0
    ? indexTrendData.value[indexTrendData.value.length - 1]
    : null
})

const filteredRpsData = computed(() => {
  let result = rpsData.value
  if (searchKeyword.value) {
    result = result.filter(item => item.name.includes(searchKeyword.value))
  }
  result = result.filter(matchesStrengthFilters)
  result = result.filter(matchesChangeRelation)
  return result
})

const filteredMemberRpsData = computed(() => {
  let result = memberRpsData.value
  if (memberRpsSearchKeyword.value) {
    const keyword = memberRpsSearchKeyword.value.trim()
    result = result.filter((item) => item.name.includes(keyword) || item.ts_code.includes(keyword))
  }
  return result
})

const getDefaultSortProp = () => {
  return 'RPS_5'
}

const memberRpsDefaultSortProp = computed(() => {
  const firstPeriod = memberRpsPeriods.value[0]
  return firstPeriod ? getDynamicRpsProp(firstPeriod) : 'RPS_today'
})

const getRpsColor = (rpsValue: number) => {
  if (rpsValue >= 90) return '#f56c6c'
  if (rpsValue >= 80) return '#e6a23c'
  if (rpsValue >= 70) return '#67c23a'
  return '#909399'
}

const getRpsRankText = (value: number) => {
  if (value >= 90) return '极强'
  if (value >= 80) return '强势'
  if (value >= 70) return '良好'
  if (value >= 50) return '一般'
  return '弱势'
}

const getRpsRankClass = (value: number) => {
  if (value >= 90) return 'rank-excellent'
  if (value >= 80) return 'rank-strong'
  if (value >= 70) return 'rank-good'
  if (value >= 50) return 'rank-normal'
  return 'rank-weak'
}

const tableRowClassName = ({ row }: { row: IndexRpsItem }) => {
  const rpsValue = row.RPS_5
  if (rpsValue >= 90) return 'row-excellent'
  if (rpsValue >= 80) return 'row-strong'
  if (rpsValue >= 70) return 'row-good'
  return ''
}

const handleSortChange = (sort: { prop: string, order: string }) => {
  if (sort.prop && sort.order) {
    rpsData.value.sort((a, b) => {
      const propA = Number(a[sort.prop as keyof IndexRpsItem] ?? 0)
      const propB = Number(b[sort.prop as keyof IndexRpsItem] ?? 0)
      if (sort.order === 'ascending') {
        return propA - propB
      } else {
        return propB - propA
      }
    })
  }
}

const applyIndexTrendShortcut = (range: MemberTrendShortcut) => {
  const yearMap: Record<MemberTrendShortcut, number> = { '1y': 1, '3y': 3, '5y': 5, '10y': 10, '20y': 20 }
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - yearMap[range])
  indexTrendDateRange.start = formatDateToYYYYMMDDWithDash(startDate)
  indexTrendDateRange.end = formatDateToYYYYMMDDWithDash(endDate)
}

const loadIndexTrendData = async () => {
  const requestId = ++indexTrendRequestId

  if (!indexTrendBoard.code || !indexTrendDateRange.start || !indexTrendDateRange.end) {
    indexTrendData.value = []
    return
  }

  indexTrendLoading.value = true
  try {
    const response = await fetchDcDaily({
      ts_code: indexTrendBoard.code,
      idx_type: idxType.value,
      start_date: formatDateForStockApi(indexTrendDateRange.start),
      end_date: formatDateForStockApi(indexTrendDateRange.end),
      fields: 'ts_code,trade_date,open,high,low,close,change,pct_change,vol,amount,swing,turnover_rate'
    })

    if (requestId !== indexTrendRequestId) return

    indexTrendData.value = [...(response.records || [])]
      .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
      .map((item) => ({
        stock_code: item.ts_code,
        stock_name: indexTrendBoard.name,
        date: item.trade_date,
        open_price: getNumericValue(item.open),
        close_price: getNumericValue(item.close),
        high_price: getNumericValue(item.high),
        low_price: getNumericValue(item.low),
        change_percent: getNumericValue(item.pct_change),
        change_amount: getNumericValue(item.change),
        volume: getNumericValue(item.vol),
        amount: getNumericValue(item.amount),
        amplitude: getNumericValue(item.swing),
        turnover_rate: getNumericValue(item.turnover_rate),
        created_at: ''
      }))
  } catch (error) {
    if (requestId !== indexTrendRequestId) return
    console.error('加载东财指数趋势看板失败:', error)
    indexTrendData.value = []
    ElMessage.error('加载东财指数趋势看板失败，请稍后重试')
  } finally {
    if (requestId === indexTrendRequestId) {
      indexTrendLoading.value = false
    }
  }
}

const handleIndexTrendShortcutChange = (range: MemberTrendShortcut) => {
  applyIndexTrendShortcut(range)
  loadIndexTrendData()
}

const showIndexDetail = (row: IndexRpsItem) => {
  indexTrendBoard.code = row.ts_code
  indexTrendBoard.name = row.name
  indexTrendShortcut.value = '1y'
  indexTrendData.value = []
  applyIndexTrendShortcut('1y')
  indexTrendDialogVisible.value = true
  loadIndexTrendData()
}

const LeadRiseDetailDialog = defineComponent({
  name: 'LeadRiseDetailDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    tsCode: { type: String, required: true },
    idxType: { type: String, required: true },
    name: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const visible = ref(props.modelValue)
    const loading = ref(false)
    const records = ref<DcIndexRecord[]>([])

    const loadData = async () => {
      if (!props.tsCode || !props.idxType) return
      loading.value = true
      try {
        const data = await fetchDcIndexLastNDays({ tsCode: props.tsCode, name: props.name }, 30)
        records.value = (data.records || []).sort((a, b) => a.trade_date.localeCompare(b.trade_date))
      } catch (e) {
        console.error('获取dc_daily数据失败:', e)
        records.value = []
      } finally {
        loading.value = false
      }
    }

    watch(() => props.modelValue, (val) => {
      visible.value = val
      if (val) {
        loadData()
      }
    })

    watch(() => props.tsCode, (newVal) => {
      if (visible.value && newVal) {
        loadData()
      }
    })

    const close = () => emit('update:modelValue', false)

    return () => h(
      ElDialog as any,
      {
        modelValue: visible.value,
        'onUpdate:modelValue': (v: boolean) => emit('update:modelValue', v),
        title: `领涨数据详情 - ${props.name || props.tsCode}`,
        width: '1200px'
      },
      {
        default: () => [
          h('div', { style: 'margin-bottom: 12px; color: #909399;' }, `近30天概念板块（领涨）：${props.idxType}`),
          h(
            ElTable as any,
            { data: records.value, stripe: true, border: true, height: 420 },
            {
              default: () => [
                h(ElTableColumn as any, { prop: 'trade_date', label: '日期', width: 110, align: 'center' }),
                h(ElTableColumn as any, { prop: 'name', label: '概念名称', minWidth: 150 }),
                h(ElTableColumn as any, { prop: 'leading', label: '领涨股票', minWidth: 150 }),
                h(ElTableColumn as any, { prop: 'leading_code', label: '领涨代码', width: 120, align: 'center' }),
                h(ElTableColumn as any, { prop: 'leading_pct', label: '领涨涨幅%', width: 110, align: 'center' }),
                h(ElTableColumn as any, { prop: 'pct_change', label: '板块涨幅%', width: 110, align: 'center' }),
                h(ElTableColumn as any, { prop: 'total_mv', label: '总市值', width: 120, align: 'center' }),
                h(ElTableColumn as any, { prop: 'turnover_rate', label: '换手率', width: 100, align: 'center' }),
                h(ElTableColumn as any, { prop: 'up_num', label: '上涨家数', width: 100, align: 'center' }),
                h(ElTableColumn as any, { prop: 'down_num', label: '下跌家数', width: 100, align: 'center' })
              ]
            }
          )
        ],
        footer: () => [
          h(ElButton as any, { onClick: close }, '关闭')
        ]
      }
    )
  }
})

const detailDialogVisible = ref(false)
const currentTsCode = ref('')
const currentIndexName = ref('')

const openLeadRiseDetail = (row: IndexRpsItem) => {
  currentTsCode.value = row.ts_code
  currentIndexName.value = row.name
  detailDialogVisible.value = true
}

/**
 * 加载成分股RPS数据
 * 功能：按当前板块与选中的交易日拉取成分股RPS。selectedDate 为空时后端返回最近一个交易日。
 * 参数：无（读取 memberRpsBoardTsCode 与 memberRpsSelectedDate）
 * 返回值：Promise<void>
 * 事件：更新 memberRpsData、memberRpsTradeDate 等状态
 */
const loadMemberRpsData = async () => {
  const tsCode = memberRpsBoardTsCode.value
  if (!tsCode) return

  const requestId = ++memberRpsRequestId
  memberRpsLoading.value = true
  try {
    const tradeDate = memberRpsSelectedDate.value
      ? formatDateForStockApi(memberRpsSelectedDate.value)
      : undefined
    const response = await getDcBoardMemberRps(tsCode, '5,20,60,120,250', tradeDate)

    if (requestId !== memberRpsRequestId) return

    memberRpsData.value = response.data || []
    memberRpsPeriods.value = response.periods || []
    memberRpsBoardTsCode.value = response.board_ts_code || tsCode
    memberRpsBoardName.value = response.board_name || memberRpsBoardName.value
    memberRpsTradeDate.value = response.trade_date || ''
    memberRpsQueryTime.value = response.query_time || ''
    // 将实际返回的交易日回填到日期选择器，默认展示最近一个交易日
    if (response.trade_date) {
      memberRpsSelectedDate.value = response.trade_date
    }
    ElMessage.success('成分股RPS数据加载成功')
  } catch (error) {
    if (requestId !== memberRpsRequestId) return
    console.error('加载成分股RPS数据失败:', error)
    memberRpsData.value = []
    ElMessage.error('加载成分股RPS数据失败，请稍后重试')
  } finally {
    if (requestId === memberRpsRequestId) {
      memberRpsLoading.value = false
    }
  }
}

/**
 * 事件：切换成分股RPS交易日
 * 功能：用户在弹窗中选择交易日后，按新交易日重新拉取成分股RPS数据
 * 参数：无
 * 返回值：无
 */
const handleMemberRpsDateChange = () => {
  loadMemberRpsData()
}

const openBoardMemberRpsDialog = async (row: IndexRpsItem) => {
  memberRpsDialogVisible.value = true
  memberRpsBoardTsCode.value = row.ts_code
  memberRpsBoardName.value = row.name
  memberRpsTradeDate.value = ''
  memberRpsQueryTime.value = ''
  memberRpsSearchKeyword.value = ''
  // 重置为空，让后端返回最近一个交易日，随后回填到日期选择器
  memberRpsSelectedDate.value = ''
  memberRpsData.value = []
  memberRpsPeriods.value = []

  await loadMemberRpsData()
}

const handleMemberRpsSortChange = (sort: { prop: string, order: string }) => {
  if (sort.prop && sort.order) {
    memberRpsData.value.sort((a, b) => {
      const propA = getNumericValue((a as Record<string, unknown>)[sort.prop])
      const propB = getNumericValue((b as Record<string, unknown>)[sort.prop])

      if (sort.order === 'ascending') {
        return propA - propB
      }
      return propB - propA
    })
  }
}

const applyMemberStockTrendShortcut = (range: MemberTrendShortcut) => {
  const yearMap: Record<MemberTrendShortcut, number> = { '1y': 1, '3y': 3, '5y': 5, '10y': 10, '20y': 20 }
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - yearMap[range])
  memberStockTrendDateRange.start = formatDateToYYYYMMDDWithDash(startDate)
  memberStockTrendDateRange.end = formatDateToYYYYMMDDWithDash(endDate)
}

const loadMemberStockTrendData = async () => {
  const requestId = ++memberStockTrendRequestId

  if (!memberStockTrendStock.code || !memberStockTrendDateRange.start || !memberStockTrendDateRange.end) {
    memberStockTrendData.value = []
    return
  }

  memberStockTrendLoading.value = true
  try {
    const data = await fetchStockHistoryData(
      memberStockTrendStock.code,
      formatDateForStockApi(memberStockTrendDateRange.start),
      formatDateForStockApi(memberStockTrendDateRange.end),
      'qfq'
    )
    if (requestId !== memberStockTrendRequestId) return
    memberStockTrendData.value = [...data].sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    if (requestId !== memberStockTrendRequestId) return
    console.error('加载成分股K线趋势失败:', error)
    memberStockTrendData.value = []
    ElMessage.error('加载成分股K线趋势失败，请稍后重试')
  } finally {
    if (requestId === memberStockTrendRequestId) {
      memberStockTrendLoading.value = false
    }
  }
}

const handleMemberStockTrendShortcutChange = (range: MemberTrendShortcut) => {
  applyMemberStockTrendShortcut(range)
  loadMemberStockTrendData()
}

const openMemberStockTrendDialog = (row: DcBoardMemberRpsItem) => {
  memberStockTrendStock.code = row.ts_code
  memberStockTrendStock.name = row.name
  memberStockTrendShortcut.value = '1y'
  memberStockTrendData.value = []
  applyMemberStockTrendShortcut('1y')
  memberStockTrendDialogVisible.value = true
  loadMemberStockTrendData()
}

const refreshData = async () => {
  if (loading.value) return
  
  loading.value = true
  try {
    const periodsStr = rpsPeriods.join(',')
    const response = await getIndexRps(
      periodsStr,
      false,
      idxType.value,
      idxType.value === '行业板块' ? industryLevel.value : undefined
    )
    rpsData.value = response.data
    queryTime.value = response.query_time
    ElMessage.success('RPS数据加载成功')
  } catch (error) {
    console.error('加载RPS数据失败:', error)
    ElMessage.error('加载RPS数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshData()
})

watch(idxType, () => {
  refreshData()
})

watch(industryLevel, () => {
  if (idxType.value === '行业板块') {
    refreshData()
  }
})

watch(() => route.query.level, (level) => {
  const nextLevel = normalizeIndustryLevel(level)
  if (nextLevel !== industryLevel.value) {
    industryLevel.value = nextLevel
  }
})
</script>

<style scoped>
.index-rps-view {
  padding: 20px;
}

.table-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: stretch;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.table-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.control-item {
  width: 160px;
}

.control-search {
  width: 220px;
}

.table-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.simple-filter-panel {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 4px;
}

.simple-filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.simple-filter-label {
  color: #606266;
  font-size: 13px;
  white-space: nowrap;
}

.simple-filter-select {
  width: 180px;
}

.strength-filter-select {
  width: 260px;
}

.relation-filter-select {
  width: 180px;
}

.simple-filter-reset {
  padding: 0;
}

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.member-rps-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

.trend-shortcuts {
  display: flex;
  justify-content: flex-end;
}

.trend-preview-card {
  min-height: 220px;
}

.member-rps-toolbar {
  margin-bottom: 0;
}

.member-rps-date {
  width: 220px;
}

.rps-data-section {
  margin-bottom: 20px;
}

.rps-card {
  border-radius: 0;
}

:deep(.rps-card .el-card__header) {
  padding: 18px 20px 16px;
}

:deep(.rps-card .el-card__body) {
  padding: 0 20px 20px;
}

.methodology {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #f7f8fa;
  color: #606266;
  font-size: 13px;
  line-height: 1.7;
}

.methodology p {
  margin: 0;
}

.methodology p + p {
  margin-top: 6px;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

:deep(.el-table__header) {
  font-weight: bold;
  background-color: #f5f7fa;
}

:deep(.el-table__row) {
  transition: all 0.3s;
}

:deep(.el-table__row:hover) {
  background-color: #f0f9ff !important;
}

.custom-header {
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-header span {
  margin-right: 5px;
}

.up {
  color: #f56c6c;
  font-weight: bold;
}

.down {
  color: #67c23a;
  font-weight: bold;
}

.change-percent-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.trend-indicator {
  margin-left: 5px;
}

.rps-cell {
  display: flex;
  flex-direction: column;
}

.rps-cell-with-change {
  gap: 4px;
}

.rps-change-text {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
}

.rps-change-text.up {
  color: #f56c6c;
}

.rps-change-text.down {
  color: #67c23a;
}

.rps-rank {
  margin-top: 5px;
  text-align: center;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
  display: inline-block;
  align-self: center;
}

.rank-excellent {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

.rank-strong {
  background-color: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #f5dab1;
}

.rank-good {
  background-color: #ecf5ff;
  color: #409eff;
  border: 1px solid #b3d8ff;
}

.rank-normal {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #c2e7b0;
}

.rank-weak {
  background-color: #f4f4f5;
  color: #909399;
  border: 1px solid #d3d4d6;
}

:deep(.row-excellent) {
  background-color: rgba(245, 108, 108, 0.05);
}

:deep(.row-strong) {
  background-color: rgba(230, 162, 60, 0.05);
}

:deep(.row-good) {
  background-color: rgba(64, 158, 255, 0.05);
}

@media (max-width: 768px) {
  .index-rps-view {
    padding: 12px;
  }

  .control-item,
  .control-search,
  .simple-filter-select,
  .strength-filter-select,
  .relation-filter-select {
    width: 100%;
  }

  .table-summary {
    width: 100%;
  }

  :deep(.rps-card .el-card__header) {
    padding: 16px;
  }

  :deep(.rps-card .el-card__body) {
    padding: 0 16px 16px;
  }
}
</style>

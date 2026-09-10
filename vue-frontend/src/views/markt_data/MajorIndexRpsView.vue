<template>
  <div
    class="major-index-rps-view"
    v-loading="loading"
    element-loading-text="正在加载大盘指数RPS数据..."
  >
    <section class="filter-panel" aria-label="指数RPS筛选条件">
      <el-form :inline="!isMobile" class="query-form">
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="tradeDate"
            type="date"
            placeholder="默认最近交易日"
            value-format="YYYYMMDD"
            clearable
            class="full-width"
          />
        </el-form-item>
        <el-form-item label="市场">
          <el-select v-model="selectedMarket" class="market-select">
            <el-option label="全部市场" value="全部" />
            <el-option label="国内" value="国内" />
            <el-option label="国际" value="国际" />
          </el-select>
        </el-form-item>
      </el-form>
    </section>

    <section class="ranking-panel" aria-label="指数RPS强度排名">
      <div class="ranking-panel-header">
        <div class="table-header">
          <div class="table-title-row">
            <div class="table-title">多周期 RPS 排名</div>
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
                <p>
                  RPS（Relative Price
                  Strength）用于衡量指数相对同组指数的强弱排序，数值越高代表相对更强。
                </p>
                <p>
                  页面按接口返回的目标交易日截面进行横向对比，同时展示当日涨跌幅与 5/20/60/120/250
                  日区间收益。
                </p>
              </div>
            </el-popover>
          </div>
          <div class="table-meta">
            <el-tag type="info" effect="plain">周期 {{ availablePeriods.join(' / ') }} 日</el-tag>
            <el-tag type="success" effect="light">更新时间 {{ queryTime || '--' }}</el-tag>
          </div>
        </div>
      </div>

      <el-table
        class="ranking-table"
        :data="filteredRows"
        stripe
        style="width: 100%"
        :height="isMobile ? undefined : 'calc(100dvh - 240px)'"
        :default-sort="{ prop: sortState.prop, order: sortState.order || undefined }"
        empty-text="暂无大盘指数RPS数据"
        @sort-change="handleSortChange"
      >
        <el-table-column
          type="index"
          label="#"
          :width="isMobile ? 34 : 60"
          align="center"
          :fixed="isMobile ? false : 'left'"
        />
        <el-table-column
          prop="name"
          label="指数名称"
          :min-width="isMobile ? 92 : 180"
          sortable="custom"
          :fixed="isMobile ? false : 'left'"
        >
          <template #header>
            <div class="custom-header">
              <span>指数名称</span>
              <el-tooltip content="点击指数名称可查看趋势看板K线图" placement="top">
                <el-icon><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
          </template>
          <template #default="{ row }">
            <div class="index-name-cell">
              <el-button
                type="primary"
                link
                class="index-name-button"
                @click="openTrendDialog(row)"
              >
                {{ row.name }}
              </el-button>
              <span class="index-code">{{ row.ts_code }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="market" label="市场" min-width="90" align="center" sortable="custom">
          <template #default="{ row }">
            <el-tag :type="row.market === '国内' ? 'danger' : 'success'" effect="light">
              {{ row.market }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="trade_date"
          label="交易日"
          min-width="110"
          align="center"
          sortable="custom"
        >
          <template #default="{ row }">
            {{ formatTradeDate(row.trade_date) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="RPS_today"
          label="当日涨跌幅 / RPS_today"
          :min-width="isMobile ? 118 : 180"
          align="center"
          sortable="custom"
        >
          <template #default="{ row }">
            <div class="rps-cell rps-cell-with-change">
              <span :class="getChangeClass(row.pct_change)" class="rps-change-text">
                {{ formatPercent(row.pct_change) }}
              </span>
              <el-progress
                :percentage="getProgressValue(row.RPS_today)"
                :color="getRpsColor(row.RPS_today)"
                :format="() => formatRpsValue(row.RPS_today)"
                :stroke-width="16"
                :show-text="true"
                :text-inside="true"
              />
            </div>
          </template>
        </el-table-column>

        <template v-for="period in availablePeriods" :key="period">
          <el-table-column
            :prop="getRpsProp(period)"
            :label="`${period}日涨跌幅 / RPS_${period}`"
            :min-width="isMobile ? 118 : 180"
            align="center"
            sortable="custom"
          >
            <template #default="{ row }">
              <div class="rps-cell rps-cell-with-change">
                <span :class="getChangeClass(row[getReturnProp(period)])" class="rps-change-text">
                  {{ formatPercent(row[getReturnProp(period)]) }}
                </span>
                <el-progress
                  :percentage="getProgressValue(row[getRpsProp(period)])"
                  :color="getRpsColor(row[getRpsProp(period)])"
                  :format="() => formatRpsValue(row[getRpsProp(period)])"
                  :stroke-width="16"
                  :show-text="true"
                  :text-inside="true"
                />
              </div>
            </template>
          </el-table-column>
        </template>
      </el-table>
    </section>

    <MajorIndexTrendDialog
      v-model="trendDialogVisible"
      :index-code="trendIndex.code"
      :index-name="trendIndex.name"
      :market="trendIndex.market"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：MajorIndexRpsView
 * 功能：
 * - 查询并展示 `/django/api/strategy/major-index-rps/` 返回的国内与国际大盘指数 RPS 排名
 * - 支持按截止日期、市场、关键词筛选数据
 * - 通过表格展示多周期涨跌幅与 RPS 强度，辅助比较指数相对强弱
 * 参数（props）：无
 * 返回值：无
 * 事件（emits）：无
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import MajorIndexTrendDialog from '@/components/MajorIndexTrendDialog.vue'
import {
  getMajorIndexRps,
  type MajorIndexRpsData,
  type MajorIndexRpsItem,
} from '@/services/strategyApi'

type MarketFilter = '全部' | '国内' | '国际'
type SortOrder = 'ascending' | 'descending' | null

interface SortState {
  prop: string
  order: SortOrder
}

const DEFAULT_PERIODS = [5, 20, 60, 120, 250]

const loading = ref(false)
const rows = ref<MajorIndexRpsItem[]>([])
const availablePeriods = ref<number[]>([...DEFAULT_PERIODS])
const queryTime = ref('')
const selectedMarket = ref<MarketFilter>('国内')
const tradeDate = ref('')
const sortState = ref<SortState>({
  prop: 'RPS_5',
  order: 'descending',
})
const trendDialogVisible = ref(false)
const trendIndex = ref({
  code: '',
  name: '',
  market: '',
})
const isMobile = ref(window.innerWidth < 768)

const filteredRows = computed(() => {
  const filtered = rows.value.filter(
    (item) => selectedMarket.value === '全部' || item.market === selectedMarket.value,
  )

  return [...filtered].sort((a, b) => compareRows(a, b, sortState.value))
})

function getReturnProp(period: number): `return_${number}` {
  return `return_${period}`
}

function getRpsProp(period: number): `RPS_${number}` {
  return `RPS_${period}`
}

function getNumericValue(value: unknown): number {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : Number.NEGATIVE_INFINITY
}

function getProgressValue(value: unknown): number {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 0
  }
  return Math.max(0, Math.min(100, numericValue))
}

function formatPercent(value: unknown): string {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '--'
  }
  return `${numericValue >= 0 ? '+' : ''}${numericValue.toFixed(2)}%`
}

function formatRpsValue(value: unknown): string {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '--'
  }
  return numericValue.toFixed(1)
}

function formatTradeDate(value?: string): string {
  if (!value || value.length !== 8) {
    return '--'
  }
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function getChangeClass(value: unknown): string {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 'flat-text'
  }
  if (numericValue > 0) {
    return 'up-text'
  }
  if (numericValue < 0) {
    return 'down-text'
  }
  return 'flat-text'
}

function getRpsColor(value: unknown): string {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '#c0c4cc'
  }
  if (numericValue >= 90) {
    return '#f56c6c'
  }
  if (numericValue >= 70) {
    return '#e6a23c'
  }
  if (numericValue >= 50) {
    return '#409eff'
  }
  return '#67c23a'
}

function compareRows(a: MajorIndexRpsItem, b: MajorIndexRpsItem, sort: SortState): number {
  if (!sort.prop || !sort.order) {
    return getNumericValue(b.RPS_today) - getNumericValue(a.RPS_today)
  }

  const aValue = a[sort.prop as keyof MajorIndexRpsItem]
  const bValue = b[sort.prop as keyof MajorIndexRpsItem]

  if (
    sort.prop === 'name' ||
    sort.prop === 'ts_code' ||
    sort.prop === 'market' ||
    sort.prop === 'source' ||
    sort.prop === 'trade_date'
  ) {
    const compareResult = String(aValue || '').localeCompare(String(bValue || ''), 'zh-CN')
    return sort.order === 'ascending' ? compareResult : -compareResult
  }

  const compareResult = getNumericValue(aValue) - getNumericValue(bValue)
  return sort.order === 'ascending' ? compareResult : -compareResult
}

async function fetchData() {
  loading.value = true
  try {
    const result: MajorIndexRpsData = await getMajorIndexRps(
      DEFAULT_PERIODS.join(','),
      tradeDate.value || undefined,
    )
    rows.value = result.data || []
    availablePeriods.value = result.periods?.length ? result.periods : [...DEFAULT_PERIODS]
    queryTime.value = result.query_time || ''
  } catch (error: any) {
    console.error('加载大盘指数RPS数据失败:', error)
    ElMessage.error(error?.message || '加载大盘指数RPS数据失败')
  } finally {
    loading.value = false
  }
}

// 截止日期变化后自动向接口请求最新数据；市场筛选为前端过滤，随 filteredRows 实时更新
watch(tradeDate, () => {
  fetchData()
})

function handleSortChange({ prop, order }: { prop: string; order: SortOrder }) {
  sortState.value = {
    prop: prop || 'RPS_today',
    order,
  }
}

/**
 * 事件：打开大盘指数趋势弹窗
 * 功能：点击指数名称后打开趋势看板弹窗，并传递当前指数代码、名称与市场信息
 * 参数：row(MajorIndexRpsItem) 当前行指数数据
 * 返回值：无
 * 事件：更新 trendIndex 与 trendDialogVisible
 */
function openTrendDialog(row: MajorIndexRpsItem) {
  trendIndex.value = {
    code: row.ts_code,
    name: row.name,
    market: row.market,
  }
  trendDialogVisible.value = true
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  isMobile.value = window.innerWidth < 768
}
</script>

<style scoped>
.major-index-rps-view {
  min-height: calc(100dvh - 104px);
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #f4f6f8;
}

.filter-panel,
.ranking-panel {
  border-radius: 6px;
}

.filter-panel {
  flex-shrink: 0;
  padding: 12px 14px 0;
  background: #ffffff;
  border: 1px solid #e5e9f0;
}

.query-form {
  margin-bottom: 0;
}

.query-form :deep(.el-form-item) {
  margin-right: 12px;
  margin-bottom: 12px;
}

.query-form :deep(.el-form-item__label) {
  color: #5f6876;
  font-weight: 500;
}

.full-width {
  width: 100%;
}

.market-select {
  width: 140px;
}

.query-form :deep(.el-input__wrapper),
.query-form :deep(.el-select__wrapper) {
  border-radius: 4px;
  box-shadow: 0 0 0 1px #d8dee8 inset;
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

.ranking-panel-header {
  flex-shrink: 0;
  padding: 12px 14px 10px;
  border-bottom: 1px solid #e8edf3;
  background: #ffffff;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.table-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-title {
  font-size: 17px;
  font-weight: 600;
  color: #172033;
  letter-spacing: 0;
}

.info-button {
  width: 22px;
  height: 22px;
  min-height: 22px;
  padding: 0;
  color: #6f7a89;
  border-color: #d8dee8;
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

.table-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.table-meta :deep(.el-tag) {
  height: 24px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  background: #f8fafc;
  border-color: #dce3ec;
}

.custom-header {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.index-name-button {
  padding: 0;
}

.index-name-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.index-code {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.rps-cell {
  min-width: 120px;
}

.rps-cell-with-change {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rps-change-text {
  font-size: 13px;
  line-height: 1.2;
}

.up-text {
  color: #f56c6c;
  font-weight: 600;
}

.down-text {
  color: #67c23a;
  font-weight: 600;
}

.flat-text {
  color: var(--el-text-color-secondary);
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

@media (max-width: 992px) {
  .table-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .major-index-rps-view {
    min-height: auto;
    padding: 8px;
    gap: 8px;
  }

  .query-form {
    display: flex;
    flex-direction: column;
  }

  .query-form :deep(.el-form-item) {
    margin-right: 0;
    margin-bottom: 12px;
    width: 100%;
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

  .query-form :deep(.el-select),
  .query-form :deep(.el-input),
  .query-form :deep(.el-date-picker),
  .market-select {
    width: 100% !important;
  }

  .query-form :deep(.el-form-item__content) {
    width: 100%;
  }

  .query-form :deep(.el-button) {
    width: 100%;
  }
}
</style>

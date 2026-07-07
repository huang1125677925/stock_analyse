<template>
  <div class="major-index-rps-view" v-loading="loading" element-loading-text="正在加载大盘指数RPS数据...">
    <el-card class="page-header" shadow="never">
      <template #header>
        <div class="header-content">
          <div>
            <h2>大盘指数RPS</h2>
            <p class="page-desc">展示国内与国际主要指数在不同周期下的涨跌幅与相对强度，便于横向观察强弱切换。</p>
          </div>
        </div>
      </template>

      <el-form :inline="!isMobile" class="query-form">
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="tradeDate"
            type="date"
            placeholder="默认最近交易日"
            value-format="YYYYMMDD"
            clearable
          />
        </el-form-item>
        <el-form-item label="市场">
          <el-select v-model="selectedMarket" style="width: 140px">
            <el-option label="全部市场" value="全部" />
            <el-option label="国内" value="国内" />
            <el-option label="国际" value="国际" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称搜索">
          <el-input
            v-model="searchKeyword"
            placeholder="输入指数名称或代码"
            clearable
            :prefix-icon="Search"
            style="width: 220px"
            @keyup.enter="fetchData"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
          <el-button :icon="RefreshRight" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="summary-grid">
        <el-card shadow="never" class="summary-card">
          <div class="summary-label">指数总数</div>
          <div class="summary-value">{{ rows.length }}</div>
        </el-card>
        <el-card shadow="never" class="summary-card">
          <div class="summary-label">国内指数</div>
          <div class="summary-value">{{ domesticCount }}</div>
        </el-card>
        <el-card shadow="never" class="summary-card">
          <div class="summary-label">国际指数</div>
          <div class="summary-value">{{ internationalCount }}</div>
        </el-card>
        <el-card shadow="never" class="summary-card">
          <div class="summary-label">最强指数</div>
          <div class="summary-value summary-name">{{ strongestIndexName }}</div>
        </el-card>
      </div>
    </el-card>

    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="table-header">
          <div class="table-title">多周期 RPS 排名</div>
          <div class="table-meta">
            <el-tag type="info" effect="plain">周期 {{ availablePeriods.join(' / ') }} 日</el-tag>
            <el-tag type="success" effect="light">更新时间 {{ queryTime || '--' }}</el-tag>
          </div>
        </div>
      </template>

      <div class="methodology">
        <p>RPS（Relative Price Strength）用于衡量指数相对同组指数的强弱排序，数值越高代表相对更强。</p>
        <p>页面按接口返回的目标交易日截面进行横向对比，同时展示当日涨跌幅与 5/20/60/120/250 日区间收益。</p>
      </div>

      <el-table
        :data="filteredRows"
        stripe
        style="width: 100%"
        :height="isMobile ? undefined : 640"
        :default-sort="{ prop: sortState.prop, order: sortState.order || undefined }"
        empty-text="暂无大盘指数RPS数据"
        @sort-change="handleSortChange"
      >
        <el-table-column type="index" label="#" :width="isMobile ? 40 : 60" align="center" :fixed="isMobile ? false : 'left'" />
        <el-table-column prop="name" label="指数名称" :min-width="isMobile ? 120 : 180" sortable="custom" :fixed="isMobile ? false : 'left'">
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
        <el-table-column prop="trade_date" label="交易日" min-width="110" align="center" sortable="custom">
          <template #default="{ row }">
            {{ formatTradeDate(row.trade_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="RPS_today" label="当日涨跌幅 / RPS_today" min-width="180" align="center" sortable="custom">
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
            min-width="180"
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
    </el-card>

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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled, RefreshRight, Search } from '@element-plus/icons-vue'
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
const searchKeyword = ref('')
const selectedMarket = ref<MarketFilter>('国内')
const tradeDate = ref('')
const sortState = ref<SortState>({
  prop: 'RPS_today',
  order: 'descending',
})
const trendDialogVisible = ref(false)
const trendIndex = ref({
  code: '',
  name: '',
  market: '',
})
const isMobile = ref(window.innerWidth < 768)

const domesticCount = computed(() => rows.value.filter(item => item.market === '国内').length)
const internationalCount = computed(() => rows.value.filter(item => item.market === '国际').length)
const strongestIndexName = computed(() => {
  const sorted = [...filteredRows.value].sort((a, b) => getNumericValue(b.RPS_today) - getNumericValue(a.RPS_today))
  return sorted[0]?.name || '--'
})

const filteredRows = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  const filtered = rows.value.filter(item => {
    const matchesMarket = selectedMarket.value === '全部' || item.market === selectedMarket.value
    const matchesKeyword = !keyword
      || item.name.toLowerCase().includes(keyword)
      || item.ts_code.toLowerCase().includes(keyword)

    return matchesMarket && matchesKeyword
  })

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

  if (sort.prop === 'name' || sort.prop === 'ts_code' || sort.prop === 'market' || sort.prop === 'source' || sort.prop === 'trade_date') {
    const compareResult = String(aValue || '').localeCompare(String(bValue || ''), 'zh-CN')
    return sort.order === 'ascending' ? compareResult : -compareResult
  }

  const compareResult = getNumericValue(aValue) - getNumericValue(bValue)
  return sort.order === 'ascending' ? compareResult : -compareResult
}

async function fetchData() {
  loading.value = true
  try {
    const result: MajorIndexRpsData = await getMajorIndexRps(DEFAULT_PERIODS.join(','), tradeDate.value || undefined)
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

function resetFilters() {
  searchKeyword.value = ''
  selectedMarket.value = '国内'
  tradeDate.value = ''
  fetchData()
}

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
  padding: 0;
}

.page-header,
.table-card {
  margin-bottom: 12px;
}

/* 去掉 el-card 的边框、阴影和圆角 */
.page-header.el-card,
.table-card.el-card {
  border-radius: 0;
}

:deep(.page-header.el-card),
:deep(.table-card.el-card) {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

/* 去掉 el-card header 和 body 的左右 padding */
:deep(.page-header .el-card__header),
:deep(.table-card .el-card__header) {
  padding: 18px 0 16px;
}

:deep(.page-header .el-card__body),
:deep(.table-card .el-card__body) {
  padding: 0 0 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-desc {
  margin: 8px 0 0;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.query-form {
  margin-bottom: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card :deep(.el-card__body) {
  padding: 16px;
}

.summary-label {
  margin-bottom: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.summary-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.summary-name {
  font-size: 18px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
}

.table-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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

.methodology {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  line-height: 1.7;
}

.methodology p {
  margin: 0;
}

.methodology p + p {
  margin-top: 6px;
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

@media (max-width: 992px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .table-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .major-index-rps-view {
    padding: 0;
  }

  .page-header,
  .table-card {
    margin-bottom: 12px;
  }

  :deep(.page-header .el-card__header),
  :deep(.table-card .el-card__header) {
    padding: 16px 12px;
  }

  :deep(.page-header .el-card__body),
  :deep(.table-card .el-card__body) {
    padding: 0 0 12px;
  }

  .summary-grid {
    grid-template-columns: minmax(0, 1fr);
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

  .query-form :deep(.el-select),
  .query-form :deep(.el-input),
  .query-form :deep(.el-date-picker) {
    width: 100% !important;
  }

  .query-form :deep(.el-form-item__content) {
    width: 100%;
  }

  .query-form :deep(.el-button) {
    width: 100%;
  }

  .methodology {
    padding: 10px 12px;
    font-size: 13px;
  }
}
</style>

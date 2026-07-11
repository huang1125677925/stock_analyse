<template>
  <el-dialog
    :model-value="modelValue"
    :title="`领涨数据详情 - ${name || tsCode}`"
    width="90%"
    top="6vh"
    append-to-body
    destroy-on-close
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div class="lead-rise-matrix" v-loading="loading" element-loading-text="正在加载领涨数据...">
      <div class="matrix-caption">
        近30天概念板块（领涨）：{{ idxType }}
        <span class="matrix-hint">横轴为日期，纵轴为领涨股票；标色格子表示该股当日领涨，格内为领涨涨幅。点击股票名称查看K线趋势图</span>
      </div>

      <div v-if="dates.length" class="matrix-scroll">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="corner-cell">领涨股票 \ 日期</th>
              <th v-for="d in dates" :key="d.date" class="date-cell">
                <div class="date-text">{{ formatDate(d.date) }}</div>
                <div
                  class="date-board-pct"
                  :class="{ up: d.pct_change > 0, down: d.pct_change < 0 }"
                >
                  {{ formatPercent(d.pct_change) }}
                </div>
                <div class="date-updown">
                  <span class="up-num">↑{{ d.up_num }}</span>
                  <span class="down-num">↓{{ d.down_num }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stock in stocks" :key="stock.name">
              <th class="stock-cell">
                <el-button
                  type="primary"
                  link
                  class="stock-name-button"
                  @click="openStockTrendDialog(stock)"
                >
                  <div class="stock-name">{{ stock.name }}</div>
                </el-button>
                <div class="stock-code">{{ stock.code }}</div>
                <div class="stock-count">领涨 {{ stock.count }} 天</div>
              </th>
              <td
                v-for="d in dates"
                :key="d.date"
                class="value-cell"
                :class="{ active: !!matrix[stock.name]?.[d.date] }"
                :style="matrix[stock.name]?.[d.date] ? cellStyle(matrix[stock.name][d.date]!) : undefined"
              >
                <span v-if="matrix[stock.name]?.[d.date]">
                  {{ formatPercent(matrix[stock.name][d.date]!) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <el-empty v-else-if="!loading" description="暂无领涨数据" :image-size="80" />
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>

  <!-- K线趋势图弹窗 -->
  <el-dialog
    v-model="stockTrendDialogVisible"
    width="88%"
    top="6vh"
    :close-on-click-modal="false"
    destroy-on-close
    append-to-body
  >
    <template #header>
      <div class="trend-dialog-header">
        <div class="trend-dialog-title">
          {{ stockTrendStock.name || stockTrendStock.code }} K线趋势图
        </div>
        <div class="trend-dialog-subtitle">
          {{ stockTrendDateRange.start || '-' }} 至 {{ stockTrendDateRange.end || '-' }}
        </div>
      </div>
    </template>

    <div class="trend-dialog-body">
      <div class="toolbar-row">
        <div class="trend-tags">
          <el-tag v-if="stockTrendStock.code" type="info" effect="plain">
            {{ stockTrendStock.code }}
          </el-tag>
          <el-tag v-if="latestStockTrendData" type="info" effect="light">
            最新收盘 {{ latestStockTrendData.close_price.toFixed(2) }}
          </el-tag>
          <el-tag
            v-if="latestStockTrendData"
            :type="latestStockTrendData.change_percent >= 0 ? 'danger' : 'success'"
            effect="light"
          >
            涨跌幅 {{ formatPercent(latestStockTrendData.change_percent) }}
          </el-tag>
        </div>

        <div class="trend-shortcuts">
          <el-radio-group v-model="stockTrendShortcut" @change="handleStockTrendShortcutChange">
            <el-radio-button label="1y">最近1年</el-radio-button>
            <el-radio-button label="3y">最近3年</el-radio-button>
            <el-radio-button label="5y">最近5年</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <el-card class="trend-preview-card" v-loading="stockTrendLoading">
        <StockKLineChart
          v-if="stockTrendData.length"
          :stock-code="stockTrendStock.code"
          :stock-name="stockTrendStock.name"
          :kline-data="stockTrendData"
          height="420px"
        />
        <el-empty
          v-else-if="!stockTrendLoading"
          description="当前区间暂无K线数据"
          :image-size="80"
        />
      </el-card>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 组件：领涨数据详情矩阵弹窗（LeadRiseMatrixDialog）
 * 功能：以透视矩阵展示概念板块近30天领涨情况。横轴为日期（含板块涨幅、涨跌家数），
 *       纵轴为领涨股票，交叉格标色并展示领涨涨幅。点击股票名称可查看K线趋势图。
 * 参数：
 *  - modelValue: 弹窗显隐
 *  - tsCode: 概念代码
 *  - idxType: 概念板块类型描述
 *  - name: 概念名称
 * 事件：update:modelValue
 */
import { ref, computed, watch, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchDcIndexLastNDays, type DcIndexRecord } from '@/services/dcIndexApi'
import { fetchStockHistoryData, type StockHistoryDataItem } from '@/services/stockHistoryApi'
import StockKLineChart from '@/components/StockKLineChart.vue'

type TrendShortcut = '1y' | '3y' | '5y'

const props = defineProps<{
  modelValue: boolean
  tsCode: string
  idxType: string
  name?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const loading = ref(false)
const records = ref<DcIndexRecord[]>([])

// K线趋势图状态
const stockTrendDialogVisible = ref(false)
const stockTrendLoading = ref(false)
const stockTrendData = ref<StockHistoryDataItem[]>([])
const stockTrendShortcut = ref<TrendShortcut>('1y')
const stockTrendDateRange = reactive({ start: '', end: '' })
const stockTrendStock = reactive({
  code: '',
  name: ''
})
let stockTrendRequestId = 0

const loadData = async () => {
  if (!props.tsCode) return
  loading.value = true
  try {
    const data = await fetchDcIndexLastNDays({ tsCode: props.tsCode, name: props.name }, 30)
    records.value = (data.records || []).sort((a, b) => a.trade_date.localeCompare(b.trade_date))
  } catch (e) {
    console.error('获取dc_index领涨数据失败:', e)
    records.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (val) => {
  if (val) loadData()
})

watch(() => props.tsCode, (newVal) => {
  if (props.modelValue && newVal) loadData()
})

// 日期维度：仅取实际有交易数据的交易日（去重后按日期升序），
// 节假日和周末没有交易数据，因此不会出现在日期轴上
const dates = computed(() => {
  const map = new Map<string, { date: string; pct_change: number; up_num: number; down_num: number }>()
  for (const r of records.value) {
    if (map.has(r.trade_date)) continue
    map.set(r.trade_date, {
      date: r.trade_date,
      pct_change: Number(r.pct_change) || 0,
      up_num: Number(r.up_num) || 0,
      down_num: Number(r.down_num) || 0
    })
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
})

// 领涨股票维度：按领涨天数降序排列
const stocks = computed(() => {
  const map = new Map<string, { name: string; code: string; count: number }>()
  for (const r of records.value) {
    const key = r.leading || '-'
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
    } else {
      map.set(key, { name: key, code: r.leading_code || '', count: 1 })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
})

// 矩阵：stockName -> date -> leading_pct
const matrix = computed(() => {
  const result: Record<string, Record<string, number>> = {}
  for (const r of records.value) {
    const key = r.leading || '-'
    if (!result[key]) result[key] = {}
    result[key][r.trade_date] = Number(r.leading_pct) || 0
  }
  return result
})

const latestStockTrendData = computed(() =>
  stockTrendData.value.length > 0
    ? stockTrendData.value[stockTrendData.value.length - 1]
    : null
)

const formatDate = (date: string) => {
  // YYYYMMDD 或 YYYY-MM-DD -> MM-DD
  const digits = date.replace(/-/g, '')
  if (digits.length === 8) {
    return `${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  }
  return date
}

const formatPercent = (value: number) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`
}

// 领涨格子按涨幅强度着色（涨幅越高红色越深）
const cellStyle = (pct: number) => {
  const clamped = Math.min(Math.max(pct, 0), 10)
  const intensity = 0.25 + (clamped / 10) * 0.55
  return {
    backgroundColor: `rgba(245, 108, 108, ${intensity.toFixed(2)})`,
    color: intensity > 0.55 ? '#fff' : '#a52121'
  }
}

// -------- K线趋势图相关函数 --------

/** 根据快捷区间计算起止日期（YYYY-MM-DD） */
function applyStockTrendShortcut(range: TrendShortcut) {
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
  stockTrendDateRange.start = fmt(startDate)
  stockTrendDateRange.end = fmt(endDate)
}

/** 加载趋势弹窗中的个股 K 线数据 */
async function loadStockTrendData() {
  const requestId = ++stockTrendRequestId
  if (!stockTrendStock.code) {
    stockTrendData.value = []
    return
  }

  stockTrendLoading.value = true
  try {
    const response = await fetchStockHistoryData(
      stockTrendStock.code,
      stockTrendDateRange.start.replace(/-/g, ''),
      stockTrendDateRange.end.replace(/-/g, ''),
      'qfq'
    )
    if (requestId !== stockTrendRequestId) return
    stockTrendData.value = [...response].sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    if (requestId !== stockTrendRequestId) return
    console.error('加载领涨股票趋势图失败:', error)
    stockTrendData.value = []
    ElMessage.error('加载股票趋势图失败，请稍后重试')
  } finally {
    if (requestId === stockTrendRequestId) {
      stockTrendLoading.value = false
    }
  }
}

/** 打开个股趋势弹窗 */
function openStockTrendDialog(stock: { name: string; code: string; count: number }) {
  const tsCode = stock.code || ''
  if (!tsCode) {
    ElMessage.warning('该股票缺少股票代码，无法查看趋势图')
    return
  }
  stockTrendStock.code = tsCode
  stockTrendStock.name = stock.name || ''
  stockTrendShortcut.value = '1y'
  stockTrendData.value = []
  applyStockTrendShortcut('1y')
  stockTrendDialogVisible.value = true
  loadStockTrendData()
}

/** 切换趋势弹窗快捷区间 */
function handleStockTrendShortcutChange(range: TrendShortcut) {
  applyStockTrendShortcut(range)
  loadStockTrendData()
}
</script>

<style scoped>
.lead-rise-matrix {
  min-height: 200px;
}

.matrix-caption {
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
}

.matrix-hint {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.matrix-scroll {
  overflow: auto;
  max-height: 620px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.matrix-table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
  width: max-content;
  min-width: 100%;
}

.matrix-table th,
.matrix-table td {
  border-right: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
  padding: 6px 8px;
  text-align: center;
  white-space: nowrap;
}

.matrix-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f5f7fa;
}

.corner-cell {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 3;
  background: #f5f7fa;
  color: #909399;
  min-width: 120px;
  text-align: left;
}

.date-cell {
  min-width: 68px;
}

.date-text {
  font-weight: 600;
  color: #303133;
}

.date-board-pct {
  font-size: 11px;
  margin-top: 2px;
}

.date-board-pct.up {
  color: #f56c6c;
}

.date-board-pct.down {
  color: #67c23a;
}

.date-updown {
  font-size: 11px;
  margin-top: 2px;
}

.date-updown .up-num {
  color: #f56c6c;
  margin-right: 4px;
}

.date-updown .down-num {
  color: #67c23a;
}

.stock-cell {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fff;
  text-align: left;
  min-width: 120px;
}

.stock-name-button {
  padding: 0;
  height: auto;
}

.stock-name {
  font-weight: 600;
  color: #303133;
}

.stock-name-button:hover .stock-name {
  color: #409eff;
}

.stock-code {
  font-size: 11px;
  color: #909399;
}

.stock-count {
  font-size: 11px;
  color: #409eff;
}

.value-cell {
  color: #c0c4cc;
  min-width: 68px;
}

.value-cell.active {
  font-weight: 600;
}

/* -------- K线趋势图弹窗样式 -------- */
.trend-dialog-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.trend-dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.trend-dialog-subtitle {
  font-size: 12px;
  color: #909399;
}

.trend-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.trend-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trend-preview-card {
  min-height: 440px;
}
</style>

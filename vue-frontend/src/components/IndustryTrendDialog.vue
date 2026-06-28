<template>
  <el-dialog
    :model-value="props.modelValue"
    width="88%"
    top="6vh"
    :close-on-click-modal="false"
    destroy-on-close
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="trend-dialog-header">
        <div class="trend-dialog-title">
          {{ displayBoardName }} 趋势看板K线图
        </div>
        <div class="trend-dialog-subtitle">
          {{ trendDateRange.start || '-' }} 至 {{ trendDateRange.end || '-' }}
        </div>
      </div>
    </template>

    <div class="trend-dialog-body">
      <div class="toolbar-row">
        <div class="table-summary">
          <el-tag v-if="props.sectorCode" type="info" effect="plain">
            板块代码 {{ props.sectorCode }}
          </el-tag>
          <el-tag v-if="props.idxType" type="warning" effect="light">
            板块类型 {{ props.idxType }}
          </el-tag>
          <el-tag v-if="latestTrendData" type="success" effect="light">
            最新收盘 {{ latestTrendData.close_price.toFixed(2) }}
          </el-tag>
          <el-tag
            v-if="latestTrendData"
            :type="latestTrendData.change_percent > 0 ? 'danger' : latestTrendData.change_percent < 0 ? 'success' : 'info'"
            effect="light"
          >
            最新涨跌幅 {{ formatPercent(latestTrendData.change_percent) }}
          </el-tag>
          <el-tag v-if="latestTrendData" type="info" effect="light">
            最新成交额 {{ formatAmount(latestTrendData.amount) }}
          </el-tag>
        </div>
        <div class="trend-shortcuts">
          <el-radio-group v-model="trendShortcut" @change="handleTrendShortcutChange">
            <el-radio-button label="1y">最近1年</el-radio-button>
            <el-radio-button label="3y">最近3年</el-radio-button>
            <el-radio-button label="5y">最近5年</el-radio-button>
            <el-radio-button label="10y">最近10年</el-radio-button>
            <el-radio-button label="20y">最近20年</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <el-card class="trend-preview-card" v-loading="trendLoading">
        <StockKLineChart
          v-if="trendData.length"
          :stock-code="props.sectorCode"
          :stock-name="displayBoardName"
          :kline-data="trendData"
          height="420px"
        />
        <el-empty
          v-else-if="!trendLoading"
          :description="trendEmptyText"
          :image-size="80"
        />
      </el-card>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 行业趋势弹窗组件
 * 功能：
 * - 根据选中的东财行业板块代码弹出趋势看板 K 线图
 * - 支持最近 1 年、3 年、5 年、10 年、20 年快捷切换
 * - 展示最新收盘价、涨跌幅、成交额等摘要信息
 * 参数：
 * - modelValue(boolean): 是否显示弹窗
 * - sectorCode(string): 东财板块代码
 * - sectorName(string): 东财板块名称
 * - idxType(string): 东财板块类型，默认行业板块
 * 返回值：无
 * 事件：
 * - update:modelValue: 更新弹窗显示状态
 */
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import StockKLineChart from '@/components/StockKLineChart.vue'
import { fetchDcDaily } from '@/services/dcDailyApi'
import type { StockHistoryDataItem } from '@/services/stockHistoryApi'
import type { IndustryMaBreadthIdxType } from '@/services/strategyBreadthApi'

type TrendShortcut = '1y' | '3y' | '5y' | '10y' | '20y'

interface Props {
  modelValue: boolean
  sectorCode: string
  sectorName: string
  idxType?: IndustryMaBreadthIdxType
}

const props = withDefaults(defineProps<Props>(), {
  idxType: '行业板块'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const trendLoading = ref(false)
const trendShortcut = ref<TrendShortcut>('1y')
const trendData = ref<StockHistoryDataItem[]>([])
const trendDateRange = reactive({
  start: '',
  end: ''
})
let trendRequestId = 0

const displayBoardName = computed(() => props.sectorName || props.sectorCode || '行业板块')

const latestTrendData = computed(() => {
  return trendData.value.length > 0
    ? trendData.value[trendData.value.length - 1]
    : null
})

const trendEmptyText = computed(() => {
  return props.sectorCode
    ? '暂无该东财板块区间K线数据'
    : '请选择板块查看趋势看板'
})

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateForApi(dateText: string): string {
  return dateText.replace(/-/g, '')
}

function getNumericValue(value: unknown): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(num) ? num : 0
}

function formatPercent(value: unknown): string {
  const num = getNumericValue(value)
  if (!Number.isFinite(num)) return '-'
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

function formatAmount(value: unknown): string {
  const numericValue = getNumericValue(value)
  if (!Number.isFinite(numericValue) || numericValue === 0) return '0'
  if (Math.abs(numericValue) >= 100000000) return `${(numericValue / 100000000).toFixed(2)}亿`
  if (Math.abs(numericValue) >= 10000) return `${(numericValue / 10000).toFixed(2)}万`
  return `${numericValue.toFixed(2)}元`
}

/**
 * 工具：应用板块趋势快捷时间范围
 * 功能：根据最近1年、3年、5年、10年、20年的快捷选项计算东财板块K线查询区间
 * 参数：range(TrendShortcut) 快捷时间范围
 * 返回值：无
 * 事件：更新 trendDateRange
 */
const applyTrendShortcut = (range: TrendShortcut) => {
  const yearMap: Record<TrendShortcut, number> = { '1y': 1, '3y': 3, '5y': 5, '10y': 10, '20y': 20 }
  const end = new Date()
  const start = new Date()
  start.setFullYear(end.getFullYear() - yearMap[range])
  trendDateRange.start = formatDate(start)
  trendDateRange.end = formatDate(end)
}

/**
 * 工具：加载东财板块趋势K线数据
 * 功能：调用 dc-daily 接口获取当前选中板块日线，并转换为 K 线组件所需结构
 * 参数：无
 * 返回值：Promise<void>
 * 事件：更新 trendData、trendLoading
 */
const loadTrendData = async () => {
  const requestId = ++trendRequestId

  if (!props.sectorCode || !trendDateRange.start || !trendDateRange.end) {
    trendData.value = []
    return
  }

  trendLoading.value = true
  try {
    const response = await fetchDcDaily({
      ts_code: props.sectorCode,
      idx_type: props.idxType,
      start_date: formatDateForApi(trendDateRange.start),
      end_date: formatDateForApi(trendDateRange.end),
      fields: 'ts_code,trade_date,open,high,low,close,change,pct_change,vol,amount,swing,turnover_rate'
    })

    if (requestId !== trendRequestId) return

    trendData.value = [...(response.records || [])]
      .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
      .map((item) => ({
        stock_code: item.ts_code,
        stock_name: displayBoardName.value,
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
    if (requestId !== trendRequestId) return
    console.error('获取东财板块趋势K线失败:', error)
    trendData.value = []
    ElMessage.error('获取东财板块趋势K线失败，请稍后重试')
  } finally {
    if (requestId === trendRequestId) {
      trendLoading.value = false
    }
  }
}

/**
 * 事件：切换板块趋势快捷范围
 * 功能：响应最近1年、3年、5年、10年、20年快捷范围切换并重新加载K线数据
 * 参数：range(TrendShortcut) 快捷时间范围
 * 返回值：无
 * 事件：更新趋势查询区间并刷新图表
 */
const handleTrendShortcutChange = (range: TrendShortcut) => {
  applyTrendShortcut(range)
  loadTrendData()
}

watch(
  () => [props.modelValue, props.sectorCode, props.sectorName, props.idxType] as const,
  ([visible, sectorCode]) => {
    if (!visible || !sectorCode) {
      return
    }

    trendShortcut.value = '1y'
    trendData.value = []
    applyTrendShortcut('1y')
    loadTrendData()
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.table-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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
</style>

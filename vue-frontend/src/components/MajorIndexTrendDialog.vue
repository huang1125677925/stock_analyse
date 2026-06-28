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
          {{ displayIndexName }} 趋势看板K线图
        </div>
        <div class="trend-dialog-subtitle">
          {{ trendDateRange.start || '-' }} 至 {{ trendDateRange.end || '-' }}
        </div>
      </div>
    </template>

    <div class="trend-dialog-body">
      <div class="toolbar-row">
        <div class="table-summary">
          <el-tag v-if="props.indexCode" type="info" effect="plain">
            指数代码 {{ props.indexCode }}
          </el-tag>
          <el-tag v-if="displayMarketLabel" type="warning" effect="light">
            市场 {{ displayMarketLabel }}
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
          </el-radio-group>
        </div>
      </div>

      <el-card class="trend-preview-card" v-loading="trendLoading">
        <StockKLineChart
          v-if="trendData.length"
          :stock-code="props.indexCode"
          :stock-name="displayIndexName"
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
 * 组件名称：MajorIndexTrendDialog
 * 功能：
 * - 根据大盘指数代码弹出趋势看板 K 线图
 * - 调用 `/django/api/index/major-index-daily/` 获取国内/国际主要指数日线行情
 * - 支持最近 1 年、3 年、5 年快捷区间切换
 * - 展示最新收盘价、涨跌幅、成交额等摘要信息
 * 参数：
 * - modelValue(boolean): 是否显示弹窗
 * - indexCode(string): 指数代码
 * - indexName(string): 指数名称
 * - market(string): 市场类型，支持国内/国际
 * 返回值：无
 * 事件：
 * - update:modelValue: 更新弹窗显示状态
 */
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import StockKLineChart from '@/components/StockKLineChart.vue'
import {
  fetchMajorIndexDaily,
  type MajorIndexDailyScope,
  type MajorIndexDailyRecord,
} from '@/services/majorIndexDailyApi'
import type { StockHistoryDataItem } from '@/services/stockHistoryApi'

type TrendShortcut = '1y' | '3y' | '5y'

interface Props {
  modelValue: boolean
  indexCode: string
  indexName: string
  market?: string
}

const props = withDefaults(defineProps<Props>(), {
  market: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const trendLoading = ref(false)
const trendShortcut = ref<TrendShortcut>('1y')
const trendData = ref<StockHistoryDataItem[]>([])
const trendDateRange = reactive({
  start: '',
  end: '',
})
let trendRequestId = 0

const displayIndexName = computed(() => props.indexName || props.indexCode || '大盘指数')

const displayMarketLabel = computed(() => {
  if (props.market === '国内' || props.market === '国际') {
    return props.market
  }
  return ''
})

const latestTrendData = computed(() => {
  return trendData.value.length > 0
    ? trendData.value[trendData.value.length - 1]
    : null
})

const trendEmptyText = computed(() => {
  return props.indexCode
    ? '暂无该指数区间K线数据'
    : '请选择指数查看趋势看板'
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

function normalizeTradeDate(dateText: string): string {
  if (!dateText) {
    return ''
  }

  const normalized = dateText.replace(/[^0-9]/g, '')
  if (normalized.length !== 8) {
    return dateText
  }

  return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`
}

function getNumericValue(value: unknown): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(num) ? num : 0
}

function formatPercent(value: unknown): string {
  const num = getNumericValue(value)
  if (!Number.isFinite(num)) {
    return '-'
  }
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

function formatAmount(value: unknown): string {
  const numericValue = getNumericValue(value)
  if (!Number.isFinite(numericValue) || numericValue === 0) {
    return '0'
  }
  if (Math.abs(numericValue) >= 100000000) {
    return `${(numericValue / 100000000).toFixed(2)}亿`
  }
  if (Math.abs(numericValue) >= 10000) {
    return `${(numericValue / 10000).toFixed(2)}万`
  }
  return `${numericValue.toFixed(2)}元`
}

function resolveScopeByMarket(market?: string): MajorIndexDailyScope {
  return market === '国际' ? 'global' : 'domestic'
}

/**
 * 工具：应用指数趋势快捷时间范围
 * 功能：根据最近1年、3年、5年的快捷选项计算主要指数K线查询区间
 * 参数：range(TrendShortcut) 快捷时间范围
 * 返回值：无
 * 事件：更新 trendDateRange
 */
function applyTrendShortcut(range: TrendShortcut) {
  const yearMap: Record<TrendShortcut, number> = { '1y': 1, '3y': 3, '5y': 5 }
  const end = new Date()
  const start = new Date()
  start.setFullYear(end.getFullYear() - yearMap[range])
  trendDateRange.start = formatDate(start)
  trendDateRange.end = formatDate(end)
}

function mapRecordToKlineItem(record: MajorIndexDailyRecord): StockHistoryDataItem {
  return {
    stock_code: record.ts_code,
    stock_name: record.name,
    date: normalizeTradeDate(record.trade_date),
    open_price: getNumericValue(record.open),
    close_price: getNumericValue(record.close),
    high_price: getNumericValue(record.high),
    low_price: getNumericValue(record.low),
    change_percent: getNumericValue(record.pct_chg),
    change_amount: getNumericValue(record.change),
    volume: getNumericValue(record.vol),
    amount: getNumericValue(record.amount),
    amplitude: getNumericValue(record.swing),
    turnover_rate: 0,
    created_at: '',
  }
}

/**
 * 工具：加载大盘指数趋势K线数据
 * 功能：调用 major-index-daily 接口获取当前选中指数日线，并转换为 K 线组件所需结构
 * 参数：无
 * 返回值：Promise<void>
 * 事件：更新 trendData、trendLoading
 */
async function loadTrendData() {
  const requestId = ++trendRequestId

  if (!props.indexCode || !trendDateRange.start || !trendDateRange.end) {
    trendData.value = []
    return
  }

  trendLoading.value = true
  try {
    const scope = resolveScopeByMarket(props.market)
    const response = await fetchMajorIndexDaily({
      scope,
      startDate: formatDateForApi(trendDateRange.start),
      endDate: formatDateForApi(trendDateRange.end),
      domesticCodes: scope === 'domestic' ? props.indexCode : undefined,
      globalCodes: scope === 'global' ? props.indexCode : undefined,
    })

    if (requestId !== trendRequestId) {
      return
    }

    trendData.value = [...(response.records || [])]
      .filter((item) => item.ts_code === props.indexCode)
      .sort((a, b) => String(a.trade_date).localeCompare(String(b.trade_date)))
      .map(mapRecordToKlineItem)
  } catch (error) {
    if (requestId !== trendRequestId) {
      return
    }
    console.error('获取主要指数趋势K线失败:', error)
    trendData.value = []
    ElMessage.error('获取主要指数趋势K线失败，请稍后重试')
  } finally {
    if (requestId === trendRequestId) {
      trendLoading.value = false
    }
  }
}

/**
 * 事件：切换指数趋势快捷范围
 * 功能：响应最近1年、3年、5年快捷范围切换并重新加载K线数据
 * 参数：range(TrendShortcut) 快捷时间范围
 * 返回值：无
 * 事件：更新趋势查询区间并刷新图表
 */
function handleTrendShortcutChange(range: TrendShortcut) {
  applyTrendShortcut(range)
  loadTrendData()
}

watch(
  () => [props.modelValue, props.indexCode, props.indexName, props.market] as const,
  ([visible, indexCode]) => {
    if (!visible || !indexCode) {
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

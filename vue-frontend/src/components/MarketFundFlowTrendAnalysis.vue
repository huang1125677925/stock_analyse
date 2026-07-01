<template>
  <div class="market-fund-flow-trend-analysis" v-loading="loading" element-loading-text="正在加载大盘资金趋势数据...">
    <el-card class="toolbar-card" shadow="hover">
      <el-form :inline="true" class="query-form">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :clearable="false"
          />
        </el-form-item>
        <el-form-item label="展示维度">
          <el-select v-model="selectedMetricGroup" style="width: 160px">
            <el-option label="净流入金额" value="amount" />
            <el-option label="净流入占比" value="ratio" />
          </el-select>
        </el-form-item>
        <el-form-item label="数值过滤">
          <el-select v-model="valueFilter" style="width: 140px">
            <el-option label="全部" value="all" />
            <el-option label="仅正值" value="positive" />
            <el-option label="仅负值" value="negative" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button-group>
            <el-button
              v-for="preset in presetRanges"
              :key="preset"
              :type="activePresetDays === preset ? 'primary' : 'default'"
              @click="applyPresetRange(preset)"
            >
              最近{{ preset }}天
            </el-button>
          </el-button-group>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="summary-grid">
      <el-card shadow="never" class="summary-card">
        <div class="summary-label">最新交易日</div>
        <div class="summary-value">{{ latestSnapshot ? formatDisplayDate(latestSnapshot.date) : '--' }}</div>
        <div class="summary-meta">热力图按日期横向展开资金对象变化</div>
      </el-card>
      <el-card shadow="never" class="summary-card">
        <div class="summary-label">上证综指</div>
        <div class="summary-value">{{ formatIndexValue(latestSnapshot?.shanghai_close_price) }}</div>
        <div class="summary-meta" :class="getChangeClass(latestSnapshot?.shanghai_change_rate)">
          {{ formatChange(latestSnapshot?.shanghai_change_rate) }}
        </div>
      </el-card>
      <el-card shadow="never" class="summary-card">
        <div class="summary-label">深证成指</div>
        <div class="summary-value">{{ formatIndexValue(latestSnapshot?.shenzhen_close_price) }}</div>
        <div class="summary-meta" :class="getChangeClass(latestSnapshot?.shenzhen_change_rate)">
          {{ formatChange(latestSnapshot?.shenzhen_change_rate) }}
        </div>
      </el-card>
    </div>

    <el-card class="heatmap-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-title">大盘资金热力图</div>
            <div class="card-desc">行表示不同资金对象，列表示交易日期；颜色越红代表净流入越强，越绿代表净流出越明显。</div>
          </div>
          <div class="card-tags">
            <el-tag type="info" effect="plain">{{ selectedMetricGroupLabel }}</el-tag>
            <el-tag type="success" effect="light">样本 {{ trendRows.length }} 天</el-tag>
          </div>
        </div>
      </template>

      <div v-if="trendRows.length === 0" class="empty-state">当前时间范围暂无大盘资金趋势数据</div>
      <HeatmapChart v-else :option="heatmapOption" :height="440" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：MarketFundFlowTrendAnalysis
 * 功能：
 * - 查询并展示 `/django/api/market/fund-flow/trend/` 的大盘资金趋势热力图
 * - 支持按时间范围、金额/占比维度和正负值过滤查看不同资金对象的变化
 * - 在热力图上方展示最新交易日的上证综指、深证成指点位与涨跌幅摘要
 * 参数（props）：无
 * 返回值：无
 * 事件（emits）：无
 */
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { EChartsOption } from 'echarts'
import HeatmapChart from '@/components/HeatmapChart.vue'
import {
  MARKET_FUND_FLOW_OBJECT_GROUPS,
  fetchMarketFundFlowTrend,
  formatMoney,
  formatPercent,
  type MarketFundFlowMetricGroup,
  type MarketFundFlowObjectOption,
  type MarketFundFlowTrendItem,
} from '@/services/marketFundFlowTrendApi'

type ValueFilter = 'all' | 'positive' | 'negative'

const DEFAULT_RANGE_DAYS = 20
const PRESET_RANGE_DAYS = [20, 40, 60, 120] as const
type PresetDays = typeof PRESET_RANGE_DAYS[number]

const loading = ref(false)
const trendRows = ref<MarketFundFlowTrendItem[]>([])
const selectedMetricGroup = ref<MarketFundFlowMetricGroup>('amount')
const valueFilter = ref<ValueFilter>('all')
const activePresetDays = ref<PresetDays | null>(DEFAULT_RANGE_DAYS)
const dateRange = ref<[string, string]>(buildRecentDateRange(DEFAULT_RANGE_DAYS))
const presetRanges: PresetDays[] = [...PRESET_RANGE_DAYS]

const selectedObjects = computed<MarketFundFlowObjectOption[]>(() => {
  return MARKET_FUND_FLOW_OBJECT_GROUPS[selectedMetricGroup.value]
})

const selectedMetricGroupLabel = computed(() => {
  return selectedMetricGroup.value === 'amount' ? '净流入金额' : '净流入占比'
})

const latestSnapshot = computed<MarketFundFlowTrendItem | null>(() => {
  return trendRows.value.length > 0 ? trendRows.value[trendRows.value.length - 1] : null
})

const heatmapOption = computed<EChartsOption>(() => {
  const dates = trendRows.value.map(item => formatDisplayDate(item.date))
  const objectLabels = selectedObjects.value.map(item => item.label)
  const heatmapData: Array<[number, number, number]> = []
  let minValue = Infinity
  let maxValue = -Infinity

  trendRows.value.forEach((row, xIndex) => {
    selectedObjects.value.forEach((objectItem, yIndex) => {
      const rawValue = row[objectItem.key]
      if (rawValue == null) {
        return
      }

      if (valueFilter.value === 'positive' && rawValue <= 0) {
        return
      }
      if (valueFilter.value === 'negative' && rawValue >= 0) {
        return
      }

      heatmapData.push([xIndex, yIndex, rawValue])
      minValue = Math.min(minValue, rawValue)
      maxValue = Math.max(maxValue, rawValue)
    })
  })

  if (heatmapData.length === 0) {
    return {
      title: {
        text: '当前筛选条件下暂无可展示数据',
        left: 'center',
        top: 'center',
        textStyle: {
          fontSize: 16,
          color: '#909399',
        },
      },
    }
  }

  const bound = Math.max(Math.abs(minValue), Math.abs(maxValue), 1)

  return {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [xIndex, yIndex, rawValue] = params.data as [number, number, number]
        const snapshot = trendRows.value[xIndex]
        const objectItem = selectedObjects.value[yIndex]
        return [
          formatDisplayDate(snapshot.date),
          objectItem.label,
          formatCellValue(rawValue, selectedMetricGroup.value),
        ].join('<br/>')
      },
    },
    grid: {
      left: 40,
      right: 90,
      top: 36,
      bottom: 80,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      splitArea: { show: true },
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'category',
      data: objectLabels,
      splitArea: { show: true },
      axisLabel: {
        interval: 0,
      },
    },
    visualMap: {
      min: -bound,
      max: bound,
      calculable: true,
      orient: 'vertical',
      right: 12,
      top: 'center',
      text: ['净流入', '净流出'],
      inRange: {
        color: ['#00C853', '#f7f7f7', '#FF1744'],
      },
    },
    series: [
      {
        name: selectedMetricGroupLabel.value,
        type: 'heatmap',
        data: heatmapData,
        progressive: 0,
        emphasis: {
          itemStyle: {
            borderColor: '#333',
            borderWidth: 1,
          },
        },
      },
    ],
  }
})

async function fetchData() {
  const [startDate, endDate] = dateRange.value
  if (!startDate || !endDate) {
    ElMessage.warning('请选择完整的时间范围')
    return
  }

  loading.value = true
  try {
    trendRows.value = await fetchMarketFundFlowTrend({ startDate, endDate })
  } catch (error) {
    console.error('获取大盘资金趋势数据失败:', error)
    ElMessage.error('获取大盘资金趋势数据失败')
  } finally {
    loading.value = false
  }
}

function applyPresetRange(days: PresetDays) {
  activePresetDays.value = days
  dateRange.value = buildRecentDateRange(days)
}

function buildRecentDateRange(days: number): [string, string] {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days + 1)

  return [formatDate(endDateValue(startDate)), formatDate(endDateValue(endDate))]
}

function diffDays(range: [string, string]): number {
  const [start, end] = range
  if (!start || !end) {
    return 0
  }
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return 0
  }
  return Math.round((endTime - startTime) / (24 * 60 * 60 * 1000)) + 1
}

// 时间范围表单手动修改时，自动取消与快捷按钮的联动高亮，
// 避免“按了 20 天再去改日期”出现按钮和表单不一致的情况。
watch(dateRange, (next) => {
  const matched = PRESET_RANGE_DAYS.find((days) => diffDays(next) === days)
  activePresetDays.value = matched ?? null
})

// 任意筛选条件变化都自动刷新热力图
watch(
  [dateRange, selectedMetricGroup, valueFilter],
  () => {
    fetchData()
  },
  { deep: true }
)

function endDateValue(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) {
    return '--'
  }
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
  }
  return value
}

function formatIndexValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '--'
  }
  return value.toFixed(2)
}

function formatChange(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '--'
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatCellValue(value: number, group: MarketFundFlowMetricGroup): string {
  return group === 'amount' ? formatMoney(value) : formatPercent(value)
}

function getChangeClass(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return ''
  }
  if (value > 0) {
    return 'is-up'
  }
  if (value < 0) {
    return 'is-down'
  }
  return 'is-flat'
}

onMounted(() => {
  // 初次进入页面时按默认范围（最近 20 天）拉取数据
  fetchData()
})
</script>

<style scoped lang="scss">
.market-fund-flow-trend-analysis {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.query-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  min-height: 128px;
}

.summary-label {
  font-size: 13px;
  color: #909399;
}

.summary-value {
  margin-top: 14px;
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.summary-meta {
  margin-top: 10px;
  font-size: 14px;
  color: #606266;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-desc {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
}

.card-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220px;
  color: #909399;
}

.is-up {
  color: #f56c6c;
}

.is-down {
  color: #67c23a;
}

.is-flat {
  color: #909399;
}

@media (max-width: 960px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .card-header {
    flex-direction: column;
  }
}
</style>

<template>
  <div class="market-index-breadth-view">
    <el-card class="control-card" shadow="never">
      <div class="controls">
        <div class="control-group">
          <span class="control-label">时间范围：</span>
          <el-select
            v-model="rangeDays"
            :disabled="loading"
            @change="fetchData"
            style="width: 140px"
          >
            <el-option
              v-for="option in rangeDaysOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="control-group">
          <span class="control-label">结束日期：</span>
          <el-date-picker
            v-model="endDate"
            type="date"
            placeholder="选择结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :clearable="false"
            :disabled="loading"
            :disabled-date="disableFutureDate"
            @change="fetchData"
            style="width: 160px"
          />
        </div>
        <div class="control-group">
          <el-button type="primary" :loading="loading" @click="fetchData">刷新</el-button>
        </div>
        <div class="control-group">
          <el-button
            type="default"
            :disabled="loading || !rawData.length"
            :icon="sortByLastColumn ? 'SortDown' : 'Sort'"
            @click="toggleLastColumnSort"
          >
            {{ sortByLastColumn ? '取消排序' : '按最后一列排序' }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="chart-card" shadow="never" v-loading="loading" element-loading-text="正在加载指数宽度数据...">
      <template #header>
        <div class="card-header">
          <span>大盘指数宽度热力图（MA5 / MA10 / MA20）</span>
          <div class="header-right">
            <span class="count-info">指数数量：{{ displayedIndexCount }}</span>
            <span class="tips">数据来源：指数MA宽度接口</span>
          </div>
        </div>
      </template>

      <div class="methodology">
        <p>
          统计口径：基于各大盘指数的成分股，同时汇总每个指数中收盘价高于 MA5、MA10、MA20 的成分股占比。
        </p>
        <p>
          计算方式：市场宽度 = count_above_ma / eligible_count。数值越高，表示该指数内站上均线的成分股占比越高，整体走势越强。
        </p>
        <p>点击热力图单元格可查看对应指数的趋势看板 K 线图。</p>
      </div>

      <HeatmapChart
        v-if="heatmapOption"
        :option="heatmapOption"
        @chart-click="onHeatmapClick"
      />

      <div v-else-if="!loading" class="empty-tip">暂无数据</div>
    </el-card>

    <MajorIndexTrendDialog
      v-model="trendDialogVisible"
      :index-code="trendIndex.code"
      :index-name="trendIndex.name"
      :market="trendIndex.market"
      :start-date="trendDateRange.start"
      :end-date="trendDateRange.end"
      :breadth-lines="trendBreadthLines"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：MarketIndexBreadthView
 * 功能：
 * - 使用 /django/api/strategy/index-ma-breadth/ 接口渲染大盘指数 MA 市场宽度热力图（日期 × 指数-MA周期，值为宽度比例）
 * - 支持选择时间范围、结束日期
 * - 支持按最后一列（最新交易日）宽度值对指数排序
 * 参数（props）：无
 * 返回值：无
 * 事件（emits）：无
 */
import { ref, computed, onMounted } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import HeatmapChart from '@/components/HeatmapChart.vue'
import MajorIndexTrendDialog from '@/components/MajorIndexTrendDialog.vue'
import { useIsMobile } from '@/composables/useIsMobile'
import {
  fetchIndexMaBreadth,
  type IndexMaBreadthItem
} from '@/services/indexMaBreadthApi'

// 国内大盘指数代码列表（与 major-index-rps 国内指数一致）
const DOMESTIC_INDEX_CODES = [
  '000001.SH', // 上证综指
  '000016.SH', // 上证50
  '000300.SH', // 沪深300
  '000905.SH', // 中证500
  '000688.SH', // 科创50
  '399001.SZ', // 深证成指
  '399006.SZ', // 创业板指
]

type DisplayMaWindow = 5 | 10 | 20
type HeatmapPoint = [number, number, number, DisplayMaWindow]

interface IndexMaBreadthHeatmapItem extends IndexMaBreadthItem {
  ma_window: DisplayMaWindow
}

interface HeatmapRow {
  key: string
  label: string
  indexName: string
  maWindow: DisplayMaWindow
}

interface BreadthLinePoint {
  date: string
  value: number
}

interface BreadthOverlayLine {
  name: string
  points: BreadthLinePoint[]
  color?: string
  width?: number
  type?: 'solid' | 'dashed' | 'dotted'
  showSymbol?: boolean
  yAxisIndex?: number
  valueFormat?: 'percent' | 'raw'
}

const { isMobile } = useIsMobile()

const loading = ref(false)
const endDate = ref<string>(formatDate(new Date()))
const rangeDays = ref<number>(60)
const sortByLastColumn = ref(true)

const rangeDaysOptions = [
  { label: '最近10天', value: 10 },
  { label: '最近20天', value: 20 },
  { label: '最近30天', value: 30 },
  { label: '最近60天', value: 60 },
]
const displayMaWindows: DisplayMaWindow[] = [5, 10, 20]

const rawData = ref<IndexMaBreadthHeatmapItem[]>([])

// 指数趋势看板弹窗状态：点击热力图单元格后打开对应指数的 K 线趋势图
const trendDialogVisible = ref(false)
const trendIndex = ref({
  code: '',
  name: '',
  market: '国内',
})

const maLineColors: Record<DisplayMaWindow, string> = {
  5: '#e11d48',
  10: '#2563eb',
  20: '#16a34a',
}

// 日期工具
function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(dateText: string): Date {
  const [year, month, day] = dateText.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function computeDateRangeByEndDate(endDateText: string, days: number): [string, string] {
  const end = parseDate(endDateText)
  const start = new Date(end.getTime())
  start.setDate(end.getDate() - days)
  return [formatDate(start), formatDate(end)]
}

function disableFutureDate(date: Date): boolean {
  return date.getTime() > Date.now()
}

const toggleLastColumnSort = () => {
  sortByLastColumn.value = !sortByLastColumn.value
}

// 日期维度（升序）
const dates = computed<string[]>(() => {
  return Array.from(new Set(rawData.value.map(d => d.date))).sort()
})

// 指数维度：默认按最后一列（最新交易日）宽度值升序排列，使强势指数落在热力图顶部
const indexNames = computed<string[]>(() => {
  const names = Array.from(new Set(rawData.value.map(d => d.index_name)))

  if (sortByLastColumn.value && dates.value.length > 0) {
    const lastDate = dates.value[dates.value.length - 1]
    const lastValues = new Map<string, number[]>()
    rawData.value.forEach(item => {
      if (item.date === lastDate && names.includes(item.index_name)) {
        const val = Number(item.breadth_ratio)
        const values = lastValues.get(item.index_name) ?? []
        values.push(Number.isNaN(val) ? 0 : val)
        lastValues.set(item.index_name, values)
      }
    })
    const getAverageLastValue = (name: string) => {
      const values = lastValues.get(name) ?? []
      if (!values.length) return 0
      return values.reduce((sum, value) => sum + value, 0) / values.length
    }
    names.sort((a, b) => getAverageLastValue(a) - getAverageLastValue(b))
  } else {
    names.sort()
  }

  return names
})

const displayedIndexCount = computed<number>(() => indexNames.value.length)

const trendDateRange = computed(() => {
  if (dates.value.length > 0) {
    return {
      start: dates.value[0],
      end: dates.value[dates.value.length - 1],
    }
  }

  const [start, end] = computeDateRangeByEndDate(endDate.value, rangeDays.value)
  return { start, end }
})

const heatmapRows = computed<HeatmapRow[]>(() => {
  return indexNames.value.flatMap(indexName =>
    displayMaWindows.map(maWindow => ({
      key: `${indexName}__MA${maWindow}`,
      label: `${indexName} MA${maWindow}`,
      indexName,
      maWindow
    }))
  )
})

// 热力图矩阵数据 [x(dateIndex), y(rowIndex), value, maWindow]
const heatmapData = computed<HeatmapPoint[]>(() => {
  const dateIndex = new Map(dates.value.map((d, i) => [d, i]))
  const rowIndex = new Map(heatmapRows.value.map((row, i) => [row.key, i]))
  const points: HeatmapPoint[] = []
  rawData.value.forEach(item => {
    const di = dateIndex.get(item.date)
    const ri = rowIndex.get(`${item.index_name}__MA${item.ma_window}`)
    if (di !== undefined && ri !== undefined) {
      const val = Number(item.breadth_ratio)
      points.push([di, ri, Number.isNaN(val) ? 0 : val, item.ma_window])
    }
  })
  return points
})

const trendBreadthLines = computed<BreadthOverlayLine[]>(() => {
  if (!trendIndex.value.code) return []

  return displayMaWindows
    .map(maWindow => {
      const points = rawData.value
        .filter(item => item.index_code === trendIndex.value.code && item.ma_window === maWindow)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(item => ({
          date: item.date,
          value: Number(item.breadth_ratio)
        }))
        .filter(point => Number.isFinite(point.value))

      return {
        name: `MA${maWindow}宽度`,
        points,
        color: maLineColors[maWindow],
        width: 1.6,
        showSymbol: false,
        yAxisIndex: 1,
        valueFormat: 'percent' as const,
      }
    })
    .filter(line => line.points.length > 0)
})

const heatmapOption = computed<echarts.EChartsOption | null>(() => {
  if (dates.value.length === 0 || heatmapRows.value.length === 0 || heatmapData.value.length === 0) return null
  const mobile = isMobile.value
  return {
    animation: false,
    tooltip: {
      position: 'top',
      confine: true,
      formatter: (params: any) => {
        const [x, y, v, ma] = params?.data ?? []
        const date = typeof x === 'number' ? dates.value[x] : ''
        const row = typeof y === 'number' ? heatmapRows.value[y] : undefined
        const maLabel = ma ? `MA${ma}` : row ? `MA${row.maWindow}` : ''
        return `${date}<br/>${row?.indexName ?? ''} ${maLabel}<br/>宽度比例: ${(Number(v) * 100).toFixed(2)}%`
      }
    },
    grid: mobile
      ? { left: 4, right: 6, top: 34, bottom: 56, containLabel: true }
      : { left: 140, right: 80, top: 80, bottom: 20 },
    xAxis: {
      type: 'category',
      data: dates.value,
      position: mobile ? 'bottom' : 'top',
      axisLabel: {
        rotate: mobile ? 45 : 0,
        hideOverlap: true,
        interval: 'auto',
        fontSize: mobile ? 9 : 12,
        formatter: mobile ? (v: string) => (v && v.length >= 10 ? v.slice(5) : v) : undefined
      }
    },
    yAxis: {
      type: 'category',
      data: heatmapRows.value.map(row => row.label),
      axisLabel: {
        fontSize: mobile ? 9 : 12,
        ...(mobile ? { width: 72, overflow: 'truncate' as const } : {})
      }
    },
    visualMap: {
      dimension: 2,
      min: 0,
      max: 1,
      calculable: true,
      orient: mobile ? 'horizontal' : 'vertical',
      ...(mobile
        ? { left: 'center', bottom: 2, itemWidth: 12, itemHeight: 70 }
        : { right: 10, top: 40, bottom: 40 }),
      textStyle: { fontSize: mobile ? 10 : 12 },
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      }
    },
    series: [{
      type: 'heatmap',
      data: heatmapData.value,
      label: {
        show: !mobile,
        fontSize: 9,
        formatter: (params: any) => `${(Number(params.data[2]) * 100).toFixed(0)}`
      },
      itemStyle: { borderColor: '#fff', borderWidth: mobile ? 0.5 : 1 },
      emphasis: {
        itemStyle: { shadowBlur: 5, shadowColor: 'rgba(0, 0, 0, 0.3)' },
        label: {
          show: true,
          fontSize: 10,
          formatter: (params: any) => `${(Number(params.data[2]) * 100).toFixed(2)}%`
        }
      }
    }]
  }
})

const fetchData = async () => {
  loading.value = true
  try {
    const [start, end] = computeDateRangeByEndDate(endDate.value, rangeDays.value)
    const results = await Promise.all(displayMaWindows.map(async maWindow => {
      const result = await fetchIndexMaBreadth({
        startDate: start,
        endDate: end,
        maWindow,
        indexCodes: DOMESTIC_INDEX_CODES
      })
      return {
        ...result,
        data: (result.data ?? []).map(item => ({ ...item, ma_window: maWindow }))
      }
    }))
    rawData.value = results.flatMap(result => result.data)
  } catch (err: any) {
    console.error('获取大盘指数MA宽度数据失败:', err)
    ElMessage.error(err?.message || '获取大盘指数MA宽度数据失败')
    rawData.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 事件：点击热力图单元格
 * 功能：根据点击的指数打开趋势看板弹窗，展示该指数的 K 线趋势图
 * 参数：params(any) ECharts 点击事件，data 为 [dateIndex, indexIndex, value]
 * 返回值：无
 * 事件：更新 trendIndex 与 trendDialogVisible
 */
const onHeatmapClick = (params: any) => {
  const [, y] = (params?.data ?? []) as [number, number, number]
  const row = typeof y === 'number' ? heatmapRows.value[y] : undefined
  const name = row?.indexName ?? ''
  if (!name) return

  const matched = rawData.value.find(item => item.index_name === name)
  if (!matched?.index_code) return

  trendIndex.value = {
    code: matched.index_code,
    name: matched.index_name,
    market: '国内',
  }
  trendDialogVisible.value = true
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.market-index-breadth-view {
  display: flex;
  flex-direction: column;
  gap: 16px;

  // 去掉所有 el-card 的边框、圆角和阴影
  :deep(.el-card) {
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  // 去掉 el-card 的 header 和 body 的左右 padding
  :deep(.el-card__header),
  :deep(.el-card__body) {
    padding-left: 0;
    padding-right: 0;
  }
}

.control-card {
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
  }
  .control-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .control-label {
    color: #666;
  }
}

.chart-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
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
  .methodology p { margin: 0; }
  .methodology p + p { margin-top: 6px; }
  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: normal;
  }
  .count-info { color: #606266; font-size: 12px; }
  .tips { color: #999; font-size: 12px; }
  .skipped-tip { margin-bottom: 12px; }
  .empty-tip { color: #999; padding: 24px; text-align: center; }
}

// 移动端适配
@media (max-width: 768px) {
  .market-index-breadth-view {
    gap: 12px;
  }

  .control-card {
    .controls {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }
    .control-group {
      flex-direction: column;
      align-items: stretch;
      gap: 6px;

      :deep(.el-select),
      :deep(.el-input),
      :deep(.el-date-picker) {
        width: 100% !important;
      }

      :deep(.el-button) {
        width: 100%;
      }
    }
    .control-label {
      font-weight: 500;
    }
  }

  .chart-card {
    .methodology {
      padding: 10px 12px;
      font-size: 12px;
    }

    :deep(.heatmap-chart) {
      min-height: 300px;
    }
  }
}
</style>

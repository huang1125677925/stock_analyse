<template>
  <div class="industry-breadth-analysis">
    <el-card class="control-card" shadow="hover">
      <div class="controls">
        <div class="control-group">
          <span class="control-label">板块类型：</span>
          <el-select
            v-model="selectedIdxType"
            placeholder="选择板块类型"
            :disabled="loading"
            @change="handleIdxTypeChange"
            style="width: 160px"
          >
            <el-option label="行业板块" value="行业板块" />
            <el-option label="概念板块" value="概念板块" />
          </el-select>
        </div>
        <div v-if="selectedIdxType === '行业板块'" class="control-group">
          <span class="control-label">行业层级：</span>
          <el-select
            v-model="selectedLevel"
            placeholder="选择行业层级"
            :disabled="loading"
            @change="handleParamsChange"
            style="width: 160px"
          >
            <el-option
              v-for="option in levelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="control-group">
          <span class="control-label">时间范围：</span>
          <el-input
            value="最近20天"
            disabled
            style="width: 160px"
          />
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
            @change="handleParamsChange"
            style="width: 160px"
          />
        </div>
        <div class="control-group">
          <span class="control-label">MA窗口：</span>
          <el-select
            v-model="maWindow"
            placeholder="选择 MA 窗口"
            :disabled="loading"
            @change="handleParamsChange"
            style="width: 140px"
          >
            <el-option
              v-for="option in maWindowOptions"
              :key="option"
              :label="`MA${option}`"
              :value="option"
            />
          </el-select>
        </div>
        <div class="control-group">
          <span class="control-label">宽度递增：</span>
          <el-select
            v-model="consecutiveIncreaseDays"
            placeholder="筛选连续递增"
            :disabled="loading"
            style="width: 160px"
          >
            <el-option
              v-for="option in consecutiveIncreaseDaysOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="control-group">
          <el-button type="primary" :loading="loading" @click="fetchData">刷新</el-button>
        </div>
        <div class="control-group">
          <el-button 
            type="default" 
            :disabled="loading || !increasingFilterRawData.length" 
            @click="toggleLastColumnSort"
            :icon="sortByLastColumn ? 'SortDown' : 'Sort'"
          >
            {{ sortByLastColumn ? '取消排序' : '按最后一列排序' }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="chart-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>市场宽度热力图（{{ selectedBoardLabel }} / MA {{ maWindow }}）</span>
          <span class="tips">数据来源：板块MA宽度接口</span>
        </div>
      </template>

      <div class="methodology">
        <p>
          统计口径：基于东方财富{{ selectedIdxType === '概念板块' ? '概念板块' : '行业板块' }}成分，汇总各板块中收盘价高于 MA{{ maWindow }} 的股票占比。
        </p>
        <p>
          计算方式：市场宽度 = count_above_ma / eligible_count。数值越高，表示该板块内站上均线的股票占比越高，整体走势越强。
        </p>
      </div>

      <HeatmapChart
        v-if="heatmapOption"
        :option="heatmapOption"
        @chart-ready="onChartReady"
        @chart-click="onChartClick"
      />

      <div v-else class="empty-tip">暂无数据</div>
    </el-card>

    <el-dialog
      v-model="trendDialogVisible"
      width="88%"
      top="6vh"
      :close-on-click-modal="false"
      destroy-on-close
      append-to-body
    >
      <template #header>
        <div class="trend-dialog-header">
          <div class="trend-dialog-title">
            {{ trendBoard.name || trendBoard.code }} 趋势看板K线图
          </div>
          <div class="trend-dialog-subtitle">
            {{ trendDateRange.start || '-' }} 至 {{ trendDateRange.end || '-' }}
          </div>
        </div>
      </template>

      <div class="trend-dialog-body">
        <div class="toolbar-row">
          <div class="table-summary">
            <el-tag v-if="trendBoard.code" type="info" effect="plain">
              板块代码 {{ trendBoard.code }}
            </el-tag>
            <el-tag v-if="trendBoard.idxType" type="warning" effect="light">
              板块类型 {{ trendBoard.idxType }}
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
            :stock-code="trendBoard.code"
            :stock-name="trendBoard.name"
            :kline-data="trendData"
            :overlay-lines="trendOverlayLines"
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
  </div>
</template>

<script setup lang="ts">
/**
 * 市场宽度热力图组件
 * 功能：
 * - 使用板块 MA 市场宽度接口渲染热力图（日期 × 板块，值为宽度比例）
 * - 支持行业板块与概念板块切换，并在点击热力图单元格后打开东财板块 K 线趋势弹窗
 * - 支持选择东方财富行业层级、固定最近20天结束日期与 MA 窗口
 * 参数：无
 * 返回值：无
 * 事件（Emits）：
 * - chartReady(chart): 图表初始化完成
 * - chartClick(payload): 图表点击事件，包含 { industry, sectorCode, date, value, idxType }
 */
import { ref, computed, onMounted, reactive, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import HeatmapChart from '@/components/HeatmapChart.vue'
import StockKLineChart from '@/components/StockKLineChart.vue'
import {
  fetchIndustryMaBreadth,
  type IndustryMaBreadthIdxType,
  type EastMoneyIndustryLevel,
  type IndustryMaBreadthItem
} from '@/services/strategyBreadthApi'
import { fetchDcDaily } from '@/services/dcDailyApi'
import type { StockHistoryDataItem } from '@/services/stockHistoryApi'

type TrendShortcut = '1y' | '3y' | '5y' | '10y' | '20y'

const emit = defineEmits<{
  chartReady: [chart: echarts.ECharts]
  chartClick: [payload: { industry: string; sectorCode: string; date: string; value: number; idxType: IndustryMaBreadthIdxType }]
  industriesLoaded: [industries: string[]]
}>()

const FIXED_RANGE_DAYS = 20
const loading = ref(false)
const endDate = ref<string>(formatDate(new Date()))
const maWindow = ref<number>(10)
const sortByLastColumn = ref(true)
const maWindowOptions = [5, 10, 20, 30, 60, 90, 250]
const consecutiveIncreaseDaysOptions = [
  { label: '不筛选', value: 0 },
  { label: '连续2天递增', value: 2 },
  { label: '连续3天递增', value: 3 },
  { label: '连续5天递增', value: 5 },
  { label: '连续10天递增', value: 10 }
]
const consecutiveIncreaseDays = ref<number>(0)
const selectedIdxType = ref<IndustryMaBreadthIdxType>('行业板块')
const levelOptions: Array<{ label: EastMoneyIndustryLevel; value: EastMoneyIndustryLevel }> = [
  { label: '东财一级行业', value: '东财一级行业' },
  { label: '东财二级行业', value: '东财二级行业' },
  { label: '东财三级行业', value: '东财三级行业' }
]
const selectedLevel = ref<EastMoneyIndustryLevel>('东财二级行业')
const trendDialogVisible = ref(false)
const trendLoading = ref(false)
const trendShortcut = ref<TrendShortcut>('1y')
const trendData = ref<StockHistoryDataItem[]>([])
const trendBreadthPoints = ref<Array<{ date: string; value: number }>>([])
const trendBoard = reactive({
  code: '',
  name: '',
  idxType: '行业板块' as IndustryMaBreadthIdxType
})
const trendDateRange = reactive({
  start: '',
  end: ''
})
let trendRequestId = 0

// 计算日期范围字符串（YYYY-MM-DD）
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
  const start = new Date()
  start.setTime(end.getTime())
  start.setDate(end.getDate() - days)
  return [formatDate(start), formatDate(end)]
}

function disableFutureDate(date: Date): boolean {
  return date.getTime() > Date.now()
}

function formatDateForApi(dateText: string): string {
  return dateText.replace(/-/g, '')
}

function formatPercent(value: unknown): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (!Number.isFinite(num)) return '-'
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

function getNumericValue(value: unknown): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(num) ? num : 0
}

function formatAmount(value: unknown): string {
  const numericValue = getNumericValue(value)
  if (!Number.isFinite(numericValue) || numericValue === 0) return '0'
  if (numericValue >= 100000000) return `${(numericValue / 100000000).toFixed(2)}亿`
  if (numericValue >= 10000) return `${(numericValue / 10000).toFixed(2)}万`
  return numericValue.toFixed(2)
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
 * 功能：调用 /django/api/strategy/dc-daily/ 获取当前选中板块日线，并转换为K线组件需要的数据结构
 * 参数：无
 * 返回值：Promise<void>
 * 事件：更新 trendData、trendLoading
 */
const loadTrendData = async () => {
  const requestId = ++trendRequestId

  if (!trendBoard.code || !trendDateRange.start || !trendDateRange.end) {
    trendData.value = []
    return
  }

  trendLoading.value = true
  try {
    // 并行拉取：东财板块日线K线 + 该板块的市场宽度序列（单行业模式）
    const [response, breadthData] = await Promise.all([
      fetchDcDaily({
        ts_code: trendBoard.code,
        idx_type: trendBoard.idxType,
        start_date: formatDateForApi(trendDateRange.start),
        end_date: formatDateForApi(trendDateRange.end),
        fields: 'ts_code,trade_date,open,high,low,close,change,pct_change,vol,amount,swing,turnover_rate'
      }),
      fetchIndustryMaBreadth({
        sectorCode: trendBoard.code,
        startDate: trendDateRange.start,
        endDate: trendDateRange.end,
        maWindow: maWindow.value
      }).catch((breadthErr) => {
        // 宽度序列失败不应阻断K线展示，降级为空数据
        console.error('获取板块市场宽度序列失败:', breadthErr)
        return null
      })
    ])

    if (requestId !== trendRequestId) return

    trendBreadthPoints.value = (breadthData?.data ?? [])
      .map((item) => ({
        date: item.date,
        value: typeof item.breadth_ratio === 'number' ? item.breadth_ratio : Number(item.breadth_ratio)
      }))
      .filter((point) => Number.isFinite(point.value))
      .sort((a, b) => a.date.localeCompare(b.date))

    trendData.value = [...(response.records || [])]
      .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
      .map((item) => ({
        stock_code: item.ts_code,
        stock_name: trendBoard.name,
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
  } catch (err) {
    if (requestId !== trendRequestId) return
    console.error('获取东财板块趋势K线失败:', err)
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

/**
 * 事件：打开板块趋势弹窗
 * 功能：点击热力图行业/概念单元格时打开东财板块K线趋势弹窗
 * 参数：
 * - sectorCode(string): 板块代码
 * - sectorName(string): 板块名称
 * - idxType(IndustryMaBreadthIdxType): 板块类型
 * 返回值：无
 * 事件：更新趋势弹窗状态并触发日线请求
 */
const openTrendDialog = (sectorCode: string, sectorName: string, idxType: IndustryMaBreadthIdxType) => {
  if (!sectorCode) {
    ElMessage.warning('未找到该板块代码，暂时无法打开K线趋势图')
    return
  }
  trendBoard.code = sectorCode
  trendBoard.name = sectorName
  trendBoard.idxType = idxType
  trendShortcut.value = '1y'
  trendData.value = []
  trendBreadthPoints.value = []
  applyTrendShortcut('1y')
  trendDialogVisible.value = true
  loadTrendData()
}

const rawData = ref<IndustryMaBreadthItem[]>([])

/**
 * 从获取到的原始数据中提取唯一的行业名称列表（已排序），
 * 用于驱动筛选组件的下拉选项，确保与实际数据一致。
 */
const rawIndustryNames = computed<string[]>(() => {
  const names = Array.from(new Set(rawData.value.map(d => d.sector_name)))
  names.sort()
  return names
})

watch(rawIndustryNames, (names) => {
  emit('industriesLoaded', names)
}, { immediate: true })

interface Props {
  selectedIndustries: string[]
}

const props = defineProps<Props>()

/**
 * 过滤后的原始数据：当selectedIndustries为空时显示全部，否则只显示选中的行业
 */
const filteredRawData = computed(() => {
  if (!props.selectedIndustries || props.selectedIndustries.length === 0) {
    return rawData.value
  }
  const selectedSet = new Set(props.selectedIndustries)
  return rawData.value.filter(item => selectedSet.has(item.sector_name))
})

/**
 * 连续递增筛选：在行业筛选基础上，进一步筛选出最近 N 天宽度值连续递增的行业。
 * 逻辑：取该行业按日期排序后最后 N+1 个数据点，检查每对相邻值是否严格递增。
 * 当 consecutiveIncreaseDays 为 0 时不做递增筛选，直接透传。
 */
const increasingFilterRawData = computed(() => {
  const n = consecutiveIncreaseDays.value
  if (n === 0) return filteredRawData.value

  const source = filteredRawData.value

  // 获取所有日期并排序，取最后 N+1 个交易日
  const allDates = Array.from(new Set(source.map(d => d.date))).sort()
  if (allDates.length < n + 1) return []
  const lastNDates = allDates.slice(-(n + 1))
  const lastNDatesSet = new Set(lastNDates)

  // 按行业分组，收集最近 N+1 天的宽度值
  const sectorMap = new Map<string, Array<{ date: string; value: number }>>()
  source.forEach(item => {
    if (!lastNDatesSet.has(item.date)) return
    if (!sectorMap.has(item.sector_name)) {
      sectorMap.set(item.sector_name, [])
    }
    const val = typeof item.breadth_ratio === 'number' ? item.breadth_ratio : Number(item.breadth_ratio)
    sectorMap.get(item.sector_name)!.push({ date: item.date, value: Number.isNaN(val) ? 0 : val })
  })

  // 判断哪些行业满足连续 N 天递增
  const qualifiedSectors = new Set<string>()
  sectorMap.forEach((points, sector) => {
    if (points.length < n + 1) return
    points.sort((a, b) => a.date.localeCompare(b.date))
    const tail = points.slice(-(n + 1))
    for (let i = 1; i < tail.length; i++) {
      if (tail[i].value <= tail[i - 1].value) return
    }
    qualifiedSectors.add(sector)
  })

  return source.filter(item => qualifiedSectors.has(item.sector_name))
})

const selectedBoardLabel = computed(() => {
  return selectedIdxType.value === '行业板块'
    ? selectedLevel.value
    : '东财概念板块'
})

const latestTrendData = computed(() => {
  return trendData.value.length > 0
    ? trendData.value[trendData.value.length - 1]
    : null
})

const trendEmptyText = computed(() => {
  return trendBoard.code
    ? '暂无该东财板块区间K线数据'
    : '请选择板块查看趋势看板'
})

/**
 * K线叠加线：将该板块的市场宽度序列作为副轴（右侧 0~1）叠加在K线图上，
 * 与价格走势对照观察。宽度为空时返回空数组，不影响K线展示。
 */
const trendOverlayLines = computed(() => {
  if (!trendBreadthPoints.value.length) return []
  return [
    {
      name: `市场宽度(MA${maWindow.value})`,
      points: trendBreadthPoints.value,
      color: '#8e44ad',
      width: 1.5,
      type: 'solid' as const,
      showSymbol: false,
      yAxisIndex: 1,
      valueFormat: 'percent' as const
    }
  ]
})

// 切换按最后一列排序的状态
const toggleLastColumnSort = () => {
  sortByLastColumn.value = !sortByLastColumn.value
}

// 计算行业与日期维度
const industries = computed<string[]>(() => {
  const names = Array.from(new Set(increasingFilterRawData.value.map(d => d.sector_name)))
  
  // 如果启用按最后一列排序
  if (sortByLastColumn.value && dates.value.length > 0) {
    const lastDate = dates.value[dates.value.length - 1]
    
    // 获取每个行业在最后一个日期的数据
    const industryLastValues = new Map<string, number>()
    increasingFilterRawData.value.forEach(item => {
      if (item.date === lastDate && names.includes(item.sector_name)) {
        const val = typeof item.breadth_ratio === 'number' ? item.breadth_ratio : Number(item.breadth_ratio)
        industryLastValues.set(item.sector_name, Number.isNaN(val) ? 0 : val)
      }
    })
    
    // 按最后一列的值降序排序
    names.sort((a, b) => {
      const valueA = industryLastValues.get(a) || 0
      const valueB = industryLastValues.get(b) || 0
      return valueA - valueB || 0
    })
  }
  
  return names
})

const dates = computed<string[]>(() => {
  const ds = Array.from(new Set(increasingFilterRawData.value.map(d => d.date))).sort()
  return ds
})

// 构建热力图矩阵数据 [x(dateIndex), y(industryIndex), value]
const heatmapData = computed<[number, number, number][]>(() => {
  const dateIndex = new Map(dates.value.map((d, i) => [d, i]))
  const industryIndex = new Map(industries.value.map((n, i) => [n, i]))
  const points: [number, number, number][] = []
  increasingFilterRawData.value.forEach(item => {
    const di = dateIndex.get(item.date)
    const ii = industryIndex.get(item.sector_name)
    if (di !== undefined && ii !== undefined) {
      const val = typeof item.breadth_ratio === 'number' ? item.breadth_ratio : Number(item.breadth_ratio)
      points.push([di, ii, Number.isNaN(val) ? 0 : val])
    }
  })
  return points
})

// 计算热力图配置
const heatmapOption = computed<echarts.EChartsOption | null>(() => {
  if (dates.value.length === 0 || industries.value.length === 0 || heatmapData.value.length === 0) return null
  return {
    animation: false,
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [x, y, v] = params?.data ?? []
        const date = typeof x === 'number' ? dates.value[x] : ''
        const industry = typeof y === 'number' ? industries.value[y] : ''
        return `${date}<br/>${industry}<br/>宽度比例: ${(Number(v) * 100).toFixed(2)}%`
      }
    },
    // 加大左右与顶部边距，给上方日期与右侧颜色条留空间
    grid: { left: 140, right: 80, top: 80, bottom: 20 },
    xAxis: {
      type: 'category',
      data: dates.value,
      // 将日期轴放在上方，并优化标签拥挤问题
      position: 'top',
      axisLabel: { rotate: 0, hideOverlap: true, interval: 'auto' }
    },
    yAxis: {
      type: 'category',
      data: industries.value
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: true,
      // 改为纵向颜色条放在右侧
      orient: 'vertical',
      right: 10,
      top: 40,
      bottom: 40,
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      }
    },
    series: [{
      type: 'heatmap',
      data: heatmapData.value,
      itemStyle: { borderColor: '#fff', borderWidth: 1 },
      emphasis: { itemStyle: { shadowBlur: 5, shadowColor: 'rgba(0, 0, 0, 0.3)' } }
    }]
  }
})

// 拉取数据
const fetchData = async () => {
  loading.value = true
  try {
    const [start, end] = computeDateRangeByEndDate(endDate.value, FIXED_RANGE_DAYS)
    const data = await fetchIndustryMaBreadth({
      startDate: start,
      endDate: end,
      maWindow: maWindow.value,
      idxType: selectedIdxType.value,
      level: selectedIdxType.value === '行业板块' ? selectedLevel.value : undefined
    })
    rawData.value = data.data ?? []
  } catch (err) {
    console.error('获取行业MA宽度数据失败:', err)
  } finally {
    loading.value = false
  }
}

const handleParamsChange = () => {
  fetchData()
}

const handleIdxTypeChange = () => {
  fetchData()
}

const onChartReady = (chart: echarts.ECharts) => emit('chartReady', chart)
const onChartClick = (params: any) => {
  const [x, y, v] = (params?.data ?? []) as [number, number, number]
  const date = typeof x === 'number' ? dates.value[x] : ''
  const industry = typeof y === 'number' ? industries.value[y] : ''
  const matchedRecord = increasingFilterRawData.value.find((item) => item.date === date && item.sector_name === industry)
  const payload = {
    date,
    industry,
    sectorCode: matchedRecord?.sector_code || '',
    value: typeof v === 'number' ? v : 0,
    idxType: selectedIdxType.value
  }
  emit('chartClick', payload)
  if (payload.sectorCode && payload.industry) {
    openTrendDialog(payload.sectorCode, payload.industry, payload.idxType)
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.industry-breadth-analysis {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  .tips { color: #999; font-size: 12px; }
  .empty-tip { color: #999; padding: 24px; text-align: center; }
}
</style>

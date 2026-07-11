<template>
  <el-dialog
    :model-value="modelValue"
    :title="`领涨数据详情 - ${name || tsCode}`"
    width="90%"
    top="6vh"
    append-to-body
    destroy-on-close
    @open="initTrend"
    @closed="disposeTrendChart"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div class="lead-rise-matrix" v-loading="loading" element-loading-text="正在加载领涨数据...">
      <div class="matrix-caption">
        {{ rangeLabel }}概念板块（领涨）：{{ idxType }}
        <span class="matrix-hint">横轴为日期，纵轴为领涨股票；标色格子表示该股当日领涨，格内为领涨涨幅。悬停日期列可在上方对比图查看当日K线</span>
      </div>

      <!-- 日期区间选项：统一控制对比图K线与下方领涨表格的日期范围 -->
      <div class="trend-panel">
        <div class="trend-toolbar">
          <span class="trend-hint">选择日期区间，对比图K线与下方领涨表格均按此范围展示</span>
          <el-radio-group
            v-model="trendRangeKey"
            size="small"
            @change="handleTrendRangeChange"
          >
            <el-radio-button label="3m">最近3月</el-radio-button>
            <el-radio-button label="1y">最近1年</el-radio-button>
            <el-radio-button label="3y">最近3年</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 对比区：左=板块K线（固定），右=悬停日期当日领涨股K线；随下方矩阵日期列悬停切换 -->
      <div class="compare-panel" v-loading="trendLoading">
        <div class="compare-hint">
          悬停下方矩阵的<strong>日期列</strong>，右侧即显示当日领涨股K线，与左侧板块K线对照（紫色虚线标记该日）
        </div>
        <div class="compare-chart-wrap" :style="{ height: compareChartHeight + 'px' }">
          <div
            ref="compareChartRef"
            class="compare-chart"
            :style="{ height: compareChartHeight + 'px' }"
          ></div>
        </div>
      </div>

      <div v-if="dates.length" class="matrix-scroll">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="corner-cell">领涨股票 \ 日期</th>
              <th
                v-for="d in displayDates"
                :key="d.date"
                class="date-cell"
                :class="{ 'date-focused': d.date === focusedDate }"
                @mouseenter="focusedDate = d.date"
              >
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
                  @click="selectTrendStock(stock)"
                >
                  <div class="stock-name">{{ stock.name }}</div>
                </el-button>
                <div class="stock-code">{{ stock.code }}</div>
                <div class="stock-count">领涨 {{ stock.count }} 天</div>
              </th>
              <td
                v-for="d in displayDates"
                :key="d.date"
                class="value-cell"
                :class="{ active: !!matrix[stock.name]?.[d.date], 'date-focused': d.date === focusedDate }"
                :style="matrix[stock.name]?.[d.date] ? cellStyle(matrix[stock.name][d.date]!) : undefined"
                @mouseenter="focusedDate = d.date"
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
import { ref, computed, watch, reactive, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { fetchDcIndexLastNDays, type DcIndexRecord } from '@/services/dcIndexApi'
import { fetchStockHistoryData } from '@/services/stockHistoryApi'
import { fetchDcDaily } from '@/services/dcDailyApi'

type TrendRangeKey = '3m' | '1y' | '3y'

// 小图矩阵标题取色：板块单独用醒目深色，个股循环取色
const BOARD_COLOR = '#303133'
const STOCK_COLORS = [
  '#f56c6c', '#409eff', '#67c23a', '#e6a23c', '#9b59b6',
  '#1abc9c', '#e67e22', '#2c3e50', '#c0392b', '#16a085',
  '#8e44ad', '#2980b9', '#d35400', '#27ae60', '#f39c12'
]

// K线涨跌颜色（A股习惯：红涨绿跌）
const UP_COLOR = '#f56c6c'
const DOWN_COLOR = '#67c23a'

// 小图矩阵布局尺寸（px）：每行整体高度 / 标题占位 / 绘图区高度
const CELL_H = 220
const TITLE_H = 30
const GRID_H = CELL_H - TITLE_H - 46

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

// 趋势图状态：板块 + 全部领涨股的归一化涨跌幅折线，叠加在同一张图
const trendRangeKey = ref<TrendRangeKey>('3m')
const trendRange = reactive({ start: '', end: '' })
// 区间选项对应的天数：领涨矩阵按此天数拉取，与对比图K线区间保持一致
const RANGE_DAYS: Record<TrendRangeKey, number> = { '3m': 90, '1y': 365, '3y': 1095 }
const RANGE_LABELS: Record<TrendRangeKey, string> = { '3m': '近3月', '1y': '近1年', '3y': '近3年' }
const rangeLabel = computed(() => RANGE_LABELS[trendRangeKey.value])
const trendLoading = ref(false)
const trendPanelRef = ref<HTMLElement>()
const trendChartRef = ref<HTMLDivElement>()
const trendHasData = ref(false)
const trendChartHeight = ref(340)
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth <= 768)
let trendChart: echarts.ECharts | null = null
let trendRequestId = 0

// 对比区状态：左=板块K线（固定），右=当前悬停日期的领涨股K线
const compareChartRef = ref<HTMLDivElement>()
const focusedDate = ref('')
const compareChartHeight = computed(() => (isMobile.value ? 460 : 320))
let compareChart: echarts.ECharts | null = null
// 缓存最近一次渲染数据，供窗口尺寸变化（列数切换）时重绘
let lastSeriesData: Array<{ target: TrendTarget; candles: Candle[] }> = []
// 当前可见小图（含日期->索引映射）与其“基础标题”（未悬停时仅显示名称），供指针联动时更新标题
let lastVisible: Array<{ target: TrendTarget; candles: Candle[]; byDate: Map<string, number> }> = []
let baseTitles: echarts.TitleComponentOption[] = []

const loadData = async () => {
  // 支持两种寻址方式：优先 ts_code，其次按板块名称（dc_index 接口支持 name 查询）
  if (!props.tsCode && !props.name) return
  loading.value = true
  try {
    const data = await fetchDcIndexLastNDays({ tsCode: props.tsCode, name: props.name }, RANGE_DAYS[trendRangeKey.value])
    records.value = (data.records || []).sort((a, b) => a.trade_date.localeCompare(b.trade_date))
  } catch (e) {
    console.error('获取dc_index领涨数据失败:', e)
    records.value = []
  } finally {
    loading.value = false
  }
}

// 板块代码：调用方未传 ts_code 时（按名称寻址），从领涨数据记录中回填，供板块自身K线使用
const boardTsCode = computed(() => props.tsCode || records.value[0]?.ts_code || '')

watch(() => props.modelValue, (val) => {
  if (val) {
    // 打开时重置为默认区间，保证矩阵与对比图区间一致
    trendRangeKey.value = '3m'
    applyTrendRange('3m')
    candleCache.clear()
    loadData()
  }
})

watch([() => props.tsCode, () => props.name], () => {
  if (props.modelValue && (props.tsCode || props.name)) {
    candleCache.clear()
    loadData()
    // 寻址变化时区间/图表保持，待 stocks 更新后由 watch(stocks) 重绘
    applyTrendRange(trendRangeKey.value)
  }
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

// 表格列展示顺序：从左到右按日期递减（最新在左）。dates 仍保持升序供“默认聚焦最近交易日”等逻辑使用
const displayDates = computed(() => [...dates.value].reverse())

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

// 日期 -> 当日领涨股（代码/名称），供对比区右侧图定位当日领涨股
const dateToLeading = computed(() => {
  const map = new Map<string, { code: string; name: string }>()
  for (const r of records.value) {
    if (r.leading_code) {
      map.set(r.trade_date, { code: r.leading_code, name: r.leading || r.leading_code })
    }
  }
  return map
})

// 趋势图标的：板块自身 + 各领涨股票（按领涨天数降序）
interface TrendTarget {
  kind: 'board' | 'stock'
  code: string
  name: string
  color: string
}

const trendTargets = computed<TrendTarget[]>(() => {
  const boardName = props.name || boardTsCode.value
  const targets: TrendTarget[] = [
    { kind: 'board', code: boardTsCode.value, name: `${boardName}（板块）`, color: BOARD_COLOR }
  ]
  let ci = 0
  for (const s of stocks.value) {
    if (!s.code) continue
    targets.push({
      kind: 'stock',
      code: s.code,
      name: s.name,
      color: STOCK_COLORS[ci % STOCK_COLORS.length]
    })
    ci += 1
  }
  return targets
})

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

// -------- 趋势图相关函数 --------

const toNum = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const normalizeYmd = (s: string) => s.replace(/[^0-9]/g, '')

/** 根据快捷区间计算起止日期（YYYY-MM-DD） */
function applyTrendRange(range: TrendRangeKey) {
  const monthMap: Record<TrendRangeKey, number> = { '3m': 3, '1y': 12, '3y': 36 }
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(endDate.getMonth() - monthMap[range])

  const fmt = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  trendRange.start = fmt(startDate)
  trendRange.end = fmt(endDate)
}

/** 单个标的的一根K线（date 为 YYYYMMDD） */
interface Candle {
  date: string
  open: number
  close: number
  low: number
  high: number
}

/** 拉取单个标的的K线序列（按日期升序），板块走 dc_daily，个股走个股行情（前复权） */
async function fetchTargetOHLC(
  target: TrendTarget,
  startYmd: string,
  endYmd: string
): Promise<Candle[]> {
  let candles: Candle[]
  if (target.kind === 'board') {
    const resp = await fetchDcDaily({
      ts_code: target.code,
      idx_type: props.idxType,
      start_date: startYmd,
      end_date: endYmd,
      fields: 'ts_code,trade_date,open,high,low,close'
    })
    candles = (resp.records || []).map(item => ({
      date: normalizeYmd(item.trade_date),
      open: toNum(item.open),
      close: toNum(item.close),
      low: toNum(item.low),
      high: toNum(item.high)
    }))
  } else {
    const resp = await fetchStockHistoryData(target.code, startYmd, endYmd, 'qfq')
    candles = resp.map(item => ({
      date: normalizeYmd(item.date),
      open: toNum(item.open_price),
      close: toNum(item.close_price),
      low: toNum(item.low_price),
      high: toNum(item.high_price)
    }))
  }
  return candles
    .filter(c => c.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** 加载趋势图数据：并行拉取板块 + 全部领涨股K线，以小图矩阵形式各自渲染 */
async function loadTrendData() {
  const requestId = ++trendRequestId
  const targets = trendTargets.value
  if (!targets.length || !trendRange.start || !trendRange.end) {
    trendHasData.value = false
    renderTrendChart([])
    return
  }

  trendLoading.value = true
  try {
    const startYmd = normalizeYmd(trendRange.start)
    const endYmd = normalizeYmd(trendRange.end)

    // 并行拉取；单个标的失败不影响其它标的（返回空序列）
    const candleLists = await Promise.all(
      targets.map(t =>
        fetchTargetOHLC(t, startYmd, endYmd).catch(err => {
          console.error(`加载趋势标的失败: ${t.name}`, err)
          return [] as Candle[]
        })
      )
    )
    if (requestId !== trendRequestId) return

    const seriesData = targets.map((t, i) => ({ target: t, candles: candleLists[i] }))
    trendHasData.value = seriesData.some(s => s.candles.length > 0)
    renderTrendChart(seriesData)
  } catch (error) {
    if (requestId !== trendRequestId) return
    console.error('加载领涨趋势图失败:', error)
    trendHasData.value = false
    renderTrendChart([])
    ElMessage.error('加载趋势图失败，请稍后重试')
  } finally {
    if (requestId === trendRequestId) {
      trendLoading.value = false
    }
  }
}

/**
 * 渲染小图矩阵：板块 + 每只领涨股各占一格独立K线图。
 * 每格拥有独立的 grid / xAxis / yAxis / candlestick series，避免不同价格量级共用一轴。
 */
function renderTrendChart(
  seriesData: Array<{ target: TrendTarget; candles: Candle[] }>
) {
  lastSeriesData = seriesData

  // 默认聚焦最近交易日；若当前聚焦日期已不在数据中则回退到最近交易日
  const focusDates = dates.value
  if (!focusedDate.value || !focusDates.some(d => d.date === focusedDate.value)) {
    focusedDate.value = focusDates.length ? focusDates[focusDates.length - 1].date : ''
  }
  renderCompareChart()

  // 小图矩阵已移除；若未初始化 trendChart（正常情况）则到此为止，仅保留对比图
  if (!trendChart) return

  const visible = seriesData.filter(s => s.candles.length > 0)
  if (!visible.length) {
    trendChartHeight.value = 340
    trendChart.clear()
    nextTick(() => trendChart?.resize())
    return
  }

  const cols = isMobile.value ? 1 : 2
  const rows = Math.ceil(visible.length / cols)
  const colW = 100 / cols

  const grids: echarts.GridComponentOption[] = []
  const titles: echarts.TitleComponentOption[] = []
  const xAxes: echarts.XAXisComponentOption[] = []
  const yAxes: echarts.YAXisComponentOption[] = []
  const series: echarts.CandlestickSeriesOption[] = []

  // 供指针联动更新标题使用：可见标的 + 日期(YYYYMMDD)->索引 映射
  lastVisible = visible.map(s => ({
    target: s.target,
    candles: s.candles,
    byDate: new Map(s.candles.map((c, idx) => [c.date, idx]))
  }))

  visible.forEach((s, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    const left = col * colW + 4
    const width = colW - 7
    const top = row * CELL_H + TITLE_H

    grids.push({ left: `${left}%`, width: `${width}%`, top, height: GRID_H })
    titles.push({
      text: s.target.name,
      left: `${col * colW + colW / 2}%`,
      top: top - 24,
      textAlign: 'center',
      textStyle: { fontSize: 12, fontWeight: 'bold', color: s.target.color }
    })

    const dates = s.candles.map(c =>
      c.date.length === 8 ? `${c.date.slice(4, 6)}-${c.date.slice(6, 8)}` : c.date
    )
    xAxes.push({
      type: 'category',
      gridIndex: i,
      data: dates,
      boundaryGap: true,
      axisTick: { show: false },
      axisLabel: { fontSize: 9, hideOverlap: true },
      axisLine: { onZero: false }
    })
    yAxes.push({
      type: 'value',
      gridIndex: i,
      scale: true,
      axisLabel: { fontSize: 9 },
      splitLine: { lineStyle: { type: 'dashed' } }
    })
    series.push({
      name: s.target.name,
      type: 'candlestick',
      xAxisIndex: i,
      yAxisIndex: i,
      data: s.candles.map(c => [c.open, c.close, c.low, c.high]),
      itemStyle: {
        color: UP_COLOR,
        color0: DOWN_COLOR,
        borderColor: UP_COLOR,
        borderColor0: DOWN_COLOR
      }
    })
  })

  baseTitles = titles

  const option: echarts.EChartsOption = {
    animation: false,
    // 仅借用 tooltip(axis) 触发指针联动，不显示浮层内容（改为把当日涨跌幅写进各小图标题）
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      showContent: false
    },
    // 按日期联动各小图的指针：在任一格悬停某日期，其它格同一日期也显示指针
    axisPointer: {
      link: [{ xAxisIndex: 'all' }],
      label: { backgroundColor: '#777' }
    },
    title: titles,
    grid: grids,
    xAxis: xAxes,
    yAxis: yAxes,
    series
  }

  trendChartHeight.value = rows * CELL_H + 12
  // 高度是响应式绑定，需等 DOM 应用后再 resize，使各 grid 的像素定位落在正确画布高度内
  nextTick(() => {
    trendChart?.resize()
    trendChart?.setOption(option, true)
  })
}

/**
 * 渲染对比区：左=板块K线（固定），右=当前聚焦日期的领涨股K线。
 * 复用 loadTrendData 已拉取的 OHLC（lastSeriesData），不额外发起请求；紫色虚线标记聚焦日。
 */
// 按标的代码缓存已加载的K线，避免重复请求；区间/寻址变化时清空
const candleCache = new Map<string, Candle[]>()
let compareReqId = 0

// 板块自身作为对比图左侧固定标的
const boardTarget = computed<TrendTarget>(() => ({
  kind: 'board',
  code: boardTsCode.value,
  name: `${props.name || boardTsCode.value}（板块）`,
  color: BOARD_COLOR
}))

/** 按需拉取单个标的K线（命中缓存则直接返回），失败返回空序列 */
async function getCandles(target: TrendTarget): Promise<Candle[]> {
  if (!target.code) return []
  const cached = candleCache.get(target.code)
  if (cached) return cached
  if (!trendRange.start || !trendRange.end) return []
  const startYmd = normalizeYmd(trendRange.start)
  const endYmd = normalizeYmd(trendRange.end)
  const candles = await fetchTargetOHLC(target, startYmd, endYmd).catch(err => {
    console.error(`加载K线失败: ${target.name}`, err)
    return [] as Candle[]
  })
  candleCache.set(target.code, candles)
  return candles
}

/** 默认聚焦最近交易日（数据变化后调用） */
function setDefaultFocus() {
  const ds = dates.value
  if (!focusedDate.value || !ds.some(d => d.date === focusedDate.value)) {
    focusedDate.value = ds.length ? ds[ds.length - 1].date : ''
  }
}

/**
 * 对比图数据按需加载：仅加载板块（缓存一次）与“当前聚焦日期”的那只领涨股K线，
 * 不再一次性拉取全部领涨股。加载完成后渲染对比图。
 */
async function ensureCompareCandles() {
  if (!compareChart) return
  const reqId = ++compareReqId
  const lead = focusedDate.value ? dateToLeading.value.get(focusedDate.value) : undefined
  trendLoading.value = true
  try {
    const tasks: Array<Promise<Candle[]>> = [getCandles(boardTarget.value)]
    if (lead?.code) {
      tasks.push(getCandles({ kind: 'stock', code: lead.code, name: lead.name, color: STOCK_COLORS[0] }))
    }
    await Promise.all(tasks)
    if (reqId !== compareReqId) return
    renderCompareChart()
  } finally {
    if (reqId === compareReqId) trendLoading.value = false
  }
}

function renderCompareChart() {
  if (!compareChart) return

  const boardCandles = candleCache.get(boardTsCode.value) ?? []

  const lead = focusedDate.value ? dateToLeading.value.get(focusedDate.value) : undefined
  const leadCandles = lead ? (candleCache.get(lead.code) ?? []) : []

  const toFull = (ymd: string) =>
    ymd.length === 8 ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : ymd
  // 统一为纯数字(YYYYMMDD)与K线的 candle.date 比对，避免 trade_date 带横线时匹配失败
  const focusYmd = focusedDate.value ? normalizeYmd(focusedDate.value) : ''
  const focusFull = focusYmd ? toFull(focusYmd) : ''
  const focusMmdd = focusedDate.value ? formatDate(focusedDate.value) : ''

  const mobile = isMobile.value

  const boardName = props.name || boardTsCode.value || '板块'
  // 移动端标题空间小，领涨股标题用更紧凑的写法（去括号），避免居中时被裁切
  const leadTitle = lead
    ? (mobile ? `${lead.name} ${focusMmdd}领涨` : `${lead.name}（${focusMmdd} 领涨）`)
    : '悬停下方日期查看当日领涨股'

  // 计算聚焦日期当日涨跌幅（相对前一交易日收盘，红涨绿跌），供标题展示
  const focusPct = (candles: Candle[]): { txt: string; color: string } | null => {
    if (!focusYmd) return null
    const i = candles.findIndex(c => c.date === focusYmd)
    if (i < 0) return null
    const c = candles[i]
    const prevClose = i > 0 ? candles[i - 1].close : c.open
    const pct = prevClose > 0 ? ((c.close - prevClose) / prevClose) * 100 : 0
    const sign = pct >= 0 ? '+' : ''
    return { txt: `${sign}${pct.toFixed(2)}%`, color: pct >= 0 ? UP_COLOR : DOWN_COLOR }
  }
  const boardPct = focusPct(boardCandles)
  const leadPct = focusPct(leadCandles)

  // 用富文本把“当日涨幅”按红涨绿跌上色拼到标题后（富文本样式须放在 textStyle.rich 下）
  const titleFontSize = mobile ? 11 : 13
  const buildTitleText = (base: string, baseColor: string, pct: { txt: string; color: string } | null): echarts.TitleComponentOption => {
    if (!pct) {
      return {
        text: `{n|${base}}`,
        textStyle: { rich: { n: { fontSize: titleFontSize, fontWeight: 'bold' as const, color: baseColor } } }
      }
    }
    return {
      text: `{n|${base}}  {p|${pct.txt}}`,
      textStyle: {
        rich: {
          n: { fontSize: titleFontSize, fontWeight: 'bold' as const, color: baseColor },
          p: { fontSize: titleFontSize, fontWeight: 'bold' as const, color: pct.color }
        }
      }
    }
  }
  const boardTitleText = buildTitleText(`${boardName}（板块）`, BOARD_COLOR, boardPct)
  const leadTitleText = buildTitleText(leadTitle, leadCandles.length ? '#c0392b' : '#909399', leadPct)

  const grids: echarts.GridComponentOption[] = mobile
    ? [
        { left: '10%', right: '6%', top: 32, height: 150 },
        { left: '10%', right: '6%', top: 254, height: 150 }
      ]
    : [
        { left: '5%', width: '41%', top: 40, bottom: 44 },
        { left: '54%', width: '41%', top: 40, bottom: 44 }
      ]
  const titles: echarts.TitleComponentOption[] = mobile
    ? [
        { ...boardTitleText, left: 'center', top: 8, textAlign: 'center' },
        { ...leadTitleText, left: 'center', top: 230, textAlign: 'center' }
      ]
    : [
        { ...boardTitleText, left: '25%', top: 14, textAlign: 'center' },
        { ...leadTitleText, left: '74%', top: 14, textAlign: 'center' }
      ]

  const buildAxes = (gridIndex: number, candles: Candle[]) => {
    const cats = candles.map(c => toFull(c.date))
    const x: echarts.XAXisComponentOption = {
      type: 'category',
      gridIndex,
      data: cats,
      boundaryGap: true,
      axisTick: { show: false },
      axisLine: { onZero: false },
      axisLabel: {
        fontSize: 9,
        hideOverlap: true,
        formatter: (v: string) => (typeof v === 'string' && v.length === 10 ? v.slice(5) : v)
      }
    }
    const y: echarts.YAXisComponentOption = {
      type: 'value',
      gridIndex,
      scale: true,
      axisLabel: { fontSize: 9 },
      splitLine: { lineStyle: { type: 'dashed' } }
    }
    return { x, y }
  }

  const a0 = buildAxes(0, boardCandles)
  const a1 = buildAxes(1, leadCandles)

  const focusMarkLine = (candles: Candle[]) => {
    if (!focusFull || !candles.some(c => c.date === focusYmd)) return undefined
    return {
      symbol: 'none',
      silent: true,
      lineStyle: { color: '#8e44ad', type: 'dashed' as const, width: 1.5 },
      label: { show: false },
      data: [{ xAxis: focusFull }]
    }
  }

  const candleItemStyle = {
    color: UP_COLOR,
    color0: DOWN_COLOR,
    borderColor: UP_COLOR,
    borderColor0: DOWN_COLOR
  }

  const series: echarts.CandlestickSeriesOption[] = [
    {
      name: '板块',
      type: 'candlestick',
      xAxisIndex: 0,
      yAxisIndex: 0,
      data: boardCandles.map(c => [c.open, c.close, c.low, c.high]),
      itemStyle: candleItemStyle,
      markLine: focusMarkLine(boardCandles)
    },
    {
      name: '领涨股',
      type: 'candlestick',
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: leadCandles.map(c => [c.open, c.close, c.low, c.high]),
      itemStyle: candleItemStyle,
      markLine: focusMarkLine(leadCandles)
    }
  ]

  compareChart.setOption(
    {
      animation: false,
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, confine: true },
      title: titles,
      grid: grids,
      xAxis: [a0.x, a1.x],
      yAxis: [a0.y, a1.y],
      series
    },
    true
  )
}

const handleTrendResize = () => {
  const mobile = window.innerWidth <= 768
  if (mobile !== isMobile.value) {
    // 断点变化：对比区横/纵排布需按新尺寸重绘
    isMobile.value = mobile
    nextTick(() => {
      compareChart?.resize()
      renderCompareChart()
    })
  } else {
    compareChart?.resize()
  }
}

/** 悬停某日期时的小图标题：名称 + 日期 + 收盘价 + 当日涨跌幅（相对前一交易日收盘，红涨绿跌） */
function buildHoverTitle(
  item: { target: TrendTarget; candles: Candle[]; byDate: Map<string, number> },
  index: number,
  date: string
): echarts.TitleComponentOption {
  const base = baseTitles[index]
  const idx = item.byDate.get(date)
  if (idx === undefined) return base // 该标的当日无数据，保持仅显示名称
  const c = item.candles[idx]
  const prevClose = idx > 0 ? item.candles[idx - 1].close : c.open
  const pct = prevClose > 0 ? ((c.close - prevClose) / prevClose) * 100 : 0
  const mmdd = date.length === 8 ? `${date.slice(4, 6)}-${date.slice(6, 8)}` : date
  const sign = pct >= 0 ? '+' : ''
  return {
    ...base,
    text: `${item.target.name}  ${mmdd}  ${c.close.toFixed(2)}  ${sign}${pct.toFixed(2)}%`,
    textStyle: { fontSize: 12, fontWeight: 'bold', color: pct >= 0 ? UP_COLOR : DOWN_COLOR }
  }
}

/** 指针移动：以触发轴定位当日日期，把各小图标题替换为“名称+日期+收盘+涨跌幅” */
function handleAxisPointerUpdate(event: any) {
  if (!trendChart || !lastVisible.length) return
  const axesInfo: Array<{ axisDim: string; axisIndex: number; value: unknown }> =
    event?.axesInfo || []
  const hit = axesInfo.find(a => a.axisDim === 'x' && typeof a.value === 'number')
  if (!hit) return
  const src = lastVisible[hit.axisIndex]
  const srcCandle = src?.candles[hit.value as number]
  if (!srcCandle) return
  const date = srcCandle.date
  trendChart.setOption({
    title: lastVisible.map((item, i) => buildHoverTitle(item, i, date))
  })
}

/** 指针移出图表：恢复各小图仅显示名称的基础标题 */
function restoreBaseTitles() {
  if (trendChart && baseTitles.length) {
    trendChart.setOption({ title: baseTitles })
  }
}

function ensureTrendChart() {
  if (!trendChart && trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
    trendChart.on('updateAxisPointer', handleAxisPointerUpdate)
    trendChart.on('globalout', restoreBaseTitles)
  }
  if (!compareChart && compareChartRef.value) {
    compareChart = echarts.init(compareChartRef.value)
  }
  window.addEventListener('resize', handleTrendResize)
}

/** 切换趋势快捷区间 */
function handleTrendRangeChange(range: TrendRangeKey) {
  applyTrendRange(range)
  candleCache.clear()
  // 重新拉取该区间的领涨矩阵（表格日期随之变化）；records 更新后经 watch(stocks) 级联刷新对比图K线
  loadData()
}

/** 点击矩阵中的领涨股票名：滚动到趋势图并高亮该股折线 */
function selectTrendStock(stock: { name: string; code: string; count: number }) {
  if (!stock.code) {
    ElMessage.warning('该股票缺少股票代码，无法在趋势图中定位')
    return
  }
  nextTick(() => {
    trendPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (trendChart) {
      trendChart.dispatchAction({ type: 'highlight', seriesName: stock.name })
      trendChart.dispatchAction({ type: 'showTip', seriesName: stock.name, dataIndex: 0 })
    }
  })
}

/** 弹窗打开时初始化趋势面板（此时对话框 body 已挂载，图表容器可用）：默认最近3个月 */
function initTrend() {
  trendRangeKey.value = '3m'
  trendHasData.value = false
  applyTrendRange('3m')
  candleCache.clear()
  nextTick(() => {
    ensureTrendChart()
    // 板块K线立即加载；聚焦日期的领涨股K线待 loadData 完成后由 watch(stocks) 按需加载
    ensureCompareCandles()
  })
}

/** 关闭对话框时销毁图表（destroy-on-close 会重建 body，下次打开需重新 init） */
function disposeTrendChart() {
  if (trendChart) {
    trendChart.dispose()
    trendChart = null
  }
  if (compareChart) {
    compareChart.dispose()
    compareChart = null
  }
  trendHasData.value = false
  focusedDate.value = ''
}

// 悬停矩阵日期列切换聚焦日期后，按需加载该日领涨股K线并重绘对比区
watch(focusedDate, () => {
  if (compareChart) ensureCompareCandles()
})

// 矩阵数据到达（loadData 完成）后，设定默认聚焦日并按需加载对比图K线
watch(stocks, () => {
  if (props.modelValue) {
    setDefaultFocus()
    ensureCompareCandles()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleTrendResize)
  disposeTrendChart()
})
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
  cursor: pointer;
}

/* 当前对比区聚焦的日期列高亮 */
.date-cell.date-focused,
.value-cell.date-focused {
  outline: 2px solid #8e44ad;
  outline-offset: -2px;
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

/* -------- 对比区面板样式 -------- */
/* 紧贴领涨表格上方，随内容正常滚动（不再 sticky，避免覆盖下方表格） */
.compare-panel {
  margin-bottom: 16px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px;
  background: #fff;
}

.compare-hint {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.compare-hint strong {
  color: #409eff;
}

.compare-chart-wrap {
  width: 100%;
}

.compare-chart {
  width: 100%;
}

/* -------- 趋势图面板样式 -------- */
.trend-panel {
  margin-bottom: 16px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px;
  background: #fff;
}

.trend-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.trend-hint {
  font-size: 12px;
  color: #909399;
}

.trend-chart-wrap {
  position: relative;
  min-height: 340px;
}

.trend-chart {
  width: 100%;
  height: 340px;
}

.trend-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

@media (max-width: 768px) {
  .trend-toolbar {
    gap: 8px;
  }

  .trend-chart,
  .trend-chart-wrap {
    height: 280px;
    min-height: 280px;
  }
}
</style>

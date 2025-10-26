<template>
  <div class="candlestick-pattern-heatmap">
    <div class="header">
      <h3>形态识别结果热力图</h3>
      <span class="subtitle">日期范围与历史行情一致；纵轴为形态类别，按看涨/看跌/中性分组</span>
      <el-link type="primary" :underline="false" @click="descVisible = true">形态说明</el-link>
    </div>
    <HeatmapChart
      v-if="hasData"
      :option="chartOption"
      :height="computedHeight"
      @chartReady="handleChartReady"
    />
    <div v-else class="empty">
      <el-empty description="暂无形态识别数据" />
    </div>

    <el-dialog v-model="descVisible" title="K线形态说明（TA-Lib）" width="80%">
      <el-table :data="patternDescRows" height="60vh" size="small">
        <el-table-column prop="key" label="字段" width="180" />
        <el-table-column prop="name" label="形态名称" width="200" />
        <el-table-column prop="talib" label="TA-Lib 函数" width="200" />
        <el-table-column prop="group" label="分组" width="140" />
        <el-table-column prop="summary" label="主要作用与预示" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import * as echarts from 'echarts'
import HeatmapChart from '@/components/HeatmapChart.vue'
import { getCandlestickPatterns } from '@/services/strategyApi'

interface Props { stockCode: string; startDate?: string; endDate?: string }
const props = defineProps<Props>()

const chartOption = ref<any>({})
const hasData = ref(false)
const chartInstance = ref<echarts.ECharts | null>(null)
const displayCategoryCount = ref(0)
const descVisible = ref(false)

// 扩展：将形态类别按看涨/中性(双向)/看跌分组
const BULLISH = [
  'hammer','morning_star','piercing','inverted_hammer','three_white_soldiers','ladder_bottom','matching_low','mat_hold','morning_doji_star','homing_pigeon','stick_sandwich','takuri','unique_three_river'
]
const BEARISH = [
  'hanging_man','evening_star','dark_cloud_cover','three_black_crows','identical_three_crows','two_crows','advance_block','evening_doji_star','in_neck','on_neck','shooting_star','stalled_pattern','thrusting','upside_gap_two_crows','conceal_baby_swallow'
]
const NEUTRAL = [
  'doji','long_legged_doji','gravestone_doji','dragonfly_doji','rickshaw_man','spinning_top','marubozu','short_line','long_line','doji_star','tristar','separating_lines','rise_fall_three_methods','tasuki_gap','gap_side_by_side_white','three_inside','three_line_strike','three_outside','three_stars_in_south','abandoned_baby','belt_hold','breakaway','closing_marubozu','counterattack','kicking','kicking_by_length','engulfing','harami','xside_gap_three_methods'
]
const CATEGORY_ORDER = [...BULLISH, ...NEUTRAL, ...BEARISH]

const CATEGORY_LABELS: Record<string, string> = {
  hammer: '锤子线（看涨）', morning_star: '早晨之星（看涨）', piercing: '刺透（看涨）', inverted_hammer: '倒锤头（看涨）', three_white_soldiers: '三个白兵（看涨）', ladder_bottom: '梯底（看涨）', matching_low: '相同低价（看涨）', mat_hold: '垫脚石（看涨）', morning_doji_star: '十字晨星（看涨）', homing_pigeon: '家鸽（看涨）', stick_sandwich: '条形三明治（看涨）', takuri: '探水杆（看涨）', unique_three_river: '独特三河（看涨）',
  hanging_man: '上吊线（看跌）', evening_star: '黄昏之星（看跌）', dark_cloud_cover: '乌云盖顶（看跌）', three_black_crows: '三只黑乌鸦（看跌）', identical_three_crows: '同样三乌鸦（看跌）', two_crows: '两只乌鸦（看跌）', advance_block: '大敌当前（看跌）', evening_doji_star: '十字暮星（看跌）', in_neck: '颈内线（看跌）', on_neck: '颈上线（看跌）', shooting_star: '射击之星（看跌）', stalled_pattern: '停顿形态（看跌）', thrusting: '插入形态（看跌）', upside_gap_two_crows: '向上跳空两只乌鸦（看跌）', conceal_baby_swallow: '藏婴吞没（看跌）',
  doji: '十字星（中性）', long_legged_doji: '长脚十字星（中性）', gravestone_doji: '墓碑十字星（中性）', dragonfly_doji: '蜻蜓十字（中性）', rickshaw_man: '黄包车夫（中性）', spinning_top: '纺锤线（中性/双向）', marubozu: '秃线/缺影线（中性/双向）', short_line: '短线（中性/双向）', long_line: '长线（中性/双向）', doji_star: '十字星形态（中性/双向）', tristar: '三星（中性/双向）', separating_lines: '分离线（中性/双向）', rise_fall_three_methods: '上升/下降三法（中性/双向）', tasuki_gap: '跳空并列线（中性/双向）', gap_side_by_side_white: '并列阳线（中性/双向）', three_inside: '三内部上涨/下跌（中性/双向）', three_line_strike: '三线打击（中性/双向）', three_outside: '三外部上涨/下跌（中性/双向）', three_stars_in_south: '南方三星（中性/双向）', abandoned_baby: '弃婴（中性/双向）', belt_hold: '捉腰带线（中性/双向）', breakaway: '脱离形态（中性/双向）', closing_marubozu: '收盘秃线（中性/双向）', counterattack: '反击线（中性/双向）', kicking: '踢击（看涨/看跌）', kicking_by_length: '由较长秃线决定的反冲（中性/双向）', engulfing: '吞没（看涨/看跌）', harami: '孕线（看涨/看跌）', xside_gap_three_methods: '向上/向下跳空三法（中性/双向）'
}

// 形态说明数据（来自 API 文档摘要）
const PATTERN_DESC: Array<{ key: string; talib: string; name: string; summary: string }> = [
  { key: 'two_crows', talib: 'CDL2CROWS', name: '两只乌鸦', summary: '看跌反转，三日模式，第二三天高开收阴，收盘价降低。' },
  { key: 'three_black_crows', talib: 'CDL3BLACKCROWS', name: '三只黑乌鸦', summary: '强烈看跌反转，上涨后出现三根连续阴线，空方强劲。' },
  { key: 'three_inside', talib: 'CDL3INSIDE', name: '三内部上涨/下跌', summary: '趋势反转，Inside Up 为阴阳阳组合，第三日收盘高于第一日开盘。' },
  { key: 'three_line_strike', talib: 'CDL3LINESTRIKE', name: '三线打击', summary: '看跌持续/反转，第四日高开低走，可能上涨趋势失效。' },
  { key: 'three_outside', talib: 'CDL3OUTSIDE', name: '三外部上涨/下跌', summary: '趋势反转，Outside Up 第一日K线位于第二日实体内部，预示上涨。' },
  { key: 'three_stars_in_south', talib: 'CDL3STARSINSOUTH', name: '南方三星', summary: '看涨反转，下跌中三日皆阴但实体缩短，下影线变短。' },
  { key: 'three_white_soldiers', talib: 'CDL3WHITESOLDIERS', name: '三个白兵', summary: '强烈看涨反转，底部三根连续阳线，买盘强劲。' },
  { key: 'abandoned_baby', talib: 'CDLABANDONEDBABY', name: '弃婴', summary: '典型反转，第二日跳空且十字星，趋势可能结束。' },
  { key: 'advance_block', talib: 'CDLADVANCEBLOCK', name: '大敌当前', summary: '看跌反转，三连阳但实体缩短、上影线变长，上涨动能衰竭。' },
  { key: 'belt_hold', talib: 'CDLBELTHOLD', name: '捉腰带线', summary: '趋势反转，下跌中长阳线，开盘为最低价，收盘接近最高。' },
  { key: 'breakaway', talib: 'CDLBREAKAWAY', name: '脱离形态', summary: '趋势反转，五日模式，下跌后出现组合，预示趋势脱离转向。' },
  { key: 'closing_marubozu', talib: 'CDLCLOSINGMARUBOZU', name: '收盘秃线', summary: '趋势持续，一日模式，收盘等于最高价（阳线），上涨动力强。' },
  { key: 'conceal_baby_swallow', talib: 'CDLCONCEALBABYSWALL', name: '藏婴吞没', summary: '看涨反转，下跌中四日模式，最后一日暗示底部反转。' },
  { key: 'counterattack', talib: 'CDLCOUNTERATTACK', name: '反击线', summary: '趋势反转信号，两日收盘价处同一水平，多空短暂平衡。' },
  { key: 'dark_cloud_cover', talib: 'CDLDARKCLOUDCOVER', name: '乌云盖顶', summary: '看跌反转，第二日高开后收盘深入第一日实体下半部。' },
  { key: 'doji', talib: 'CDLDOJI', name: '十字线', summary: '趋势反转指示，开收盘几乎相同，趋势末端是重要警示。' },
  { key: 'doji_star', talib: 'CDLDOJISTAR', name: '十字星形态', summary: '趋势反转指示，与十字线类似，可能伴随跳空，反转意义更强。' },
  { key: 'dragonfly_doji', talib: 'CDLDRAGONFLYDOJI', name: '蜻蜓十字', summary: '看涨反转，长下影线，底部出现时预示可能反弹。' },
  { key: 'engulfing', talib: 'CDLENGULFING', name: '吞没形态', summary: '趋势反转，两日第二日吞没第一日，看涨/看跌取决于方向。' },
  { key: 'evening_doji_star', talib: 'CDLEVENINGDOJISTAR', name: '十字暮星', summary: '强烈看跌反转，暮星变体，第二日为十字星。' },
  { key: 'evening_star', talib: 'CDLEVENINGSTAR', name: '暮星/黄昏之星', summary: '看跌反转，三日模式，第三日阴线深入第一日实体。' },
  { key: 'gap_side_by_side_white', talib: 'CDLGAPSIDESIDEWHITE', name: '并列阳线', summary: '趋势持续，跳空后并列两根阳线，趋势将延续。' },
  { key: 'gravestone_doji', talib: 'CDLGRAVESTONEDOJI', name: '墓碑十字', summary: '看跌反转，长上影线位于顶部，出现在上涨趋势顶部危险。' },
  { key: 'hammer', talib: 'CDLHAMMER', name: '锤头线', summary: '看涨反转，实体小、长下影线，底部预示回升。' },
  { key: 'hanging_man', talib: 'CDLHANGINGMAN', name: '上吊线', summary: '看跌反转，形似锤头线但位于上涨顶部。' },
  { key: 'harami', talib: 'CDLHARAMI', name: '孕线', summary: '趋势反转，两日第二日小实体位于第一日内部。' },
  { key: 'harami_cross', talib: 'CDLHARAMICROSS', name: '十字孕线', summary: '孕线变体，第二日为十字星，反转意味更强。' },
  { key: 'high_wave', talib: 'CDLHIGHWAVE', name: '风高浪大线', summary: '趋势反转，极长影线与短实体，剧烈波动与犹豫。' },
  { key: 'hikkake', talib: 'CDLHIKKAKE', name: '陷阱模式', summary: '趋势持续/失败反转，初似反转但后续走势失败恢复原趋势。' },
  { key: 'hikkakemod', talib: 'CDLHIKKAKEMOD', name: '修正陷阱模式', summary: '趋势持续，陷阱模式的修正定义，延续原有趋势。' },
  { key: 'homing_pigeon', talib: 'CDLHOMINGPIGEON', name: '家鸽', summary: '看涨反转，与孕线类似，两日同色，下跌中出现。' },
  { key: 'identical_three_crows', talib: 'CDLIDENTICAL3CROWS', name: '三胞胎乌鸦', summary: '强烈看跌反转，三日阴线长度更接近，开盘等于前日收盘。' },
  { key: 'in_neck', talib: 'CDLINNECK', name: '颈内线', summary: '趋势持续（下跌），第二日阳线收盘略高于前一日收盘。' },
  { key: 'inverted_hammer', talib: 'CDLINVERTEDHAMMER', name: '倒锤头', summary: '看涨反转，长上影线，需次日阳线确认。' },
  { key: 'kicking', talib: 'CDLKICKING', name: '反冲形态', summary: '趋势反转，两根相反颜色且跳空的秃线组成。' },
  { key: 'kicking_by_length', talib: 'CDLKICKINGBYLENGTH', name: '由较长秃线决定的反冲', summary: '趋势反转，较长的秃线方向决定看涨/看跌。' },
  { key: 'ladder_bottom', talib: 'CDLLADDERBOTTOM', name: '梯底', summary: '看涨反转，五日模式，最后一日阳线确认底部。' },
  { key: 'long_legged_doji', talib: 'CDLLONGLEGGEDDOJI', name: '长腿十字', summary: '趋势反转指示，极长上下影线与极短实体，强烈警示。' },
  { key: 'long_line', talib: 'CDLLONGLINE', name: '长线', summary: '趋势强度指示，实体很长，显示趋势动力强。' },
  { key: 'marubozu', talib: 'CDLMARUBOZU', name: '秃线/缺影线', summary: '趋势持续，几乎无影线，显示趋势动力强劲。' },
  { key: 'matching_low', talib: 'CDLMATCHINGLOW', name: '相同低价', summary: '看涨反转，两日最低收盘价相同，下跌动能减弱。' },
  { key: 'mat_hold', talib: 'CDLMATHOLD', name: '垫脚石', summary: '趋势持续（上涨），上升中短暂休息后继续上涨。' },
  { key: 'morning_doji_star', talib: 'CDLMORNINGDOJISTAR', name: '十字晨星', summary: '强烈看涨反转，晨星变体，第二日为十字星。' },
  { key: 'morning_star', talib: 'CDLMORNINGSTAR', name: '晨星/启明星', summary: '看涨反转，三日模式，底部经典信号。' },
  { key: 'on_neck', talib: 'CDLONNECK', name: '颈上线', summary: '趋势持续（下跌），第二日阳线回升至前一日最低点。' },
  { key: 'piercing', talib: 'CDLPIERCING', name: '刺透形态', summary: '看涨反转，两日第二日大幅低开后强劲回升，切入前日实体一半以上。' },
  { key: 'rickshaw_man', talib: 'CDLRICKSHAWMAN', name: '黄包车夫', summary: '趋势反转指示，特殊长腿十字，开收位于区间中点。' },
  { key: 'rise_fall_three_methods', talib: 'CDLRISEFALL3METHODS', name: '上升/下降三法', summary: '趋势持续，长阳后数日小实体回调，最后再以长阳确认。' },
  { key: 'separating_lines', talib: 'CDLSEPARATINGLINES', name: '分离线', summary: '趋势持续，两日颜色相反但开盘相同，沿原方向继续。' },
  { key: 'shooting_star', talib: 'CDLSHOOTINGSTAR', name: '射击之星', summary: '看跌反转，位于上涨顶部，长上影线，可能见顶回落。' },
  { key: 'short_line', talib: 'CDLSHORTLINE', name: '短线', summary: '趋势动能减弱，实体很短，波动小，市场犹豫。' },
  { key: 'spinning_top', talib: 'CDLSPINNINGTOP', name: '纺锤线', summary: '趋势犹豫/反转警示，小实体与较短影线，力量平衡。' },
  { key: 'stalled_pattern', talib: 'CDLSTALLEDPATTERN', name: '停顿形态', summary: '看跌反转，上涨末端三烛线组合，动能衰竭。' },
  { key: 'stick_sandwich', talib: 'CDLSTICKSANDWICH', name: '条形三明治', summary: '看涨反转，三日两边阴线中间阳线，阴线收盘同一水平。' },
  { key: 'takuri', talib: 'CDLTAKURI', name: '探水杆', summary: '看涨反转，蜻蜓十字的一种，下影线特别长。' },
  { key: 'tasuki_gap', talib: 'CDLTASUKIGAP', name: '跳空并列线', summary: '趋势持续，跳空后下一日未回补缺口，趋势延续。' },
  { key: 'thrusting', talib: 'CDLTHRUSTING', name: '插入形态', summary: '趋势持续（下跌），第二日阳线未能超过前一日实体一半。' },
  { key: 'tristar', talib: 'CDLTRISTAR', name: '三星', summary: '趋势反转，三个十字星组成，罕见但重要信号。' },
  { key: 'unique_three_river', talib: 'CDLUNIQUE3RIVER', name: '独特三河', summary: '看涨反转，三日复杂组合，底部出现预示反转。' },
  { key: 'upside_gap_two_crows', talib: 'CDLUPSIDEGAP2CROWS', name: '向上跳空两只乌鸦', summary: '看跌反转，上涨中出现两只乌鸦，是顶部警告。' },
  { key: 'xside_gap_three_methods', talib: 'CDLXSIDEGAP3METHODS', name: '向上/向下跳空三法', summary: '趋势持续，跳空并列线的扩展，经过整理后延续。' }
]

const patternDescRows = computed(() => PATTERN_DESC.map(i => ({
  ...i,
  group: BULLISH.includes(i.key) ? '看涨' : BEARISH.includes(i.key) ? '看跌' : NEUTRAL.includes(i.key) ? '中性/双向' : '趋势持续/其它'
})))

const computedHeight = computed(() => {
  const count = displayCategoryCount.value || CATEGORY_ORDER.length
  return Math.max(500, count * 28 + 140)
})

const fetchData = async () => {
  if (!props.stockCode) { hasData.value = false; return }
  try {
    const formatYmd = (s?: string) => { if (!s) return undefined; if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`; return s }
    const formattedStartDate = formatYmd(props.startDate)
    const formattedEndDate = formatYmd(props.endDate)
    const data = await getCandlestickPatterns(props.stockCode, { start_date: formattedStartDate, end_date: formattedEndDate })
    if (!data) { hasData.value = false; return }
    const patterns = Array.isArray(data.patterns) ? data.patterns : []
    if (!patterns.length) { hasData.value = false; return }
    const dates = patterns.map(p => String(p.date))

    const activeCategories = CATEGORY_ORDER.filter(key =>
      patterns.some(p => typeof (p as any)[key] === 'number' && (p as any)[key] !== 0)
    )
    displayCategoryCount.value = activeCategories.length

    const heatmapData: [number, number, number][] = []
    const categoryIndexMap = new Map<string, number>()
    activeCategories.forEach((key, idx) => categoryIndexMap.set(key, idx))
    patterns.forEach((p, xIdx) => {
      activeCategories.forEach((key) => {
        const raw = (p as any)[key] as number | undefined
        const v = typeof raw === 'number' ? raw : 0
        const y = categoryIndexMap.get(key)
        if (typeof y === 'number') heatmapData.push([xIdx, y, v])
      })
    })

    const visualPieces = [
      { value: -100, label: '看跌', color: '#4a7bd0' },
      { value: 0, label: '无信号', color: '#bdbdbd' },
      { value: 100, label: '看涨', color: '#e84e40' }
    ]

    chartOption.value = {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const xIdx = params.data[0]
          const yIdx = params.data[1]
          const val = params.data[2]
          const date = dates[xIdx]
          const key = activeCategories[yIdx]
          const name = CATEGORY_LABELS[key]
          const signal = val === 100 ? '看涨(+100)' : val === -100 ? '看跌(-100)' : '无信号(0)'
          return `${date}<br/>${name}: <br/>${signal}`
        }
      },
      grid: { left: 5, right: 20, top: 40, bottom: 40 },
      xAxis: { type: 'category', data: dates, axisLabel: { rotate: 45 } },
      yAxis: { type: 'category', data: activeCategories.map(k => CATEGORY_LABELS[k]) },
      visualMap: { type: 'piecewise', show: true, pieces: visualPieces, orient: 'horizontal', left: 'center', top: 8, textStyle: { fontSize: 12 } },
      series: [{ type: 'heatmap', data: heatmapData, emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.25)' } } }]
    }

    hasData.value = heatmapData.length > 0
  } catch (err) {
    console.error('[CandlestickPatternHeatmap] 加载形态识别热力图失败:', err)
    hasData.value = false
  }
}

const handleChartReady = (chart: echarts.ECharts) => { chartInstance.value = chart }
watch(() => [props.stockCode, props.startDate, props.endDate], fetchData, { immediate: true })
onMounted(() => { fetchData() })
</script>

<style scoped>
.candlestick-pattern-heatmap { margin-top: 16px; }
.header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
.header h3 { margin: 0; font-size: 18px; }
.subtitle { color: #909399; font-size: 12px; }
.empty { padding: 12px 0; }
</style>
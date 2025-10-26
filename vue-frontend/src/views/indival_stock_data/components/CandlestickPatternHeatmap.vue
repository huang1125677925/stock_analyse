<template>
  <div class="candlestick-pattern-heatmap">
    <div class="header">
      <h3>形态识别结果热力图</h3>
      <span class="subtitle">日期范围与历史行情一致；纵轴为形态类别，按看涨/看跌/中性分组</span>
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
  </div>
</template>

<script setup lang="ts">
/**
 * 组件：CandlestickPatternHeatmap
 * 功能：
 * - 展示个股K线形态识别的热力图，横轴为日期，纵轴为形态类别
 * - 形态类别按看涨、看跌、中性分组并着色区分
 * 参数：
 * @param stockCode - 股票代码
 * @param startDate - 开始日期（YYYYMMDD），与历史行情一致
 * @param endDate - 结束日期（YYYYMMDD），与历史行情一致
 * 事件：
 * - chartReady: 图表初始化完成，回传 ECharts 实例
 * 返回值：
 * - 无
 */
import { ref, computed, watch, onMounted } from 'vue'
import * as echarts from 'echarts'
import HeatmapChart from '@/components/HeatmapChart.vue'
import { getCandlestickPatterns } from '@/services/strategyApi'

interface Props {
  stockCode: string
  startDate?: string
  endDate?: string
}

const props = defineProps<Props>()

// 使用 any 类型避免复杂的 ECharts 类型问题
const chartOption = ref<any>({})
const hasData = ref(false)
const chartInstance = ref<echarts.ECharts | null>(null)

// 按规范：将形态类别划分为看涨、看跌、中性
const BULLISH = [
  'hammer',
  'morning_star',
  'piercing',
  'kicking',
  'inverted_hammer',
  'engulfing',
  'harami'
]
const BEARISH = [
  'hanging_man',
  'evening_star',
  'dark_cloud_cover',
  'three_black_crows',
  'identical_three_crows',
]
const NEUTRAL = [
  'doji',
  'long_legged_doji',
  'gravestone_doji'
]

// 显示顺序：先看涨，再中性，再看跌（便于区分）
const CATEGORY_ORDER = [
  ...BULLISH,
  ...NEUTRAL,
  ...BEARISH
]

// 标签映射（中文）
const CATEGORY_LABELS: Record<string, string> = {
  hammer: '锤子线（看涨）',
  morning_star: '早晨之星（看涨）',
  piercing: '刺透（看涨）',
  kicking: '踢击（看涨/看跌）',
  inverted_hammer: '倒锤头（看涨）',
  engulfing: '吞没（看涨/看跌）',
  harami: '孕线（看涨/看跌）',
  hanging_man: '上吊线（看跌）',
  evening_star: '黄昏之星（看跌）',
  dark_cloud_cover: '乌云盖顶（看跌）',
  three_black_crows: '三只黑乌鸦（看跌）',
  identical_three_crows: '同样三乌鸦（看跌）',
  doji: '十字星（中性）',
  long_legged_doji: '长脚十字星（中性）',
  gravestone_doji: '墓碑十字星（中性）'
}

// 颜色映射：看涨为红系，看跌为蓝系，中性为灰系
const COLOR_MAP: Record<'bull' | 'bear' | 'neutral', string[]> = {
  bull: ['#fde0dc', '#f9bdbb', '#f57c6e', '#e84e40', '#d32f2f'],
  bear: ['#d0d9ff', '#a6baff', '#7a99ff', '#4a7bd0', '#2c4d8a'],
  neutral: ['#f5f5f5', '#e0e0e0', '#bdbdbd', '#9e9e9e', '#757575']
}

const computedHeight = computed(() => {
  // 每个类别 28px，高度下限 500
  const count = CATEGORY_ORDER.length
  return Math.max(500, count * 28 + 140)
})

const fetchData = async () => {
  if (!props.stockCode) {
    console.log('[CandlestickPatternHeatmap] 股票代码为空，跳过数据获取')
    hasData.value = false
    return
  }
  
  console.log('[CandlestickPatternHeatmap] 开始获取数据:', {
    stockCode: props.stockCode,
    startDate: props.startDate,
    endDate: props.endDate
  })
  
  try {
    // API 要求 YYYY-MM-DD；视图使用 YYYYMMDD，这里转换
    const formatYmd = (s?: string) => {
      if (!s) return undefined
      if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
      return s
    }
    
    const formattedStartDate = formatYmd(props.startDate)
    const formattedEndDate = formatYmd(props.endDate)
    
    console.log('[CandlestickPatternHeatmap] 格式化后的日期参数:', {
      start_date: formattedStartDate,
      end_date: formattedEndDate
    })
    
    const data = await getCandlestickPatterns(props.stockCode, {
      start_date: formattedStartDate,
      end_date: formattedEndDate
    })

    console.log('[CandlestickPatternHeatmap] API返回的原始数据:', data)

    // 健壮性校验：后端未就绪/错误时 data 可能为 undefined 或不含 patterns
    if (!data) {
      console.warn('[CandlestickPatternHeatmap] API返回数据为空')
      hasData.value = false
      return
    }

    const patterns = Array.isArray(data.patterns) ? data.patterns : []
    console.log('[CandlestickPatternHeatmap] 提取的patterns数组:', patterns)
    console.log('[CandlestickPatternHeatmap] patterns数组长度:', patterns.length)
    
    if (!patterns.length) {
      console.warn('[CandlestickPatternHeatmap] patterns数组为空')
      hasData.value = false
      return
    }

    const dates = patterns.map(p => String(p.date))
    console.log('[CandlestickPatternHeatmap] 提取的日期数组:', dates)
    
    // 构造热力图数据：[x(日期索引), y(类别索引), value]
    const heatmapData: [number, number, number][] = []

    const categoryIndexMap = new Map<string, number>()
    CATEGORY_ORDER.forEach((key, idx) => categoryIndexMap.set(key, idx))

    patterns.forEach((p, xIdx) => {
      CATEGORY_ORDER.forEach((key) => {
        const raw = (p as any)[key] as number | undefined
        // 值规范：+100 看涨，-100 看跌，0 无信号
        const v = typeof raw === 'number' ? raw : 0
        const y = categoryIndexMap.get(key)
        if (typeof y === 'number') {
          heatmapData.push([xIdx, y, v])
        }
      })
    })

    console.log('[CandlestickPatternHeatmap] 构造的热力图数据:', heatmapData)
    console.log('[CandlestickPatternHeatmap] 热力图数据长度:', heatmapData.length)
    
    // 检查是否有非零值
    const nonZeroData = heatmapData.filter(([, , value]) => value !== 0)
    console.log('[CandlestickPatternHeatmap] 非零值数据:', nonZeroData)
    console.log('[CandlestickPatternHeatmap] 非零值数据长度:', nonZeroData.length)

    // visualMap 分段：-100 蓝（看跌）、0 灰（无）、+100 红（看涨）
    const visualPieces = [
      { value: -100, label: '看跌', color: COLOR_MAP.bear[3] },
      { value: 0, label: '无信号', color: COLOR_MAP.neutral[2] },
      { value: 100, label: '看涨', color: COLOR_MAP.bull[3] }
    ]

    chartOption.value = {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const xIdx = params.data[0]
          const yIdx = params.data[1]
          const val = params.data[2]
          const date = dates[xIdx]
          const key = CATEGORY_ORDER[yIdx]
          const name = CATEGORY_LABELS[key]
          const signal = val === 100 ? '看涨(+100)' : val === -100 ? '看跌(-100)' : '无信号(0)'
          return `${date}<br/>${name}: <br/>${signal}`
        }
      },
      grid: { left: 5, right: 20, top: 40, bottom: 40 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { rotate: 45 }
      },
      yAxis: {
        type: 'category',
        data: CATEGORY_ORDER.map(k => CATEGORY_LABELS[k])
      },
      visualMap: {
        type: 'piecewise',
        show: true,
        pieces: visualPieces,
        orient: 'horizontal',
        left: 'center',
        top: 8,
        textStyle: { fontSize: 12 }
      },
      series: [
        {
          type: 'heatmap',
          data: heatmapData,
          emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.25)' } }
        }
      ]
    }

    console.log('[CandlestickPatternHeatmap] 构造的图表配置:', chartOption.value)

    // 修改判断逻辑：只要有数据就显示图表，不管是否有非零值
    hasData.value = heatmapData.length > 0
    console.log('[CandlestickPatternHeatmap] hasData设置为:', hasData.value)
  } catch (err) {
    console.error('[CandlestickPatternHeatmap] 加载形态识别热力图失败:', err)
    hasData.value = false
  }
}

const handleChartReady = (chart: echarts.ECharts) => {
  chartInstance.value = chart
}

watch(() => [props.stockCode, props.startDate, props.endDate], fetchData, { immediate: true })

onMounted(() => {
  // 初次挂载时拉取
  fetchData()
})
</script>

<style scoped>
.candlestick-pattern-heatmap {
  margin-top: 16px;
}
.header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}
.header h3 {
  margin: 0;
  font-size: 18px;
}
.subtitle {
  color: #909399;
  font-size: 12px;
}
.empty {
  padding: 12px 0;
}
</style>
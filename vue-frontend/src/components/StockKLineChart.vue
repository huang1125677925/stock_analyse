<template>
  <div class="stock-kline-chart-container">
    <div class="chart-header">
      <h3 v-if="title">{{ title }}</h3>
    </div>
    
    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

interface KLineDataItem {
  date: string
  open_price: number
  close_price: number
  high_price: number
  low_price: number
  volume: number
  amount: number
  [key: string]: any
}

interface TradeSignal {
  date: string
  type: 'buy' | 'sell'
  price: number
  description?: string
}

interface EventLine {
  date: string
  label: string
  color?: string
}

interface OverlayLinePoint {
  date: string
  value: number
}

interface OverlayLine {
  name: string
  points: OverlayLinePoint[]
  color?: string
  width?: number
  type?: 'solid' | 'dashed' | 'dotted'
  showSymbol?: boolean
  /**
   * 使用的 y 轴索引：
   * - 0 或省略：与 K 线共用左侧价格轴
   * - 1：使用右侧副轴（用于量纲不同的指标，如 0~1 的市场宽度比例）
   */
  yAxisIndex?: number
  /**
   * 副轴数值格式化：'percent' 表示按百分比展示（value * 100）
   */
  valueFormat?: 'percent' | 'raw'
}

interface PatternMarker {
  date: string
  label: string
  direction?: 'bullish' | 'bearish' | 'neutral'
  description?: string
}

interface Props {
  title?: string
  stockCode: string
  stockName?: string
  klineData: KLineDataItem[]
  tradeSignals?: TradeSignal[]
  eventLines?: EventLine[]
  overlayLines?: OverlayLine[]
  patternMarkers?: PatternMarker[]
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  stockName: '',
  tradeSignals: () => [],
  eventLines: () => [],
  overlayLines: () => [],
  patternMarkers: () => [],
  height: '600px'
})

const chartContainer = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

// 初始化图表
const initChart = () => {
  if (!chartContainer.value) return
  
  // 销毁旧图表
  if (chart) {
    chart.dispose()
  }
  
  // 创建新图表
  chart = echarts.init(chartContainer.value)
  
  // 设置图表配置和数据
  updateChart()
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
}

// 更新图表
const updateChart = () => {
  if (!chart || !props.klineData || props.klineData.length === 0) return
  
  // 准备数据
  const dates = props.klineData.map(item => item.date)
  const data = props.klineData.map(item => [
    item.open_price,
    item.close_price,
    item.low_price,
    item.high_price
  ])

  console.log('更新图表数据', data)

  // 归一化日期工具与映射（兼容 YYYYMMDD / YYYY-MM-DD 等）
  const normalizeDate = (s: string) => (s ? s.replace(/[^0-9]/g, '') : '')
  const dateIndexMap: Map<string, number> = new Map()
  dates.forEach((d, idx) => {
    dateIndexMap.set(normalizeDate(d), idx)
  })

  const alignEventLineIndex = (eventDate: string) => {
    const normalizedEventDate = normalizeDate(eventDate)
    if (!normalizedEventDate) return undefined

    const exactIndex = dateIndexMap.get(normalizedEventDate)
    if (exactIndex !== undefined) return exactIndex

    const nextTradingDayIndex = dates.findIndex((date) => normalizeDate(date) >= normalizedEventDate)
    if (nextTradingDayIndex !== -1) return nextTradingDayIndex

    return dates.length > 0 ? dates.length - 1 : undefined
  }

  const alignedEventLines = (props.eventLines || [])
    .map((eventLine) => {
      const index = alignEventLineIndex(eventLine.date)
      if (index === undefined) return null
      return {
        xAxis: dates[index],
        name: eventLine.label,
        lineStyle: {
          color: eventLine.color || '#dc2626',
          width: 2,
          type: 'solid'
        },
        label: {
          show: true,
          formatter: eventLine.label,
          color: eventLine.color || '#dc2626',
          fontSize: 12,
          fontWeight: 'bold',
          backgroundColor: '#fff',
          padding: [3, 6],
          borderColor: eventLine.color || '#dc2626',
          borderWidth: 1,
          borderRadius: 4
        }
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const patternEventLines = (props.patternMarkers || [])
    .map((marker) => {
      const index = alignEventLineIndex(marker.date)
      if (index === undefined) return null
      return {
        xAxis: dates[index],
        name: marker.label,
        lineStyle: {
          color: '#dc2626',
          width: 1.5,
          type: 'dashed',
          opacity: 0.78
        },
        label: {
          show: true,
          formatter: marker.label,
          color: '#dc2626',
          fontSize: 10,
          fontWeight: 'bold',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: [2, 4],
          borderColor: '#dc2626',
          borderWidth: 1,
          borderRadius: 4,
          position: 'insideEndTop'
        },
        tooltip: {
          formatter: `${marker.label}<br/>日期: ${dates[index]}${marker.description ? `<br/>${marker.description}` : ''}`
        }
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const markLineData = [...alignedEventLines, ...patternEventLines]

  const overlayLineSeries = (props.overlayLines || [])
    .filter(line => Array.isArray(line.points) && line.points.length > 0)
    .map(line => {
      const pointMap = new Map<string, number>()
      line.points.forEach(point => {
        const normalizedDate = normalizeDate(point.date)
        if (normalizedDate && Number.isFinite(point.value)) {
          pointMap.set(normalizedDate, point.value)
        }
      })

      const isPercent = line.valueFormat === 'percent'
      return {
        name: line.name,
        type: 'line',
        yAxisIndex: line.yAxisIndex ?? 0,
        data: dates.map(date => {
          const value = pointMap.get(normalizeDate(date))
          return value === undefined ? null : Number(value.toFixed(3))
        }),
        smooth: false,
        symbol: line.showSymbol ? 'circle' : 'none',
        symbolSize: 4,
        connectNulls: true,
        z: 6,
        lineStyle: {
          color: line.color || '#2563eb',
          width: line.width ?? 1.5,
          type: line.type || 'solid'
        },
        itemStyle: {
          color: line.color || '#2563eb'
        },
        tooltip: {
          valueFormatter: (value: number | string) =>
            typeof value === 'number'
              ? isPercent
                ? `${(value * 100).toFixed(2)}%`
                : value.toFixed(2)
              : value
        }
      }
    })

  // 是否存在使用副轴（右侧）的叠加线，用于渲染量纲不同的指标（如市场宽度比例）
  const hasSecondaryAxisLine = (props.overlayLines || []).some(
    line => (line.yAxisIndex ?? 0) === 1 && Array.isArray(line.points) && line.points.length > 0
  )

// 生成交易信号标记
const generateTradeSignals = (signals: TradeSignal[], type: 'buy' | 'sell') => {
  // 确保signals是有效的数组
  if (!signals || !Array.isArray(signals) || signals.length === 0) {
    return []
  }
  
  // 对信号按日期排序，确保不会有重叠
  const sortedSignals = [...signals]
    .filter(signal => signal.type === type)
    .sort((a, b) => {
      const dateA = normalizeDate(a.date)
      const dateB = normalizeDate(b.date)
      return dateA.localeCompare(dateB)
    })
  
  // 记录已处理的日期，避免在同一天生成多个标记
  const processedDates = new Set()
  
  // 调试信息
  console.log(`生成${type}信号标记，数量:`, sortedSignals.length)
  if (type === 'sell') {
    console.log('卖出信号原始数据:', JSON.stringify(sortedSignals))
  }
  
  return sortedSignals
    .map(signal => {
      const idx = dateIndexMap.get(normalizeDate(signal.date))
      if (idx === undefined) {
        console.log(`信号日期${signal.date}不在K线数据范围内`)
        return null
      }
      
      // 如果同一天已经有标记，则跳过
      const dateKey = normalizeDate(signal.date)
      if (processedDates.has(dateKey)) {
        // 可以选择返回不同样式的标记，或者完全跳过
        console.log(`日期${signal.date}已有标记，跳过`)
        return null
      }
      processedDates.add(dateKey)
      
      const isBuy = type === 'buy'
      const priceOffset = isBuy ? 0.95 : 1.05 // 调整标记位置，避免被K线遮挡
      
      return {
        name: isBuy ? '买入点' : '卖出点',
        coord: [dates[idx], signal.price],
        symbol: 'arrow',
        symbolSize: 50,
        symbolRotate: isBuy ? 0 : 180,
        symbolOffset: [0, isBuy ? -100 : 20],
        value: signal.price,
        itemStyle: {
          color: isBuy ? '#FF0000' : '#00FF00',
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          color: '#fff',
          backgroundColor: 'rgba(255,0,0,0.7)' ,
          padding: [5, 10],
          borderRadius: 4,
          position: isBuy ? 'top' : 'bottom',
          formatter: isBuy ? `买入\n${signal.price.toFixed(2)}元` : `卖出\n${signal.price.toFixed(2)}元`,
          fontSize: 14,
          fontWeight: 'bold'
        },
        tooltip: {
          formatter: isBuy ? 
            `买入\n价格: ${signal.price.toFixed(2)}\n${signal.description || ''}` : 
            `卖出\n价格: ${signal.price.toFixed(2)}\n${signal.description || ''}`
        }
      }
    })
    .filter(v => v !== null)
}

// 确保每次更新时都重新生成交易信号
console.log('更新图表，交易信号数量:', props.tradeSignals.length)
console.log('交易信号详情:', JSON.stringify(props.tradeSignals))

const buySignals = generateTradeSignals(props.tradeSignals, 'buy')
const sellSignals = generateTradeSignals(props.tradeSignals, 'sell')

console.log('生成的买入信号数量:', buySignals.length)
console.log('生成的卖出信号数量:', sellSignals.length)
console.log('卖出信号详情:', JSON.stringify(sellSignals))
  
  // 准备图表选项
  const option: any = {
    title: {
      text: props.title || `${props.stockName}(${props.stockCode})K线图`,
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: (params: any) => {
        const date = params[0].axisValue
        let res = `<div style="font-weight:bold;margin-bottom:5px;">${date}</div>`

        // 记录使用百分比展示的叠加线名称，用于tooltip格式化
        const percentLineNames = new Set(
          (props.overlayLines || [])
            .filter(line => line.valueFormat === 'percent')
            .map(line => line.name)
        )

        params.forEach((param: any) => {
          const color = param.color
          const seriesName = param.seriesName
          const value = param.value

          if (seriesName === 'K线') {
            res += `<div style="color:${color};">${seriesName}</div>`
            res += `<div>开盘价: ${value[1]}</div>`
            res += `<div>收盘价: ${value[2]}</div>`
            res += `<div>最低价: ${value[4]}</div>`
            res += `<div>最高价: ${value[3]}</div>`
          } else if (value !== null && value !== undefined) {
            const numeric = Array.isArray(value) ? value[1] : value
            if (numeric === null || numeric === undefined) return
            const display = percentLineNames.has(seriesName)
              ? `${(Number(numeric) * 100).toFixed(2)}%`
              : Number(numeric).toFixed(2)
            res += `<div style="color:${color};">${seriesName}: ${display}</div>`
          }
        })

        return res
      }
    },
    legend: {
      show: overlayLineSeries.length > 0,
      top: 24,
      data: ['K线', ...overlayLineSeries.map(line => line.name)]
    },
    grid: {
      left: '10%',
      right: '10%',
      top: '15%',
      bottom: '15%'
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false }
    },
    yAxis: [
      {
        scale: true,
        splitArea: {
          show: true
        }
      },
      ...(hasSecondaryAxisLine
        ? [{
            type: 'value',
            scale: true,
            min: 0,
            max: 1,
            position: 'right',
            axisLabel: {
              formatter: (value: number) => `${(value * 100).toFixed(0)}%`
            },
            splitLine: { show: false }
          }]
        : [])
    ],
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        show: true,
        type: 'slider',
        bottom: '5%',
        start: 0,
        end: 100
      }
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: data.map(item => [item[0], item[1], item[3], item[2]]), // 开盘、收盘、最高、最低
        markLine: markLineData.length
          ? {
              symbol: 'none',
              silent: true,
              animation: false,
              data: markLineData
            }
          : undefined,
        markPoint: {
          symbol: 'arrow',
          symbolSize: 50,
          data: [...buySignals, ...sellSignals],
          clipByCoordinateSystem: false,
          silent: false,
          animation: false,
          avoidLabelOverlap: true,
          zlevel: 10,
          emphasis: {
            disabled: false
          },
          label: {
            fontSize: 14,
            fontWeight: 'bold',
            padding: [5, 10],
            borderRadius: 4,
            show: true,
            formatter: function(param: any) {
              // 确保卖出信号的标签正确显示
              if(param.data && param.data.name === '卖出点') {
                return `卖出\n${param.data.value.toFixed(2)}元`;
              } else if(param.data && param.data.name === '买入点') {
                return `买入\n${param.data.value.toFixed(2)}元`;
              }
              return param.data?.value || param.name;
            }
          },
          itemStyle: {
            borderWidth: 2,
            borderColor: '#fff',
            color: function(param: any) {
              // 确保卖出信号为绿色，买入信号为红色
              if (param.data?.name === '卖出点') return '#00FF00'
              if (param.data?.name === '买入点') return '#FF0000'
              return param.data?.itemStyle?.color || '#6b7280'
            }
          }
        },
        itemStyle: {
          color: '#ec0000',
          color0: '#00da3c',
          borderColor: '#8A0000',
          borderColor0: '#008F28'
        }
      },
      ...overlayLineSeries
    ]
  }
  
  // 设置图表选项
  chart.setOption(option, true)
}

// 处理窗口大小变化
const handleResize = () => {
  chart?.resize()
}

// 监听属性变化
watch(
  [() => props.klineData, () => props.tradeSignals, () => props.eventLines, () => props.overlayLines, () => props.patternMarkers],
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { deep: true, immediate: true }
)

// 专门监听交易信号变化
watch(
  () => props.tradeSignals,
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { deep: true, immediate: true }
)

watch(
  () => props.eventLines,
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { deep: true, immediate: true }
)

watch(
  () => props.overlayLines,
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { deep: true, immediate: true }
)

watch(
  () => props.patternMarkers,
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { deep: true, immediate: true }
)

// 组件挂载和卸载
onMounted(() => {
  nextTick(() => {
    initChart()
  })
})

onUnmounted(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.stock-kline-chart-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  box-sizing: border-box;
}

.chart-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: bold;
}

.chart-container {
  width: 100%;
  height: v-bind('props.height');
}
</style>

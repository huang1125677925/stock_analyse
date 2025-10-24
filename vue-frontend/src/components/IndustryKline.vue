<template>
  <div class="industry-kline">
    <div class="chart-header">
      <h3 v-if="title">{{ title }}</h3>
      <div class="chart-subtitle" v-if="sectorName">
        行业板块：{{ sectorName }}（代码：{{ industryCode }}）
      </div>
    </div>
    <div ref="chartRef" class="chart-container"></div>
    <el-empty v-if="!loading && klineData.length === 0" description="暂无数据" />
  </div>
</template>

<script setup lang="ts">
/**
 * 组件：IndustryKline
 * 功能：
 * - 展示指定行业板块的日频K线图，采用 ECharts candlestick-brush 示例的交互（缩放、刷选）。
 * - 同时展示成交量柱状图。
 * 
 * 参数（Props）：
 * - industryCode: string (必传) 行业板块代码，例如 "BK0001"
 * - title?: string 图表标题
 * - height?: string 图表高度，默认 "600px"
 * 
 * 返回值：无
 * 事件：无
 */
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { getIndustrySectorDaily, type IndustrySectorDailyItem } from '@/services/industryApi'

interface Props {
  industryCode: string
  title?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '行业K线图',
  height: '600px'
})

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const loading = ref(false)
const sectorName = ref('')
const klineData = ref<IndustrySectorDailyItem[]>([])

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  if (chart) chart.dispose()
  chart = echarts.init(chartRef.value)
  updateChart()
  window.addEventListener('resize', handleResize)
}

// 更新图表
const updateChart = () => {
  if (!chart) return

  const data = klineData.value
  if (!data || data.length === 0) {
    chart.clear()
    return
  }

  const dates = data.map(d => formatDate(d.date))
  const values = data.map(d => [d.open_price, d.close_price, d.low_price, d.high_price])
  const volumes = data.map(d => d.total_volume || 0)

  const option: echarts.EChartsOption = {
    animation: false,
    title: {
      text: props.title,
      left: 'center'
    },
    legend: {
      data: ['K线', '成交量'],
      left: 'left'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    toolbox: {
      feature: {
        brush: { type: ['lineX', 'clear'] },
        saveAsImage: {},
        dataZoom: { yAxisIndex: false }
      }
    },
    axisPointer: {
      link: [{ xAxisIndex: [0, 1] }]
    },
    grid: [
      { left: '10%', right: '8%', top: '10%', height: '55%' },
      { left: '10%', right: '8%', top: '72%', height: '18%' }
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      },
      {
        type: 'category',
        gridIndex: 1,
        data: dates,
        boundaryGap: false,
        axisLine: { onZero: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      }
    ],
    yAxis: [
      {
        scale: true,
        splitArea: { show: true }
      },
      {
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: true },
        axisLine: { show: true },
        axisTick: { show: true },
        splitLine: { show: false }
      }
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1], start: 0, end: 100 },
      { show: true, xAxisIndex: [0, 1], type: 'slider', top: '90%', start: 0, end: 100 }
    ],
    brush: {
      xAxisIndex: 'all',
      brushLink: 'all',
      outOfBrush: { colorAlpha: 0.1 }
    },
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: values,
        itemStyle: {
          color: '#ec0000',
          color0: '#00da3c',
          borderColor: '#8A0000',
          borderColor0: '#008F28'
        }
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumes,
        itemStyle: { color: '#7fbe9e' }
      }
    ]
  }

  chart.setOption(option, true)
}

// 获取数据
const fetchData = async () => {
  if (!props.industryCode) return
  loading.value = true
  try {
    const res = await getIndustrySectorDaily(props.industryCode)
    sectorName.value = res.sector_name
    klineData.value = (res.daily_data || []).sort((a, b) => (a.date > b.date ? 1 : -1))
    nextTick(updateChart)
  } catch (e: unknown) {
    console.error(e)
    ElMessage.error('获取行业K线数据失败')
  } finally {
    loading.value = false
  }
}

// 辅助：格式化日期（兼容 YYYYMMDD/YYYY-MM-DD）
const formatDate = (s: string) => {
  const ns = s.replace(/[^0-9]/g, '')
  if (ns.length === 8) return `${ns.slice(0, 4)}-${ns.slice(4, 6)}-${ns.slice(6, 8)}`
  return s
}

// 事件：窗口大小自适应
const handleResize = () => chart?.resize()

watch(() => props.industryCode, () => {
  fetchData()
})

onMounted(() => {
  nextTick(() => {
    initChart()
    fetchData()
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

<style scoped lang="scss">
.industry-kline {
  width: 100%;
  box-sizing: border-box;
}

.chart-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;

  h3 {
    margin: 0 0 6px 0;
    font-size: 18px;
    font-weight: bold;
  }

  .chart-subtitle {
    color: #606266;
    font-size: 13px;
  }
}

.chart-container {
  width: 100%;
  height: v-bind('props.height');
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}
</style>
<template>
  <div class="index-volume-trend">
    <div class="chart-header">
      <h3></h3>
      <div class="chart-controls">
        <el-select v-model="range" placeholder="时间范围" style="width: 160px" @change="reload">
          <el-option label="近一年" value="1y" />
          <el-option label="近三年" value="3y" />
          <el-option label="近五年" value="5y" />
        </el-select>
      </div>
    </div>
    <div ref="chartRef" class="chart" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { fetchIndexDailyVolume, type IndexDailyVolumeItem } from '@/services/indexDailyApi'

interface Props {
  tsCode?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  tsCode: '000001.SH',
  height: '420px'
})

const range = ref<'1y' | '3y' | '5y'>('1y')
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

function formatToYYYYMMDD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function computeDateRange(): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  const years = range.value === '1y' ? 1 : range.value === '3y' ? 3 : 5
  start.setFullYear(end.getFullYear() - years)
  return { start: formatToYYYYMMDD(start), end: formatToYYYYMMDD(end) }
}

async function reload() {
  try {
    const { start, end } = computeDateRange()
    const data: IndexDailyVolumeItem[] = await fetchIndexDailyVolume(props.tsCode, start, end)
    renderChart(data)
  } catch (error) {
    console.error('加载指数成交量失败:', error)
    ElMessage.error('加载指数成交量失败')
  }
}

function renderChart(data: IndexDailyVolumeItem[]) {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)

  const dates = data.map(d => d.date)
  const volumes = data.map(d => d.volume)
  const amounts = data.map(d => (d.amount != null ? Number(d.amount) : null))
  const closes = data.map(d => (d.close != null ? Number(d.close) : null))

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const idx = params[0]?.dataIndex ?? 0
        const amt = amounts[idx]
        const cls = closes[idx]
        return `日期: ${dates[idx]}<br/>成交量: ${volumes[idx]}<br/>成交额: ${amt ?? '-'}<br/>收盘价: ${cls ?? '-'}`
      }
    },
    legend: { data: ['成交量', '成交额', '收盘价'], top: 0 },
    grid: { left: 50, right: 70, top: 30, bottom: 40 },
    xAxis: { type: 'category', data: dates, axisLabel: { rotate: 45 } },
    yAxis: [
      { type: 'value', name: '成交量/成交额', position: 'left' },
      { type: 'value', name: '收盘价', position: 'right' }
    ],
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100 }
    ],
    series: [
      {
        name: '成交量',
        type: 'bar',
        data: volumes,
        itemStyle: { color: '#E6A23C' }
      },
      {
        name: '成交额',
        type: 'line',
        yAxisIndex: 0,
        data: amounts,
        smooth: true,
        lineStyle: { color: '#409EFF' }
      },
      {
        name: '收盘价',
        type: 'line',
        yAxisIndex: 1,
        data: closes,
        smooth: true,
        lineStyle: { color: '#67C23A' }
      }
    ]
  }

  chart.setOption(option)
}

function handleResize() {
  chart?.resize()
}

onMounted(() => {
  reload()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})

// 监听指数代码变化，自动刷新图表
watch(() => props.tsCode, () => {
  reload()
})
</script>

<style scoped>
.index-volume-trend {
  background: #fff;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart {
  width: 100%;
  height: v-bind(height);
  margin-top: 16px;
}
</style>
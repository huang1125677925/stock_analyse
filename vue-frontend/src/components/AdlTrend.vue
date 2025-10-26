<template>
  <el-card shadow="hover" class="adl-trend">
    <div class="header">
      <h2>腾落指标（ADL）趋势</h2>
      <span class="subtitle">区间默认最近{{ days }}个交易日</span>
    </div>
    <div ref="chartRef" class="chart"></div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { fetchAdl, type AdlResponseData } from '@/services/marketBreadthAnalysisApi'

// Props
interface Props {
  days?: number
  startDate?: string
  endDate?: string
}

const props = withDefaults(defineProps<Props>(), {
  days: 30,
  startDate: undefined,
  endDate: undefined
})

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const loadData = async () => {
  try {
    const data: AdlResponseData = await fetchAdl({ days: props.days, start_date: props.startDate, end_date: props.endDate })
    const dates = data.adl.map(d => d.date)
    const dailyDiff = data.adl.map(d => Number(d.daily_diff))
    const adlCum = data.adl.map(d => Number(d.adl_cumulative))

    if (!chartRef.value) return
    if (!chart) chart = echarts.init(chartRef.value)

    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['每日差值', 'ADL累计'], top: 8 },
      grid: { left: 50, right: 50, top: 70, bottom: 40 },
      xAxis: { type: 'category', data: dates },
      yAxis: [
        { type: 'value', name: '每日差值', position: 'left' },
        { type: 'value', name: 'ADL累计', position: 'right' }
      ],
      series: [
        {
          name: '每日差值',
          type: 'bar',
          data: dailyDiff,
          itemStyle: { color: '#4a7bd0' }
        },
        {
          name: 'ADL累计',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          data: adlCum,
          itemStyle: { color: '#c23531' },
          lineStyle: { width: 2 }
        }
      ]
    }

    chart.setOption(option)
    window.addEventListener('resize', handleResize)
  } catch (err) {
    console.error(err)
    ElMessage.error('获取ADL数据失败，请稍后重试')
  }
}

const handleResize = () => chart?.resize()

onMounted(loadData)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})

watch(() => [props.days, props.startDate, props.endDate], () => {
  loadData()
})
</script>

<style scoped>
.adl-trend .header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}
.adl-trend .header h2 { margin: 0; font-size: 18px; }
.adl-trend .header .subtitle { color: #909399; font-size: 12px; }
.chart { width: 100%; height: 360px; }
</style>
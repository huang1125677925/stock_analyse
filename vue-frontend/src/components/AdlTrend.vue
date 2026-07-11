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
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { fetchAdl, type AdlResponseData } from '@/services/marketBreadthAnalysisApi'
import { useIsMobile } from '@/composables/useIsMobile'

const { isMobile } = useIsMobile()

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

    const mobile = isMobile.value
    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'axis', confine: true },
      legend: { data: ['每日差值', 'ADL累计'], type: 'scroll', top: 8 },
      grid: mobile
        ? { left: 42, right: 42, top: 64, bottom: 56, containLabel: true }
        : { left: 50, right: 50, top: 70, bottom: 40, containLabel: true },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { rotate: mobile ? 45 : 0, hideOverlap: true, interval: 'auto', fontSize: mobile ? 10 : 12 }
      },
      yAxis: [
        { type: 'value', name: '每日差值', position: 'left', nameTextStyle: { fontSize: mobile ? 10 : 12 } },
        { type: 'value', name: 'ADL累计', position: 'right', nameTextStyle: { fontSize: mobile ? 10 : 12 } }
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

    chart.setOption(option, true)
  } catch (err) {
    console.error(err)
    ElMessage.error('获取ADL数据失败，请稍后重试')
  }
}

const handleResize = () => chart?.resize()

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

// 断点切换时重算 option
watch(isMobile, () => {
  if (chart) {
    loadData()
    nextTick(() => chart?.resize())
  }
})

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
@media (max-width: 768px) {
  .chart { height: 300px; }
  .adl-trend .header { flex-direction: column; align-items: flex-start; gap: 2px; }
  .adl-trend .header h2 { font-size: 16px; }
}
</style>
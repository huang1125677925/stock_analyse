<template>
  <el-card shadow="hover" class="adr-trend">
    <div class="header">
      <h2>涨跌家数比（ADR）趋势</h2>
      <span class="subtitle">区间默认最近{{ days }}个交易日</span>
    </div>
    <div class="counts">
      <span>上涨：{{ advSum }}</span>
      <span>下跌：{{ declSum }}</span>
      <span>平：{{ flatSum }}</span>
    </div>
    <div ref="chartRef" class="chart"></div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { fetchAdr, type AdrResponseData } from '@/services/marketBreadthAnalysisApi'

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

const advSum = ref<number>(0)
const declSum = ref<number>(0)
const flatSum = ref<number>(0)

const loadData = async () => {
  try {
    const data: AdrResponseData = await fetchAdr({ days: props.days, start_date: props.startDate, end_date: props.endDate })
    const dates = data.daily.map(d => d.date)
    const adrValues = data.daily.map(d => (d.daily_adr == null ? null : Number(d.daily_adr)))
    const [typicalMin, typicalMax] = data.aggregated.typical_range

    // 每日上涨/下跌/平家数序列
    const advCounts = data.daily.map(d => Number(d.adv_count))
    const declCounts = data.daily.map(d => Number(d.decl_count))
    const flatCounts = data.daily.map(d => Number(d.flat_count))

    // 汇总上涨/下跌/平数量（总计）
    advSum.value = data.aggregated.adv_sum
    declSum.value = data.aggregated.decl_sum
    flatSum.value = data.daily.reduce((sum, d) => sum + (d.flat_count || 0), 0)

    if (!chartRef.value) return
    if (!chart) chart = echarts.init(chartRef.value)

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const date = params?.[0]?.axisValueLabel || ''
          const adrItem = params.find((p: any) => p.seriesName === 'ADR')
          const advItem = params.find((p: any) => p.seriesName === '上涨家数')
          const declItem = params.find((p: any) => p.seriesName === '下跌家数')
          const flatItem = params.find((p: any) => p.seriesName === '平家数')
          const adrStr = adrItem ? `ADR：${(adrItem.data == null ? '-' : Number(adrItem.data).toFixed(4))}` : ''
          const advStr = advItem ? `上涨家数：${advItem.data}` : ''
          const declStr = declItem ? `下跌家数：${declItem.data}` : ''
          const flatStr = flatItem ? `平家数：${flatItem.data}` : ''
          return [date, adrStr, advStr, declStr, flatStr].filter(Boolean).join('<br/>')
        }
      },
      legend: { data: ['ADR', '上涨家数', '下跌家数', '平家数', '典型区间'], top: 8 },
      grid: { left: 48, right: 24, top: 80, bottom: 48 },
      xAxis: { type: 'category', data: dates },
      yAxis: [
        {
          type: 'value',
          name: 'ADR',
          position: 'left',
          min: (val) => Math.min(typicalMin, Math.floor(val.min * 10) / 10),
          max: (val) => Math.max(typicalMax, Math.ceil(val.max * 10) / 10)
        },
        {
          type: 'value',
          name: '家数',
          position: 'right'
        }
      ],
      series: [
        {
          name: 'ADR',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          showSymbol: false,
          data: adrValues,
          lineStyle: { width: 2 },
          itemStyle: { color: '#4a7bd0' },
          connectNulls: true,
          z: 3
        },
        {
          name: '上涨家数',
          type: 'bar',
          yAxisIndex: 1,
          stack: 'counts',
          data: advCounts,
          itemStyle: { color: '#F56C6C' },
          barMaxWidth: 28,
          z: 2
        },
        {
          name: '下跌家数',
          type: 'bar',
          yAxisIndex: 1,
          stack: 'counts',
          data: declCounts,
          itemStyle: { color: '#67C23A' },
          barMaxWidth: 28,
          z: 2
        },
        {
          name: '平家数',
          type: 'bar',
          yAxisIndex: 1,
          stack: 'counts',
          data: flatCounts,
          itemStyle: { color: '#909399' },
          barMaxWidth: 28,
          z: 2
        },
        {
          name: '典型区间',
          type: 'line',
          data: [],
          markArea: {
            itemStyle: { color: 'rgba(255, 193, 7, 0.15)' },
            data: [
              [
                { yAxis: typicalMin },
                { yAxis: typicalMax }
              ]
            ]
          },
          z: 1
        }
      ]
    }

    chart.setOption(option)
    window.addEventListener('resize', handleResize)
  } catch (err) {
    console.error(err)
    ElMessage.error('获取ADR数据失败，请稍后重试')
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
.adr-trend .header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 6px;
}
.adr-trend .header h2 { margin: 0; font-size: 18px; }
.adr-trend .header .subtitle { color: #909399; font-size: 12px; }
.counts { color: #606266; font-size: 12px; margin: 6px 0 8px; display: flex; gap: 16px; }
.chart { width: 100%; height: 380px; }
</style>
<template>
  <div class="industry-scale-breadth-panel">
    <el-row :gutter="16">
      <el-col :span="24">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span v-if="panelType === 'breadth'">行业规模宽度指标</span>
              <span v-else>行业产出与营收（亿元）</span>
              <div class="header-actions">
                <span class="tips" v-if="panelType === 'breadth'">按排序指标展示重点行业，可拖动右侧缩放条查看更多</span>
                <span class="tips" v-else>展示：top_n_revenue_sum、estimated_industry_output（全行业）</span>
                <el-select v-if="panelType === 'breadth'" v-model="breadthSortMetric" size="small" class="sort-select" @change="onBreadthSortChange">
                  <el-option label="按规模宽度" value="scale_breadth" />
                  <el-option label="按总市值占比" value="market_cap_ratio" />
                  <el-option label="按公司数量占比" value="company_ratio" />
                </el-select>
                <el-select v-else v-model="outputSortMetric" size="small" class="sort-select" @change="onOutputSortChange">
                  <el-option label="按估算行业总产出" value="estimated_industry_output" />
                  <el-option label="按TopN营收总和" value="top_n_revenue_sum" />
                </el-select>
              </div>
            </div>
          </template>
          <div v-if="panelType === 'breadth'" ref="breadthChartRef" class="chart"></div>
          <div v-else ref="barChartRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
/**
 * 行业规模宽度面板组件
 * 功能：
 * - 通过后端接口获取全行业数据，展示横向柱状图（bar-y-category 风格）
 * - 在各自视图内支持选择排序指标，默认降序（从大到小）
 * - 监听窗口 resize 事件，确保在 Tab 切换后图表自适应尺寸
 * 
 * 返回值：无
 * 事件：无
 */
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { fetchIndustryScaleBreadth, fetchIndustryActualOutput, type IndustryScaleBreadthItem, type IndustryActualOutputItem } from '@/services/strategyBreadthApi'

interface Props { panelType?: 'breadth' | 'output' }
const props = withDefaults(defineProps<Props>(), { panelType: 'breadth' })

const panelType = props.panelType

const breadthChartRef = ref<HTMLDivElement>()
const barChartRef = ref<HTMLDivElement>()
let breadthChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null

const scaleItems = ref<IndustryScaleBreadthItem[]>([])
const outputItems = ref<IndustryActualOutputItem[]>([])
const loading = ref(false)

// 排序指标（各视图独立）
const breadthMetricKeys = ['scale_breadth', 'market_cap_ratio', 'company_ratio'] as const
type BreadthMetricKey = typeof breadthMetricKeys[number]
const breadthSortMetric = ref<BreadthMetricKey>('scale_breadth')

const outputMetricKeys = ['estimated_industry_output', 'top_n_revenue_sum'] as const
type OutputMetricKey = typeof outputMetricKeys[number]
const outputSortMetric = ref<OutputMetricKey>('estimated_industry_output')

function getBreadthMetricValue(item: IndustryScaleBreadthItem, key: BreadthMetricKey): number {
  // 保证参与排序的值为有效数字，避免出现 NaN 导致排序失效（升序看起来像默认顺序）
  return Number(item[key] ?? 0)
}

function getOutputMetricValue(item: IndustryActualOutputItem | undefined, key: OutputMetricKey): number {
  if (!item) return 0
  // 与上同理，统一转成数字，避免 undefined/字符串 等导致比较异常
  return Number(item[key] ?? 0)
}

function getSortedItemsForBreadth(): IndustryScaleBreadthItem[] {
  const list = scaleItems.value
  const key = breadthSortMetric.value
  // 明确使用降序（从大到小）
  return [...list].sort((a, b) => getBreadthMetricValue(b, key) - getBreadthMetricValue(a, key))
}

function getSortedItemsForOutput(): IndustryActualOutputItem[] {
  const list = outputItems.value
  const key = outputSortMetric.value
  // 明确使用降序（从大到小）
  return [...list].sort((a, b) => getOutputMetricValue(b, key) - getOutputMetricValue(a, key))
}

function initCharts() {
  if (panelType === 'breadth') {
    if (breadthChartRef.value) {
      if (breadthChart) breadthChart.dispose()
      breadthChart = echarts.init(breadthChartRef.value)
    }
  } else {
    if (barChartRef.value) {
      if (barChart) barChart.dispose()
      barChart = echarts.init(barChartRef.value)
    }
  }
}

// 动态计算图表高度
function calculateChartHeight(itemCount: number): number {
  // 参考HeatmapChart的计算方式：最小高度500px，每个行业22px高度，加上120px的边距
  return Math.max(500, itemCount * 22 + 120)
}

function calculateCompactChartHeight(): number {
  if (typeof window === 'undefined') return 560
  return Math.max(480, Math.min(620, window.innerHeight - 260))
}

function renderBreadthChart() {
  if (!breadthChart) return
  const items = getSortedItemsForBreadth()
  const categories = items.map(i => i.sector_name)
  const marketCapSeries = items.map(i => i.market_cap_ratio)
  const companyRatioSeries = items.map(i => i.company_ratio)
  const scaleBreadthSeries = items.map(i => i.scale_breadth)
  
  const chartHeight = calculateCompactChartHeight()
  if (breadthChartRef.value) {
    breadthChartRef.value.style.height = `${chartHeight}px`
  }

  const visibleCount = Math.min(32, items.length)
  const endPercent = items.length > 0 ? Math.min(100, (visibleCount / items.length) * 100) : 100
  
  const option: echarts.EChartsOption = {
    legend: {
      top: 0,
      left: 0,
      itemWidth: 10,
      itemHeight: 8,
      textStyle: { fontSize: 12 }
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any) => {
      const lines = p.map((x: any) => `${x.seriesName}: ${(x.value * 100).toFixed(2)}%`)
      return `${p[0].name}<br/>${lines.join('<br/>')}`
    } },
    grid: { left: 96, right: 42, top: 36, bottom: 28, containLabel: true },
    xAxis: {
      type: 'value',
      boundaryGap: [0, 0.01],
      axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%`, fontSize: 11 },
      splitLine: { lineStyle: { type: 'dashed', color: '#ebeef5' } }
    },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
      axisTick: { show: false },
      axisLabel: {
        fontSize: 11,
        width: 86,
        overflow: 'truncate'
      }
    },
    dataZoom: [
      {
        type: 'inside',
        yAxisIndex: 0,
        start: 0,
        end: endPercent,
        zoomOnMouseWheel: false,
        moveOnMouseWheel: true,
        moveOnMouseMove: true
      },
      {
        type: 'slider',
        yAxisIndex: 0,
        right: 4,
        width: 14,
        start: 0,
        end: endPercent,
        brushSelect: false,
        showDetail: false
      }
    ],
    series: [
      { name: '总市值占比', type: 'bar', data: marketCapSeries, barWidth: 7, barGap: '35%' },
      { name: '公司数占比', type: 'bar', data: companyRatioSeries, barWidth: 7, barGap: '35%' },
      { name: '规模宽度', type: 'bar', data: scaleBreadthSeries, barWidth: 7, barGap: '35%' }
    ]
  }
  breadthChart.setOption(option)
  breadthChart.resize()
}

function renderOutputChart() {
  if (!barChart) return
  const items = getSortedItemsForOutput()
  const categories = items.map(i => i.sector_name)
  const revenueSeries = items.map(i => (i.top_n_revenue_sum || 0) / 1e8)
  const estimatedOutputSeries = items.map(i => (i.estimated_industry_output || 0) / 1e8)
  
  // 动态调整图表容器高度
  const chartHeight = calculateChartHeight(items.length)
  if (barChartRef.value) {
    barChartRef.value.style.height = `${chartHeight}px`
  }
  
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any) => {
      const lines = p.map((x: any) => `${x.seriesName}: ${x.value.toFixed(2)} 亿元`)
      return `${p[0].name}<br/>${lines.join('<br/>')}`
    } },
    grid: { left: 100, right: 10, top: 12, bottom: 40 },
    xAxis: { type: 'value', boundaryGap: [0, 0.01] },
    yAxis: { type: 'category', data: categories, inverse: true },
    series: [
      { name: 'top_n_revenue_sum', type: 'bar', data: revenueSeries, barWidth: 8 },
      { name: 'estimated_industry_output', type: 'bar', data: estimatedOutputSeries, barWidth: 8 }
    ]
  }
  barChart.setOption(option)
  barChart.resize()
}

function onBreadthSortChange() {
  renderBreadthChart()
  handleResize()
}

function onOutputSortChange() {
  renderOutputChart()
  handleResize()
}

// 处理窗口尺寸变化
function handleResize() {
  if (panelType === 'breadth') {
    renderBreadthChart()
  }
  breadthChart?.resize()
  barChart?.resize()
}

async function loadData() {
  loading.value = true
  try {
    if (panelType === 'breadth') {
      const scaleRes = await fetchIndustryScaleBreadth()
      console.log(scaleRes)
      scaleItems.value = Array.isArray(scaleRes.data) ? scaleRes.data : []
    } else {
      const outputRes = await fetchIndustryActualOutput(undefined, 3)
      outputItems.value = Array.isArray(outputRes.data) ? outputRes.data : []
    }
    if (panelType === 'breadth') {
      renderBreadthChart()
    } else {
      renderOutputChart()
    }
    handleResize()
  } catch (err) {
    console.error('加载行业规模宽度/实际产出数据失败:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  initCharts()
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
.industry-scale-breadth-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
  }
  .tips { color: #999; font-size: 12px; }
  .sort-select { width: 180px; }
  .chart { width: 100%; min-height: 500px; }
}
</style>

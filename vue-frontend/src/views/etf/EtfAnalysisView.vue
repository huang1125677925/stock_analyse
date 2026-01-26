<template>
  <div class="etf-analysis-view">
    <div class="page-header">
      <h2>ETF 数据统计分析</h2>
      <el-button type="primary" :loading="loading" @click="fetchData">刷新数据</el-button>
    </div>

    <div v-loading="loading" class="charts-container">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>交易所分布</span>
              </div>
            </template>
            <div ref="exchangeChartRef" class="chart"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>上市状态分布</span>
              </div>
            </template>
            <div ref="statusChartRef" class="chart"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mt-20">
        <el-col :span="24">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>上市数量趋势 (按月)</span>
              </div>
            </template>
            <div ref="listDateChartRef" class="chart"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mt-20">
        <el-col :span="24">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>ETF类型分布</span>
              </div>
            </template>
            <div ref="typeChartRef" class="chart"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mt-20">
        <el-col :span="24">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>基金管理人分布 (Top 20)</span>
              </div>
            </template>
            <div ref="mgrChartRef" class="chart" style="height: 500px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mt-20">
        <el-col :span="24">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>跟踪指数分布 (Top 20)</span>
              </div>
            </template>
            <div ref="indexChartRef" class="chart" style="height: 500px;"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称: EtfAnalysisView
 * 功能描述: ETF数据统计分析页面
 * 
 * 功能点:
 * 1. 交易所分布饼图
 * 2. 上市状态分布饼图
 * 3. 上市数量趋势 (按月) 折线图
 * 4. ETF类型分布柱状图
 * 5. 基金管理人分布 (Top 20)
 * 6. 跟踪指数分布 (Top 20)
 * 
 * 依赖接口:
 * - getEtfBasic: 获取ETF基础数据列表
 */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getEtfBasic, type EtfBasicItem } from '@/services/etfApi'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const items = ref<EtfBasicItem[]>([])

const exchangeChartRef = ref<HTMLElement>()
const statusChartRef = ref<HTMLElement>()
const listDateChartRef = ref<HTMLElement>()
const typeChartRef = ref<HTMLElement>()
const mgrChartRef = ref<HTMLElement>()
const indexChartRef = ref<HTMLElement>()

let exchangeChart: echarts.ECharts | null = null
let statusChart: echarts.ECharts | null = null
let listDateChart: echarts.ECharts | null = null
let typeChart: echarts.ECharts | null = null
let mgrChart: echarts.ECharts | null = null
let indexChart: echarts.ECharts | null = null

const fetchData = async () => {
  loading.value = true
  try {
    // 获取全量数据用于分析
    const data = await getEtfBasic({
      page: 1,
      page_size: 10000 // 足够大的页大小以获取所有数据
    })
    if (data.data) {
      items.value = data.data
      updateCharts()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '获取数据失败')
  } finally {
    loading.value = false
  }
}

const processDistribution = (key: keyof EtfBasicItem) => {
  const map = new Map<string, number>()
  items.value.forEach(item => {
    const val = String(item[key] || '未知')
    map.set(val, (map.get(val) || 0) + 1)
  })
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

const processTimeTrend = (key: keyof EtfBasicItem) => {
  const map = new Map<string, number>()
  items.value.forEach(item => {
    const dateStr = String(item[key] || '')
    // 假设格式为 YYYYMMDD，截取前6位 YYYYMM
    if (dateStr && dateStr.length >= 6) {
      const month = dateStr.substring(0, 6)
      map.set(month, (map.get(month) || 0) + 1)
    }
  })
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name)) // 按时间正序排列
}

const updateCharts = async () => {
  await nextTick()
  
  if (!exchangeChart && exchangeChartRef.value) exchangeChart = echarts.init(exchangeChartRef.value)
  if (!statusChart && statusChartRef.value) statusChart = echarts.init(statusChartRef.value)
  if (!listDateChart && listDateChartRef.value) listDateChart = echarts.init(listDateChartRef.value)
  if (!typeChart && typeChartRef.value) typeChart = echarts.init(typeChartRef.value)
  if (!mgrChart && mgrChartRef.value) mgrChart = echarts.init(mgrChartRef.value)
  if (!indexChart && indexChartRef.value) indexChart = echarts.init(indexChartRef.value)

  // 1. 交易所分布
  const exchangeData = processDistribution('exchange')
  exchangeChart?.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%', left: 'center' },
    series: [{
      name: '交易所',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
      data: exchangeData
    }]
  })

  // 2. 上市状态分布
  const statusMap: Record<string, string> = { 'L': '上市', 'D': '退市', 'P': '暂停' }
  const statusData = processDistribution('list_status').map(item => ({
    ...item,
    name: statusMap[item.name] || item.name
  }))
  statusChart?.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%', left: 'center' },
    series: [{
      name: '状态',
      type: 'pie',
      radius: '50%',
      data: statusData,
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
    }]
  })

  // 3. 上市数量趋势 (按月)
  const listDateData = processTimeTrend('list_date')
  listDateChart?.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: { type: 'category', data: listDateData.map(i => i.name) },
    yAxis: { type: 'value' },
    dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 0 }],
    series: [{
      name: '上市数量',
      type: 'line',
      smooth: true,
      data: listDateData.map(i => i.value),
      itemStyle: { color: '#EE6666' },
      areaStyle: { opacity: 0.3 }
    }]
  })

  // 4. ETF类型分布
  const typeData = processDistribution('etf_type')
  typeChart?.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: typeData.map(i => i.name), axisLabel: { interval: 0, rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{
      name: '数量',
      type: 'bar',
      data: typeData.map(i => i.value),
      itemStyle: { color: '#5470C6' }
    }]
  })

  // 5. 管理人分布 (Top 20)
  const mgrData = processDistribution('mgr_name').slice(0, 20)
  mgrChart?.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: mgrData.map(i => i.name), axisLabel: { interval: 0, rotate: 45 } },
    yAxis: { type: 'value' },
    series: [{
      name: '管理基金数量',
      type: 'bar',
      data: mgrData.map(i => i.value),
      itemStyle: { color: '#91CC75' }
    }]
  })

  // 6. 跟踪指数分布 (Top 20)
  const indexMap = new Map<string, number>()
  items.value.forEach(item => {
    const name = item.index_name || item.index_code || '未知'
    indexMap.set(name, (indexMap.get(name) || 0) + 1)
  })
  const indexData = Array.from(indexMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)

  indexChart?.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true }, // 增加底部空间给长标签
    xAxis: { 
      type: 'category', 
      data: indexData.map(i => i.name), 
      axisLabel: { interval: 0, rotate: 45, width: 100, overflow: 'truncate' } 
    },
    yAxis: { type: 'value' },
    series: [{
      name: '跟踪基金数量',
      type: 'bar',
      data: indexData.map(i => i.value),
      itemStyle: { color: '#FAC858' }
    }]
  })
}

const handleResize = () => {
  exchangeChart?.resize()
  statusChart?.resize()
  listDateChart?.resize()
  typeChart?.resize()
  mgrChart?.resize()
  indexChart?.resize()
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  exchangeChart?.dispose()
  statusChart?.dispose()
  listDateChart?.dispose()
  typeChart?.dispose()
  mgrChart?.dispose()
  indexChart?.dispose()
})
</script>

<style scoped>
.etf-analysis-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.mt-20 {
  margin-top: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.chart {
  height: 400px;
  width: 100%;
}
</style>

<template>
  <div class="index-dailybasic-view">
    <el-card class="page-header" shadow="hover">
      <template #header>
        <div class="header-content">
          <h2>大盘指数估值</h2>
          <div class="actions">
            <el-button type="primary" :loading="loading" @click="handleSearch">查询</el-button>
            <el-button @click="resetForm">重置</el-button>
          </div>
        </div>
      </template>
      <div class="search-section">
        <el-form :inline="true" :model="form" class="query-form">
          <el-form-item label="指数代码">
            <el-select v-model="form.tsCode" placeholder="请选择指数代码" style="width: 200px">
              <el-option
                v-for="item in indexOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="指标">
            <el-select v-model="selectedMetric" placeholder="请选择展示指标" style="width: 200px" @change="updateChart">
              <el-option
                v-for="item in metricOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="日期范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYYMMDD"
              :shortcuts="dateShortcuts"
            />
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <div class="chart-section">
      <el-card>
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <span>趋势图（{{ totalCount }} 条数据）</span>
              <el-tag v-if="currentValuation" :type="currentValuation.type" effect="dark" class="valuation-tag">
                当前{{ metricOptions.find(opt => opt.value === selectedMetric)?.label || selectedMetric }}分位: {{ currentValuation.percentile.toFixed(2) }}% - {{ currentValuation.status }}
              </el-tag>
            </div>
            <el-button link @click="refreshData">刷新</el-button>
          </div>
        </template>
        <div ref="chartRef" class="chart-container" style="width: 100%; height: 500px;"></div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：IndexDailybasicView
 * 功能：
 * - 查询并展示 `/django/api/tasks/index-dailybasic/` 的指数每日基础指标数据
 * - 提供指数代码和日期范围筛选
 * - 使用 ECharts 展示数据趋势
 * 参数（props）：无
 * 返回值：无
 * 事件（emits）：
 * - loaded: 数据加载完成时触发，传递记录数
 */
import { ref, reactive, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchIndexDailybasic, type IndexDailybasicItem } from '@/services/indexDailybasicApi'
import * as echarts from 'echarts'

// emits：对外发出 loaded 事件
const emit = defineEmits<{ (e: 'loaded', count: number): void }>()

// 加载状态
const loading = ref(false)

// 指数代码选项
const indexOptions = [
  { label: '上证综指', value: '000001.SH' },
  { label: '沪深300', value: '000300.SH' },
  { label: '中证500', value: '000905.SH' },
  { label: '深证成指', value: '399001.SZ' },
  { label: '中小板指', value: '399005.SZ' },
  { label: '创业板指', value: '399006.SZ' },
  { label: '深证创新', value: '399016.SZ' },
  { label: '沪深300(深)', value: '399300.SZ' },
]

// 指标选项
const metricOptions = [
  { label: 'PE (市盈率)', value: 'pe' },
  { label: 'PE TTM (滚动市盈率)', value: 'pe_ttm' },
  { label: 'PB (市净率)', value: 'pb' },
  { label: '总市值', value: 'total_mv' },
  { label: '流通市值', value: 'float_mv' },
  { label: '总股本', value: 'total_share' },
  { label: '流通股本', value: 'float_share' },
  { label: '自由流通股本', value: 'free_share' },
  { label: '换手率', value: 'turnover_rate' },
  { label: '换手率(自由流通)', value: 'turnover_rate_f' },
]

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近一年',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setFullYear(start.getFullYear() - 1)
      return [start, end]
    },
  },
  {
    text: '最近三年',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setFullYear(start.getFullYear() - 3)
      return [start, end]
    },
  },
  {
    text: '最近五年',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setFullYear(start.getFullYear() - 5)
      return [start, end]
    },
  },
  {
    text: '最近十年',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setFullYear(start.getFullYear() - 10)
      return [start, end]
    },
  },
]

// 表单状态与默认参数
const form = reactive({
  tsCode: '000001.SH',
  fields: '',
})

// 当前选中的指标
const selectedMetric = ref('pe')

// 日期范围：默认最近365天 (展示趋势通常需要较长时间跨度)
const dateRange = ref<[string, string]>()

// 数据
const records = ref<IndexDailybasicItem[]>([])
const totalCount = ref<number>(0)

// ECharts 相关
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// 当前估值状态
const currentValuation = ref<{
  value: number
  percentile: number
  status: string
  type: 'success' | 'warning' | 'danger' | 'info' | 'primary'
} | null>(null)

// 计算分位值
function calculatePercentileRank(values: number[], target: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const rank = sorted.findIndex(v => v >= target)
  // 如果没找到（target比所有值都大），rank为-1，但逻辑上应该是100%
  if (rank === -1) return 100
  return (rank / sorted.length) * 100
}

function updateValuationStatus(values: number[]) {
  if (values.length === 0) {
    currentValuation.value = null
    return
  }

  // 获取最新值（records已按日期排序，取最后一个）
  const latestValue = values[values.length - 1]
  
  // 计算在历史数据中的分位
  const percentile = calculatePercentileRank(values, latestValue)
  
  let status = '适中'
  let type: 'success' | 'warning' | 'danger' | 'info' | 'primary' = 'info'

  if (percentile >= 90) {
    status = '极高'
    type = 'danger'
  } else if (percentile >= 70) {
    status = '较高'
    type = 'warning'
  } else if (percentile <= 10) {
    status = '极低'
    type = 'success' // 机会
  } else if (percentile <= 30) {
    status = '较低'
    type = 'primary'
  }

  currentValuation.value = {
    value: latestValue,
    percentile,
    status,
    type
  }
}

function buildDefaultDateRange(days = 365): [string, string] {
  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return [fmt(start), fmt(end)]
}

async function fetchData() {
  try {
    loading.value = true
    if (chartInstance) {
      chartInstance.showLoading()
    }
    
    const [startDate, endDate] = dateRange.value || buildDefaultDateRange()
    const res = await fetchIndexDailybasic({
      tsCode: form.tsCode,
      startDate,
      endDate,
      fields: form.fields || undefined,
    })
    
    // 对数据按日期排序，确保图表展示正确
    records.value = (res.records || []).sort((a, b) => {
      const dateA = String(a.trade_date || '')
      const dateB = String(b.trade_date || '')
      return dateA.localeCompare(dateB)
    })
    
    totalCount.value = res.count || records.value.length
    emit('loaded', totalCount.value)
    
    updateChart()
  } catch (e: any) {
    ElMessage.error(e?.message || '数据加载失败')
  } finally {
    loading.value = false
    if (chartInstance) {
      chartInstance.hideLoading()
    }
  }
}

function initChart() {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    window.addEventListener('resize', handleResize)
  }
}

function calculatePercentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0
  const index = (p / 100) * (sortedValues.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

function updateChart() {
  if (!chartInstance) return

  const dates = records.value.map(item => item.trade_date)
  const values = records.value.map(item => Number(item[selectedMetric.value]))
  const metricLabel = metricOptions.find(opt => opt.value === selectedMetric.value)?.label || selectedMetric.value

  // 计算分位数
  const validValues = values.filter(v => !isNaN(v)).sort((a, b) => a - b)
  
  // 更新估值状态
  updateValuationStatus(values.filter(v => !isNaN(v)))

  const p10 = calculatePercentile(validValues, 10)
  const p30 = calculatePercentile(validValues, 30)
  const p50 = calculatePercentile(validValues, 50)
  const p70 = calculatePercentile(validValues, 70)
  const p90 = calculatePercentile(validValues, 90)

  const option = {
    title: {
      text: `${indexOptions.find(i => i.value === form.tsCode)?.label || form.tsCode} - ${metricLabel} 趋势`,
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      right: '15%' // 留出右侧空间显示 markLine 标签
    },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: {
      type: 'value',
      scale: true // 让坐标轴自适应数据范围，而不是从0开始
    },
    series: [
      {
        name: metricLabel,
        type: 'line',
        data: values,
        smooth: true,
        showSymbol: false,
        markLine: {
          symbol: 'none',
          data: [
            { yAxis: p90, name: '90%分位', label: { formatter: '90%: {c}' }, lineStyle: { color: '#FF4500', type: 'dashed' } },
            { yAxis: p70, name: '70%分位', label: { formatter: '70%: {c}' }, lineStyle: { color: '#FFA500', type: 'dashed' } },
            { yAxis: p50, name: '50%分位', label: { formatter: '50%: {c}' }, lineStyle: { color: '#32CD32', width: 2 } }, // 中位数加粗
            { yAxis: p30, name: '30%分位', label: { formatter: '30%: {c}' }, lineStyle: { color: '#1E90FF', type: 'dashed' } },
            { yAxis: p10, name: '10%分位', label: { formatter: '10%: {c}' }, lineStyle: { color: '#0000FF', type: 'dashed' } },
          ]
        }
      }
    ]
  }

  chartInstance.setOption(option)
}

function handleResize() {
  chartInstance?.resize()
}

function handleSearch() { fetchData() }
function refreshData() { fetchData() }
function resetForm() {
  form.tsCode = '000001.SH'
  form.fields = ''
  selectedMetric.value = 'pe'
  dateRange.value = buildDefaultDateRange()
  fetchData()
}

// 监听指数代码和日期范围变化，自动刷新数据
watch([() => form.tsCode, dateRange], () => {
  fetchData()
})

onMounted(() => {
  dateRange.value = buildDefaultDateRange()
  initChart()
  fetchData()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
.index-dailybasic-view { padding: 20px; }
.page-header, .search-section, .table-section { margin-bottom: 20px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-title { display: flex; align-items: center; gap: 10px; }
.valuation-tag { margin-left: 10px; font-weight: bold; }
</style>
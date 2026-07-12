<template>
  <div class="sw-industry-trend-chart">
    <el-card shadow="never" class="chart-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <span>{{ industryName ? `${tsCode} - ${industryName} - ${metricOptions.find(opt => opt.value === selectedMetric)?.label || selectedMetric} 趋势` : '行业趋势' }}</span>
            <el-tag v-if="currentValuation" :type="currentValuation.type" effect="dark" class="valuation-tag">
              当前{{ metricOptions.find(opt => opt.value === selectedMetric)?.label || selectedMetric }}分位: {{ currentValuation.percentile.toFixed(2) }}% - {{ currentValuation.status }}
            </el-tag>
          </div>
        </div>
      </template>

      <div class="form-row">
        <el-form :inline="true" label-width="80px">
          <el-form-item label="指标">
            <el-select v-model="selectedMetric" placeholder="选择指标" style="width: 150px" @change="handleMetricChange">
              <el-option
                v-for="item in metricOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-button-group>
              <el-button :type="selectedYears === 1 ? 'primary' : 'default'" @click="setYearRange(1)">1年</el-button>
              <el-button :type="selectedYears === 3 ? 'primary' : 'default'" @click="setYearRange(3)">3年</el-button>
              <el-button :type="selectedYears === 5 ? 'primary' : 'default'" @click="setYearRange(5)">5年</el-button>
              <el-button :type="selectedYears === 10 ? 'primary' : 'default'" @click="setYearRange(10)">10年</el-button>
            </el-button-group>
          </el-form-item>
          <el-form-item label="截止日期">
            <el-date-picker
              v-model="endDate"
              type="date"
              placeholder="选择截止日期"
              format="YYYY-MM-DD"
              value-format="YYYYMMDD"
              style="width: 160px"
              @change="updateDateRange"
            />
          </el-form-item>
        </el-form>
      </div>

      <el-alert v-if="error" type="error" :closable="false" :title="error" class="mb-12" />

      <div v-loading="loading" class="chart-container" ref="chartRef"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import axios from '@/services/axiosConfig'
import * as echarts from 'echarts'

const props = defineProps<{
  tsCode: string
  industryName?: string
}>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const loading = ref(false)
const error = ref('')

const selectedYears = ref(1)
const endDate = ref('')
const dateRange = ref<[string, string] | null>(null)

interface DailyRecord {
  ts_code: string
  trade_date: string
  name: string
  open: number
  high: number
  low: number
  close: number
  change: number
  pct_change: number
  vol: number
  amount: number
  pe: number
  pb: number
  float_mv: number
  total_mv: number
  [key: string]: any
}

interface DailyData {
  interface: string
  count: number
  records: DailyRecord[]
}

interface ApiResponse {
  code: number
  message: string
  timestamp?: string
  data: DailyData
}

// 指标选项
const metricOptions = [
  { label: '收盘价', value: 'close' },
  { label: '开盘价', value: 'open' },
  { label: '最高价', value: 'high' },
  { label: '最低价', value: 'low' },
  { label: '市盈率 (PE)', value: 'pe' },
  { label: '市净率 (PB)', value: 'pb' },
  { label: '涨跌额', value: 'change' },
  { label: '涨跌幅', value: 'pct_change' },
  { label: '成交量', value: 'vol' },
  { label: '成交额', value: 'amount' },
  { label: '流通市值', value: 'float_mv' },
  { label: '总市值', value: 'total_mv' },
]

const selectedMetric = ref('pe')
const records = ref<DailyRecord[]>([])

// 当前估值状态
const currentValuation = ref<{
  value: number
  percentile: number
  status: string
  type: 'success' | 'warning' | 'danger' | 'info' | 'primary'
} | null>(null)

const formatDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

// 根据年数和截止日期计算日期范围
function setYearRange(years: number) {
  selectedYears.value = years
  updateDateRange()
  fetchData()
}

// 更新日期范围（基于 selectedYears 和 endDate）
function updateDateRange() {
  if (!endDate.value) return

  const end = new Date(endDate.value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
  const start = new Date(end)
  start.setFullYear(start.getFullYear() - selectedYears.value)

  dateRange.value = [formatDate(start), formatDate(end)]
  fetchData()
}

// 初始化默认日期范围（最近一年，截止日期为今天）
function initDateRange() {
  const today = new Date()
  endDate.value = formatDate(today)
  selectedYears.value = 1
  updateDateRange()
}

function initChart() {
  if (chartRef.value) {
    // 销毁旧实例，防止内存泄漏或重复初始化
    if (chartInstance) {
      chartInstance.dispose()
    }
    chartInstance = echarts.init(chartRef.value)
    // 确保图表能响应大小变化
    chartInstance.resize()
  }
}

function resizeChart() {
  chartInstance?.resize()
}

// 计算分位值
function calculatePercentileRank(values: number[], target: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const rank = sorted.findIndex(v => v >= target)
  if (rank === -1) return 100
  return (rank / sorted.length) * 100
}

function calculatePercentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0
  const index = (p / 100) * (sortedValues.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
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

function updateChart(data: DailyRecord[] = records.value) {
  if (!chartInstance) initChart()
  if (!chartInstance) return

  // 按日期升序排序
  const sortedData = [...data].sort((a, b) => a.trade_date.localeCompare(b.trade_date))
  
  const dates = sortedData.map(item => item.trade_date)
  const values = sortedData.map(item => Number(item[selectedMetric.value]))
  const volumes = sortedData.map(item => item.vol)
  
  const metricLabel = metricOptions.find(opt => opt.value === selectedMetric.value)?.label || selectedMetric.value

  // 计算分位数相关
  const validValues = values.filter(v => !isNaN(v)).sort((a, b) => a - b)
  updateValuationStatus(values.filter(v => !isNaN(v)))

  const p10 = calculatePercentile(validValues, 10)
  const p30 = calculatePercentile(validValues, 30)
  const p50 = calculatePercentile(validValues, 50)
  const p70 = calculatePercentile(validValues, 70)
  const p90 = calculatePercentile(validValues, 90)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: [metricLabel, '成交量'],
      top: 0 // 调整 legend 位置
    },
    grid: [
      {
        left: '10%',
        right: '15%',
        bottom: '20%',
        height: '60%'
      },
      {
        left: '10%',
        right: '15%',
        bottom: '5%',
        height: '10%'
      }
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { onZero: false }
      },
      {
        type: 'category',
        gridIndex: 1,
        data: dates,
        axisLabel: { show: false }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: metricLabel,
        scale: true
      },
      {
        type: 'value',
        name: '成交量',
        gridIndex: 1,
        axisLabel: { show: false },
        splitLine: { show: false }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 0,
        end: 100
      },
      {
        show: true,
        xAxisIndex: [0, 1],
        type: 'slider',
        bottom: '0%',
        start: 0,
        end: 100
      }
    ],
    series: [
      {
        name: metricLabel,
        type: 'line',
        data: values,
        smooth: true,
        lineStyle: {
          width: 2
        },
        itemStyle: {
          color: '#409EFF'
        },
        markLine: {
          symbol: 'none',
          data: [
            { yAxis: p90, name: '90%分位', label: { formatter: '90%: {c}' }, lineStyle: { color: '#FF4500', type: 'dashed' } },
            { yAxis: p70, name: '70%分位', label: { formatter: '70%: {c}' }, lineStyle: { color: '#FFA500', type: 'dashed' } },
            { yAxis: p50, name: '50%分位', label: { formatter: '50%: {c}' }, lineStyle: { color: '#32CD32', width: 2 } },
            { yAxis: p30, name: '30%分位', label: { formatter: '30%: {c}' }, lineStyle: { color: '#1E90FF', type: 'dashed' } },
            { yAxis: p10, name: '10%分位', label: { formatter: '10%: {c}' }, lineStyle: { color: '#0000FF', type: 'dashed' } },
          ]
        }
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumes,
        itemStyle: {
          color: '#67C23A'
        }
      }
    ]
  }

  chartInstance.setOption(option, true)
}

function handleMetricChange() {
  fetchData()
}

async function fetchData() {
  if (!props.tsCode) {
    return
  }

  loading.value = true
  error.value = ''
  
  try {
    const params: any = {
      ts_code: props.tsCode,
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }

    const res = await axios.get<any, ApiResponse>('/django/api/index/sw-daily/', { params })
    
    if (res.data && Array.isArray(res.data.records)) {
       records.value = res.data.records
       updateChart(records.value)
    } else {
       records.value = []
       error.value = '暂无数据'
       chartInstance?.clear()
       currentValuation.value = null
    }
  } catch (e: any) {
    error.value = e?.message || '请求失败'
  } finally {
    loading.value = false
  }
}

watch(() => props.tsCode, (newVal) => {
  if (newVal) {
    fetchData()
  }
})

onMounted(() => {
  initDateRange()
  nextTick(() => {
    initChart()
    if (props.tsCode) {
      fetchData()
    }
    window.addEventListener('resize', resizeChart)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstance?.dispose()
})
</script>

<style scoped>
.sw-industry-trend-chart {
  /* margin-top: 20px; parent handles spacing */
}
.chart-card {
  border: 1px solid #ebeef5;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.valuation-tag {
  font-weight: bold;
}
.form-row {
  margin-bottom: 12px;
}
.chart-container {
  height: 500px;
  width: 100%;
}
.mb-12 {
  margin-bottom: 12px;
}
</style>
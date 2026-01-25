<template>
  <div class="page-container">
    <el-card class="search-card">
      <template #header>
        <div class="card-header">
          <span class="title">中结持股汇总</span>
          <el-tag type="success" effect="plain" class="count-tag" v-if="rows.length">
            共 {{ rows.length }} 条数据
          </el-tag>
        </div>
      </template>

      <el-form :inline="true" :model="query" class="query-form">
        <el-form-item label="快捷选择">
          <el-select v-model="quickRange" style="width: 140px" @change="onQuickRangeChange">
            <el-option label="最近一周" value="last7d" />
            <el-option label="最近1月" value="last1m" />
            <el-option label="最近三月" value="last3m" />
            <el-option label="最近半年" value="last6m" />
            <el-option label="最近一年" value="last1y" />
            <el-option label="最近三年" value="last3y" />
          </el-select>
        </el-form-item>
        <el-form-item label="股票代码">
          <el-input v-model="query.ts_code" placeholder="如 00960.HK" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="港交所代码">
          <el-input v-model="query.hk_code" placeholder="如 95009" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYYMMDD"
            unlink-panels
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 图表区域 -->
    <div class="charts-row" v-if="rows.length > 0">
      <el-card class="chart-card" shadow="hover">
        <div ref="mainChartRef" class="chart-container"></div>
      </el-card>
    </div>

    <!-- 数据卡片列表 -->
    <div class="data-list" v-loading="loading">
      <el-empty v-if="!loading && rows.length === 0" description="暂无数据，请调整查询条件" />
      
      <el-row :gutter="16" v-else>
        <el-col 
          :xs="24" :sm="12" :md="8" :lg="6" :xl="4" 
          v-for="(item, index) in rows" 
          :key="index"
          class="data-col"
        >
          <el-card class="data-item-card" shadow="hover">
            <div class="item-header">
              <div class="stock-info">
                <span class="stock-name">{{ item.name }}</span>
                <span class="stock-code">{{ item.ts_code }}</span>
              </div>
              <el-tag size="small" effect="light">{{ item.trade_date }}</el-tag>
            </div>
            
            <div class="item-body">
              <div class="metric-row">
                <span class="label">持股比例</span>
                <div class="value-highlight">{{ item.hold_ratio }}%</div>
              </div>
              <el-progress 
                :percentage="Math.min(item.hold_ratio, 100)" 
                :color="getProgressColor"
                :show-text="false"
                :stroke-width="8"
                class="ratio-progress"
              />
              
              <div class="metric-grid">
                <div class="metric-item">
                  <span class="label">持股数量</span>
                  <span class="value">{{ formatBigNumber(item.shareholding) }}</span>
                </div>
                <div class="metric-item">
                  <span class="label">持股人数</span>
                  <span class="value">{{ item.hold_nums }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { fetchCcassHold, type CcassHoldQueryParams } from '@/services/ccassHoldApi'
import * as echarts from 'echarts'

const loading = ref(false)
const dateRange = ref<[string, string] | null>(null)
const quickRange = ref<string>('last7d')
const query = ref<CcassHoldQueryParams>({})
const rows = ref<Record<string, any>[]>([])
const mainChartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// 工具函数：格式化大数字
function formatBigNumber(num: number | string) {
  const n = Number(num)
  if (isNaN(n)) return '-'
  if (n > 100000000) return (n / 100000000).toFixed(2) + '亿'
  if (n > 10000) return (n / 10000).toFixed(2) + '万'
  return n.toLocaleString()
}

// 进度条颜色
function getProgressColor(percentage: number) {
  if (percentage > 70) return '#F56C6C'
  if (percentage > 30) return '#E6A23C'
  return '#67C23A'
}

function normalizeToRows(data: any): Record<string, any>[] {
  if (!data) return []
  if (Array.isArray(data.records) && data.records.length > 0) return data.records
  if (Array.isArray(data.items) && Array.isArray(data.fields)) {
    const f = data.fields as string[]
    return (data.items as any[][]).map(arr => {
      const obj: Record<string, any> = {}
      f.forEach((k, i) => (obj[k] = arr[i]))
      return obj
    })
  }
  return []
}

async function onSearch() {
  loading.value = true
  try {
    const params: CcassHoldQueryParams = { ...query.value }
    if (dateRange.value) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const data = await fetchCcassHold(params)
    rows.value = normalizeToRows(data)
    updateChart()
  } finally {
    loading.value = false
  }
}

function onReset() {
  query.value = {}
  // 重置为最近一周
  setDateRangeByPreset('last7d')
  rows.value = []
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function setDateRangeByPreset(preset: string) {
  const end = new Date()
  const start = new Date()
  switch (preset) {
    case 'last7d':
      start.setDate(end.getDate() - 6)
      break
    case 'last1m':
      start.setMonth(end.getMonth() - 1)
      break
    case 'last3m':
      start.setMonth(end.getMonth() - 3)
      break
    case 'last6m':
      start.setMonth(end.getMonth() - 6)
      break
    case 'last1y':
      start.setFullYear(end.getFullYear() - 1)
      break
    case 'last3y':
      start.setFullYear(end.getFullYear() - 3)
      break
  }
  dateRange.value = [formatDate(start), formatDate(end)]
}

function onQuickRangeChange(val: string) {
  setDateRangeByPreset(val)
}

// 图表逻辑
function updateChart() {
  if (!rows.value.length || !mainChartRef.value) return

  if (!chartInstance) {
    chartInstance = echarts.init(mainChartRef.value)
  }

  // 分析数据特征
  const uniqueStocks = new Set(rows.value.map(r => r.ts_code))
  const isSingleStock = uniqueStocks.size === 1

  const option: any = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    legend: {
      data: ['持股比例(%)', '持股数量']
    }
  }

  if (isSingleStock) {
    // 单只股票：时间序列分析
    const sortedData = [...rows.value].sort((a, b) => a.trade_date.localeCompare(b.trade_date))
    const dates = sortedData.map(r => r.trade_date)
    const ratios = sortedData.map(r => r.hold_ratio)
    const volumes = sortedData.map(r => r.shareholding)

    option.title = { text: `${sortedData[0].name} (${sortedData[0].ts_code}) 持股趋势` }
    option.xAxis = { type: 'category', data: dates }
    option.yAxis = [
      { type: 'value', name: '持股比例(%)', max: 100 },
      { type: 'value', name: '持股数量', splitLine: { show: false } }
    ]
    option.series = [
      {
        name: '持股比例(%)',
        type: 'line',
        data: ratios,
        yAxisIndex: 0,
        smooth: true,
        itemStyle: { color: '#409EFF' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64,158,255,0.3)' },
            { offset: 1, color: 'rgba(64,158,255,0.01)' }
          ])
        }
      },
      {
        name: '持股数量',
        type: 'bar',
        data: volumes,
        yAxisIndex: 1,
        itemStyle: { color: '#E6A23C', opacity: 0.6 }
      }
    ]
  } else {
    // 多只股票：横截面分析（取最新日期或Top排行）
    // 简单起见，展示前20个数据的持股比例对比
    // 如果数据很多，优先按持股比例排序
    const sortedByRatio = [...rows.value].sort((a, b) => b.hold_ratio - a.hold_ratio).slice(0, 20)
    
    const names = sortedByRatio.map(r => r.name)
    const ratios = sortedByRatio.map(r => r.hold_ratio)
    const volumes = sortedByRatio.map(r => r.shareholding)

    option.title = { text: '持股比例 TOP20' }
    option.xAxis = { 
      type: 'category', 
      data: names,
      axisLabel: { interval: 0, rotate: 30 }
    }
    option.yAxis = [
      { type: 'value', name: '持股比例(%)', max: 100 },
      { type: 'value', name: '持股数量', splitLine: { show: false } }
    ]
    option.series = [
      {
        name: '持股比例(%)',
        type: 'bar',
        data: ratios,
        yAxisIndex: 0,
        itemStyle: { 
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#67C23A' },
            { offset: 1, color: '#95D475' }
          ])
        }
      },
      {
        name: '持股数量',
        type: 'line',
        data: volumes,
        yAxisIndex: 1,
        itemStyle: { color: '#E6A23C' },
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  }

  chartInstance.setOption(option)
}

// 监听窗口大小变化
const handleResize = () => {
  chartInstance?.resize()
}

onMounted(() => {
  setDateRangeByPreset('last7d')
  onSearch()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})

</script>

<style scoped>
.page-container {
  padding: 16px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 84px);
}

.search-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-weight: 600;
  font-size: 16px;
}

.charts-row {
  margin-bottom: 16px;
}

.chart-container {
  height: 350px;
  width: 100%;
}

.data-list {
  margin-top: 16px;
}

.data-col {
  margin-bottom: 16px;
}

.data-item-card {
  height: 100%;
  transition: all 0.3s;
  border-radius: 8px;
  border: none;
}

.data-item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.stock-info {
  display: flex;
  flex-direction: column;
}

.stock-name {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.stock-code {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.item-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.value-highlight {
  font-size: 18px;
  font-weight: bold;
  color: #409EFF;
}

.ratio-progress {
  margin-bottom: 8px;
}

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background-color: #f9fafc;
  padding: 8px;
  border-radius: 4px;
}

.metric-item {
  display: flex;
  flex-direction: column;
}

.metric-item .label {
  font-size: 12px;
  color: #909399;
}

.metric-item .value {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}
</style>

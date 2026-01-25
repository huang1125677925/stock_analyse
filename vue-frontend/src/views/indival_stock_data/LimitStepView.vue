<template>
  <el-card class="page-card">
    <template #header>
      <div class="card-header">连板天梯</div>
    </template>

    <el-form :inline="true" class="query-form">
      <el-form-item label="快捷选择">
        <el-select v-model="quickRange" style="width: 180px" @change="onQuickRangeChange">
          <el-option label="最近一周" value="last7d" />
          <el-option label="最近1月" value="last1m" />
          <el-option label="最近三月" value="last3m" />
          <el-option label="最近半年" value="last6m" />
          <el-option label="最近一年" value="last1y" />
          <el-option label="最近三年" value="last3y" />
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
          unlink-panels
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <div v-loading="loading">
      <!-- 趋势图表 -->
      <div v-if="hasData" class="chart-container" ref="chartRef"></div>
      
      <!-- 日期切换 (如果有多天数据) -->
      <div v-if="availableDates.length > 0" class="date-selector">
        <span class="label">选择日期查看天梯：</span>
        <el-radio-group v-model="selectedDate" size="small">
          <el-radio-button v-for="d in availableDates" :key="d" :label="d" :value="d">
            {{ formatDateStr(d) }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <!-- 连板天梯视图 -->
      <div v-if="currentLadder.length > 0" class="ladder-container">
        <div class="ladder-header">
          <h3>{{ formatDateStr(selectedDate) }} 连板分布</h3>
        </div>
        <div class="ladder-content">
          <div v-for="level in currentLadder" :key="level.nums" class="ladder-row">
            <div class="ladder-label">
              <div class="board-count">{{ level.nums }}板</div>
              <div class="stock-count">{{ level.stocks.length }}只</div>
            </div>
            <div class="ladder-stocks">
              <el-tag 
                v-for="stock in level.stocks" 
                :key="stock.ts_code" 
                class="stock-tag"
                effect="dark"
                :type="getBoardColorType(level.nums)"
              >
                {{ stock.name }}
                <span class="stock-code">({{ stock.ts_code }})</span>
              </el-tag>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else-if="!loading && hasData" description="该日期无连板数据" />
      <el-empty v-else-if="!loading && !hasData" description="暂无数据，请查询" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue'
import { fetchLimitStep, type LimitStepQueryParams } from '@/services/limitStepApi'
import * as echarts from 'echarts'

/**
 * 组件：LimitStepView
 * 功能：查询并展示市场连板梯度数据（可视化版本）
 * 参数：无
 * 返回值：无
 */

const loading = ref(false)
const dateRange = ref<[string, string] | null>(null)
const quickRange = ref<string>('last7d')
const rawData = ref<Record<string, any>[]>([])
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// 选中的日期（用于展示天梯）
const selectedDate = ref<string>('')

// 计算属性：是否有数据
const hasData = computed(() => rawData.value.length > 0)

// 计算属性：所有可用日期（排序后）
const availableDates = computed(() => {
  const dates = new Set(rawData.value.map(item => item.trade_date))
  return Array.from(dates).sort().reverse() // 降序排列，最近的在前
})

// 定义数据接口
interface StockItem {
  ts_code: string
  name: string
  trade_date: string
  nums: number
  [key: string]: any
}

interface LadderLevel {
  nums: number
  stocks: StockItem[]
}

// 计算属性：当前选中日期的天梯数据
const currentLadder = computed<LadderLevel[]>(() => {
  if (!selectedDate.value) return []
  
  const stocksInDate = rawData.value.filter(item => item.trade_date === selectedDate.value) as StockItem[]
  
  // 按板数分组
  const groups = new Map<number, StockItem[]>()
  stocksInDate.forEach(stock => {
    const n = Number(stock.nums)
    if (!groups.has(n)) groups.set(n, [])
    groups.get(n)!.push(stock)
  })

  // 转为数组并按板数降序排序
  const levels: LadderLevel[] = []
  groups.forEach((list, nums) => {
    levels.push({ nums, stocks: list })
  })
  
  return levels.sort((a, b) => b.nums - a.nums)
})

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
    const params: LimitStepQueryParams = {}
    if (dateRange.value) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const data = await fetchLimitStep(params)
    rawData.value = normalizeToRows(data)
    
    // 默认选中最新的日期
    if (availableDates.value.length > 0) {
      selectedDate.value = availableDates.value[0]
    } else {
      selectedDate.value = ''
    }

    // 渲染图表
    nextTick(() => {
      renderChart()
    })
  } finally {
    loading.value = false
  }
}

function onReset() {
  dateRange.value = null
  rawData.value = []
  selectedDate.value = ''
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

// 格式化日期字符串 20260123 -> 2026-01-23
function formatDateStr(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr
  return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
}

// 根据板数返回Tag颜色类型
function getBoardColorType(nums: number): 'success' | 'warning' | 'danger' | 'primary' | 'info' {
  if (nums >= 5) return 'danger' // 高度板
  if (nums >= 3) return 'warning' // 中位板
  if (nums === 2) return 'primary' // 2板
  return 'info' // 1板或其他
}

function renderChart() {
  if (!chartRef.value || !hasData.value) return
  
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
    // 监听图表点击，切换日期
    chartInstance.on('click', (params) => {
      if (params.name) {
        // params.name 应该是日期
        // 需要反向查找原始日期字符串 (格式化后的日期 -> 原始YYYYMMDD)
        // 简单起见，我们在图表数据中直接使用 YYYYMMDD，label formatter 再格式化
        // 或者直接遍历 availableDates 匹配
        const clickedDate = availableDates.value.find(d => d === params.name || formatDateStr(d) === params.name)
        if (clickedDate) {
          selectedDate.value = clickedDate
        }
      }
    })
  }

  // 准备图表数据
  // X轴：日期（升序）
  const datesAsc = [...availableDates.value].reverse()
  
  // Y轴1：最高板数
  const maxBoards = datesAsc.map(d => {
    const stocks = rawData.value.filter(item => item.trade_date === d)
    return Math.max(...stocks.map(s => Number(s.nums)))
  })

  // Y轴2：连板家数
  const counts = datesAsc.map(d => {
    return rawData.value.filter(item => item.trade_date === d).length
  })

  const option = {
    title: { text: '连板情绪趋势', left: 'center' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['最高连板数', '连板家数'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: datesAsc, // 使用原始日期字符串，或者格式化后的
      axisLabel: {
        formatter: (value: string) => formatDateStr(value)
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '最高连板数',
        position: 'left',
        minInterval: 1
      },
      {
        type: 'value',
        name: '连板家数',
        position: 'right',
        minInterval: 1
      }
    ],
    series: [
      {
        name: '最高连板数',
        type: 'line',
        data: maxBoards,
        yAxisIndex: 0,
        itemStyle: { color: '#d9001b' },
        smooth: true
      },
      {
        name: '连板家数',
        type: 'bar',
        data: counts,
        yAxisIndex: 1,
        itemStyle: { color: '#409EFF', opacity: 0.6 }
      }
    ]
  }

  chartInstance.setOption(option)
}

// 监听窗口大小变化
function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  // 页面挂载默认设置最近一周，并自动触发查询
  setDateRangeByPreset('last7d')
  onSearch()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})

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
</script>

<style scoped>
.page-card { margin: 12px; }
.card-header { font-weight: 600; }
.query-form { margin-bottom: 12px; }

.chart-container {
  width: 100%;
  height: 300px;
  margin-bottom: 20px;
}

.date-selector {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.label {
  font-weight: bold;
  color: #606266;
}

.ladder-container {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 16px;
  background-color: #fff;
}

.ladder-header {
  text-align: center;
  margin-bottom: 16px;
  border-bottom: 2px solid #d9001b;
  padding-bottom: 8px;
}
.ladder-header h3 {
  margin: 0;
  color: #303133;
}

.ladder-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  border-bottom: 1px dashed #ebeef5;
  padding-bottom: 12px;
}
.ladder-row:last-child {
  border-bottom: none;
}

.ladder-label {
  width: 80px;
  flex-shrink: 0;
  text-align: center;
  margin-right: 16px;
  background-color: #f5f7fa;
  padding: 8px 0;
  border-radius: 4px;
}

.board-count {
  font-size: 18px;
  font-weight: bold;
  color: #d9001b;
}

.stock-count {
  font-size: 12px;
  color: #909399;
}

.ladder-stocks {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.stock-tag {
  cursor: pointer;
  transition: all 0.2s;
}
.stock-tag:hover {
  transform: scale(1.05);
}
.stock-code {
  font-size: 0.8em;
  opacity: 0.8;
  margin-left: 4px;
}
</style>
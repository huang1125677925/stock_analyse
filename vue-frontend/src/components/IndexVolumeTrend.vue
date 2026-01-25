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
    <!-- 上涨预测日期列表（MACD XGBoost） -->
    <div class="prediction-section">
      <div class="prediction-header">
        <h4>指数上涨预测日期（MACD XGBoost）</h4>
        <div class="prediction-actions">
          <el-tag type="info">最近 {{ predictionDays }} 天</el-tag>
          <el-button size="small" @click="reloadPredictions" :loading="loadingPredictions">刷新</el-button>
        </div>
      </div>
      <div v-if="loadingPredictions" class="prediction-loading">正在加载预测数据...</div>
      <el-empty v-else-if="predictedDates.length === 0" description="暂无预测上涨日期" />
      <el-space v-else wrap>
        <el-tag v-for="d in predictedDates" :key="d" type="success">{{ formatDateDisplay(d) }}</el-tag>
      </el-space>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：IndexVolumeTrend
 * 功能：展示指定指数在选择的时间范围内的成交量、成交额、收盘价趋势图，并在下方展示基于 MACD XGBoost 模型预测的最近 N 天上涨交易日期列表。
 * 参数（Props）：
 * - tsCode?: 指数代码（默认 '000001.SH'）
 * - height?: 图表高度（默认 '420px'）
 * 返回值：无（组合式组件不返回值）
 * 事件（Emits）：无
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { fetchIndexDailyVolume, type IndexDailyVolumeItem } from '@/services/indexDailyApi'
import { fetchIndexMacdUpPredictionDates } from '@/services/strategyIndexAnalysisApi'

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

// 预测日期相关状态
const predictedDates = ref<string[]>([])
const loadingPredictions = ref<boolean>(false)
const predictionDays = ref<number>(30)

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

/**
 * 刷新上涨预测日期列表
 */
async function reloadPredictions() {
  try {
    loadingPredictions.value = true
    const data = await fetchIndexMacdUpPredictionDates(props.tsCode, predictionDays.value)
    predictedDates.value = Array.isArray(data.list) ? data.list : []
  } catch (error) {
    console.error('加载上涨预测日期失败:', error)
    ElMessage.error('加载上涨预测日期失败')
  } finally {
    loadingPredictions.value = false
  }
}

/**
 * 日期显示格式化：支持将 YYYYMMDD 转为 YYYY-MM-DD
 */
function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  if (dateStr.includes('-')) return dateStr
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }
  return dateStr
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
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        const idx = params[0]?.dataIndex ?? 0
        const dateStr = dates[idx]
        const formattedDate = dateStr && dateStr.length === 8 
          ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}` 
          : dateStr
        
        const vol = volumes[idx]
        const amt = amounts[idx]
        const cls = closes[idx]
        
        // 格式化数值辅助函数
        const formatNum = (num: number | null | undefined, unit: string = '') => {
          if (num == null) return '-'
          return num.toLocaleString() + unit
        }

        const formatMoney = (num: number | null | undefined) => {
           if (num == null) return '-'
           if (num > 100000000) return (num / 100000000).toFixed(2) + '亿'
           if (num > 10000) return (num / 10000).toFixed(2) + '万'
           return num.toFixed(2)
        }

        return `
          <div style="font-weight: bold; margin-bottom: 4px;">${formattedDate}</div>
          <div style="display: flex; justify-content: space-between; gap: 20px;">
            <span style="color: #67C23A">● 收盘价:</span>
            <span style="font-weight: bold;">${formatNum(cls)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 20px;">
            <span style="color: #E6A23C">● 成交量:</span>
            <span style="font-weight: bold;">${formatNum(vol, ' 手')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 20px;">
            <span style="color: #409EFF">● 成交额:</span>
            <span style="font-weight: bold;">${formatMoney(amt)}</span>
          </div>
        `
      }
    },
    legend: { 
      data: ['收盘价', '成交量', '成交额'],
      top: 0 
    },
    grid: { left: 60, right: 60, top: 40, bottom: 60 },
    xAxis: { 
      type: 'category', 
      data: dates, 
      axisLabel: { 
        rotate: 0,
        formatter: (value: string) => {
           // 简化日期显示，例如 20230101 -> 01/01
           if (value && value.length === 8) {
             return `${value.slice(4, 6)}/${value.slice(6, 8)}`
           }
           return value
        }
      },
      axisTick: { alignWithLabel: true }
    },
    yAxis: [
      { 
        type: 'value', 
        name: '成交量/额', 
        position: 'right',
        splitLine: { show: false },
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 100000000) return (value / 100000000).toFixed(0) + '亿'
            if (value >= 10000) return (value / 10000).toFixed(0) + '万'
            return value + ''
          }
        }
      },
      { 
        type: 'value', 
        name: '收盘价', 
        position: 'left',
        scale: true, // 自适应刻度，不从0开始
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } }
      }
    ],
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, bottom: 0 }
    ],
    series: [
      {
        name: '成交量',
        type: 'bar',
        yAxisIndex: 0,
        data: volumes,
        itemStyle: { color: 'rgba(230, 162, 60, 0.6)' },
        barMaxWidth: 30
      },
      {
        name: '成交额',
        type: 'line',
        yAxisIndex: 0,
        data: amounts,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: '#409EFF', width: 2, type: 'dashed' }
      },
      {
        name: '收盘价',
        type: 'line',
        yAxisIndex: 1,
        data: closes,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: '#67C23A', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
            { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
          ])
        }
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
  reloadPredictions()
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
  reloadPredictions()
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

.prediction-section {
  margin-top: 16px;
}

.prediction-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.prediction-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.prediction-loading {
  color: #909399;
}
</style>
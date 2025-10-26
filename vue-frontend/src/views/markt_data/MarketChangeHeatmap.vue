<template>
  <div class="market-change-heatmap">
    <el-card shadow="hover">
      <div class="header">
        <h2>大盘涨跌（日历热力图）</h2>
        <span class="subtitle">数据来源：上证指数（sh000001）</span>
      </div>
      <div ref="chartRef" class="chart"></div>
    </el-card>
    <!-- 连续色条热力图 -->
    <el-card shadow="hover">
      <div class="header">
        <h2>连续色条热力图</h2>
        <span class="subtitle">连续视觉映射（visualMap: continuous）</span>
      </div>
      <div ref="continuousChartRef" class="chart chart-continuous"></div>
    </el-card>
    <!-- 区间分布饼图 -->
    <el-card shadow="hover">
      <div class="header">
        <h2>区间分布（饼图）</h2>
        <span class="subtitle">区间：&lt; -1%、-1% ~ 0%、0% ~ 1%、≥ 1%</span>
      </div>
      <div ref="pieChartRef" class="chart chart-pie"></div>
    </el-card>
    
    <!-- 新增：ADR/ADL 趋势图组件 -->
    <div class="breadth-intro">
      <p><strong>涨跌家数比（ADR）</strong>：一段时间内上涨股票家数之和与下跌股票家数之和的比值，常用参数为 10 日。比值通常在特定区间（如 0.5–1.5）波动，超出则可能预示市场超买或超卖，趋势可能反转。</p>
      <p><strong>腾落指标（ADL）</strong>：每日上涨家数与下跌家数的差值的累计。从基期（通常为一段行情起点）开始，每天用上涨家数减去下跌家数并持续累加。观察与大盘指数的同步或背离；背离常被视为趋势反转的先行信号。</p>
    </div>
    <AdrTrend :days="30" />
    <AdlTrend :days="30" />
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：MarketChangeHeatmap
 * 功能：
 * - 使用 ECharts 日历热力图渲染大盘（上证指数 sh000001）每日涨跌幅（分段色阶）
 * - 额外提供使用连续色条（visualMap: continuous）的日历热力图
 * - 根据指定区间（< -1%、-1% ~ 0%、0% ~ 1%、>= 1%）统计并绘制饼图
 *
 * 参数（Props）：无
 * 返回值：无
 * 事件（Emits）：无
 */

import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { getStockHistory } from '@/services/individualStockApi'
import AdrTrend from '@/components/AdrTrend.vue'
import AdlTrend from '@/components/AdlTrend.vue'

// 定义组件名称，便于路由与组件名称一致
defineOptions({ name: 'MarketChangeHeatmap' })

const chartRef = ref<HTMLDivElement | null>(null)
const continuousChartRef = ref<HTMLDivElement | null>(null)
const pieChartRef = ref<HTMLDivElement | null>(null)

let chartPiecewise: echarts.ECharts | null = null
let chartContinuous: echarts.ECharts | null = null
let chartPie: echarts.ECharts | null = null

// 工具方法：格式化日期为 YYYYMMDD
const formatDateYYYYMMDD = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

// 初始化并渲染图表
const initChart = async () => {
  try {
    if (!chartRef.value) return

    // 初始化图表实例
    chartPiecewise = echarts.init(chartRef.value)

    // 计算时间范围：最近365天
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 365)

    const startDateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
    const endDateStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`

    // 请求数据（接口支持默认30天，这里主动传递近一年范围）
    const data = await getStockHistory('sh000001', {
      start_date: formatDateYYYYMMDD(start),
      end_date: formatDateYYYYMMDD(end),
      adjust: ''
    })

    // 组装热力图数据：[日期, 涨跌幅]
    const pairs: [string, number][] = data.map(item => [item.date, Number(item.change_percent)])

    // 计算数值范围
    const values = pairs.map(p => p[1]).filter(v => typeof v === 'number' && !Number.isNaN(v))
    const minVal = values.length ? Math.min(...values) : -5
    const maxVal = values.length ? Math.max(...values) : 5

    // 分段色阶（日历热力图）
    const optionPiecewise: echarts.EChartsOption = {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const date = params.data?.[0]
          const val = params.data?.[1]
          return `${date}<br/>涨跌幅：${(val ?? 0).toFixed(2)}%`
        }
      },
      visualMap: {
        type: 'piecewise',
        pieces: [
          { lt: -1, label: '< -1%', color: '#2c4d8a' },
          { gte: -1, lt: 0, label: '-1% ~ 0%', color: '#4a7bd0' },
          { gte: 0, lt: 1, label: '0% ~ 1%', color: '#f57c6e' },
          { gte: 1, label: '>= 1%', color: '#c23531' }
        ],
        orient: 'horizontal',
        left: 'center',
        top: '62%',
        textStyle: { fontSize: 12 }
      },
      calendar: {
        range: [startDateStr, endDateStr],
        cellSize: 18,
        splitLine: {
          show: true,
          lineStyle: { color: '#ddd', width: 1 }
        },
        yearLabel: { show: false },
        dayLabel: { firstDay: 1 },
        monthLabel: { nameMap: 'cn' }
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: pairs,
          emphasis: {
            itemStyle: {
              shadowBlur: 8,
              shadowColor: 'rgba(0,0,0,0.3)'
            }
          }
        }
      ]
    }

    // 连续色条（日历热力图）
    const optionContinuous: echarts.EChartsOption = {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const date = params.data?.[0]
          const val = params.data?.[1]
          return `${date}<br/>涨跌幅：${(val ?? 0).toFixed(2)}%`
        }
      },
      visualMap: {
        type: 'continuous',
        min: Math.floor(minVal),
        max: Math.ceil(maxVal),
        calculable: true,
        inRange: { color: ['#2c4d8a', '#e9e9e9', '#c23531'] },
        orient: 'horizontal',
        left: 'center',
        top: '62%',
        textStyle: { fontSize: 12 }
      },
      calendar: {
        range: [startDateStr, endDateStr],
        cellSize: 18,
        splitLine: {
          show: true,
          lineStyle: { color: '#ddd', width: 1 }
        },
        yearLabel: { show: false },
        dayLabel: { firstDay: 1 },
        monthLabel: { nameMap: 'cn' }
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: pairs
        }
      ]
    }

    // 统计区间（< -1%、-1% ~ 0%、0% ~ 1%、>= 1%）
    const buckets = [
      { name: '< -1%', color: '#2c4d8a', count: 0 },
      { name: '-1% ~ 0%', color: '#4a7bd0', count: 0 },
      { name: '0% ~ 1%', color: '#f57c6e', count: 0 },
      { name: '>= 1%', color: '#c23531', count: 0 }
    ]
    for (const v of values) {
      if (v < -1) buckets[0].count++
      else if (v >= -1 && v < 0) buckets[1].count++
      else if (v >= 0 && v < 1) buckets[2].count++
      else if (v >= 1) buckets[3].count++
    }

    const optionPie: echarts.EChartsOption = {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      color: buckets.map(b => b.color),
      series: [
        {
          name: '区间分布',
          type: 'pie',
          radius: '60%',
          center: ['50%', '45%'],
          label: { formatter: '{b}: {c} ({d}%)' },
          data: buckets.map(b => ({ name: b.name, value: b.count }))
        }
      ]
    }

    // 设置图表
    chartPiecewise.setOption(optionPiecewise)

    if (continuousChartRef.value) {
      chartContinuous = echarts.init(continuousChartRef.value)
      chartContinuous.setOption(optionContinuous)
    }
    if (pieChartRef.value) {
      chartPie = echarts.init(pieChartRef.value)
      chartPie.setOption(optionPie)
    }

    window.addEventListener('resize', handleResize)
  } catch (err: unknown) {
    console.error(err)
    ElMessage.error('获取大盘历史数据失败，请稍后重试')
  }
}

const handleResize = () => {
  chartPiecewise?.resize()
  chartContinuous?.resize()
  chartPie?.resize()
}

onMounted(() => {
  initChart()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartPiecewise?.dispose()
  chartContinuous?.dispose()
  chartPie?.dispose()
  chartPiecewise = null
  chartContinuous = null
  chartPie = null
})
</script>

<style scoped lang="scss">
.market-change-heatmap {
  .header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 12px;

    h2 {
      margin: 0;
      font-size: 18px;
    }
    .subtitle {
      color: #909399;
      font-size: 12px;
    }
  }

  .chart {
    width: 100%;
    height: 340px; // 适配单页展示
  }
  .chart-continuous {
    height: 340px;
  }
  .chart-pie {
    height: 360px;
  }
}
.breadth-intro {
  margin: 12px 0 8px;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}
</style>
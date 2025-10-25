<template>
  <div class="industry-fund-flow-correlation-scatter">
    <el-card class="control-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="title-left">
            <h3>{{ title || `${industryName} - 行业资金流相关性散点图` }}</h3>
            <div class="subtitle">行业板块代码：{{ sectorCode }}</div>
          </div>
          <div class="controls">
            <div class="control-group">
              <span class="control-label">时间范围：</span>
              <el-select v-model="daysRange" style="width: 120px">
                <el-option :value="20" label="最近20天" />
                <el-option :value="40" label="最近40天" />
                <el-option :value="60" label="最近60天" />
                <el-option :value="120" label="最近120天" />
              </el-select>
            </div>
            <div class="control-group">
              <span class="control-label">X轴：</span>
              <el-select v-model="xAxis" style="width: 160px">
                <el-option v-for="opt in xAxisOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
              </el-select>
            </div>
            <div class="control-group">
              <span class="control-label">Y轴（可多选）：</span>
              <el-select v-model="yAxes" multiple collapse-tags :max-collapse-tags="2" style="min-width: 260px">
                <el-option v-for="opt in yAxisOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
              </el-select>
            </div>
            <div class="control-group">
              <span class="control-label">排序：</span>
              <el-select v-model="sortOrder" style="width: 120px">
                <el-option value="desc" label="按Y降序" />
                <el-option value="asc" label="按Y升序" />
              </el-select>
            </div>
          </div>
        </div>
      </template>
      <div ref="chartRef" class="chart-container" :style="{ height }"></div>
      <el-empty v-if="!loading && seriesCount === 0" description="暂无数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件：IndustryFundFlowCorrelationScatter
 * 功能：
 * - 展示指定行业在选择时间范围内的 x 与多个 y 净流入之间的散点关系
 * - 支持选择时间范围（20/40/60/120天）、x轴指标与多选y轴净流入类型
 * - 基于 ECharts 散点图实现，参考 Anscombe Quartet 示例（多系列散点）
 * 
 * 参数（Props）：
 * - sectorCode: string (必传) 行业板块代码，例如 "BK0001"
 * - industryName?: string 行业名称，用于标题显示
 * - title?: string 自定义标题
 * - height?: string 图表高度，默认 "480px"
 * 
 * 返回值：无
 * 事件：无
 */
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import ecStat from 'echarts-stat'
// 注册回归转换（统计插件）
// 由于类型定义未暴露 transform 属性，这里使用 any 以保证运行时兼容
(echarts as any).registerTransform((ecStat as any).transform.regression)
import { ElMessage } from 'element-plus'
import { 
  getIndustryFundFlowCorrelation, 
  X_AXIS_OPTIONS, Y_AXIS_OPTIONS,
  type AxisX, type AxisY, type FundFlowCorrelationPoint, type IndustryFundFlowCorrelationData
} from '@/services/industryFundFlowCorrelationApi'

interface Props {
  sectorCode: string
  industryName?: string
  title?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: '480px'
})

// 控制项
const daysRange = ref<number>(20)
const xAxis = ref<AxisX>('change_percent')
const yAxes = ref<AxisY[]>(['main', 'all'])
const sortOrder = ref<'asc' | 'desc'>('desc')

// 选项映射
const xAxisOptions = X_AXIS_OPTIONS
const yAxisOptions = Y_AXIS_OPTIONS

// 图表实例
const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
const loading = ref(false)
const seriesCount = ref(0)

// 工具函数
function formatDateStr(d: Date): string {
  // 与项目其他文件保持一致，使用 toISOString 拆分
  return d.toISOString().split('T')[0]
}

function computeDateRangeByDays(days: number): [string, string] {
  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return [formatDateStr(start), formatDateStr(end)]
}

// 拉取数据并渲染
async function fetchAndRender() {
  if (!props.sectorCode) return
  loading.value = true
  try {
    const [start_date, end_date] = computeDateRangeByDays(daysRange.value)

    // 针对每个 y 轴类型分别调用接口，组合为多系列散点
    const results = await Promise.all(
      yAxes.value.map(y =>
        getIndustryFundFlowCorrelation({
          sector_code: props.sectorCode,
          start_date,
          end_date,
          x_axis: xAxis.value,
          y_axis: y,
          sort_order: sortOrder.value
        }).catch(err => {
          console.error('获取相关性散点失败:', err)
          return null as unknown as IndustryFundFlowCorrelationData
        })
      )
    )

    // 使用 dataset + ecStat.regression 生成每个系列的散点与回归线
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const datasets: any[] = []
    const series: echarts.SeriesOption[] = []
    const legends: string[] = []

    results.forEach((res, idx) => {
      if (!res || !res.points || res.points.length === 0) return
      const y = yAxes.value[idx]
      const label = yAxisOptions.find(o => o.value === y)?.label || y

      // source: [x, y, date]
      const source = res.points.map((p: FundFlowCorrelationPoint) => [p.x, p.y, p.date])
      const baseIndex = datasets.length
      datasets.push({ source })
      datasets.push({
        transform: {
          type: 'ecStat:regression',
          config: { method: 'polynomial', order: 3 }
        },
        // 指定来源数据集，确保回归基于对应散点数据
        fromDatasetIndex: baseIndex
      })

      // 散点系列
      series.push({
        name: `${label} 散点`,
        type: 'scatter',
        datasetIndex: baseIndex,
        symbolSize: 8,
        // 取消强调与标签，避免悬浮出现大标题字
        emphasis: { focus: 'none', scale: false, label: { show: false } },
        label: { show: false }
      })

      // 回归线系列
      series.push({
        name: `${label} 回归`,
        type: 'line',
        smooth: true,
        datasetIndex: baseIndex + 1,
        symbolSize: 0.1,
        symbol: 'circle',
        // 取消强调与标签
        emphasis: { focus: 'none', scale: false, label: { show: false } },
        label: { show: false }
      })

      legends.push(`${label} 散点`)
      legends.push(`${label} 回归`)
    })

    seriesCount.value = series.length

    // 初始化或更新图表
    await nextTick()
    if (!chartRef.value) return
    if (!chart) chart = echarts.init(chartRef.value)

    const option: echarts.EChartsOption = {
      title: { text: props.title || `${props.industryName || ''} - 资金流相关性散点图（含多项式回归）`, left: 'center', top: 10 },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          // 对散点项展示日期
          if (Array.isArray(params.data)) {
            const [x, y, date] = params.data
            const xLabel = xAxisOptions.find(o => o.value === xAxis.value)?.label || xAxis.value
            return `${date || ''}<br/>${xLabel}: ${typeof x === 'number' ? x.toFixed(2) : x}<br/>${params.seriesName}: ${typeof y === 'number' ? y.toFixed(2) : y}`
          }
          return `${params.seriesName}`
        },
        // 限制 tooltip 只在图表容器内显示，避免覆盖标题
        confine: true,
        appendToBody: true
      },
      legend: { top: 54, data: legends },
      grid: { left: 60, right: 30, top: 150, bottom: 40, containLabel: true },
      xAxis: { type: 'value', name: xAxisOptions.find(o => o.value === xAxis.value)?.label },
      yAxis: { type: 'value', name: '净流入(元)' },
      dataset: datasets,
      series
    }

    chart.setOption(option)
    chart.resize()
  } catch (error) {
    console.error(error)
    ElMessage.error('获取相关性散点数据失败')
  } finally {
    loading.value = false
  }
}

// 监听变更
watch(() => props.sectorCode, fetchAndRender)
watch([daysRange, xAxis, yAxes, sortOrder], fetchAndRender, { deep: true })

// 生命周期
onMounted(() => {
  fetchAndRender()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  chart?.resize()
}
</script>

<style scoped lang="scss">
.industry-fund-flow-correlation-scatter {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .title-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
    h3 { margin: 0; font-size: 18px; font-weight: 600; }
    .subtitle { color: #666; font-size: 12px; }
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  .control-group { display: flex; align-items: center; gap: 8px; }
  .control-label { color: #666; }
}

.chart-container {
  width: 100%;
}

/* 响应式 */
@media (max-width: 768px) {
  .controls { flex-direction: column; align-items: flex-start; }
}
</style>
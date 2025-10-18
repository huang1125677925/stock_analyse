<template>
  <div ref="chartContainer" class="heatmap-chart" :style="{ height: containerHeight + 'px' }"></div>
</template>

<script setup lang="ts">
/**
 * 通用热力图组件
 * 
 * 功能：
 * - 提供基础的ECharts热力图渲染功能
 * - 支持动态调整容器高度
 * - 支持自定义配置选项
 * - 支持响应式数据更新
 * 
 * Props:
 * - option: ECharts配置选项
 * - height: 图表高度（可选，默认自动计算）
 * - autoResize: 是否自动调整大小（默认true）
 * 
 * Events:
 * - chartReady: 图表初始化完成
 * - chartClick: 图表点击事件
 * 
 * 暴露方法:
 * - getChart: 获取ECharts实例
 * - resize: 手动调整图表大小
 * - clear: 清空图表
 */

import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import * as echarts from 'echarts'

interface Props {
  /** ECharts配置选项 */
  option: echarts.EChartsOption
  /** 图表高度，不设置则自动计算 */
  height?: number
  /** 是否自动调整大小 */
  autoResize?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoResize: true
})

const emit = defineEmits<{
  chartReady: [chart: echarts.ECharts]
  chartClick: [params: any]
}>()

const chartContainer = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

// 计算容器高度
const containerHeight = computed(() => {
  if (props.height) {
    return props.height
  }
  
  // 根据option中的数据自动计算高度
  const yAxisData = props.option?.yAxis as any
  if (yAxisData && Array.isArray(yAxisData) && yAxisData[0]?.data) {
    const dataLength = yAxisData[0].data.length
    return Math.max(500, dataLength * 22 + 120)
  } else if (yAxisData && yAxisData.data) {
    const dataLength = yAxisData.data.length
    return Math.max(500, dataLength * 22 + 120)
  }
  
  return 500
})

// 初始化图表
const initChart = () => {
  if (!chartContainer.value) return
  
  chart = echarts.init(chartContainer.value)
  
  // 绑定点击事件
  chart.on('click', (params) => {
    emit('chartClick', params)
  })
  
  emit('chartReady', chart)
  updateChart()
}

// 更新图表
const updateChart = () => {
  if (!chart || !props.option) return
  
  nextTick(() => {
    if (!chart) return
    
    chart.clear()
    chart.setOption(props.option)
    
    // 延迟执行resize，确保容器高度已更新
    setTimeout(() => {
      if (chart) {
        chart.resize()
      }
    }, 0)
  })
}

// 监听配置变化
watch(() => props.option, updateChart, { deep: true })

// 监听高度变化
watch(containerHeight, () => {
  nextTick(() => {
    if (chart) {
      chart.resize()
    }
  })
})

// 窗口大小变化时自动调整
const handleResize = () => {
  if (chart && props.autoResize) {
    chart.resize()
  }
}

onMounted(() => {
  initChart()
  if (props.autoResize) {
    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
  if (props.autoResize) {
    window.removeEventListener('resize', handleResize)
  }
})

// 暴露方法给父组件
defineExpose({
  /** 获取ECharts实例 */
  getChart: () => chart,
  /** 手动调整图表大小 */
  resize: () => {
    if (chart) {
      chart.resize()
    }
  },
  /** 清空图表 */
  clear: () => {
    if (chart) {
      chart.clear()
    }
  }
})
</script>

<style scoped lang="scss">
.heatmap-chart {
  width: 100%;
  min-height: 400px;
}
</style>
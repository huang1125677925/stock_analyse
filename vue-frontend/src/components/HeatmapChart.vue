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
 * - minAutoHeight: 自动计算时的最小高度（默认 500）
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
import { useIsMobile } from '@/composables/useIsMobile'

const { isMobile } = useIsMobile()

interface Props {
  /** ECharts配置选项 */
  option: echarts.EChartsOption
  /** 图表高度，不设置则自动计算 */
  height?: number
  /** 是否自动调整大小 */
  autoResize?: boolean
  /** 自动计算时的最小高度，默认 500 */
  minAutoHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoResize: true,
  minAutoHeight: 500
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

  // 移动端压缩每行高度与最小高度，避免过高的纵向滚动、提升单屏密度
  const perRow = isMobile.value ? 18 : 22
  const minH = isMobile.value ? Math.min(props.minAutoHeight, 360) : props.minAutoHeight

  // 根据option中的数据自动计算高度
  const yAxisData = props.option?.yAxis as any
  if (yAxisData && Array.isArray(yAxisData) && yAxisData[0]?.data) {
    const dataLength = yAxisData[0].data.length
    return Math.max(minH, dataLength * perRow + 120)
  } else if (yAxisData && yAxisData.data) {
    const dataLength = yAxisData.data.length
    return Math.max(minH, dataLength * perRow + 120)
  }

  return minH
})

// 隐藏 tooltip
const hideTip = () => chart?.dispatchAction({ type: 'hideTip' })

// 触摸/点击图表外部时隐藏 tooltip（移动端 tap 触发的 tooltip 没有“指针移出”事件，
// 不处理会一直悬浮；桌面端由 globalout 处理指针移出画布的情况）
const handleOutsidePointer = (e: Event) => {
  const target = e.target as Node | null
  if (chartContainer.value && target && chartContainer.value.contains(target)) return
  hideTip()
}

// 初始化图表
const initChart = () => {
  if (!chartContainer.value) return

  chart = echarts.init(chartContainer.value)

  // 绑定点击事件
  chart.on('click', (params) => {
    emit('chartClick', params)
  })

  // 指针移出画布时隐藏 tooltip，避免标签残留
  chart.getZr().on('globalout', hideTip)

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

// 容器尺寸变化时自动调整（ResizeObserver 能捕捉窗口 resize 之外的宽度变化，
// 如侧栏收起、Tab 切换显示等场景，避免画布被挤压或溢出）
let resizeObserver: ResizeObserver | null = null
let resizeRaf = 0
const handleResize = () => {
  if (!(chart && props.autoResize)) return
  cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => chart?.resize())
}

onMounted(() => {
  initChart()
  // 捕获阶段监听，触摸/点击图表外部时隐藏残留 tooltip
  document.addEventListener('touchstart', handleOutsidePointer, true)
  document.addEventListener('mousedown', handleOutsidePointer, true)
  if (props.autoResize) {
    window.addEventListener('resize', handleResize)
    if (typeof ResizeObserver !== 'undefined' && chartContainer.value) {
      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(chartContainer.value)
    }
  }
})

onUnmounted(() => {
  cancelAnimationFrame(resizeRaf)
  document.removeEventListener('touchstart', handleOutsidePointer, true)
  document.removeEventListener('mousedown', handleOutsidePointer, true)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
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

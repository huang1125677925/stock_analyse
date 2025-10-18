<template>
  <div class="industry-treemap">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="metric-selector">
        <label for="metric-select">选择指标：</label>
        <select 
          id="metric-select" 
          v-model="selectedMetric" 
          @change="updateTreemap"
          class="metric-select"
        >
          <option 
            v-for="metric in availableMetrics" 
            :key="metric.key" 
            :value="metric.key"
          >
            {{ metric.label }}
          </option>
        </select>
      </div>
      
      <div class="refresh-controls">
        <button @click="refreshData" :disabled="loading" class="refresh-btn">
          <span v-if="loading">刷新中...</span>
          <span v-else>刷新数据</span>
        </button>
        <span v-if="lastUpdateTime" class="update-time">
          最后更新：{{ formatTime(lastUpdateTime) }}
        </span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载行业数据...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <div class="error-message">
        <h3>数据加载失败</h3>
        <p>{{ error }}</p>
        <button @click="refreshData" class="retry-btn">重试</button>
      </div>
    </div>

    <!-- 矩形树图容器 -->
    <div v-else class="treemap-container">
      <div ref="treemapChart" class="treemap-chart"></div>
      
      <!-- 图例和统计信息 -->
      <div class="chart-info">
        <div class="legend">
          <h4>图例说明</h4>
          <div class="legend-items">
            <div class="legend-item positive">
              <span class="color-box positive"></span>
              <span>正值/上涨</span>
            </div>
            <div class="legend-item negative">
              <span class="color-box negative"></span>
              <span>负值/下跌</span>
            </div>
            <div class="legend-item neutral">
              <span class="color-box neutral"></span>
              <span>中性/无变化</span>
            </div>
          </div>
        </div>
        
        <div class="statistics">
          <h4>统计信息</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">行业总数：</span>
              <span class="stat-value">{{ totalIndustries }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">当前指标：</span>
              <span class="stat-value">{{ currentMetricLabel }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最大值：</span>
              <span class="stat-value">{{ formatValue(maxValue) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最小值：</span>
              <span class="stat-value">{{ formatValue(minValue) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 行业矩形树图组件
 * 功能：
 * 1. 展示各行业的矩形树图可视化
 * 2. 支持多种指标维度切换
 * 3. 提供数据刷新和实时更新
 * 4. 显示统计信息和图例说明
 * 
 * 参数：无
 * 返回值：无
 * 事件：无
 */
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { fetchIndustryStatistics, type IndustryStatistics } from '@/services/industryApi'

// 响应式数据
const loading = ref(false)
const error = ref<string | null>(null)
const industryData = ref<IndustryStatistics[]>([])
const selectedMetric = ref('total_market_cap_sum')
const lastUpdateTime = ref<Date | null>(null)
const treemapChart = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

// 可选择的指标配置
const availableMetrics = [
  { key: 'total_market_cap_sum', label: '总市值', unit: '元', isPercent: false },
  { key: 'circulating_market_cap_sum', label: '流通市值', unit: '元', isPercent: false },
  { key: 'avg_change_percent', label: '平均涨跌幅', unit: '%', isPercent: true },
  { key: 'total_volume', label: '总成交量', unit: '手', isPercent: false },
  { key: 'total_amount', label: '总成交额', unit: '元', isPercent: false },
  { key: 'avg_turnover_rate', label: '平均换手率', unit: '%', isPercent: true },
  { key: 'avg_pe_ratio', label: '平均市盈率', unit: '', isPercent: false },
  { key: 'avg_pb_ratio', label: '平均市净率', unit: '', isPercent: false },
  { key: 'stock_count', label: '股票数量', unit: '只', isPercent: false },
  { key: 'avg_change_60d', label: '60日平均涨跌幅', unit: '%', isPercent: true },
  { key: 'avg_change_ytd', label: '年初至今平均涨跌幅', unit: '%', isPercent: true }
]

// 计算属性
const currentMetricLabel = computed(() => {
  const metric = availableMetrics.find(m => m.key === selectedMetric.value)
  return metric?.label || ''
})

const totalIndustries = computed(() => industryData.value?.length || 0)

const maxValue = computed(() => {
  if (!industryData.value || industryData.value.length === 0) return 0
  return Math.max(...industryData.value.map(item => item[selectedMetric.value as keyof IndustryStatistics] as number))
})

const minValue = computed(() => {
  if (!industryData.value || industryData.value.length === 0) return 0
  return Math.min(...industryData.value.map(item => item[selectedMetric.value as keyof IndustryStatistics] as number))
})

// 方法定义
/**
 * 加载行业统计数据
 */
async function loadIndustryData() {
  try {
    loading.value = true
    error.value = null
    
    console.log('开始加载行业数据...')
    const data = await fetchIndustryStatistics()
    console.log('API响应数据:', data)
    
    industryData.value = data.industries || []
    console.log('设置industryData:', industryData.value)
    console.log('数据条数:', industryData.value?.length || 0)
    
    lastUpdateTime.value = new Date()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载数据失败'
    console.error('Failed to load industry data:', err)
  } finally {
    // 先关闭加载状态，使矩形树图容器渲染到 DOM 中，再更新图表
    loading.value = false
    await nextTick()
    console.log('DOM更新完成，开始更新树图')
    updateTreemap()
  }
}

/**
 * 刷新数据
 */
async function refreshData() {
  await loadIndustryData()
}

/**
 * 更新矩形树图
 */
function updateTreemap() {
  console.log('updateTreemap被调用')
  console.log('treemapChart.value:', treemapChart.value)
  console.log('industryData.value:', industryData.value)
  console.log('industryData长度:', industryData.value?.length || 0)
  
  if (!treemapChart.value) {
    console.error('treemapChart容器未找到')
    return
  }
  
  if (!industryData.value || industryData.value.length === 0) {
    console.error('industryData为空或未定义')
    return
  }
  
  // 初始化或获取图表实例
  if (!chartInstance) {
    console.log('初始化ECharts实例')
    chartInstance = echarts.init(treemapChart.value)
  }
  
  // 准备数据
  const metric = availableMetrics.find(m => m.key === selectedMetric.value)
  console.log('当前选择的指标:', metric)
  
  // 将后端数据稳健地转换为数值，避免 NaN/字符串导致空图
  const baseData = industryData.value.map(item => {
    const raw = item[selectedMetric.value as keyof IndustryStatistics] as unknown
    const num = typeof raw === 'number' ? raw : Number(raw)
    const originalValue = Number.isNaN(num) ? 0 : num
    const stockCount = typeof item.stock_count === 'number' && item.stock_count > 0 ? item.stock_count : 1
    return { industry: item.industry, originalValue, stockCount }
  })
  
  console.log('baseData处理结果:', baseData.slice(0, 3)) // 只打印前3条避免日志过长

  let treemapData = baseData.map(d => ({
    name: d.industry,
    value: Math.abs(d.originalValue),
    originalValue: d.originalValue,
    itemStyle: { color: getColorByValue(d.originalValue, metric?.isPercent || false) }
  }))

  console.log('初始treemapData:', treemapData.slice(0, 3))

  // 若所有值为 0（或等价于 0），则回退使用股票数量作为面积，保证图形可见
  const totalArea = treemapData.reduce((sum, it) => sum + it.value, 0)
  console.log('总面积:', totalArea)
  
  if (totalArea <= 0) {
    console.log('所有值为0，使用股票数量作为回退')
    treemapData = baseData.map(d => ({
      name: d.industry,
      value: d.stockCount,
      originalValue: d.originalValue,
      itemStyle: { color: getColorByValue(d.originalValue, metric?.isPercent || false) }
    }))
  }

  // 过滤无效数据
  treemapData = treemapData.filter(item => item.value > 0)
  console.log('过滤后的treemapData长度:', treemapData.length)
  console.log('最终treemapData:', treemapData.slice(0, 3))

  if (treemapData.length === 0) {
    console.error('treemapData为空，无法渲染图表')
    return
  }

  // 配置图表选项
  const option = {
    title: {
      text: `行业${currentMetricLabel.value}分布`,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params.data
        const sum = treemapData.reduce((s, it) => s + it.value, 0)
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${data.name}</div>
            <div>${currentMetricLabel.value}: ${formatValue(data.originalValue)}</div>
            <div>占比: ${sum > 0 ? ((data.value / sum) * 100).toFixed(2) : '0.00'}%</div>
          </div>
        `
      }
    },
    series: [{
      type: 'treemap',
      data: treemapData,
      roam: false,
      nodeClick: false,
      breadcrumb: { show: false },
      label: {
        show: true,
        // 标签显示原始指标值，避免在回退场景显示面积值造成误解
        formatter: (params: any) => `${params.name}\n${formatValue(params.data.originalValue)}`,
        fontSize: 12,
        color: '#fff',
        fontWeight: 'bold'
      },
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 2,
        gapWidth: 2
      },
      emphasis: {
        itemStyle: {
          borderColor: '#333',
          borderWidth: 3
        },
        label: {
          fontSize: 14
        }
      }
    }]
  }

  console.log('设置ECharts选项:', option)
  chartInstance.setOption(option)
  console.log('ECharts选项设置完成')
}

/**
 * 根据数值获取颜色
 */
function getColorByValue(value: number, isPercent: boolean): string {
  if (isPercent) {
    // 百分比类型，正值绿色，负值红色
    if (value > 0) return '#52c41a' // 绿色
    if (value < 0) return '#ff4d4f' // 红色
    return '#d9d9d9' // 灰色
  } else {
    // 非百分比类型，使用渐变色
    const colors = [
      '#1890ff', '#13c2c2', '#52c41a', '#faad14', 
      '#f759ab', '#722ed1', '#fa541c', '#eb2f96'
    ]
    const index = Math.abs(value.toString().charCodeAt(0)) % colors.length
    return colors[index]
  }
}

/**
 * 格式化数值显示
 */
function formatValue(value: number): string {
  const metric = availableMetrics.find(m => m.key === selectedMetric.value)
  
  if (metric?.isPercent) {
    return `${value.toFixed(2)}%`
  }
  
  if (metric?.unit === '元') {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}万亿`
    if (value >= 1e8) return `${(value / 1e8).toFixed(2)}亿`
    if (value >= 1e4) return `${(value / 1e4).toFixed(2)}万`
    return value.toFixed(2)
  }
  
  if (value >= 1e8) return `${(value / 1e8).toFixed(2)}亿`
  if (value >= 1e4) return `${(value / 1e4).toFixed(2)}万`
  
  return value.toFixed(2) + (metric?.unit || '')
}

/**
 * 格式化时间显示
 */
function formatTime(date: Date): string {
  return date.toLocaleString('zh-CN')
}

// 生命周期钩子
onMounted(async () => {
  await loadIndustryData()
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  })
})

onUnmounted(() => {
  // 清理图表实例
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  
  // 移除事件监听器
  window.removeEventListener('resize', () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  })
})
</script>

<style scoped lang="scss">
.industry-treemap {
  .control-panel {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 24px;
  }

  .metric-selector {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .metric-selector label {
    font-weight: 500;
    color: #333;
  }

  .metric-select {
    padding: 8px 12px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    font-size: 14px;
    min-width: 200px;
    background: white;
  }

  .metric-select:focus {
    border-color: #1890ff;
    outline: none;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }

  .refresh-controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .refresh-btn {
    padding: 8px 16px;
    background: #1890ff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s;
  }

  .refresh-btn:hover:not(:disabled) {
    background: #40a9ff;
  }

  .refresh-btn:disabled {
    background: #d9d9d9;
    cursor: not-allowed;
  }

  .update-time {
    font-size: 12px;
    color: #999;
  }

  .loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #1890ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-message {
    text-align: center;
  }

  .error-message h3 {
    color: #ff4d4f;
    margin-bottom: 8px;
  }

  .retry-btn {
    padding: 8px 16px;
    background: #ff4d4f;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    margin-top: 16px;
  }

  .treemap-container {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .treemap-chart {
    width: 100%;
    height: 600px;
  }

  .chart-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding: 24px;
    border-top: 1px solid #f0f0f0;
  }

  .legend h4, .statistics h4 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .legend-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .color-box {
    width: 16px;
    height: 16px;
    border-radius: 2px;
  }

  .color-box.positive {
    background-color: #52c41a;
  }

  .color-box.negative {
    background-color: #ff4d4f;
  }

  .color-box.neutral {
    background-color: #d9d9d9;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }

  .stat-label {
    color: #666;
    font-size: 14px;
  }

  .stat-value {
    font-weight: 600;
    color: #333;
    font-size: 14px;
  }

  @media (max-width: 768px) {
    .control-panel {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
    }
    
    .chart-info {
      grid-template-columns: 1fr;
    }
    
    .treemap-chart {
      height: 400px;
    }
  }
}
</style>
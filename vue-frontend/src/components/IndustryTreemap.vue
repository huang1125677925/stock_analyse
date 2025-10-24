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
 * 5. 支持行业白名单过滤（用于“仅看我的”）
 * 
 * 参数：
 * - industryWhitelist?: string[] 行业白名单，传入后仅显示该列表中的行业
 * 返回值：无
 * 事件：无
 */
import { ref, onMounted, computed, nextTick, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { fetchIndustryStatistics, type IndustryStatistics } from '@/services/industryApi'

interface Props {
  industryWhitelist?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  industryWhitelist: () => []
})

// 路由实例
const router = useRouter()

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

// 行业白名单过滤后的数据
const visibleIndustryData = computed<IndustryStatistics[]>(() => {
  if (!props.industryWhitelist || props.industryWhitelist.length === 0) return industryData.value
  const set = new Set(props.industryWhitelist.map(s => s.trim().toLowerCase()))
  return industryData.value.filter(item => set.has(item.industry.trim().toLowerCase()))
})

// 监听白名单变化，及时刷新树图
watch(() => props.industryWhitelist, () => {
  updateTreemap()
}, { deep: true })

// 监听可见数据变化，确保图表及时更新
watch(visibleIndustryData, () => {
  updateTreemap()
})

const totalIndustries = computed(() => visibleIndustryData.value?.length || 0)

const maxValue = computed(() => {
  const data = visibleIndustryData.value
  if (!data || data.length === 0) return 0
  return Math.max(...data.map(item => item[selectedMetric.value as keyof IndustryStatistics] as number))
})

const minValue = computed(() => {
  const data = visibleIndustryData.value
  if (!data || data.length === 0) return 0
  return Math.min(...data.map(item => item[selectedMetric.value as keyof IndustryStatistics] as number))
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
 * 处理矩形树图节点点击事件
 * @param params ECharts点击事件参数
 */
function handleTreemapClick(params: any) {
  const industryName = params.data.name
  console.log('点击行业:', industryName)
  
  // 跳转到股票列表页面，并传递行业参数
  router.push({
    path: '/stock-list',
    query: {
      industry: industryName
    }
  })
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
  
  const sourceData = visibleIndustryData.value
  if (!sourceData || sourceData.length === 0) {
    console.error('可见数据为空或未定义')
    // 清空图表，显示暂无数据
    if (chartInstance) {
      chartInstance.setOption({
        title: { text: '暂无数据', left: 'center', top: 'center' }
      })
      chartInstance.resize()
    }
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
  const baseData = sourceData.map(item => {
    const raw = item[selectedMetric.value as keyof IndustryStatistics] as unknown
    const num = typeof raw === 'number' ? raw : Number(raw)
    const originalValue = Number.isNaN(num) ? 0 : num
    const stockCount = typeof item.stock_count === 'number' && item.stock_count > 0 ? item.stock_count : 1
    
    // 根据指标类型选择值（示例：百分比指标不做额外处理）
    const value = originalValue
    
    return {
      name: item.industry,
      value,
      stockCount,
      metricKey: selectedMetric.value
    }
  })
  
  // 构建矩形树图数据结构
  const treemapSeriesData = baseData.map(item => ({
    name: item.name,
    value: Math.abs(item.value),
    children: [
      {
        name: `${item.name}`,
        value: Math.abs(item.value),
        originalValue: item.value,
        label: {
          show: true,
          formatter: (params: any) => `${params.name}\n${formatValue(params.data.originalValue)}`
        },
        itemStyle: {
          color: item.value > 0 ? '#73C0DE' : item.value < 0 ? '#EE6666' : '#999'
        }
      }
    ]
  }))
  
  // 设置图表配置
  const option: echarts.EChartsOption = {
    title: {
      text: `行业矩形树图（${metric?.label || ''}）`,
      left: 'center'
    },
    tooltip: {
      formatter: (params: any) => {
        const nameStr = typeof params?.name === 'string' ? params.name : ''
        const baseName = nameStr.replace(/\s*\(.+\)\s*$/, '')
        // 优先使用节点携带的原始值
        const originalVal = (params?.data && 'originalValue' in params.data) ? Number(params.data.originalValue) : undefined
        const dataItem = sourceData.find(i => i.industry === baseName)
        const valueToShow = originalVal !== undefined ? originalVal : dataItem ? (dataItem[selectedMetric.value as keyof IndustryStatistics] as number) : 0
        return `${baseName}<br/>${metric?.label || ''}: ${formatValue(Number(valueToShow))}`
      }
    },
    series: [{
      type: 'treemap',
      data: treemapSeriesData,
      roam: true,
      nodeClick: false,
      breadcrumb: { show: false },
      label: {
        show: true,
        color: '#2c3e50',
        textShadowColor: 'rgba(255,255,255,0.9)',
        textShadowBlur: 2,
        textShadowOffsetX: 0,
        textShadowOffsetY: 0
      },
      // 增强边界与间隙，使块之间更清晰
      itemStyle: {
        borderColor: '#ffffff',
        borderWidth: 1,
        gapWidth: 2
      },
      // 分层配置，父层与子层边界区分更明显
      levels: [
        {
          itemStyle: {
            borderColor: '#e5e7eb',
            borderWidth: 1,
            gapWidth: 3
          },
          upperLabel: {
            show: false
          }
        },
        {
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 1,
            gapWidth: 2
          }
        }
      ],
      // 鼠标悬停强调，边界更明显
      emphasis: {
        itemStyle: {
          borderColor: '#409EFF',
          borderWidth: 2
        }
      }
    }]
  }
  
  chartInstance.setOption(option)
  chartInstance.resize()
  chartInstance.off('click')
  chartInstance.on('click', handleTreemapClick)
}

// 添加窗口resize处理，确保tab切换后图表自适应
function handleResize() {
  if (chartInstance) {
    chartInstance.resize()
  }
}

onMounted(async () => {
  await loadIndustryData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})

function formatValue(val: number): string {
  const metric = availableMetrics.find(m => m.key === selectedMetric.value)
  const value = typeof val === 'number' ? val : Number(val)
  if (Number.isNaN(value)) return '--'

  if (metric?.isPercent) {
    return `${value.toFixed(2)}%`
  }

  if (metric?.unit === '元') {
    const abs = Math.abs(value)
    if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}万亿`
    if (abs >= 1e8) return `${(value / 1e8).toFixed(2)}亿`
    if (abs >= 1e4) return `${(value / 1e4).toFixed(2)}万`
    return value.toFixed(2)
  }

  if (metric?.unit === '手') {
    const abs = Math.abs(value)
    if (abs >= 1e8) return `${(value / 1e8).toFixed(2)}亿手`
    if (abs >= 1e4) return `${(value / 1e4).toFixed(2)}万手`
    return `${value.toFixed(2)}手`
  }

  if (metric?.unit) {
    return `${value.toFixed(2)}${metric.unit}`
  }

  return value.toFixed(2)
}

function formatTime(date: Date): string {
  try {
    return new Date(date).toLocaleString('zh-CN')
  } catch {
    return ''
  }
}
</script>

<style scoped lang="scss">
.industry-treemap {
  .treemap-container {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 16px;
    align-items: start;
  }

  .treemap-chart {
    width: 100%;
    height: 560px; // 确保图表容器有高度，否则不显示
    min-height: 420px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background-color: #fff;
  }

  .chart-info {
    padding: 12px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background-color: #fff;

    .legend {
      margin-bottom: 12px;

      .legend-items {
        display: flex;
        gap: 12px;

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;

          .color-box {
            width: 12px;
            height: 12px;
            border-radius: 2px;

            &.positive { background-color: #73C0DE; }
            &.negative { background-color: #EE6666; }
            &.neutral { background-color: #999; }
          }
        }
      }
    }

    .statistics {
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px 12px;

        .stat-item {
          display: flex;
          justify-content: space-between;

          .stat-label { color: #606266; }
          .stat-value { color: #303133; }
        }
      }
    }
  }

  @media (max-width: 1200px) {
    .treemap-container {
      grid-template-columns: 1fr;
    }
    .treemap-chart {
      height: 480px;
    }
  }
}
</style>
<template>
  <div class="performance-analysis">
    <div class="controls">
      <!-- 业绩指标选择 -->
      <MetricSelector 
        v-model="selectedMetric" 
        @change="updateChart" 
        style="margin-right: 10px;"
      />
      
      <!-- 报告类型选择 -->
      <ReportTypeSelector 
        v-model="reportType" 
        @change="updateChart" 
        style="margin-right: 10px;"
      />
      
      <el-button @click="sortByLastColumn" type="primary">按最后一列排序</el-button>
    </div>
    
    <div class="chart-container">
      <!-- 业绩指标热力图 -->
      <PerformanceHeatmap 
        :data="industryHeatmapData"
        :selected-metric="selectedMetric"
        :sort-ascending="sortAscending"
        @chart-ready="handleChartReady"
        @chart-click="handleChartClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 行业业绩指标分析组件
 * 功能：显示行业业绩指标热力图，支持多种业绩指标和报告类型
 * 参数：无
 * 返回值：无
 * 事件：chart-ready, chart-click
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchIndustryHeatmapData, HeatmapMetricType } from '@/services/industry-heatmap'
import type { IndustryHeatmapData } from '@/services/industry-heatmap'
import MetricSelector from '@/components/MetricSelector.vue'
import ReportTypeSelector from '@/components/ReportTypeSelector.vue'
import PerformanceHeatmap from '@/components/PerformanceHeatmap.vue'

// 响应式变量
const router = useRouter()
const selectedMetric = ref(HeatmapMetricType.OPERATING_REVENUE_GROWTH)
const reportType = ref('annual')
const sortAscending = ref(true)
const loading = ref(false)

// 数据存储
const industryHeatmapData = ref<IndustryHeatmapData | null>(null)

// 获取行业业绩数据
const fetchPerformanceData = async () => {
  loading.value = true
  try {
    const response = await fetchIndustryHeatmapData(
      undefined, // searchKeyword removed
      reportType.value,
      undefined, // startDate
      undefined  // endDate
    )
    
    if (response) {
      industryHeatmapData.value = response
    } else {
      ElMessage.error('获取行业业绩数据失败')
    }
  } catch (error) {
    console.error('获取业绩数据出错:', error)
    ElMessage.error('获取业绩数据出错，请检查网络连接或API服务是否可用')
  } finally {
    loading.value = false
  }
}

// 更新图表
const updateChart = () => {
  fetchPerformanceData()
}

// 按最后一列排序
const sortByLastColumn = () => {
  sortAscending.value = !sortAscending.value
}

// 图表事件处理
const handleChartReady = (chartInstance: any) => {
  // 图表准备就绪
}

const handleChartClick = (payload: any) => {
  // 图表点击事件：使用结构化 payload 的行业对象进行跳转，避免索引错位
  console.log('Performance chart clicked payload:', payload)

  const industryName = payload?.industry?.indexName || payload?.industry?.indexCode
  if (!industryName) return

  router.push({
    path: '/stock-list',
    query: { industry: industryName }
  })

  ElMessage.success(`正在跳转到 ${industryName} 的股票列表`)
}

// 组件挂载时获取数据
onMounted(() => {
  fetchPerformanceData()
})
</script>

<style scoped lang="scss">
.performance-analysis {
  .controls {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    gap: 10px;
  }
  
  .chart-container {
    width: 100%;
    min-height: 500px;
  }
}
</style>
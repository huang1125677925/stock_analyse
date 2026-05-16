<template>
  <div class="industry-breadth-analysis">
    <el-card class="control-card" shadow="hover">
      <div class="controls">
        <div class="control-group">
          <span class="control-label">时间范围：</span>
          <el-select v-model="recentDays" placeholder="选择最近天数" :disabled="loading" @change="handleParamsChange" style="width: 160px">
            <el-option :label="'最近20天'" :value="20" />
            <el-option :label="'最近30天'" :value="30" />
            <el-option :label="'最近40天'" :value="40" />
          </el-select>
        </div>
        <div class="control-group">
          <span class="control-label">MA窗口：</span>
          <el-input-number v-model="maWindow" :min="5" :max="120" :step="5" :disabled="loading" @change="handleParamsChange" />
        </div>
        <div class="control-group">
          <el-button type="primary" :loading="loading" @click="fetchData">刷新</el-button>
        </div>
        <div class="control-group">
          <el-button 
            type="default" 
            :disabled="loading || !rawData.length" 
            @click="toggleLastColumnSort"
            :icon="sortByLastColumn ? 'SortDown' : 'Sort'"
          >
            {{ sortByLastColumn ? '取消排序' : '按最后一列排序' }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="chart-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>行业宽度热力图（MA {{ maWindow }}）</span>
          <span class="tips">数据来源：行业MA宽度接口</span>
        </div>
      </template>

      <div class="methodology">
        <p>
          统计口径：基于申万一级行业分类及行业成分股映射，将股票归入对应行业后，按交易日统计各行业内部走势强弱。
        </p>
        <p>
          计算方式：行业宽度 = 收盘价高于 MA{{ maWindow }} 的股票数 / 行业内可统计股票总数。数值越高，表示该行业内站上均线的股票占比越高，整体走势越强。
        </p>
      </div>

      <HeatmapChart
        v-if="heatmapOption"
        :option="heatmapOption"
        @chart-ready="onChartReady"
        @chart-click="onChartClick"
      />

      <div v-else class="empty-tip">暂无数据</div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 行业宽度热力图组件
 * 功能：
 * - 使用行业MA宽度数据渲染热力图（日期 × 行业，值为宽度比例）
 * - 支持选择时间范围与MA窗口
 * 
 * 返回值：无
 * 事件（Emits）：
 * - chartReady(chart): 图表初始化完成
 * - chartClick(payload): 图表点击事件，包含 { industry, date, value }
 */
import { ref, computed, onMounted } from 'vue'
import * as echarts from 'echarts'
import HeatmapChart from '@/components/HeatmapChart.vue'
import { fetchIndustryMaBreadth, type IndustryMaBreadthItem } from '@/services/strategyBreadthApi'

const emit = defineEmits<{ chartReady: [chart: echarts.ECharts]; chartClick: [payload: { industry: string; date: string; value: number }] }>()

const loading = ref(false)
const recentDays = ref<number>(20)
const maWindow = ref<number>(20)
const sortByLastColumn = ref(true)

// 计算日期范围字符串（YYYY-MM-DD）
function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function computeDateRangeByRecentDays(days: number): [string, string] {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  return [formatDate(start), formatDate(end)]
}

const rawData = ref<IndustryMaBreadthItem[]>([])

// 切换按最后一列排序的状态
const toggleLastColumnSort = () => {
  sortByLastColumn.value = !sortByLastColumn.value
}

// 计算行业与日期维度
const industries = computed<string[]>(() => {
  const names = Array.from(new Set(rawData.value.map(d => d.sector_name)))
  
  // 如果启用按最后一列排序
  if (sortByLastColumn.value && dates.value.length > 0) {
    const lastDate = dates.value[dates.value.length - 1]
    
    // 获取每个行业在最后一个日期的数据
    const industryLastValues = new Map<string, number>()
    rawData.value.forEach(item => {
      if (item.date === lastDate && names.includes(item.sector_name)) {
        const val = typeof item.breadth_ratio === 'number' ? item.breadth_ratio : Number(item.breadth_ratio)
        industryLastValues.set(item.sector_name, Number.isNaN(val) ? 0 : val)
      }
    })
    
    // 按最后一列的值降序排序
    names.sort((a, b) => {
      const valueA = industryLastValues.get(a) || 0
      const valueB = industryLastValues.get(b) || 0
      return valueA - valueB || 0
    })
  }
  
  return names
})

const dates = computed<string[]>(() => {
  const ds = Array.from(new Set(rawData.value.map(d => d.date))).sort()
  return ds
})

// 构建热力图矩阵数据 [x(dateIndex), y(industryIndex), value]
const heatmapData = computed<[number, number, number][]>(() => {
  const dateIndex = new Map(dates.value.map((d, i) => [d, i]))
  const industryIndex = new Map(industries.value.map((n, i) => [n, i]))
  const points: [number, number, number][] = []
  rawData.value.forEach(item => {
    const di = dateIndex.get(item.date)
    const ii = industryIndex.get(item.sector_name)
    if (di !== undefined && ii !== undefined) {
      const val = typeof item.breadth_ratio === 'number' ? item.breadth_ratio : Number(item.breadth_ratio)
      points.push([di, ii, Number.isNaN(val) ? 0 : val])
    }
  })
  return points
})

// 计算热力图配置
const heatmapOption = computed<echarts.EChartsOption | null>(() => {
  if (dates.value.length === 0 || industries.value.length === 0 || heatmapData.value.length === 0) return null
  return {
    animation: false,
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [x, y, v] = params?.data ?? []
        const date = typeof x === 'number' ? dates.value[x] : ''
        const industry = typeof y === 'number' ? industries.value[y] : ''
        return `${date}<br/>${industry}<br/>宽度比例: ${(Number(v) * 100).toFixed(2)}%`
      }
    },
    // 加大左右与顶部边距，给上方日期与右侧颜色条留空间
    grid: { left: 140, right: 80, top: 80, bottom: 20 },
    xAxis: {
      type: 'category',
      data: dates.value,
      // 将日期轴放在上方，并优化标签拥挤问题
      position: 'top',
      axisLabel: { rotate: 0, hideOverlap: true, interval: 'auto' }
    },
    yAxis: {
      type: 'category',
      data: industries.value
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: true,
      // 改为纵向颜色条放在右侧
      orient: 'vertical',
      right: 10,
      top: 40,
      bottom: 40,
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      }
    },
    series: [{
      type: 'heatmap',
      data: heatmapData.value,
      itemStyle: { borderColor: '#fff', borderWidth: 1 },
      emphasis: { itemStyle: { shadowBlur: 5, shadowColor: 'rgba(0, 0, 0, 0.3)' } }
    }]
  }
})

// 拉取数据
const fetchData = async () => {
  loading.value = true
  try {
    const [start, end] = computeDateRangeByRecentDays(recentDays.value)
    const data = await fetchIndustryMaBreadth(start, end, maWindow.value)
    rawData.value = data.data ?? []
  } catch (err) {
    console.error('获取行业MA宽度数据失败:', err)
  } finally {
    loading.value = false
  }
}

const handleParamsChange = () => {
  fetchData()
}

const onChartReady = (chart: echarts.ECharts) => emit('chartReady', chart)
const onChartClick = (params: any) => {
  const [x, y, v] = (params?.data ?? []) as [number, number, number]
  const payload = {
    date: typeof x === 'number' ? dates.value[x] : '',
    industry: typeof y === 'number' ? industries.value[y] : '',
    value: typeof v === 'number' ? v : 0
  }
  emit('chartClick', payload)
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.industry-breadth-analysis {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-card {
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
  }
  .control-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .control-label {
    color: #666;
  }
}

.chart-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }
  .methodology {
    margin-bottom: 16px;
    padding: 12px 14px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #f7f8fa;
    color: #606266;
    font-size: 13px;
    line-height: 1.7;
  }
  .methodology p { margin: 0; }
  .methodology p + p { margin-top: 6px; }
  .tips { color: #999; font-size: 12px; }
  .empty-tip { color: #999; padding: 24px; text-align: center; }
}
</style>

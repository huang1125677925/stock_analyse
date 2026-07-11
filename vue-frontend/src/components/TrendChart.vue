<template>
  <div class="trend-chart-container">
    <div class="chart-header">
      <div class="chart-controls">
        <div class="control-group">
          <label>时间范围：</label>
          <el-select v-model="dateRangeType" @change="handleDateRangeChange" style="width: 120px">
            <el-option label="最近一周" value="week" />
            <el-option label="最近一月" value="month" />
            <el-option label="最近三月" value="threeMonths" />
            <el-option label="最近六月" value="sixMonths" />
            <el-option label="最近一年" value="year" />
            <el-option label="最近三年" value="threeYears" />
            <el-option label="全部" value="all" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </div>
        <div class="control-group" v-if="dateRangeType === 'custom'">
          <label>开始日期：</label>
          <el-date-picker
            v-model="startDate"
            type="date"
            placeholder="选择开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="updateChart"
          />
        </div>
        <div class="control-group" v-if="dateRangeType === 'custom'">
          <label>结束日期：</label>
          <el-date-picker
            v-model="endDate"
            type="date"
            placeholder="选择结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="updateChart"
          />
        </div>
        <div class="control-group">
          <label>图表类型：</label>
          <el-select v-model="chartType" @change="updateChart" style="width: 120px">
            <el-option label="折线图" value="line" />
            <el-option label="柱状图" value="bar" />
            <el-option label="散点图" value="scatter" />
            <el-option label="面积图" value="area" />
          </el-select>
        </div>
        <div class="control-group">
          <label>Y轴字段：</label>
          <el-select
            v-model="selectedYFields"
            multiple
            placeholder="选择要显示的字段"
            @change="updateChart"
            style="width: 250px"
          >
            <el-option
              v-for="field in availableYFields"
              :key="field.key"
              :label="field.label"
              :value="field.key"
            />
          </el-select>
        </div>
        <el-button type="primary" @click="updateChart">更新图表</el-button>
        <el-button @click="resetZoom">重置缩放</el-button>
      </div>
    </div>
    
    <div ref="chartContainer" class="chart-container"></div>
    
    <div class="stats-section" v-if="filteredData.length > 0">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ filteredData.length }}</div>
          <div class="stat-label">总记录数</div>
        </div>
        <div class="stat-card" v-for="field in selectedYFields" :key="field">
          <div class="stat-value">{{ getFieldStats(field).avg }}</div>
          <div class="stat-label">{{ getFieldLabel(field) }}平均值</div>
        </div>
        <div class="stat-card" v-for="field in selectedYFields" :key="'min-' + field">
          <div class="stat-value">{{ getFieldStats(field).min }}</div>
          <div class="stat-label">{{ getFieldLabel(field) }}最小值</div>
        </div>
        <div class="stat-card" v-for="field in selectedYFields" :key="'max-' + field">
          <div class="stat-value">{{ getFieldStats(field).max }}</div>
          <div class="stat-label">{{ getFieldLabel(field) }}最大值</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useIsMobile } from '@/composables/useIsMobile'

const { isMobile } = useIsMobile()

interface TrendDataItem {
  [key: string]: any
  date?: string
}

interface YFieldConfig {
  key: string
  label: string
  color?: string
  yAxisIndex?: number
}

interface Props {
  title?: string
  data: TrendDataItem[]
  dateField?: string
  yFields: YFieldConfig[]
  defaultSelectedFields?: string[]
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '趋势分析图表',
  dateField: 'date',
  defaultSelectedFields: () => [],
  height: '600px'
})

const chartContainer = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const startDate = ref('')
const endDate = ref('')
const chartType = ref('line')
const selectedYFields = ref<string[]>([])
const dateRangeType = ref('all')

const availableYFields = computed(() => props.yFields)

// 移动端压缩图表高度以提升单屏内容密度
const effectiveHeight = computed(() => (isMobile.value ? '320px' : props.height))

const filteredData = computed(() => {
  if (!props.data || props.data.length === 0) return []
  
  let result = [...props.data]
  
  // 按日期过滤
  if (startDate.value && endDate.value) {
    result = result.filter(item => {
      const itemDate = item[props.dateField]
      return itemDate >= startDate.value && itemDate <= endDate.value
    })
  }
  
  // 按日期排序
  result.sort((a, b) => {
    const dateA = new Date(a[props.dateField])
    const dateB = new Date(b[props.dateField])
    return dateA.getTime() - dateB.getTime()
  })
  
  return result
})

const getFieldLabel = (fieldKey: string) => {
  const field = props.yFields.find(f => f.key === fieldKey)
  return field?.label || fieldKey
}

const getFieldStats = (fieldKey: string) => {
  const values = filteredData.value
    .map(item => parseFloat(item[fieldKey]))
    .filter(val => !isNaN(val))
  
  if (values.length === 0) {
    return { min: '0', max: '0', avg: '0' }
  }
  
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length
  
  return {
    min: min.toFixed(2),
    max: max.toFixed(2),
    avg: avg.toFixed(2)
  }
}

const handleDateRangeChange = () => {
  if (!props.data || props.data.length === 0) return
  
  const dates = props.data.map(item => item[props.dateField]).sort()
  const today = new Date()
  const endDateStr = dates[dates.length - 1]
  
  // 设置结束日期为数据中的最后一天或今天（取较早的）
  endDate.value = endDateStr
  
  // 根据选择的时间范围设置开始日期
  switch (dateRangeType.value) {
    case 'week':
      // 最近一周
      startDate.value = getDateBefore(endDateStr, 7)
      break
    case 'month':
      // 最近一月
      startDate.value = getDateBefore(endDateStr, 30)
      break
    case 'threeMonths':
      // 最近三月
      startDate.value = getDateBefore(endDateStr, 90)
      break
    case 'sixMonths':
      // 最近六月
      startDate.value = getDateBefore(endDateStr, 180)
      break
    case 'year':
      // 最近一年
      startDate.value = getDateBefore(endDateStr, 365)
      break
    case 'threeYears':
      // 最近三年
      startDate.value = getDateBefore(endDateStr, 365 * 3)
      break
    case 'all':
      // 全部数据
      startDate.value = dates[0]
      break
    case 'custom':
      // 自定义范围，不做处理，保留用户选择的值
      break
  }
  
  updateChart()
}

// 获取指定日期前n天的日期
const getDateBefore = (dateStr: string, days: number) => {
  const date = new Date(dateStr)
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

const initChart = () => {
  if (!chartContainer.value) return
  
  chart = echarts.init(chartContainer.value)
  
  // 设置初始日期范围
  if (props.data && props.data.length > 0) {
    const dates = props.data.map(item => item[props.dateField]).sort()
    startDate.value = dates[0]
    endDate.value = dates[dates.length - 1]
  }
  
  // 设置默认选中的字段
  if (props.defaultSelectedFields.length > 0) {
    selectedYFields.value = [...props.defaultSelectedFields]
  } else if (props.yFields.length > 0) {
    selectedYFields.value = [props.yFields[0].key]
  }
  
  // 默认选择全部时间范围
  dateRangeType.value = 'all'
  
  updateChart()
}

const updateChart = async () => {
  if (!chart || selectedYFields.value.length === 0) return
  
  await nextTick()
  
  const dates = filteredData.value.map(item => item[props.dateField])
  
  // 默认颜色数组
  const defaultColors = [
    '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', 
    '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'
  ]
  
  // 准备系列数据
  const series = selectedYFields.value.map((fieldKey, index) => {
    const fieldConfig = props.yFields.find(f => f.key === fieldKey)
    const data = filteredData.value.map(item => parseFloat(item[fieldKey]) || 0)
    
    const seriesConfig: any = {
      name: fieldConfig?.label || fieldKey,
      type: chartType.value === 'area' ? 'line' : chartType.value,
      data: data,
      yAxisIndex: fieldConfig?.yAxisIndex || 0,
      itemStyle: {
        color: fieldConfig?.color || defaultColors[index % defaultColors.length]
      },
      emphasis: {
        focus: 'series'
      }
    }
    
    if (chartType.value === 'area') {
      seriesConfig.areaStyle = {
        opacity: 0.3
      }
    }
    
    return seriesConfig
  })
  
  // 准备Y轴配置
  const yAxes: any[] = []
  const usedYAxisIndices = new Set(selectedYFields.value.map(fieldKey => {
    const fieldConfig = props.yFields.find(f => f.key === fieldKey)
    return fieldConfig?.yAxisIndex || 0
  }))
  
  Array.from(usedYAxisIndices).forEach((yAxisIndex, index) => {
    yAxes.push({
      type: 'value',
      name: index === 0 ? '主轴' : `副轴${index}`,
      position: index === 0 ? 'left' : 'right',
      axisLine: {
        lineStyle: {
          color: defaultColors[index % defaultColors.length]
        }
      }
    })
  })
  
  const mobile = isMobile.value

  const option = {
    title: {
      // text: props.title,
      subtext: `数据范围: ${startDate.value} 至 ${endDate.value} (共${filteredData.value.length}条记录)`,
      left: 'center',
      subtextStyle: { fontSize: mobile ? 10 : 12 }
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: function(params: any) {
        const dataIndex = params[0].dataIndex
        const dataItem = filteredData.value[dataIndex]
        let result = `日期: ${dataItem[props.dateField]}<br/>`

        params.forEach((param: any) => {
          result += `${param.seriesName}: ${param.value}<br/>`
        })

        return result
      }
    },
    legend: {
      data: selectedYFields.value.map(fieldKey => getFieldLabel(fieldKey)),
      type: 'scroll',
      top: mobile ? 26 : 40,
      textStyle: { fontSize: mobile ? 11 : 12 }
    },
    grid: {
      left: mobile ? 6 : '3%',
      right: mobile ? 10 : (yAxes.length > 1 ? '8%' : '4%'),
      top: mobile ? 56 : 70,
      bottom: mobile ? 64 : '15%',
      containLabel: true
    },
    // 移动端隐藏 toolbox，避免与 legend / 标题重叠
    toolbox: {
      show: !mobile,
      feature: {
        dataZoom: {
          yAxisIndex: 'none'
        },
        restore: {},
        saveAsImage: {}
      }
    },
    dataZoom: mobile
      // 移动端仅保留内置缩放 + 底部独立滑块，滑块留出独立高度不压 x 轴标签
      ? [
          { type: 'inside', start: 0, end: 100 },
          { type: 'slider', height: 16, bottom: 6, start: 0, end: 100 }
        ]
      : [
          { type: 'inside', start: 0, end: 100 },
          { start: 0, end: 100 }
        ],
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: mobile ? 45 : 45,
        hideOverlap: true,
        interval: 'auto',
        fontSize: mobile ? 10 : 12
      }
    },
    yAxis: yAxes,
    series: series
  }

  chart.setOption(option, true)
}

const resetZoom = () => {
  if (!chart) return
  
  chart.dispatchAction({
    type: 'dataZoom',
    start: 0,
    end: 100
  })
}

const handleResize = () => {
  if (chart) {
    chart.resize()
  }
}

watch(() => props.data, () => {
  if (chart) {
    // 重新设置日期范围
    if (props.data && props.data.length > 0) {
      // 如果是自定义日期范围，保留用户选择的值
      // 否则根据选择的时间范围类型重新计算日期范围
      if (dateRangeType.value !== 'custom') {
        handleDateRangeChange()
      } else {
        updateChart()
      }
    }
  }
}, { deep: true })

// 断点切换时重算 option 并 resize（高度也随之变化）
watch(isMobile, () => {
  if (!chart) return
  updateChart()
  nextTick(() => chart?.resize())
})

onMounted(() => {
  nextTick(() => {
    initChart()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.trend-chart-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 20px 0;
}

.chart-header {
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 15px;
}

.chart-header h3 {
  color: #333;
  margin: 0 0 15px 0;
  font-size: 20px;
  text-align: center;
}

.chart-controls {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.control-group label {
  font-weight: bold;
  color: #555;
  font-size: 14px;
  white-space: nowrap;
}

.chart-container {
  width: 100%;
  height: v-bind(effectiveHeight);
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.stats-section {
  margin-top: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.stat-card {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  text-align: center;
  border-left: 4px solid #1890ff;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #1890ff;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chart-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .control-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .control-group label {
    margin-bottom: 5px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }
}
</style>
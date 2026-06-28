<template>
  <div class="industry-turnover-heatmap">
    <el-card>
      <div class="header-controls">
        <h3>行业成交额分析</h3>
        <div class="control-group">
          <el-select
            v-model="selectedLevel"
            placeholder="行业层级"
            :disabled="loading"
            @change="fetchData"
            style="width: 160px; margin-right: 10px;"
          >
            <el-option
              v-for="option in levelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-date-picker
            v-model="endDate"
            type="date"
            placeholder="截止日期"
            :disabled="loading"
            :clearable="false"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="fetchData"
            style="width: 160px; margin-right: 10px;"
          />
          <span class="days-hint">最近 20 天</span>
        </div>
      </div>
      
      <el-tabs v-model="activeTab" type="border-card" @tab-click="handleTabChange">
        <el-tab-pane label="板块成交额热力图" name="amount">
          <div class="chart-section" v-loading="loading">
            <HeatmapChart 
              :option="amountChartOption" 
              @chart-click="handleChartClick"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane label="占总额比例热力图" name="ratio">
          <div class="chart-section" v-loading="loading">
            <HeatmapChart 
              :option="ratioChartOption" 
              @chart-click="handleChartClick"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane label="成交额百分位排名热力图" name="percentile">
          <div class="chart-section" v-loading="loading">
            <HeatmapChart 
              :option="percentileChartOption" 
              @chart-click="handleChartClick"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 行业成交额热力图分析页面
 * 
 * 功能：
 * - 展示板块成交额热力图
 * - 展示占总额比例热力图
 * - 展示成交额百分位排名热力图
 * - 支持行业层级选择
 * - 支持截止日期选择，最近天数固定为20天
 * 
 * 参数：无
 * 返回值：无
 * 事件：
 * - chart-click: 点击热力图单元格
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { fetchIndustryTurnoverPercentile } from '@/services/industry-turnover-percentile'
import type { IndustryTurnoverPercentileItem } from '@/services/industry-turnover-percentile'
import type { EastMoneyIndustryLevel } from '@/services/strategyBreadthApi'
import HeatmapChart from '@/components/HeatmapChart.vue'

const router = useRouter()
const loading = ref(false)
const activeTab = ref('amount')
const selectedLevel = ref<EastMoneyIndustryLevel>('东财一级行业')
const endDate = ref(new Date().toISOString().split('T')[0])
const recentDays = 20

const levelOptions: Array<{ label: EastMoneyIndustryLevel; value: EastMoneyIndustryLevel }> = [
  { label: '东财一级行业', value: '东财一级行业' },
  { label: '东财二级行业', value: '东财二级行业' },
  { label: '东财三级行业', value: '东财三级行业' }
]

interface HeatmapDataRow {
  sector_code: string
  sector_name: string
  date: string
  amount: number
  amount_ratio: number
  amount_percentile: number
}

const heatmapData = ref<HeatmapDataRow[]>([])
const allDates = ref<string[]>([])
const allIndustries = ref<string[]>([])

const fetchData = async () => {
  loading.value = true
  try {
    const endDateValue = endDate.value
    const startDate = new Date(endDateValue)
    startDate.setDate(startDate.getDate() - recentDays)
    const startDateValue = startDate.toISOString().split('T')[0]

    const response = await fetchIndustryTurnoverPercentile({
      startDate: startDateValue,
      endDate: endDateValue,
      idxType: '行业板块',
      level: selectedLevel.value
    })

    if (response && response.data) {
      const apiData = response.data
      
      if (!Array.isArray(apiData)) {
        throw new Error('API返回的数据格式不正确')
      }

      const uniqueDates = [...new Set(apiData.map((item: IndustryTurnoverPercentileItem) => item.date))].sort() as string[]
      const uniqueIndustries = [...new Set(apiData.map((item: IndustryTurnoverPercentileItem) => item.sector_name))]
      
      allDates.value = uniqueDates
      allIndustries.value = uniqueIndustries

      heatmapData.value = apiData.map((item: IndustryTurnoverPercentileItem) => ({
        sector_code: item.sector_code,
        sector_name: item.sector_name,
        date: item.date,
        amount: item.amount ?? 0,
        amount_ratio: (item.amount_ratio ?? item.turnover_ratio ?? 0) * 100,
        amount_percentile: item.amount_percentile ?? item.turnover_ratio_percentile ?? 0
      }))
    }
  } catch (error) {
    console.error('获取数据出错:', error)
    ElMessage.error('获取数据出错，请检查网络连接或API服务是否可用')
  } finally {
    loading.value = false
  }
}

const generateHeatmapOption = (
  metric: 'amount' | 'ratio' | 'percentile',
  title: string,
  min: number,
  max: number,
  formatValue: (v: number) => string
): echarts.EChartsOption => {
  const data: [number, number, number][] = []
  
  heatmapData.value.forEach((item) => {
    const dateIndex = allDates.value.indexOf(item.date)
    const industryIndex = allIndustries.value.indexOf(item.sector_name)
    
    if (dateIndex >= 0 && industryIndex >= 0) {
      let value: number
      switch (metric) {
        case 'amount':
          value = item.amount
          break
        case 'ratio':
          value = item.amount_ratio
          break
        case 'percentile':
          value = item.amount_percentile
          break
      }
      
      if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
        data.push([dateIndex, industryIndex, value])
      }
    }
  })

  return {
    title: {
      text: title,
      left: 'center',
      textStyle: { fontSize: 16 }
    },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [dateIndex, industryIndex, value] = params.data
        const date = allDates.value[dateIndex]
        const industry = allIndustries.value[industryIndex]
        return `${industry}<br/>${date}<br/>${formatValue(value)}`
      }
    },
    grid: {
      height: Math.max(400, allIndustries.value.length * 20) + 'px',
      top: '8%',
      left: '15%',
      right: '16%',
      bottom: '2%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: allDates.value.map(date => date.substring(5)),
        splitArea: { show: true },
        axisLabel: { rotate: 45, fontSize: 10 }
      },
      {
        type: 'category',
        position: 'top',
        data: allDates.value.map(date => date.substring(5)),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { rotate: 45, fontSize: 10, margin: 6 },
        name: '日期',
        nameLocation: 'end',
        nameTextStyle: { fontSize: 12 }
      }
    ],
    yAxis: [
      {
        type: 'category',
        data: allIndustries.value,
        splitArea: { show: true },
        axisLabel: { fontSize: 11 }
      },
      {
        type: 'category',
        position: 'right',
        data: allIndustries.value,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontSize: 11 },
        name: '行业',
        nameLocation: 'end',
        nameTextStyle: { fontSize: 12 }
      }
    ],
    visualMap: {
      min,
      max,
      calculable: true,
      orient: 'vertical',
      right: '2%',
      top: '10%',
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      },
      text: ['高', '低'],
      textStyle: { fontSize: 12 }
    },
    series: [{
      name: title,
      type: 'heatmap',
      data,
      label: {
        show: true,
        fontSize: 9,
        formatter: (params: any) => {
          return formatValue(params.data[2])
        }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
}

const amountChartOption = computed(() => {
  const maxValue = Math.max(...heatmapData.value.map(d => d.amount), 1)
  return generateHeatmapOption(
    'amount',
    '板块成交额热力图',
    0,
    maxValue,
    (v) => `${v.toFixed(2)}亿`
  )
})

const ratioChartOption = computed(() => {
  return generateHeatmapOption(
    'ratio',
    '占总额比例热力图',
    0,
    100,
    (v) => `${v.toFixed(2)}%`
  )
})

const percentileChartOption = computed(() => {
  return generateHeatmapOption(
    'percentile',
    '成交额百分位排名热力图',
    0,
    100,
    (v) => `${v.toFixed(0)}`
  )
})

const handleTabChange = () => {
}

const handleChartClick = (params: any) => {
  const dataPoint = params?.data as [number, number, number] | undefined
  if (!dataPoint) return
  
  const [, industryIndex] = dataPoint
  const industryName = allIndustries.value[industryIndex]
  
  if (industryName) {
    router.push({
      path: '/stock-list',
      query: { industry: industryName }
    })
    ElMessage.success(`正在跳转到 ${industryName} 行业的股票列表`)
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.industry-turnover-heatmap {
  padding: 20px;
  
  .header-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h3 {
      margin: 0;
      color: #303133;
    }
    
    .control-group {
      display: flex;
      align-items: center;
      
      .days-hint {
        color: #909399;
        font-size: 14px;
      }
    }
  }
  
  .chart-section {
    min-height: 500px;
  }
}

@media (max-width: 768px) {
  .industry-turnover-heatmap {
    padding: 12px;
    
    .header-controls {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      
      .control-group {
        width: 100%;
        flex-wrap: wrap;
        gap: 8px;
      }
    }
  }
}
</style>

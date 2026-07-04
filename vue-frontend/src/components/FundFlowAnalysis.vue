<template>
  <div class="fund-flow-analysis">
    <div class="controls">
      <el-select
        v-model="selectedLevel"
        placeholder="行业层级"
        :disabled="loading"
        @change="updateChart"
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
        @change="updateChart"
        style="width: 160px; margin-right: 10px;"
      />

      <el-select 
        v-model="weekFlag" 
        :disabled="loading"
        placeholder="数据周期" 
        style="width: 120px; margin-right: 10px;"
      >
        <el-option label="按天" :value="false" />
        <el-option label="按周" :value="true" />
      </el-select>
      
      <FundFlowMetricSelector 
        v-model="selectedFundFlowMetric" 
        @change="updateChart" 
        :disabled="loading"
        style="margin-right: 10px;"
      />
      
      <DateRangeSelector 
        v-model="selectedDateRange" 
        :week-flag="weekFlag"
        :disabled="loading"
        @change="updateChart" 
      />
      
      <el-select 
        v-model="valueFilter" 
        @change="updateChart" 
        :disabled="loading"
        placeholder="数值过滤" 
        style="width: 120px; margin-right: 10px;"
      >
        <el-option label="全部" value="all" />
        <el-option label="仅正值" value="positive" />
        <el-option label="仅负值" value="negative" />
      </el-select>

      <el-select
        v-model="consecutiveIncreaseDays"
        :disabled="loading"
        placeholder="最近N天递增"
        style="width: 160px; margin-right: 10px;"
      >
        <el-option
          v-for="option in consecutiveIncreaseDaysOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      
      <el-button @click="sortByLastColumn" type="primary" :disabled="loading">按最后一列排序</el-button>
    </div>
    
    <div class="chart-container">
      <FundFlowHeatmap 
        :data="filteredFundFlowData"
        :selected-metric="selectedFundFlowMetric"
        :sort-ascending="sortAscending"
        :value-filter="valueFilter"
        @chart-ready="handleChartReady"
        @chart-click="handleChartClick"
      />
    </div>

    <IndustryTrendDialog
      v-model="trendDialogVisible"
      :sector-code="trendBoard.sectorCode"
      :sector-name="trendBoard.name"
      idx-type="行业板块"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FundFlowMetricSelector from './FundFlowMetricSelector.vue'
import DateRangeSelector from './DateRangeSelector.vue'
import FundFlowHeatmap from './FundFlowHeatmap.vue'
import IndustryTrendDialog from '@/components/IndustryTrendDialog.vue'
import {
  FundFlowMetricType,
  fetchIndustryFundFlowData,
  type IndustryFundFlowData,
  type IndustryFundFlowDataItem
} from '@/services/industry-fund-flow'
import type { EastMoneyIndustryLevel } from '@/services/strategyBreadthApi'

const selectedFundFlowMetric = ref(FundFlowMetricType.TOTAL_NET_INFLOW_AMOUNT)
const selectedDateRange = ref('20')
const endDate = ref(new Date().toISOString().split('T')[0])
const weekFlag = ref(false)
const valueFilter = ref<'all' | 'positive' | 'negative'>('all')
const sortAscending = ref(true)
const loading = ref(false)
const trendDialogVisible = ref(false)
const trendBoard = ref({
  sectorCode: '',
  name: ''
})
const consecutiveIncreaseDaysOptions = [
  { label: '不筛选', value: 0 },
  { label: '连续2天递增', value: 2 },
  { label: '连续3天递增', value: 3 },
  { label: '连续5天递增', value: 5 },
  { label: '连续10天递增', value: 10 }
]
const consecutiveIncreaseDays = ref(0)
const levelOptions: Array<{ label: EastMoneyIndustryLevel; value: EastMoneyIndustryLevel }> = [
  { label: '东财一级行业', value: '东财一级行业' },
  { label: '东财二级行业', value: '东财二级行业' },
  { label: '东财三级行业', value: '东财三级行业' }
]
const selectedLevel = ref<EastMoneyIndustryLevel>('东财二级行业')
const industryFundFlowData = ref<IndustryFundFlowData | null>(null)

interface Props {
  selectedIndustries: string[]
}

const props = defineProps<Props>()

function getMetricValue(item: IndustryFundFlowDataItem | undefined): number {
  if (!item) return NaN
  const value = item[selectedFundFlowMetric.value as keyof IndustryFundFlowDataItem]
  return typeof value === 'number' ? value : Number(value)
}

function getRecentRangeCount(rangeValue: string, useWeekFlag: boolean): number {
  if (rangeValue === 'all') {
    return useWeekFlag ? 5 : 30
  }

  const parsedValue = Number.parseInt(rangeValue, 10)
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return useWeekFlag ? 5 : 20
  }

  return parsedValue
}

function getStartDateByEndDate(endDateValue: string, rangeValue: string, useWeekFlag: boolean): string {
  const end = new Date(endDateValue)
  const rangeCount = getRecentRangeCount(rangeValue, useWeekFlag)
  const offsetDays = useWeekFlag ? (rangeCount * 7 - 1) : (rangeCount - 1)
  const start = new Date(end)
  start.setDate(end.getDate() - offsetDays)
  return start.toISOString().split('T')[0]
}

const filteredFundFlowData = computed<IndustryFundFlowData | null>(() => {
  if (!industryFundFlowData.value) return null

  let swCodeNames = industryFundFlowData.value.swCodeNames

  if (props.selectedIndustries && props.selectedIndustries.length > 0) {
    const selectedSet = new Set(props.selectedIndustries)
    swCodeNames = swCodeNames.filter(item => selectedSet.has(item.indexName))
  }

  const n = consecutiveIncreaseDays.value
  if (n > 0) {
    swCodeNames = swCodeNames.filter((industry) => {
      const series = industryFundFlowData.value?.congestions[industry.indexCode]
        || industryFundFlowData.value?.congestions[industry.indexName]

      if (!series || series.length < n + 1) {
        return false
      }

      const tail = series.slice(-(n + 1))
      for (let i = 1; i < tail.length; i++) {
        const previousValue = getMetricValue(tail[i - 1])
        const currentValue = getMetricValue(tail[i])
        if (!Number.isFinite(previousValue) || !Number.isFinite(currentValue) || currentValue <= previousValue) {
          return false
        }
      }

      return true
    })
  }

  return {
    ...industryFundFlowData.value,
    swCodeNames
  }
})

const fetchFundFlowData = async () => {
  loading.value = true
  try {
    const endDateValue = endDate.value
    const formattedStartDate = getStartDateByEndDate(endDateValue, selectedDateRange.value, weekFlag.value)

    const response = await fetchIndustryFundFlowData({
      startDate: formattedStartDate,
      endDate: endDateValue,
      weekFlag: weekFlag.value,
      idxType: '行业板块',
      level: selectedLevel.value
    })

    if (response) {
      industryFundFlowData.value = response
    } else {
      ElMessage.error('获取行业资金流数据失败')
    }
  } catch (error) {
    console.error('获取资金流数据出错:', error)
    ElMessage.error('获取资金流数据出错，请检查网络连接或API服务是否可用')
  } finally {
    loading.value = false
  }
}

const updateChart = () => {
  fetchFundFlowData()
}

watch(weekFlag, (newWeekFlag: boolean) => {
  selectedDateRange.value = newWeekFlag ? '5' : '20'
  updateChart()
})

const sortByLastColumn = () => {
  sortAscending.value = !sortAscending.value
}

const handleChartReady = (_chartInstance: unknown) => {
}

const handleChartClick = (payload: any) => {
  const industryName = payload?.industry?.indexName
  const sectorCode = payload?.industry?.indexCode
  if (!industryName || !sectorCode) {
    ElMessage.warning('未找到该行业板块代码，暂时无法打开趋势图')
    return
  }

  trendBoard.value = {
    sectorCode,
    name: industryName
  }
  trendDialogVisible.value = true
}

onMounted(() => {
  fetchFundFlowData()
})
</script>

<style scoped lang="scss">
.fund-flow-analysis {
  .controls {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    gap: 10px;
    flex-wrap: wrap;
  }
  
  .chart-container {
    width: 100%;
    min-height: 500px;
  }
}
</style>

<template>
  <div class="turnover-analysis">
    <div class="controls">
      <el-select
        v-model="selectedLevel"
        placeholder="行业层级"
        :disabled="loading"
        @change="fetchTurnoverData"
        style="width: 160px;"
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
        @change="fetchTurnoverData"
        style="width: 160px;"
      />
      <el-select
        v-model="selectedDateRange"
        placeholder="最近天数"
        :disabled="loading"
        @change="fetchTurnoverData"
        style="width: 140px;"
      >
        <el-option
          v-for="option in dateRangeOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-select
        v-model="selectedMetric"
        placeholder="热力图类型"
        :disabled="loading"
        style="width: 220px;"
      >
        <el-option
          v-for="option in metricOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-button @click="sortByLastColumn" type="primary" :disabled="loading">
        {{ sortButtonText }}
      </el-button>
    </div>

    <div class="chart-container" v-loading="loading">
      <TurnoverHeatmap
        :industries="allIndustries"
        :dates="allDates"
        :metric="selectedMetric"
        :sort-ascending="sortAscending"
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
/**
 * 行业成交额分析组件
 * 功能：
 * - 按东财行业层级查询并展示行业成交额相关热力图
 * - 支持截止日期选择与最近40天/60天范围切换
 * - 支持在板块成交额、成交额占总额比例、成交额百分位排名之间切换
 * - 支持按最后一个交易日的当前指标值排序
 * - 支持点击行业单元格后弹出东财行业趋势看板
 * 参数：无
 * 返回值：无
 * 事件：
 * - chart-ready: 热力图实例初始化完成
 * - chart-click: 点击热力图行业单元格后弹出趋势看板
 */
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchIndustryTurnoverPercentile } from '@/services/industry-turnover-percentile'
import type { IndustryTurnoverPercentileItem } from '@/services/industry-turnover-percentile'
import type { EastMoneyIndustryLevel } from '@/services/strategyBreadthApi'
import IndustryTrendDialog from '@/components/IndustryTrendDialog.vue'
import TurnoverHeatmap from '@/components/TurnoverHeatmap.vue'

type TurnoverMetricType = 'amount' | 'amount_ratio' | 'amount_percentile'

interface IndustryMetricData {
  amount: number
  amountRatio: number
  amountPercentile: number
}

interface IndustryData {
  name: string
  sectorCode: string
  data: IndustryMetricData[]
}

const selectedDateRange = ref('40')
const endDate = ref(new Date().toISOString().split('T')[0])
const selectedMetric = ref<TurnoverMetricType>('amount')
const sortAscending = ref(true)
const loading = ref(false)
const trendDialogVisible = ref(false)
const trendBoard = ref({
  sectorCode: '',
  name: ''
})
const dateRangeOptions = [
  { label: '最近40天', value: '40' },
  { label: '最近60天', value: '60' }
]
const levelOptions: Array<{ label: EastMoneyIndustryLevel; value: EastMoneyIndustryLevel }> = [
  { label: '东财一级行业', value: '东财一级行业' },
  { label: '东财二级行业', value: '东财二级行业' },
  { label: '东财三级行业', value: '东财三级行业' }
]
const selectedLevel = ref<EastMoneyIndustryLevel>('东财二级行业')
const metricOptions: Array<{ label: string; value: TurnoverMetricType }> = [
  { label: '成交额百分位排名热力图', value: 'amount_percentile' },
  { label: '板块成交额热力图', value: 'amount' },
  { label: '成交额占总额比例热力图', value: 'amount_ratio' }
]

const allIndustries = ref<IndustryData[]>([])
const allDates = ref<string[]>([])

const sortButtonText = computed(() => (sortAscending.value ? '按最后一列升序' : '按最后一列降序'))

const normalizeRatio = (value?: number) => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.abs(value as number) <= 1 ? (value as number) * 100 : (value as number)
}

const normalizePercentile = (value?: number) => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return value! <= 1 ? value! * 100 : value!
}

const getRecentDays = (rangeValue: string) => {
  const parsedValue = Number.parseInt(rangeValue, 10)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 40
}

const getStartDateByEndDate = (endDateValue: string, days: number) => {
  const startDate = new Date(endDateValue)
  startDate.setDate(startDate.getDate() - days + 1)
  return startDate.toISOString().split('T')[0]
}

const fetchTurnoverData = async () => {
  loading.value = true
  try {
    const endDateValue = endDate.value
    const formattedStartDate = getStartDateByEndDate(endDateValue, getRecentDays(selectedDateRange.value))
    const response = await fetchIndustryTurnoverPercentile({
      startDate: formattedStartDate,
      endDate: endDateValue,
      idxType: '行业板块',
      level: selectedLevel.value
    })

    if (response) {
      const apiData = response.data

      if (!Array.isArray(apiData)) {
        console.error('API返回的数据不是数组:', apiData)
        throw new Error('API返回的数据格式不正确')
      }

      const uniqueDates = [...new Set(apiData.map((item: IndustryTurnoverPercentileItem) => item.date))].sort() as string[]
      allDates.value = uniqueDates

      const industriesMap = new Map<string, IndustryData>()

      apiData.forEach((item: IndustryTurnoverPercentileItem) => {
        if (!industriesMap.has(item.sector_code)) {
          industriesMap.set(item.sector_code, {
            name: item.sector_name,
            sectorCode: item.sector_code,
            data: []
          })
        }
        const industryData = industriesMap.get(item.sector_code)!
        const dateIndex = uniqueDates.indexOf(item.date)

        while (industryData.data.length < uniqueDates.length) {
          industryData.data.push({
            amount: 0,
            amountRatio: 0,
            amountPercentile: 0
          })
        }

        industryData.data[dateIndex] = {
          amount: item.amount ?? 0,
          amountRatio: normalizeRatio(item.amount_ratio ?? item.turnover_ratio),
          amountPercentile: normalizePercentile(item.amount_percentile ?? item.turnover_ratio_percentile)
        }
      })

      allIndustries.value = Array.from(industriesMap.values())
    } else {
      ElMessage.error('获取数据失败')
    }
  } catch (error) {
    console.error('获取数据出错:', error)
    ElMessage.error('获取数据出错，请检查网络连接或API服务是否可用')
  } finally {
    loading.value = false
  }
}

const sortByLastColumn = () => {
  sortAscending.value = !sortAscending.value
}

const handleChartReady = (_chartInstance: any) => {
  // 预留给后续图表联动能力
}

const handleChartClick = (payload: any) => {
  const industryName = payload?.industry?.name
  const sectorCode = payload?.industry?.sectorCode
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

// 组件挂载时获取数据
onMounted(() => {
  fetchTurnoverData()
})
</script>

<style scoped lang="scss">
.turnover-analysis {
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

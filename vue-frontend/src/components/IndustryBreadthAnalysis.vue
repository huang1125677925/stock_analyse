<template>
  <div class="industry-breadth-analysis">
    <el-card class="control-card" shadow="never">
      <div class="controls">
        <div class="control-group">
          <span class="control-label">板块类型：</span>
          <el-select
            v-model="selectedIdxType"
            placeholder="选择板块类型"
            :disabled="loading"
            @change="handleIdxTypeChange"
            style="width: 160px"
          >
            <el-option label="行业板块" value="行业板块" />
            <el-option label="概念板块" value="概念板块" />
          </el-select>
        </div>
        <div v-if="selectedIdxType === '行业板块'" class="control-group">
          <span class="control-label">行业层级：</span>
          <el-select
            v-model="selectedLevel"
            placeholder="选择行业层级"
            :disabled="loading"
            @change="handleParamsChange"
            style="width: 160px"
          >
            <el-option
              v-for="option in levelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="control-group">
          <span class="control-label">时间范围：</span>
          <el-input
            value="最近10天"
            disabled
            style="width: 160px"
          />
        </div>
        <div class="control-group">
          <span class="control-label">结束日期：</span>
          <el-date-picker
            v-model="endDate"
            type="date"
            placeholder="选择结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :clearable="false"
            :disabled="loading"
            :disabled-date="disableFutureDate"
            @change="handleParamsChange"
            style="width: 160px"
          />
        </div>
        <div class="control-group">
          <span class="control-label">MA窗口：</span>
          <el-select
            v-model="maWindow"
            placeholder="选择 MA 窗口"
            :disabled="loading"
            @change="handleParamsChange"
            style="width: 140px"
          >
            <el-option
              v-for="option in maWindowOptions"
              :key="option"
              :label="`MA${option}`"
              :value="option"
            />
          </el-select>
        </div>
        <div class="control-group">
          <span class="control-label">宽度递增：</span>
          <el-select
            v-model="consecutiveIncreaseDays"
            placeholder="筛选连续递增"
            :disabled="loading"
            style="width: 160px"
          >
            <el-option
              v-for="option in consecutiveIncreaseDaysOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div v-if="consecutiveIncreaseDays > 0" class="control-group">
          <span class="control-label">首日宽度：</span>
          <el-select
            v-model="firstDayBreadthRange"
            placeholder="第一天宽度范围"
            clearable
            :disabled="loading"
            style="width: 140px"
          >
            <el-option
              v-for="option in breadthRangeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div v-if="consecutiveIncreaseDays > 0" class="control-group">
          <span class="control-label">尾日宽度：</span>
          <el-select
            v-model="lastDayBreadthRange"
            placeholder="最后一天宽度范围"
            clearable
            :disabled="loading"
            style="width: 140px"
          >
            <el-option
              v-for="option in breadthRangeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="control-group amount-range-group">
          <span class="control-label">成交额范围：</span>
          <el-select
            v-model="minAmount"
            placeholder="最小值"
            :disabled="loading"
            style="width: 110px"
          >
            <el-option
              v-for="option in amountFilterOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <span style="margin: 0 4px">-</span>
          <el-select
            v-model="maxAmount"
            placeholder="最大值"
            :disabled="loading"
            style="width: 110px"
          >
            <el-option
              v-for="option in amountFilterOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="control-group">
          <el-button type="primary" :loading="loading" @click="fetchData">刷新</el-button>
        </div>
        <div class="control-group">
          <el-button
            type="default"
            :disabled="loading || !amountFilteredData.length"
            @click="toggleLastColumnSort"
            :icon="sortByLastColumn ? 'SortDown' : 'Sort'"
          >
            {{ sortByLastColumn ? '取消排序' : '按最后一列排序' }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="chart-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>市场宽度热力图（{{ selectedBoardLabel }} / MA {{ maWindow }}）</span>
          <div class="header-right">
            <span class="count-info">行业总数：{{ totalIndustryCount }} / 当前显示：{{ displayedIndustryCount }}</span>
            <span class="tips">数据来源：板块MA宽度接口</span>
          </div>
        </div>
      </template>

      <div class="methodology">
        <p>
          统计口径：基于东方财富{{ selectedIdxType === '概念板块' ? '概念板块' : '行业板块' }}成分，汇总各板块中收盘价高于 MA{{ maWindow }} 的股票占比。
        </p>
        <p>
          计算方式：市场宽度 = count_above_ma / eligible_count。数值越高，表示该板块内站上均线的股票占比越高，整体走势越强。
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

    <LeadRiseMatrixDialog
      v-model="leadRiseVisible"
      :ts-code="leadRiseTsCode"
      :idx-type="leadRiseIdxType"
      :name="leadRiseName"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 市场宽度热力图组件
 * 功能：
 * - 使用板块 MA 市场宽度接口渲染热力图（日期 × 板块，值为宽度比例）
 * - 支持行业板块与概念板块切换，并在点击热力图单元格后打开该板块的领涨数据详情弹窗
 * - 支持选择东方财富行业层级、固定最近20天结束日期与 MA 窗口
 * 参数：无
 * 返回值：无
 * 事件（Emits）：
 * - chartReady(chart): 图表初始化完成
 * - chartClick(payload): 图表点击事件，包含 { industry, sectorCode, date, value, idxType }
 */
import { ref, computed, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import HeatmapChart from '@/components/HeatmapChart.vue'
import { useIsMobile } from '@/composables/useIsMobile'
import LeadRiseMatrixDialog from '@/components/LeadRiseMatrixDialog.vue'
import {
  fetchIndustryMaBreadth,
  type IndustryMaBreadthIdxType,
  type EastMoneyIndustryLevel,
  type IndustryMaBreadthItem
} from '@/services/strategyBreadthApi'
import {
  fetchIndustryTurnoverPercentile,
  type IndustryTurnoverPercentileItem
} from '@/services/industry-turnover-percentile'

const emit = defineEmits<{
  chartReady: [chart: echarts.ECharts]
  chartClick: [payload: { industry: string; sectorCode: string; date: string; value: number; idxType: IndustryMaBreadthIdxType }]
  industriesLoaded: [industries: string[]]
}>()

const FIXED_RANGE_DAYS = 10
const loading = ref(false)
const endDate = ref<string>(formatDate(new Date()))
const maWindow = ref<number>(5)
const sortByLastColumn = ref(true)
const maWindowOptions = [5, 10, 20, 30, 60, 90, 250]
const consecutiveIncreaseDaysOptions = [
  { label: '不筛选', value: 0 },
  { label: '连续2天递增', value: 2 },
  { label: '连续3天递增', value: 3 },
  { label: '连续5天递增', value: 5 },
  { label: '连续10天递增', value: 10 }
]
const breadthRangeOptions = [
  { label: '< 20%', value: 'lt20' },
  { label: '< 30%', value: 'lt30' },
  { label: '< 40%', value: 'lt40' },
  { label: '< 50%', value: 'lt50' },
  { label: '< 60%', value: 'lt60' },
  { label: '< 70%', value: 'lt70' },
  { label: '< 80%', value: 'lt80' },
  { label: '≥ 20%', value: 'gte20' },
  { label: '≥ 30%', value: 'gte30' },
  { label: '≥ 40%', value: 'gte40' },
  { label: '≥ 50%', value: 'gte50' },
  { label: '≥ 60%', value: 'gte60' },
  { label: '≥ 70%', value: 'gte70' },
  { label: '≥ 80%', value: 'gte80' },
  { label: '≥ 90%', value: 'gte90' }
]
const amountFilterOptions = [
  { label: '不限', value: 0 },
  { label: '100亿', value: 10000000000 },
  { label: '300亿', value: 30000000000 },
  { label: '500亿', value: 50000000000 },
  { label: '1000亿', value: 100000000000 },
  { label: '2000亿', value: 200000000000 }
]
const consecutiveIncreaseDays = ref<number>(0)
const firstDayBreadthRange = ref<string>('')
const lastDayBreadthRange = ref<string>('')
const minAmount = ref<number>(30000000000)
const maxAmount = ref<number>(0)
const selectedIdxType = ref<IndustryMaBreadthIdxType>('行业板块')
const levelOptions: Array<{ label: EastMoneyIndustryLevel; value: EastMoneyIndustryLevel }> = [
  { label: '东财一级行业', value: '东财一级行业' },
  { label: '东财二级行业', value: '东财二级行业' },
  { label: '东财三级行业', value: '东财三级行业' }
]
const selectedLevel = ref<EastMoneyIndustryLevel>('东财二级行业')

// 领涨数据详情弹窗状态：点击热力图方块时打开该板块的领涨详情
const leadRiseVisible = ref(false)
const leadRiseTsCode = ref('')
const leadRiseName = ref('')
const leadRiseIdxType = ref<IndustryMaBreadthIdxType>('行业板块')

const { isMobile } = useIsMobile()

// 计算日期范围字符串（YYYY-MM-DD）
function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(dateText: string): Date {
  const [year, month, day] = dateText.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function computeDateRangeByEndDate(endDateText: string, days: number): [string, string] {
  const end = parseDate(endDateText)
  const start = new Date()
  start.setTime(end.getTime())
  start.setDate(end.getDate() - days)
  return [formatDate(start), formatDate(end)]
}

function disableFutureDate(date: Date): boolean {
  return date.getTime() > Date.now()
}

/**
 * 事件：打开领涨数据详情弹窗
 * 功能：点击热力图行业/概念单元格时，打开该板块的领涨数据详情（含板块与领涨股K线小图矩阵）
 * 参数：
 * - sectorCode(string): 板块代码
 * - sectorName(string): 板块名称
 * - idxType(IndustryMaBreadthIdxType): 板块类型
 * 返回值：无
 * 事件：更新领涨详情弹窗状态
 */
const openLeadRiseDetail = (sectorCode: string, sectorName: string, idxType: IndustryMaBreadthIdxType) => {
  if (!sectorCode) {
    ElMessage.warning('未找到该板块代码，暂时无法打开领涨数据详情')
    return
  }
  leadRiseTsCode.value = sectorCode
  leadRiseName.value = sectorName
  leadRiseIdxType.value = idxType
  leadRiseVisible.value = true
}

const rawData = ref<IndustryMaBreadthItem[]>([])
const turnoverData = ref<IndustryTurnoverPercentileItem[]>([])

/**
 * 从获取到的原始数据中提取唯一的行业名称列表（已排序），
 * 用于驱动筛选组件的下拉选项，确保与实际数据一致。
 */
const rawIndustryNames = computed<string[]>(() => {
  const names = Array.from(new Set(rawData.value.map(d => d.sector_name)))
  names.sort()
  return names
})

watch(rawIndustryNames, (names) => {
  emit('industriesLoaded', names)
}, { immediate: true })

// 行业总数量（原始数据去重后的行业数）
const totalIndustryCount = computed<number>(() => rawIndustryNames.value.length)

interface Props {
  selectedIndustries: string[]
}

const props = defineProps<Props>()

/**
 * 过滤后的原始数据：当selectedIndustries为空时显示全部，否则只显示选中的行业
 */
const filteredRawData = computed(() => {
  if (!props.selectedIndustries || props.selectedIndustries.length === 0) {
    return rawData.value
  }
  const selectedSet = new Set(props.selectedIndustries)
  return rawData.value.filter(item => selectedSet.has(item.sector_name))
})

/**
 * 工具：根据宽度范围选项判断值是否符合条件
 * 参数：value(number) 宽度值（0-1之间），rangeCode(string) 范围选项代码
 * 返回值：boolean 是否符合条件
 * 事件：无
 */
const matchesBreadthRange = (value: number, rangeCode: string): boolean => {
  if (!rangeCode) return true
  const percentage = value * 100
  if (rangeCode === 'lt20') return percentage < 20
  if (rangeCode === 'lt30') return percentage < 30
  if (rangeCode === 'lt40') return percentage < 40
  if (rangeCode === 'lt50') return percentage < 50
  if (rangeCode === 'lt60') return percentage < 60
  if (rangeCode === 'lt70') return percentage < 70
  if (rangeCode === 'lt80') return percentage < 80
  if (rangeCode === 'gte20') return percentage >= 20
  if (rangeCode === 'gte30') return percentage >= 30
  if (rangeCode === 'gte40') return percentage >= 40
  if (rangeCode === 'gte50') return percentage >= 50
  if (rangeCode === 'gte60') return percentage >= 60
  if (rangeCode === 'gte70') return percentage >= 70
  if (rangeCode === 'gte80') return percentage >= 80
  if (rangeCode === 'gte90') return percentage >= 90
  return true
}

/**
 * 连续递增筛选：在行业筛选基础上，进一步筛选出最近 N 天宽度值连续递增的行业。
 * 逻辑：取该行业按日期排序后最后 N+1 个数据点，检查每对相邻值是否严格递增。
 * 当 consecutiveIncreaseDays 为 0 时不做递增筛选，直接透传。
 * 支持首日和尾日宽度范围筛选：满足连续递增的同时，第一天和最后一天的宽度值需要符合设置的范围条件。
 */
const increasingFilterRawData = computed(() => {
  const n = consecutiveIncreaseDays.value
  if (n === 0) return filteredRawData.value

  const source = filteredRawData.value

  // 获取所有日期并排序，取最后 N+1 个交易日
  const allDates = Array.from(new Set(source.map(d => d.date))).sort()
  if (allDates.length < n + 1) return []
  const lastNDates = allDates.slice(-(n + 1))
  const lastNDatesSet = new Set(lastNDates)

  // 按行业分组，收集最近 N+1 天的宽度值
  const sectorMap = new Map<string, Array<{ date: string; value: number }>>()
  source.forEach(item => {
    if (!lastNDatesSet.has(item.date)) return
    if (!sectorMap.has(item.sector_name)) {
      sectorMap.set(item.sector_name, [])
    }
    const val = typeof item.breadth_ratio === 'number' ? item.breadth_ratio : Number(item.breadth_ratio)
    sectorMap.get(item.sector_name)!.push({ date: item.date, value: Number.isNaN(val) ? 0 : val })
  })

  // 判断哪些行业满足连续 N 天递增及首尾宽度范围条件
  const qualifiedSectors = new Set<string>()
  sectorMap.forEach((points, sector) => {
    if (points.length < n + 1) return
    points.sort((a, b) => a.date.localeCompare(b.date))
    const tail = points.slice(-(n + 1))

    // 检查连续递增
    for (let i = 1; i < tail.length; i++) {
      if (tail[i].value <= tail[i - 1].value) return
    }

    // 检查首日宽度范围
    const firstDayValue = tail[0].value
    if (!matchesBreadthRange(firstDayValue, firstDayBreadthRange.value)) return

    // 检查尾日宽度范围
    const lastDayValue = tail[tail.length - 1].value
    if (!matchesBreadthRange(lastDayValue, lastDayBreadthRange.value)) return

    qualifiedSectors.add(sector)
  })

  return source.filter(item => qualifiedSectors.has(item.sector_name))
})

/**
 * 成交额范围筛选：在递增筛选基础上，进一步按成交额范围筛选
 * 使用最近一个交易日的成交额数据进行筛选
 * 支持设置最小值和最大值，实现区间筛选
 */
const amountFilteredData = computed(() => {
  const hasMinFilter = minAmount.value > 0
  const hasMaxFilter = maxAmount.value > 0

  // 如果没有设置任何筛选条件，返回原数据
  if (!hasMinFilter && !hasMaxFilter) return increasingFilterRawData.value

  // 如果没有成交额数据，返回原数据
  if (turnoverData.value.length === 0) return increasingFilterRawData.value

  // 获取所有日期，找到最近的交易日
  const allDates = Array.from(new Set(turnoverData.value.map(d => d.date))).sort()
  if (allDates.length === 0) return increasingFilterRawData.value
  const latestDate = allDates[allDates.length - 1]

  // 构建 sector_code -> amount 的映射（使用最近一个交易日的数据）
  const sectorAmountMap = new Map<string, number>()
  turnoverData.value.forEach(item => {
    if (item.date === latestDate) {
      const amount = item.amount ?? 0
      sectorAmountMap.set(item.sector_code, amount)
    }
  })

  // 筛选出成交额符合条件的行业
  const qualifiedSectors = new Set<string>()

  sectorAmountMap.forEach((amount, sectorCode) => {
    let qualified = true

    // 检查最小值
    if (hasMinFilter && amount < minAmount.value) {
      qualified = false
    }

    // 检查最大值
    if (hasMaxFilter && amount > maxAmount.value) {
      qualified = false
    }

    if (qualified) {
      qualifiedSectors.add(sectorCode)
    }
  })

  // 过滤数据
  return increasingFilterRawData.value.filter(item =>
    qualifiedSectors.has(item.sector_code)
  )
})

const selectedBoardLabel = computed(() => {
  return selectedIdxType.value === '行业板块'
    ? selectedLevel.value
    : '东财概念板块'
})

// 切换按最后一列排序的状态
const toggleLastColumnSort = () => {
  sortByLastColumn.value = !sortByLastColumn.value
}

// 计算行业与日期维度
const industries = computed<string[]>(() => {
  const names = Array.from(new Set(amountFilteredData.value.map(d => d.sector_name)))

  // 如果启用按最后一列排序
  if (sortByLastColumn.value && dates.value.length > 0) {
    const lastDate = dates.value[dates.value.length - 1]

    // 获取每个行业在最后一个日期的数据
    const industryLastValues = new Map<string, number>()
    amountFilteredData.value.forEach(item => {
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

// 当前显示的行业数量（经过全部筛选后热力图实际展示的行业数）
const displayedIndustryCount = computed<number>(() => industries.value.length)

const dates = computed<string[]>(() => {
  const ds = Array.from(new Set(amountFilteredData.value.map(d => d.date))).sort()
  return ds
})

// 构建热力图矩阵数据 [x(dateIndex), y(industryIndex), value]
const heatmapData = computed<[number, number, number][]>(() => {
  const dateIndex = new Map(dates.value.map((d, i) => [d, i]))
  const industryIndex = new Map(industries.value.map((n, i) => [n, i]))
  const points: [number, number, number][] = []
  amountFilteredData.value.forEach(item => {
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
  const mobile = isMobile.value
  return {
    animation: false,
    tooltip: {
      position: 'top',
      confine: true,
      formatter: (params: any) => {
        const [x, y, v] = params?.data ?? []
        const date = typeof x === 'number' ? dates.value[x] : ''
        const industry = typeof y === 'number' ? industries.value[y] : ''
        return `${date}<br/>${industry}<br/>宽度比例: ${(Number(v) * 100).toFixed(2)}%`
      }
    },
    // 桌面端左右留大边距给行业名与颜色条；移动端收紧边距，颜色条移到底部横向，最大化矩阵宽度
    grid: mobile
      ? { left: 4, right: 6, top: 34, bottom: 56, containLabel: true }
      : { left: 140, right: 80, top: 80, bottom: 20 },
    xAxis: {
      type: 'category',
      data: dates.value,
      // 桌面端日期轴放在上方；移动端放在底部并旋转、去掉年份省宽
      position: mobile ? 'bottom' : 'top',
      axisLabel: {
        rotate: mobile ? 45 : 0,
        hideOverlap: true,
        interval: 'auto',
        fontSize: mobile ? 9 : 12,
        formatter: mobile ? (v: string) => (v && v.length >= 10 ? v.slice(5) : v) : undefined
      }
    },
    yAxis: {
      type: 'category',
      data: industries.value,
      axisLabel: {
        fontSize: mobile ? 10 : 12,
        // 移动端限制行业名宽度并截断，避免占用过多横向空间
        ...(mobile ? { width: 52, overflow: 'truncate' as const } : {})
      }
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: true,
      // 桌面端纵向放右侧；移动端横向放底部
      orient: mobile ? 'horizontal' : 'vertical',
      ...(mobile
        ? { left: 'center', bottom: 2, itemWidth: 12, itemHeight: 70 }
        : { right: 10, top: 40, bottom: 40 }),
      textStyle: { fontSize: mobile ? 10 : 12 },
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      }
    },
    series: [{
      type: 'heatmap',
      data: heatmapData.value,
      label: {
        // 移动端单元格过小，隐藏格内数字避免重叠不可读；数值改由 tooltip 展示
        show: !mobile,
        fontSize: 9,
        formatter: (params: any) => {
          const value = params.data[2]
          return `${(Number(value) * 100).toFixed(0)}`
        }
      },
      itemStyle: { borderColor: '#fff', borderWidth: mobile ? 0.5 : 1 },
      emphasis: {
        itemStyle: { shadowBlur: 5, shadowColor: 'rgba(0, 0, 0, 0.3)' },
        label: {
          show: true,
          fontSize: 10,
          formatter: (params: any) => {
            const value = params.data[2]
            return `${(Number(value) * 100).toFixed(2)}%`
          }
        }
      }
    }]
  }
})

// 拉取数据
const fetchData = async () => {
  loading.value = true
  try {
    const [start, end] = computeDateRangeByEndDate(endDate.value, FIXED_RANGE_DAYS)

    // 并行获取市场宽度数据和成交额数据
    const [breadthData, turnoverResult] = await Promise.all([
      fetchIndustryMaBreadth({
        startDate: start,
        endDate: end,
        maWindow: maWindow.value,
        idxType: selectedIdxType.value,
        level: selectedIdxType.value === '行业板块' ? selectedLevel.value : undefined
      }),
      fetchIndustryTurnoverPercentile({
        startDate: start,
        endDate: end,
        idxType: selectedIdxType.value,
        level: selectedIdxType.value === '行业板块' ? selectedLevel.value : undefined
      }).catch((err) => {
        console.error('获取成交额数据失败:', err)
        return null
      })
    ])

    rawData.value = breadthData.data ?? []
    turnoverData.value = turnoverResult?.data ?? []
  } catch (err) {
    console.error('获取行业MA宽度数据失败:', err)
  } finally {
    loading.value = false
  }
}

const handleParamsChange = () => {
  fetchData()
}

const handleIdxTypeChange = () => {
  fetchData()
}

const onChartReady = (chart: echarts.ECharts) => emit('chartReady', chart)
const onChartClick = (params: any) => {
  const [x, y, v] = (params?.data ?? []) as [number, number, number]
  const date = typeof x === 'number' ? dates.value[x] : ''
  const industry = typeof y === 'number' ? industries.value[y] : ''
  const matchedRecord = amountFilteredData.value.find((item) => item.date === date && item.sector_name === industry)
  const payload = {
    date,
    industry,
    sectorCode: matchedRecord?.sector_code || '',
    value: typeof v === 'number' ? v : 0,
    idxType: selectedIdxType.value
  }
  emit('chartClick', payload)
  if (payload.sectorCode && payload.industry) {
    openLeadRiseDetail(payload.sectorCode, payload.industry, payload.idxType)
  }
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

  // 去掉所有 el-card 的边框、圆角和阴影
  :deep(.el-card) {
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  // 去掉 el-card 的 header 和 body 的左右 padding
  :deep(.el-card__header),
  :deep(.el-card__body) {
    padding-left: 0;
    padding-right: 0;
  }
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
  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: normal;
  }
  .count-info { color: #606266; font-size: 12px; }
  .tips { color: #999; font-size: 12px; }
  .empty-tip { color: #999; padding: 24px; text-align: center; }
}

// 移动端适配
@media (max-width: 768px) {
  .industry-breadth-analysis {
    gap: 12px;
  }

  .control-card {
    .controls {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }
    .control-group {
      flex-direction: column;
      align-items: stretch;
      gap: 6px;

      // 让所有控件在移动端占满宽度
      :deep(.el-select),
      :deep(.el-input),
      :deep(.el-date-picker) {
        width: 100% !important;
      }

      :deep(.el-button) {
        width: 100%;
      }

      // 成交额范围的两个选择器特殊处理：保持横向布局
      &.amount-range-group {
        flex-direction: row;
        flex-wrap: wrap;

        .control-label {
          width: 100%;
          margin-bottom: 2px;
        }

        :deep(.el-select) {
          flex: 1;
          min-width: 0;
          width: auto !important;
        }

        > span:not(.control-label) {
          flex-shrink: 0;
        }
      }
    }
    .control-label {
      font-weight: 500;
    }
  }

  .chart-card {
    .methodology {
      padding: 10px 12px;
      font-size: 12px;
    }

    // 移动端优化热力图显示
    :deep(.heatmap-chart) {
      min-height: 300px;
    }
  }
}
</style>

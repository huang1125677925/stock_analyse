<template>
  <div class="industry-breadth-analysis">
    <!--
      单行筛选条：控件统一 size=small、nowrap + 横向滚动，
      放不下时横向滚动而不是换行，把纵向空间尽量留给热力图
    -->
    <div class="control-bar">
      <el-segmented
        v-model="analysisMode"
        :options="analysisModeOptions"
        size="small"
        class="ctl ctl-mode"
        :disabled="loading"
        @change="handleModeChange"
      />

      <div class="ctl ctl-industry">
        <IndustryFilter
          :model-value="props.selectedIndustries"
          :industries="rawIndustryNames"
          @update:model-value="emit('update:selectedIndustries', $event)"
        />
      </div>

      <el-select
        v-model="selectedIdxType"
        size="small"
        class="ctl ctl-md"
        placeholder="板块类型"
        :disabled="loading"
        @change="handleIdxTypeChange"
      >
        <el-option label="行业板块" value="行业板块" />
        <el-option label="概念板块" value="概念板块" />
      </el-select>

      <el-select
        v-if="selectedIdxType === '行业板块'"
        v-model="selectedLevel"
        size="small"
        class="ctl ctl-md"
        placeholder="行业层级"
        :disabled="loading"
        @change="handleParamsChange"
      >
        <el-option
          v-for="option in levelOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <el-select
        v-if="analysisMode === 'display'"
        v-model="rangeDays"
        size="small"
        class="ctl ctl-sm"
        placeholder="时间范围"
        :disabled="loading"
        @change="handleParamsChange"
      >
        <el-option
          v-for="option in rangeDayOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <el-date-picker
        v-model="endDate"
        type="date"
        size="small"
        class="ctl ctl-date"
        placeholder="结束日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        :clearable="false"
        :disabled="loading"
        :disabled-date="disableFutureDate"
        @change="handleParamsChange"
      />

      <el-select
        v-if="analysisMode === 'display'"
        v-model="maWindow"
        size="small"
        class="ctl ctl-xs"
        placeholder="MA窗口"
        :disabled="loading"
        @change="handleParamsChange"
      >
        <el-option
          v-for="option in maWindowOptions"
          :key="option"
          :label="`MA${option}`"
          :value="option"
        />
      </el-select>

      <el-select
        v-if="analysisMode === 'display'"
        v-model="consecutiveIncreaseDays"
        size="small"
        class="ctl ctl-md"
        placeholder="宽度递增"
        :disabled="loading"
      >
        <el-option
          v-for="option in consecutiveIncreaseDaysOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <template v-if="analysisMode === 'display' && consecutiveIncreaseDays > 0">
        <span class="ctl-label">首日</span>
        <el-select
          v-model="firstDayBreadthRange"
          size="small"
          class="ctl ctl-xs"
          placeholder="首日宽度"
          clearable
          :disabled="loading"
        >
          <el-option
            v-for="option in breadthRangeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <span class="ctl-label">尾日</span>
        <el-select
          v-model="lastDayBreadthRange"
          size="small"
          class="ctl ctl-xs"
          placeholder="尾日宽度"
          clearable
          :disabled="loading"
        >
          <el-option
            v-for="option in breadthRangeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </template>

      <span class="ctl-label">成交额</span>
      <el-select
        v-model="minAmount"
        size="small"
        class="ctl ctl-xs"
        placeholder="最小值"
        :disabled="loading"
      >
        <el-option
          v-for="option in amountFilterOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <span class="amount-sep">-</span>
      <el-select
        v-model="maxAmount"
        size="small"
        class="ctl ctl-xs"
        placeholder="最大值"
        :disabled="loading"
      >
        <el-option
          v-for="option in amountFilterOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <el-button type="primary" size="small" :loading="loading" @click="fetchData">刷新</el-button>
      <el-button
        type="default"
        size="small"
        :disabled="loading || (analysisMode === 'display' ? !amountFilteredData.length : !practiceSignals.length)"
        @click="toggleLastColumnSort"
        :icon="sortByLastColumn ? 'SortDown' : 'Sort'"
      >
        {{ sortByLastColumn ? '取消排序' : '末列排序' }}
      </el-button>

      <div class="bar-spacer"></div>

      <span class="count-info">
        {{ analysisMode === 'display'
          ? `行业 ${totalIndustryCount} · 显示 ${displayedIndustryCount}`
          : `实战 ${practiceSignals.length} · 匹配 ${practiceMatchedSignalCount}` }}
      </span>
      <el-popover placement="bottom-end" trigger="click" :width="380">
        <template #reference>
          <el-icon class="info-icon" :size="16" aria-label="查看统计口径与使用说明">
            <InfoFilled />
          </el-icon>
        </template>
        <div class="methodology">
          <p class="methodology-title">统计口径与说明</p>
          <template v-if="analysisMode === 'display'">
            <p>
            基于东方财富{{ selectedIdxType === '概念板块' ? '概念板块' : '行业板块' }}成分，汇总各板块中收盘价高于
              MA{{ maWindow }} 的股票占比。
            </p>
            <p>
              市场宽度 = count_above_ma / eligible_count。数值越高，代表该板块内站上均线的股票占比越高，走势越强。
            </p>
            <p>时间范围为最近 {{ rangeDays }} 天（最多 30 天），可配合结束日期一起调整。</p>
            <p>成交额区间按最近一个交易日的板块成交额过滤。</p>
            <p>
              行业总数 {{ totalIndustryCount }} / 当前显示 {{ displayedIndustryCount }}，显示数量受行业筛选、宽度递增、成交额区间影响。
            </p>
            <p>数据来源：板块 MA 宽度接口。点击热力图任意格子可查看该板块领涨数据详情。</p>
          </template>
          <template v-else>
            <p>实战模式固定使用最近 3 个有效交易日，分别统计 MA5、MA10、MA20 三线宽度变化。</p>
            <p>扩张/收窄按最新日相对 3 日前变化判断，信号按三线组合规则归类。</p>
            <p>成交额区间按最近一个交易日的板块成交额过滤。</p>
          </template>
        </div>
      </el-popover>
    </div>

    <HeatmapChart
      v-if="analysisMode === 'display' && heatmapOption"
      :option="heatmapOption"
      @chart-ready="onChartReady"
      @chart-click="onChartClick"
    />

    <section v-else-if="analysisMode === 'practice' && practiceSignals.length" class="practice-panel">
      <div class="practice-summary-grid">
        <div
          v-for="stat in practiceSignalStats"
          :key="stat.key"
          class="practice-summary-item"
          :class="`tone-${stat.tone}`"
        >
          <div class="practice-summary-label">{{ stat.label }}</div>
          <div class="practice-summary-main">
            <strong>{{ stat.count }}</strong>
            <span>{{ stat.ratioText }}</span>
          </div>
          <div class="practice-summary-desc">{{ stat.description }}</div>
        </div>
      </div>

      <el-table
        :data="practiceSortedSignals"
        border
        stripe
        size="small"
        class="practice-table"
        :height="isMobile ? undefined : 'calc(100dvh - 390px)'"
      >
        <el-table-column prop="sector_name" label="板块" min-width="150" fixed />
        <el-table-column prop="signalLabel" label="实战信号" min-width="180">
          <template #default="{ row }">
            <el-tag :type="row.tagType" effect="light">{{ row.signalLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="动作" min-width="180" />
        <el-table-column label="MA5" min-width="120" align="right">
          <template #default="{ row }">
            <span :class="directionClass(row.ma5Direction)">{{ formatPracticeCell(row.ma5, row.ma5Change) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="MA10" min-width="120" align="right">
          <template #default="{ row }">
            <span :class="directionClass(row.ma10Direction)">{{ formatPracticeCell(row.ma10, row.ma10Change) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="MA20" min-width="120" align="right">
          <template #default="{ row }">
            <span :class="directionClass(row.ma20Direction)">{{ formatPracticeCell(row.ma20, row.ma20Change) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="三日变化" min-width="260" />
      </el-table>
    </section>

    <div v-else class="empty-tip">暂无数据</div>

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
 * - 展示模式保留热力图，实战模式固定最近3个交易日并按 MA5/MA10/MA20 三线宽度规则统计
 * 参数：无
 * 返回值：无
 * 事件（Emits）：
 * - chartReady(chart): 图表初始化完成
 * - chartClick(payload): 图表点击事件，包含 { industry, sectorCode, date, value, idxType }
 */
import { ref, computed, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import HeatmapChart from '@/components/HeatmapChart.vue'
import IndustryFilter from '@/components/IndustryFilter.vue'
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

type AnalysisMode = 'display' | 'practice'
type PracticeMaWindow = 5 | 10 | 20
type WidthDirection = 'expand' | 'shrink' | 'flat'
type PracticeSignalKey = 'bullish' | 'dip' | 'mediumRisk' | 'retreat' | 'neutral' | 'insufficient'

interface PracticeSignal {
  sector_code: string
  sector_name: string
  dates: string[]
  ma5: number | null
  ma10: number | null
  ma20: number | null
  ma5Change: number | null
  ma10Change: number | null
  ma20Change: number | null
  ma5Direction: WidthDirection
  ma10Direction: WidthDirection
  ma20Direction: WidthDirection
  signalKey: PracticeSignalKey
  signalLabel: string
  action: string
  reason: string
  tagType: 'success' | 'warning' | 'danger' | 'info' | 'primary'
  tone: 'bullish' | 'dip' | 'risk' | 'retreat' | 'neutral'
}

const emit = defineEmits<{
  chartReady: [chart: echarts.ECharts]
  chartClick: [payload: { industry: string; sectorCode: string; date: string; value: number; idxType: IndustryMaBreadthIdxType }]
  industriesLoaded: [industries: string[]]
  'update:selectedIndustries': [industries: string[]]
}>()

const analysisModeOptions = [
  { label: '展示模式', value: 'display' },
  { label: '实战模式', value: 'practice' }
]
const analysisMode = ref<AnalysisMode>('display')

/** 时间范围上限：最多回溯 30 天 */
const MAX_RANGE_DAYS = 30
const PRACTICE_DAYS = 3
const PRACTICE_LOOKBACK_DAYS = 10
const PRACTICE_MA_WINDOWS: PracticeMaWindow[] = [5, 10, 20]
const rangeDayOptions = [
  { label: '最近3天', value: 3 },
  { label: '最近5天', value: 5 },
  { label: '最近10天', value: 10 },
  { label: '最近15天', value: 15 },
  { label: '最近20天', value: 20 },
  { label: '最近30天', value: 30 }
]
/** 回溯天数（可调，默认最近 30 天） */
const rangeDays = ref<number>(30)
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
const minAmount = ref<number>(0)
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
const practiceDataByMa = ref<Record<PracticeMaWindow, IndustryMaBreadthItem[]>>({
  5: [],
  10: [],
  20: []
})

/**
 * 从获取到的原始数据中提取唯一的行业名称列表（已排序），
 * 用于驱动筛选组件的下拉选项，确保与实际数据一致。
 */
const rawIndustryNames = computed<string[]>(() => {
  const source = analysisMode.value === 'practice'
    ? PRACTICE_MA_WINDOWS.flatMap(window => practiceDataByMa.value[window])
    : rawData.value
  const names = Array.from(new Set(source.map(d => d.sector_name)))
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

function passesAmountFilter(sectorCode: string): boolean {
  const hasMinFilter = minAmount.value > 0
  const hasMaxFilter = maxAmount.value > 0
  if (!hasMinFilter && !hasMaxFilter) return true
  if (turnoverData.value.length === 0) return true

  const allDates = Array.from(new Set(turnoverData.value.map(d => d.date))).sort()
  const latestDate = allDates[allDates.length - 1]
  const matched = turnoverData.value.find(item => item.date === latestDate && item.sector_code === sectorCode)
  const amount = matched?.amount ?? 0
  if (hasMinFilter && amount < minAmount.value) return false
  if (hasMaxFilter && amount > maxAmount.value) return false
  return true
}

const selectedBoardLabel = computed(() => {
  return selectedIdxType.value === '行业板块'
    ? selectedLevel.value
    : '东财概念板块'
})

function getNumericBreadth(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getDirection(change: number | null): WidthDirection {
  if (change === null) return 'flat'
  if (change > 0) return 'expand'
  if (change < 0) return 'shrink'
  return 'flat'
}

function formatPracticePercent(value: number | null): string {
  return value === null ? '--' : `${(value * 100).toFixed(1)}%`
}

function formatPracticeChange(value: number | null): string {
  if (value === null) return '无变化'
  const absText = `${Math.abs(value * 100).toFixed(1)}pct`
  if (value > 0) return `+${absText}`
  if (value < 0) return `-${absText}`
  return '0.0pct'
}

function formatPracticeCell(value: number | null, change: number | null): string {
  return `${formatPracticePercent(value)} (${formatPracticeChange(change)})`
}

function resolvePracticeSignal(
  ma5Direction: WidthDirection,
  ma10Direction: WidthDirection,
  ma20Direction: WidthDirection
): Pick<PracticeSignal, 'signalKey' | 'signalLabel' | 'action' | 'tagType' | 'tone'> {
  if (ma5Direction === 'shrink' && ma10Direction === 'shrink' && ma20Direction === 'shrink') {
    return {
      signalKey: 'retreat',
      signalLabel: '全面退潮',
      action: '空仓等待',
      tagType: 'danger',
      tone: 'retreat'
    }
  }

  if (ma20Direction === 'shrink') {
    return {
      signalKey: 'mediumRisk',
      signalLabel: '中期风险信号',
      action: '大幅减仓防守',
      tagType: 'danger',
      tone: 'risk'
    }
  }

  if (ma5Direction === 'expand' && ma10Direction === 'expand' && ma20Direction === 'expand') {
    return {
      signalKey: 'bullish',
      signalLabel: '全面做多环境',
      action: '顺势参与强势方向',
      tagType: 'success',
      tone: 'bullish'
    }
  }

  if (ma5Direction === 'shrink' && ma10Direction === 'expand' && ma20Direction === 'expand') {
    return {
      signalKey: 'dip',
      signalLabel: '正常分化调整',
      action: '可低吸',
      tagType: 'warning',
      tone: 'dip'
    }
  }

  return {
    signalKey: 'neutral',
    signalLabel: '观察区',
    action: '等待三线共振',
    tagType: 'info',
    tone: 'neutral'
  }
}

function buildPracticeSignals(): PracticeSignal[] {
  const rowsBySector = new Map<string, { code: string; name: string; byMa: Record<PracticeMaWindow, IndustryMaBreadthItem[]> }>()

  for (const ma of PRACTICE_MA_WINDOWS) {
    for (const item of practiceDataByMa.value[ma]) {
      const key = item.sector_code || item.sector_name
      if (!key) continue
      const existing = rowsBySector.get(key) ?? {
        code: item.sector_code,
        name: item.sector_name,
        byMa: { 5: [], 10: [], 20: [] }
      }
      existing.byMa[ma].push(item)
      rowsBySector.set(key, existing)
    }
  }

  const selectedSet = new Set(props.selectedIndustries || [])
  const signals: PracticeSignal[] = []

  rowsBySector.forEach(({ code, name, byMa }) => {
    if (selectedSet.size && !selectedSet.has(name)) return
    if (!passesAmountFilter(code)) return

    const sortedByMa = Object.fromEntries(
      PRACTICE_MA_WINDOWS.map(ma => [
        ma,
        [...byMa[ma]]
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-PRACTICE_DAYS)
      ])
    ) as Record<PracticeMaWindow, IndustryMaBreadthItem[]>

    const dates = Array.from(new Set(PRACTICE_MA_WINDOWS.flatMap(ma => sortedByMa[ma].map(item => item.date)))).sort()
    const hasEnoughData = PRACTICE_MA_WINDOWS.every(ma => sortedByMa[ma].length >= PRACTICE_DAYS)
    if (!hasEnoughData) {
      signals.push({
        sector_code: code,
        sector_name: name,
        dates,
        ma5: null,
        ma10: null,
        ma20: null,
        ma5Change: null,
        ma10Change: null,
        ma20Change: null,
        ma5Direction: 'flat',
        ma10Direction: 'flat',
        ma20Direction: 'flat',
        signalKey: 'insufficient',
        signalLabel: '数据不足',
        action: '等待数据补齐',
        reason: `有效交易日不足 ${PRACTICE_DAYS} 天`,
        tagType: 'info',
        tone: 'neutral'
      })
      return
    }

    const maValues = Object.fromEntries(
      PRACTICE_MA_WINDOWS.map(ma => {
        const rows = sortedByMa[ma]
        const first = getNumericBreadth(rows[0]?.breadth_ratio)
        const latest = getNumericBreadth(rows[rows.length - 1]?.breadth_ratio)
        return [ma, { latest, change: latest - first }]
      })
    ) as Record<PracticeMaWindow, { latest: number; change: number }>

    const ma5Direction = getDirection(maValues[5].change)
    const ma10Direction = getDirection(maValues[10].change)
    const ma20Direction = getDirection(maValues[20].change)
    const signal = resolvePracticeSignal(ma5Direction, ma10Direction, ma20Direction)

    signals.push({
      sector_code: code,
      sector_name: name,
      dates,
      ma5: maValues[5].latest,
      ma10: maValues[10].latest,
      ma20: maValues[20].latest,
      ma5Change: maValues[5].change,
      ma10Change: maValues[10].change,
      ma20Change: maValues[20].change,
      ma5Direction,
      ma10Direction,
      ma20Direction,
      ...signal,
      reason: `MA5 ${formatPracticeChange(maValues[5].change)}，MA10 ${formatPracticeChange(maValues[10].change)}，MA20 ${formatPracticeChange(maValues[20].change)}`
    })
  })

  return signals
}

const practiceSignals = computed<PracticeSignal[]>(() => buildPracticeSignals())

const practiceSignalRank: Record<PracticeSignalKey, number> = {
  bullish: 1,
  dip: 2,
  mediumRisk: 3,
  retreat: 4,
  neutral: 5,
  insufficient: 6
}

const practiceSortedSignals = computed<PracticeSignal[]>(() => {
  const rows = [...practiceSignals.value]
  if (sortByLastColumn.value) {
    return rows.sort((a, b) =>
      practiceSignalRank[a.signalKey] - practiceSignalRank[b.signalKey] ||
      (b.ma20 ?? -1) - (a.ma20 ?? -1) ||
      a.sector_name.localeCompare(b.sector_name)
    )
  }
  return rows.sort((a, b) => a.sector_name.localeCompare(b.sector_name))
})

const practiceMatchedSignalCount = computed(() =>
  practiceSignals.value.filter(item => item.signalKey !== 'neutral' && item.signalKey !== 'insufficient').length
)

const practiceSignalStats = computed(() => {
  const total = practiceSignals.value.length || 1
  const definitions: Array<{
    key: PracticeSignalKey
    label: string
    description: string
    tone: PracticeSignal['tone']
  }> = [
    { key: 'bullish', label: '全面做多环境', description: '三线宽度同时向上扩张，类似2020年7月/2023年1月', tone: 'bullish' },
    { key: 'dip', label: '正常分化调整', description: 'MA5收窄，MA10/MA20仍扩张', tone: 'dip' },
    { key: 'mediumRisk', label: '中期风险信号', description: 'MA20宽度开始收窄', tone: 'risk' },
    { key: 'retreat', label: '全面退潮', description: '三线宽度同时收窄', tone: 'retreat' }
  ]

  return definitions.map(definition => {
    const count = practiceSignals.value.filter(item => item.signalKey === definition.key).length
    return {
      ...definition,
      count,
      ratioText: `${((count / total) * 100).toFixed(0)}%`
    }
  })
})

function directionClass(direction: WidthDirection): string {
  if (direction === 'expand') return 'direction-up'
  if (direction === 'shrink') return 'direction-down'
  return 'direction-flat'
}

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
    const days = analysisMode.value === 'practice'
      ? PRACTICE_LOOKBACK_DAYS
      : Math.min(MAX_RANGE_DAYS, Math.max(1, Math.round(Number(rangeDays.value) || 1)))
    const [start, end] = computeDateRangeByEndDate(endDate.value, days)
    const commonQuery = {
      startDate: start,
      endDate: end,
      idxType: selectedIdxType.value,
      level: selectedIdxType.value === '行业板块' ? selectedLevel.value : undefined
    }

    if (analysisMode.value === 'practice') {
      const [ma5Data, ma10Data, ma20Data, turnoverResult] = await Promise.all([
        fetchIndustryMaBreadth({ ...commonQuery, maWindow: 5 }),
        fetchIndustryMaBreadth({ ...commonQuery, maWindow: 10 }),
        fetchIndustryMaBreadth({ ...commonQuery, maWindow: 20 }),
        fetchIndustryTurnoverPercentile(commonQuery).catch((err) => {
          console.error('获取成交额数据失败:', err)
          return null
        })
      ])

      rawData.value = []
      practiceDataByMa.value = {
        5: ma5Data.data ?? [],
        10: ma10Data.data ?? [],
        20: ma20Data.data ?? []
      }
      turnoverData.value = turnoverResult?.data ?? []
      return
    }

    const [breadthData, turnoverResult] = await Promise.all([
      fetchIndustryMaBreadth({
        ...commonQuery,
        maWindow: maWindow.value,
      }),
      fetchIndustryTurnoverPercentile(commonQuery).catch((err) => {
        console.error('获取成交额数据失败:', err)
        return null
      })
    ])

    rawData.value = breadthData.data ?? []
    practiceDataByMa.value = { 5: [], 10: [], 20: [] }
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

const handleModeChange = () => {
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
  gap: 10px;
}

/* 单行筛选条：不换行，放不下时横向滚动，纵向只占一行高度 */
.control-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #dcdfe6;
    border-radius: 2px;
  }
}

.ctl {
  flex: 0 0 auto;
}

.ctl-mode {
  width: 148px;
}

.ctl-xs {
  width: 88px;
}

.ctl-sm {
  width: 102px;
}

.ctl-md {
  width: 118px;
}

.ctl-date {
  width: 132px;
}

.ctl-industry {
  width: 190px;

  :deep(.industry-filter-select) {
    width: 100%;
    min-width: 0;
    max-width: none;
  }
}

.ctl-label {
  flex: 0 0 auto;
  font-size: 12px;
  color: #909399;
}

.amount-sep {
  flex: 0 0 auto;
  color: #c0c4cc;
}

.bar-spacer {
  flex: 1 1 auto;
  min-width: 8px;
}

.count-info {
  flex: 0 0 auto;
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.info-icon {
  flex: 0 0 auto;
  color: #909399;
  cursor: pointer;

  &:hover {
    color: var(--el-color-primary);
  }
}

.methodology {
  color: #606266;
  font-size: 13px;
  line-height: 1.7;

  p {
    margin: 0;
  }

  p + p {
    margin-top: 6px;
  }

  .methodology-title {
    font-weight: 600;
    color: #303133;
  }
}

.practice-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.practice-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.practice-summary-item {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #e1e6ee;
  border-left-width: 4px;
  border-radius: 6px;
  background: #fff;
}

.practice-summary-label {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.practice-summary-main {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 4px;
}

.practice-summary-main strong {
  font-size: 24px;
  line-height: 1;
  color: #172033;
}

.practice-summary-main span,
.practice-summary-desc {
  font-size: 12px;
  color: #909399;
}

.practice-summary-desc {
  margin-top: 5px;
  line-height: 1.45;
}

.tone-bullish {
  border-left-color: #67c23a;
}

.tone-dip {
  border-left-color: #e6a23c;
}

.tone-risk {
  border-left-color: #f56c6c;
}

.tone-retreat {
  border-left-color: #909399;
}

.practice-table {
  width: 100%;
}

.direction-up {
  color: #f56c6c;
  font-weight: 600;
}

.direction-down {
  color: #67c23a;
  font-weight: 600;
}

.direction-flat {
  color: #909399;
}

.empty-tip {
  color: #999;
  padding: 24px;
  text-align: center;
}

// 移动端适配：筛选条保持单行横向滚动，热力图压缩最小高度
@media (max-width: 768px) {
  .industry-breadth-analysis {
    gap: 8px;
  }

  .ctl-industry {
    width: 150px;
  }

  .practice-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :deep(.heatmap-chart) {
    min-height: 300px;
  }
}
</style>

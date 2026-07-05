<template>
  <div class="limit-board-page">
    <el-card class="query-card" shadow="never">
      <el-form :inline="true" class="query-form">
        <el-form-item label="时间范围">
          <el-radio-group v-model="trendRange" @change="onTrendRangeChange">
            <el-radio-button
              v-for="option in trendRangeOptions"
              :key="option.value"
              :label="option.value"
            >
              {{ option.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="行业映射">
          <el-select v-model="industryMapping" style="width: 160px" @change="onIndustryMappingChange">
            <el-option
              v-for="option in industryMappingOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="loadIndustryTrend">查询</el-button>
          <el-button :loading="loading" @click="loadIndustryTrend(true)">刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <section v-loading="loading" class="tab-panel">
      <div v-if="industryTrendData" class="summary-grid compact">
        <div v-for="item in industryTrendSummaryCards" :key="item.key" class="metric-card">
          <div class="metric-label">{{ item.label }}</div>
          <div class="metric-value">{{ formatValue(item.value, item.suffix) }}</div>
        </div>
      </div>

      <el-card shadow="never" class="trend-card" v-if="hasIndustryTrendDaily">
        <template #header>行业涨停趋势矩阵</template>
        <LimitBoardIndustryTrendMatrix :daily="industryTrendDaily" />
      </el-card>

      <SourceCounts :counts="industryTrendData?.source_counts" />
      <el-empty
        v-if="!loading && (!industryTrendData || !hasIndustryTrendDaily)"
        description="请选择日期区间查询涨停趋势"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 打板分析选股页面
 * 功能：
 * - 展示打板策略中的涨停趋势分析结果
 * - 支持按时间范围和行业映射方式查询行业涨停趋势
 * - 复用统一格式化方法展示统计指标与数据来源
 * 参数：无
 * 返回值：无
 * 事件：
 * - click: 点击查询或刷新按钮时重新拉取涨停趋势数据
 */
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import LimitBoardIndustryTrendMatrix from '@/components/LimitBoardIndustryTrendMatrix.vue'
import {
  fetchIndustryTrendStrength,
  type IndustryMapping,
  type IndustryTrendStrengthData
} from '@/services/limitBoardStrategyApi'

interface SummaryCardItem {
  key: string
  label: string
  value: unknown
  suffix?: string
  className?: string
}

/**
 * 数据来源计数组件
 * 功能：
 * - 以标签形式展示接口返回的各数据源记录数
 * - 在当前页复用统一的来源统计样式
 * 参数：
 * @param {Record<string, number> | undefined} counts 数据源记录数字典
 * 返回值：VNode | null
 * 事件：无
 */
const SourceCounts = defineComponent({
  name: 'SourceCounts',
  props: {
    counts: {
      type: Object,
      default: undefined
    }
  },
  setup(props) {
    return () => {
      const counts = props.counts as Record<string, number> | undefined
      if (!counts || Object.keys(counts).length === 0) return null
      return h(
        'div',
        { class: 'source-counts' },
        Object.entries(counts).map(([key, value]) =>
          h('span', { class: 'source-count' }, `${key}: ${value}`)
        )
      )
    }
  }
})

type TrendRange = '2w' | '1m' | '3m'

const trendRangeOptions: Array<{ label: string; value: TrendRange }> = [
  { label: '最近2周', value: '2w' },
  { label: '最近一个月', value: '1m' },
  { label: '最近三个月', value: '3m' }
]

/** 行业趋势的行业映射方式选项，取值对应接口 industry_mapping 参数 */
const industryMappingOptions: Array<{ label: string; value: IndustryMapping }> = [
  { label: '东财概念', value: 'dc_concept' },
  { label: '东财地域', value: 'dc_region' },
  { label: '东财一级行业', value: 'dc_l1' },
  { label: '东财二级行业', value: 'dc_l2' },
  { label: '东财三级行业', value: 'dc_l3' }
]

const trendRange = ref<TrendRange>('2w')
const industryMapping = ref<IndustryMapping>('dc_l1')
const trendEndDate = ref(getRecentTradeDate())
const trendStartDate = ref(getRangeStartDate(trendEndDate.value, trendRange.value))
const loading = ref(false)
const industryTrendData = ref<IndustryTrendStrengthData | null>(null)

const industryTrendSummaryCards = computed<SummaryCardItem[]>(() => {
  const s = industryTrendData.value?.summary || {}
  return [
    { key: 'industry_mapping_label', label: '行业映射', value: s.industry_mapping_label },
    { key: 'trade_day_count', label: '交易日数量', value: s.trade_day_count },
    { key: 'industry_count', label: '行业数量', value: s.industry_count },
    { key: 'total_limit_up_count', label: '累计涨停家数', value: s.total_limit_up_count },
    { key: 'industry_matched_count', label: '匹配行业记录', value: s.industry_matched_count }
  ]
})

const industryTrendDaily = computed(() => industryTrendData.value?.data || {})
const hasIndustryTrendDaily = computed(() => Object.keys(industryTrendDaily.value).length > 0)

async function loadIndustryTrend(force = false) {
  if (loading.value && !force) return
  if (!trendStartDate.value || !trendEndDate.value) return
  if (trendStartDate.value > trendEndDate.value) {
    ElMessage.warning('开始日期不能晚于结束日期')
    return
  }

  loading.value = true
  try {
    industryTrendData.value = await fetchIndustryTrendStrength({
      start_date: trendStartDate.value,
      end_date: trendEndDate.value,
      industry_mapping: industryMapping.value
    })
  } finally {
    loading.value = false
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function getRecentTradeDate(): string {
  const date = new Date()
  const day = date.getDay()
  if (day === 0) {
    date.setDate(date.getDate() - 2)
  } else if (day === 6) {
    date.setDate(date.getDate() - 1)
  }
  return formatDate(date)
}

function parseDateString(value: string): Date {
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))
  return new Date(year, month - 1, day)
}

/**
 * 工具：按时间范围快捷键计算起始日期。
 * 参数：
 *  - endValue 为区间结束日期 YYYYMMDD；
 *  - range 为快捷范围，2周/1个月/3个月。
 * 返回值：区间起始日期 YYYYMMDD。
 */
function getRangeStartDate(endValue: string, range: TrendRange): string {
  const date = parseDateString(endValue)
  if (range === '2w') {
    date.setDate(date.getDate() - 14)
  } else if (range === '1m') {
    date.setMonth(date.getMonth() - 1)
  } else {
    date.setMonth(date.getMonth() - 3)
  }
  return formatDate(date)
}

/**
 * 事件：切换涨停趋势时间范围。
 * 参数：range 为选中的快捷范围。
 * 返回值：void，重算起始日期并刷新涨停趋势数据。
 */
function onTrendRangeChange(range: string | number | boolean | undefined) {
  const value = range as TrendRange
  trendEndDate.value = getRecentTradeDate()
  trendStartDate.value = getRangeStartDate(trendEndDate.value, value)
  loadIndustryTrend(true)
}

/**
 * 事件：切换涨停趋势行业映射方式。
 * 参数：mapping 为选中的行业映射方式。
 * 返回值：void，按新映射方式刷新涨停趋势数据。
 */
function onIndustryMappingChange(mapping: string | number | boolean | undefined) {
  industryMapping.value = mapping as IndustryMapping
  loadIndustryTrend(true)
}

function formatValue(value: unknown, suffix = ''): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return `${Number.isInteger(value) ? value : value.toFixed(2)}${suffix}`
  return `${value}${suffix}`
}

onMounted(() => {
  loadIndustryTrend()
})
</script>

<style scoped>
.limit-board-page {
  padding: 12px;
}

.query-card {
  margin-bottom: 12px;
}

.query-form {
  margin-bottom: -18px;
}

.tab-panel {
  min-height: 360px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.summary-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.metric-card {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 12px;
  background: #fafafa;
}

.metric-label {
  color: #606266;
  font-size: 13px;
  margin-bottom: 8px;
}

.metric-value {
  color: #303133;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.source-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  color: #606266;
  font-size: 12px;
}

.source-count {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 3px 8px;
  background: #fafafa;
}

.trend-card {
  margin-bottom: 12px;
}
</style>

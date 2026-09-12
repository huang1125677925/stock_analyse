<template>
  <div class="limit-board-page">
    <section v-loading="loading" class="tab-panel">
      <el-card shadow="never" class="trend-card">
        <template #header>
          <div class="trend-card-header">
            <div class="trend-card-title">行业涨停趋势矩阵</div>
            <div class="trend-card-actions">
              <div class="header-control">
                <span class="header-control-label">行业映射</span>
                <el-select v-model="industryMapping" class="industry-mapping-select" @change="onIndustryMappingChange">
                  <el-option
                    v-for="option in industryMappingOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
              <el-switch
                v-model="showStockList"
                active-text="展示个股列表"
              />
            </div>
          </div>
        </template>

        <LimitBoardIndustryTrendMatrix
          :daily="industryTrendDaily"
          :idx-type="industryIdxType"
          :show-stock-list="showStockList"
        />
      </el-card>

      <SourceCounts :counts="industryTrendData?.source_counts" />
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 涨停分析选股页面
 * 功能：
 * - 展示打板策略中的涨停趋势分析结果
 * - 支持按行业映射方式查询行业涨停趋势
 * - 复用统一格式化方法展示统计指标与数据来源
 * 参数：无
 * 返回值：无
 * 事件：
 * - change: 切换行业映射时自动重新拉取涨停趋势数据
 */
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import LimitBoardIndustryTrendMatrix from '@/components/LimitBoardIndustryTrendMatrix.vue'
import {
  fetchIndustryTrendStrength,
  type IndustryMapping,
  type IndustryTrendStrengthData
} from '@/services/limitBoardStrategyApi'

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

/** 行业趋势的行业映射方式选项，取值对应接口 industry_mapping 参数 */
const industryMappingOptions: Array<{ label: string; value: IndustryMapping }> = [
  { label: '东财概念', value: 'dc_concept' },
  { label: '东财地域', value: 'dc_region' },
  { label: '东财一级行业', value: 'dc_l1' },
  { label: '东财二级行业', value: 'dc_l2' },
  { label: '东财三级行业', value: 'dc_l3' }
]

const industryMapping = ref<IndustryMapping>('dc_l2')
// 默认只展示涨停数量与状态统计，个股列表改为按需打开（右上角开关）
const showStockList = ref(false)

/** 行业映射 -> 东财板块类型，供领涨数据详情按 idx_type 拉取板块K线 */
const industryIdxType = computed(() => {
  if (industryMapping.value === 'dc_concept') return '概念板块'
  if (industryMapping.value === 'dc_region') return '地域板块'
  return '行业板块'
})
const trendEndDate = ref(getRecentTradeDate())
const trendStartDate = ref(getRangeStartDate(trendEndDate.value))
const loading = ref(false)
const industryTrendData = ref<IndustryTrendStrengthData | null>(null)

const industryTrendDaily = computed(() => industryTrendData.value?.data || {})

async function loadIndustryTrend(force = false) {
  if (loading.value && !force) return
  trendEndDate.value = getRecentTradeDate()
  trendStartDate.value = getRangeStartDate(trendEndDate.value)

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
 * 工具：计算固定近 2 周区间起始日期。
 * 参数：endValue 为区间结束日期 YYYYMMDD。
 * 返回值：区间起始日期 YYYYMMDD。
 */
function getRangeStartDate(endValue: string): string {
  const date = parseDateString(endValue)
  date.setDate(date.getDate() - 14)
  return formatDate(date)
}

/**
 * 事件：切换涨停趋势行业映射方式。
 * 返回值：void，按新映射方式刷新涨停趋势数据。
 */
function onIndustryMappingChange() {
  loadIndustryTrend(true)
}

onMounted(() => {
  loadIndustryTrend()
})
</script>

<style scoped>
.limit-board-page {
  padding: 12px;
}

.tab-panel {
  min-height: 360px;
}

.trend-card {
  margin-bottom: 12px;
}

.trend-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.trend-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.trend-card-actions {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.header-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-control-label {
  color: #606266;
  font-size: 14px;
  white-space: nowrap;
}

.industry-mapping-select {
  width: 160px;
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

@media (max-width: 768px) {
  .trend-card-header {
    align-items: flex-start;
  }

  .trend-card-actions,
  .header-control,
  .industry-mapping-select {
    width: 100%;
  }
}
</style>

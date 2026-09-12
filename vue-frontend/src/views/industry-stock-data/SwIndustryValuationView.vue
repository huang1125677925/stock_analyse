<template>
  <div class="sw-industry-valuation-view">
    <el-card shadow="hover" class="valuation-shell">
      <template #header>
        <div class="card-header">
          <div class="header-copy">
            <span class="header-title">申万行业估值柱状图</span>
          </div>
          <div class="toolbar">
            <el-button-group class="metric-buttons">
              <el-button :type="selectedValuationMetric === 'pe' ? 'primary' : 'default'" @click="setValuationMetric('pe')">PE</el-button>
              <el-button :type="selectedValuationMetric === 'pb' ? 'primary' : 'default'" @click="setValuationMetric('pb')">PB</el-button>
            </el-button-group>
            <el-select v-model="query.level" placeholder="行业级别" class="level-select" @change="fetchData">
              <el-option label="一级行业" value="L1" />
              <el-option label="二级行业" value="L2" />
            </el-select>
            <el-button-group class="range-buttons">
              <el-button :type="selectedRangeYears === 1 ? 'primary' : 'default'" @click="setYearRange(1)">最近一年</el-button>
              <el-button :type="selectedRangeYears === 3 ? 'primary' : 'default'" @click="setYearRange(3)">最近三年</el-button>
              <el-button :type="selectedRangeYears === 5 ? 'primary' : 'default'" @click="setYearRange(5)">最近五年</el-button>
              <el-button :type="selectedRangeYears === 10 ? 'primary' : 'default'" @click="setYearRange(10)">最近10年</el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <div class="content-area" v-loading="loading">
        <div v-if="filteredBoardItems.length" class="chart-grid">
          <section class="chart-panel">
            <div class="chart-heading">
              <div class="chart-title">{{ valuationChartTitle }}</div>
              <div class="color-note">
                <span class="note-item">
                  <i class="note-bar"></i>柱＝{{ selectedMetricPercentileLabel }}（左轴，颜色按分位判断）
                </span>
                <span class="note-item"><i class="note-line"></i>线＝{{ selectedMetricLabel }}（右轴）</span>
                <span class="note-item"><i class="note-dot low"></i>低估 <= 20%</span>
                <span class="note-item"><i class="note-dot neutral"></i>中性 20%-70%</span>
                <span class="note-item"><i class="note-dot high"></i>高估 >= 70%</span>
              </div>
            </div>
            <div ref="valuationChartRef" class="bar-chart"></div>
          </section>
        </div>

        <el-empty v-else description="暂无估值数据" class="empty-state" />
      </div>
    </el-card>

    <el-dialog
      v-model="industryDialogVisible"
      width="88vw"
      top="4vh"
      destroy-on-close
      class="industry-drill-dialog"
    >
      <template #header>
        <div class="dialog-header">
          <div>
            <div class="dialog-title">{{ dialogIndustry?.industry_name || dialogIndustry?.index_code || '行业详情' }}</div>
            <div class="dialog-subtitle">点击下级行业可继续下钻</div>
          </div>
          <div class="dialog-header-tags">
            <el-tag v-if="dialogIndustry?.index_code">{{ dialogIndustry.index_code }}</el-tag>
            <el-tag v-if="dialogIndustry?.level" :type="getLevelTagType(dialogIndustry.level)">{{ dialogIndustry.level }}</el-tag>
          </div>
        </div>
      </template>

      <div v-loading="industryDialogLoading" class="dialog-body">
        <el-tabs v-if="dialogIndustry" v-model="dialogActiveTab" class="dialog-tabs">
          <el-tab-pane label="基本信息" name="basic">
            <div class="dialog-basic">
              <el-descriptions :column="2" border class="dialog-descriptions">
                <el-descriptions-item label="行业名称">{{ dialogIndustry.industry_name }}</el-descriptions-item>
                <el-descriptions-item label="行业代码">{{ dialogIndustry.index_code }}</el-descriptions-item>
                <el-descriptions-item label="行业等级">
                  <el-tag :type="getLevelTagType(dialogIndustry.level)">{{ dialogIndustry.level }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="父级代码">
                  <el-link
                    v-if="dialogIndustry.parent_code"
                    type="primary"
                    :underline="false"
                    @click="handleParentClick"
                  >
                    {{ dialogIndustry.parent_code }}
                  </el-link>
                  <span v-else>无</span>
                </el-descriptions-item>
                <el-descriptions-item label="来源标准">{{ dialogIndustry.src || 'SW2021' }}</el-descriptions-item>
                <el-descriptions-item label="下级行业数量">{{ dialogChildren.length }}</el-descriptions-item>
              </el-descriptions>

              <div class="dialog-section-header">下级行业估值</div>
              <el-table
                v-if="dialogChildren.length"
                :data="dialogChildTableData"
                height="360"
                border
                stripe
                size="small"
                class="child-table"
                @row-click="handleChildRowClick"
              >
                <el-table-column prop="index_code" label="行业代码" width="120" />
                <el-table-column prop="industry_name" label="行业名称" min-width="160" />
                <el-table-column prop="level" label="等级" width="80">
                  <template #default="{ row }">
                    <el-tag size="small" :type="getLevelTagType(row.level)">{{ row.level }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="pe" label="PE" width="90" align="right">
                  <template #default="{ row }">{{ formatNumber(row.pe) }}</template>
                </el-table-column>
                <el-table-column prop="pe_percentile" label="PE分位" width="100" align="right">
                  <template #default="{ row }">
                    <span :style="getPercentileStyle(row.pe_percentile)">{{ formatPercentileText(row.pe_percentile) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="pb" label="PB" width="90" align="right">
                  <template #default="{ row }">{{ formatNumber(row.pb) }}</template>
                </el-table-column>
                <el-table-column prop="pb_percentile" label="PB分位" width="100" align="right">
                  <template #default="{ row }">
                    <span :style="getPercentileStyle(row.pb_percentile)">{{ formatPercentileText(row.pb_percentile) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="trade_date" label="数据日期" width="120" align="center" />
              </el-table>
              <el-empty v-else description="当前行业已无下级分类" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="行业趋势" name="trend">
            <SwIndustryTrendChart
              v-if="dialogActiveTab === 'trend'"
              :key="dialogIndustry.index_code"
              :ts-code="dialogIndustry.index_code"
              :industry-name="dialogIndustry.industry_name"
            />
          </el-tab-pane>

          <el-tab-pane label="指数成分股" name="members">
            <SwIndustryMembersTab
              v-if="dialogActiveTab === 'members'"
              :key="`${dialogIndustry.industry_code}-${dialogIndustry.level}`"
              :industry-code="dialogIndustry.industry_code"
              :index-code="dialogIndustry.index_code"
              :level="dialogIndustry.level"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { getSwValuationAnalysis, type SwValuationAnalysisItem } from '@/services/industryApi'
import { fetchSwIndexClassify, type SwIndexClassifyItem } from '@/services/swIndexClassifyApi'
import SwIndustryTrendChart from './components/SwIndustryTrendChart.vue'
import SwIndustryMembersTab from './components/SwIndustryMembersTab.vue'

type DirectionType = 'success' | 'warning' | 'danger'

interface BoardItem extends SwValuationAnalysisItem {
  avgPercentile: number
  avgPercentileText: string
  pePercentileText: string
  pbPercentileText: string
  pePercentileBar: number
  pbPercentileBar: number
  direction: string
  actionText: string
  tagType: DirectionType
  toneClass: string
  peBarColor: string
  pbBarColor: string
}

interface DialogChildRow extends SwIndexClassifyItem {
  pe?: number
  pe_percentile?: number
  pb?: number
  pb_percentile?: number
  trade_date?: string
}

type ChartMetricKey = 'pe' | 'pb' | 'pe_percentile' | 'pb_percentile'
type ValuationMetric = 'pe' | 'pb'

const loading = ref(false)
const tableData = ref<SwValuationAnalysisItem[]>([])
const selectedRangeYears = ref(3)
const selectedValuationMetric = ref<ValuationMetric>('pe')

const valuationChartRef = ref<HTMLElement | null>(null)

const industryDialogVisible = ref(false)
const industryDialogLoading = ref(false)
const dialogIndustry = ref<SwIndexClassifyItem | null>(null)
const dialogChildren = ref<SwIndexClassifyItem[]>([])
const dialogValuationMap = ref<Map<string, SwValuationAnalysisItem>>(new Map())
const dialogActiveTab = ref('basic')

const query = reactive({
  level: 'L1'
})

const selectedMetricLabel = computed(() => selectedValuationMetric.value.toUpperCase())
const selectedMetricPercentileLabel = computed(() => `${selectedMetricLabel.value}分位数`)
const selectedMetricKey = computed<ChartMetricKey>(() => selectedValuationMetric.value)
const selectedPercentileKey = computed<ChartMetricKey>(() => `${selectedValuationMetric.value}_percentile` as ChartMetricKey)

// 分位数与指标值合并为一张图：柱=分位数（左轴），线=指标值（右轴）
const valuationChartTitle = computed(() => `${selectedMetricLabel.value} 估值与分位数`)

const endDate = new Date()
const startDate = new Date()
startDate.setFullYear(startDate.getFullYear() - 3)

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

const dateRange = ref<[string, string]>([
  formatDate(startDate),
  formatDate(endDate)
])

const formatNumber = (num?: number | null) => {
  if (num === undefined || num === null || Number.isNaN(Number(num))) return '--'
  return Number(num).toFixed(2)
}

const formatPercentileText = (num?: number | null) => {
  if (num === undefined || num === null || Number.isNaN(Number(num))) return '--'
  return `${Number(num).toFixed(1)}%`
}

const normalizePercentile = (num?: number | null) => {
  if (num === undefined || num === null || Number.isNaN(Number(num))) return 0
  return Math.max(0, Math.min(100, Number(num)))
}

const getPercentileStyle = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return {}
  if (value < 20) return { color: '#67C23A', fontWeight: 'bold' }
  if (value > 80) return { color: '#F56C6C', fontWeight: 'bold' }
  return { color: '#b88228', fontWeight: 'bold' }
}

const getLevelTagType = (level: string) => {
  switch (level) {
    case 'L1': return 'danger'
    case 'L2': return 'warning'
    case 'L3': return 'success'
    default: return 'info'
  }
}

const getToneMeta = (avgPercentile: number) => {
  if (avgPercentile <= 20) {
    return {
      direction: '偏低估',
      actionText: '可优先纳入观察，适合等待更好的介入点',
      tagType: 'success' as DirectionType,
      toneClass: 'tone-low',
      color: '#3f9b63'
    }
  }
  if (avgPercentile < 70) {
    return {
      direction: '中性',
      actionText: '估值中性，结合景气和资金强弱继续筛选',
      tagType: 'warning' as DirectionType,
      toneClass: 'tone-neutral',
      color: '#b88228'
    }
  }
  return {
    direction: '偏高估',
    actionText: '估值偏高，优先看回撤风险和兑现压力',
    tagType: 'danger' as DirectionType,
    toneClass: 'tone-high',
    color: '#c84f44'
  }
}

const boardItems = computed<BoardItem[]>(() => {
  return [...tableData.value]
    .map(item => {
      const avgPercentile = Number((((item.pe_percentile || 0) + (item.pb_percentile || 0)) / 2).toFixed(1))
      const tone = getToneMeta(avgPercentile)
      return {
        ...item,
        avgPercentile,
        avgPercentileText: formatPercentileText(avgPercentile),
        pePercentileText: formatPercentileText(item.pe_percentile),
        pbPercentileText: formatPercentileText(item.pb_percentile),
        pePercentileBar: normalizePercentile(item.pe_percentile),
        pbPercentileBar: normalizePercentile(item.pb_percentile),
        direction: tone.direction,
        actionText: tone.actionText,
        tagType: tone.tagType,
        toneClass: tone.toneClass,
        peBarColor: tone.color,
        pbBarColor: tone.color
      }
    })
    .sort((a, b) => a.avgPercentile - b.avgPercentile)
})

const filteredBoardItems = computed<BoardItem[]>(() => {
  return boardItems.value
})

const dialogChildTableData = computed<DialogChildRow[]>(() => {
  return dialogChildren.value.map(item => {
    const valuation = dialogValuationMap.value.get(item.index_code)
    return {
      ...item,
      pe: valuation?.pe,
      pe_percentile: valuation?.pe_percentile,
      pb: valuation?.pb,
      pb_percentile: valuation?.pb_percentile,
      trade_date: valuation?.trade_date
    }
  })
})

const setYearRange = (years: number) => {
  const end = new Date()
  const start = new Date()
  start.setFullYear(start.getFullYear() - years)
  dateRange.value = [formatDate(start), formatDate(end)]
  selectedRangeYears.value = years
  void fetchData()
}

const setValuationMetric = (metric: ValuationMetric) => {
  selectedValuationMetric.value = metric
}

const getChartValue = (item: BoardItem, key: ChartMetricKey) => {
  const value = Number(item[key])
  return Number.isFinite(value) ? value : null
}

// 柱色按分位判断（低=绿、中性=黄、高=红），与右侧指标折线区分开
const getBarColorByPercentile = (percentile: number) => getToneMeta(normalizePercentile(percentile)).color

/** 行业按分位数从低到高排列，柱（分位）与线（指标值）共用同一套顺序 */
const getSortedChartItems = () => {
  return filteredBoardItems.value
    .map(item => ({
      item,
      percentile: getChartValue(item, selectedPercentileKey.value),
      metricValue: getChartValue(item, selectedMetricKey.value)
    }))
    .filter(
      (entry): entry is { item: BoardItem; percentile: number; metricValue: number | null } =>
        entry.percentile !== null
    )
    .sort((a, b) => a.percentile - b.percentile)
}

const buildChartOption = (): echarts.EChartsOption => {
  const entries = getSortedChartItems()
  const names = entries.map(({ item }) => item.name)
  const metricLabel = selectedMetricLabel.value
  const percentileLabel = selectedMetricPercentileLabel.value

  const barData = entries.map(({ item, percentile }) => ({
    value: percentile,
    item,
    itemStyle: {
      color: getBarColorByPercentile(percentile),
      borderRadius: [4, 4, 0, 0]
    }
  }))

  const lineData = entries.map(({ item, metricValue }) => ({ value: metricValue, item }))

  return {
    animationDuration: 240,
    grid: {
      top: 30,
      right: 66, // 给右侧轴名称与刻度留出空间
      bottom: 76,
      left: 54,
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter(params) {
        const list = Array.isArray(params) ? params : [params]
        const item = (list[0]?.data as { item?: BoardItem } | undefined)?.item
        if (!item) return ''
        const percentile = getChartValue(item, selectedPercentileKey.value)
        const metricValue = getChartValue(item, selectedMetricKey.value)
        return [
          `${item.name} ${item.ts_code}`,
          `${percentileLabel}: ${percentile === null ? '--' : `${percentile.toFixed(1)}%`}`,
          `${metricLabel}: ${formatNumber(metricValue)}`,
          `估值状态: ${item.direction}`
        ].join('<br/>')
      }
    },
    xAxis: {
      type: 'category',
      data: names,
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: '#d8dee8' } },
      axisLabel: {
        color: '#334155',
        fontSize: 12,
        interval: 0,
        rotate: 45,
        width: 68,
        overflow: 'truncate'
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '分位',
        min: 0,
        max: 100,
        nameTextStyle: { color: '#6b7280' },
        axisLabel: {
          color: '#6b7280',
          formatter: '{value}%'
        },
        splitLine: {
          lineStyle: { color: '#eef2f7' }
        }
      },
      {
        type: 'value',
        name: metricLabel,
        // 折线轴自适应范围（不强拉到 0），便于看出行业间指标值的相对高低
        scale: true,
        nameTextStyle: { color: '#409EFF' },
        axisLabel: { color: '#409EFF' },
        splitLine: { show: false }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        zoomLock: false
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 18,
        bottom: 8,
        brushSelect: false,
        filterMode: 'none'
      }
    ],
    series: [
      {
        name: percentileLabel,
        type: 'bar',
        yAxisIndex: 0,
        barMaxWidth: 28,
        data: barData,
        cursor: 'pointer',
        emphasis: {
          // 不用 focus:'self'：否则悬停柱子会把右侧折线整体淡化
          focus: 'none',
          itemStyle: {
            shadowBlur: 12,
            shadowColor: 'rgba(15, 23, 42, 0.22)'
          }
        },
        label: {
          show: true,
          position: 'top',
          color: '#475569',
          fontSize: 11,
          formatter: ({ value }) => `${Number(value).toFixed(1)}%`
        }
      },
      {
        name: metricLabel,
        type: 'line',
        yAxisIndex: 1,
        data: lineData,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        connectNulls: true,
        z: 3,
        cursor: 'pointer',
        lineStyle: { width: 2, color: '#409EFF' },
        itemStyle: { color: '#409EFF' }
      }
    ]
  }
}

let chartInstance: echarts.ECharts | null = null

const renderCharts = async () => {
  await nextTick()
  const el = valuationChartRef.value
  if (!el) return

  if (chartInstance && chartInstance.getDom() !== el) {
    chartInstance.dispose()
    chartInstance = null
  }
  if (!chartInstance) {
    chartInstance = echarts.init(el)
    chartInstance.on('click', (params) => {
      const chartData = params.data as { item?: BoardItem } | undefined
      if (chartData?.item) {
        void openIndustryDialog(chartData.item)
      }
    })
  }
  chartInstance.setOption(buildChartOption(), true)
  chartInstance.resize()
}

const resizeCharts = () => {
  chartInstance?.resize()
}

const disposeCharts = () => {
  chartInstance?.dispose()
  chartInstance = null
}

const fetchData = async () => {
  if (!dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请选择日期范围')
    return
  }

  loading.value = true
  try {
    const res = await getSwValuationAnalysis({
      start_date: dateRange.value[0],
      end_date: dateRange.value[1],
      level: query.level
    })
    tableData.value = Array.isArray(res) ? res : []
  } catch (error: any) {
    ElMessage.error(error.message || '获取数据失败')
  } finally {
    loading.value = false
  }
}

const fetchIndustryByIndexCode = async (indexCode: string): Promise<SwIndexClassifyItem | null> => {
  try {
    const data = await fetchSwIndexClassify({ index_code: indexCode, src: 'SW2021' })
    return data[0] || null
  } catch {
    return null
  }
}

const fetchDialogValuations = async (children: SwIndexClassifyItem[]) => {
  if (!children.length) {
    dialogValuationMap.value = new Map()
    return
  }

  const level = children[0].level
  const indexCodes = children.map(item => item.index_code).join(',')
  const data = await getSwValuationAnalysis({
    start_date: dateRange.value[0],
    end_date: dateRange.value[1],
    level,
    index_codes: indexCodes
  })

  const map = new Map<string, SwValuationAnalysisItem>()
  ;[...data]
    .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
    .forEach(item => {
      map.set(item.ts_code, item)
    })
  dialogValuationMap.value = map
}

const loadDialogIndustry = async (industry: SwIndexClassifyItem) => {
  industryDialogLoading.value = true
  try {
    dialogIndustry.value = industry
    dialogActiveTab.value = 'basic'

    if (industry.level === 'L3') {
      dialogChildren.value = []
      dialogValuationMap.value = new Map()
      return
    }

    const children = await fetchSwIndexClassify({
      parent_code: industry.industry_code,
      src: industry.src || 'SW2021'
    })
    dialogChildren.value = children
    await fetchDialogValuations(children)
  } catch (error: any) {
    ElMessage.error(error?.message || '加载行业下钻信息失败')
    dialogChildren.value = []
    dialogValuationMap.value = new Map()
  } finally {
    industryDialogLoading.value = false
  }
}

const openIndustryDialog = async (item: BoardItem) => {
  industryDialogVisible.value = true
  const industry = await fetchIndustryByIndexCode(item.ts_code)
  if (!industry) {
    ElMessage.warning(`未找到行业分类信息：${item.name}`)
    industryDialogVisible.value = false
    return
  }
  await loadDialogIndustry(industry)
}

const handleChildRowClick = async (row: DialogChildRow) => {
  await loadDialogIndustry(row)
}

const handleParentClick = async () => {
  if (!dialogIndustry.value?.parent_code) return

  const currentIndustry = dialogIndustry.value

  // 确定父级的 level
  const currentLevel = currentIndustry.level
  let parentLevel: string
  if (currentLevel === 'L3') {
    parentLevel = 'L2'
  } else if (currentLevel === 'L2') {
    parentLevel = 'L1'
  } else {
    ElMessage.warning('当前行业已是顶级，无父级')
    return
  }

  try {
    // 查询父级 level 的所有行业
    const allParentLevelIndustries = await fetchSwIndexClassify({
      level: parentLevel,
      src: currentIndustry.src || 'SW2021'
    })

    // 从中找到 industry_code 匹配的父级
    const parentIndustry = allParentLevelIndustries.find(
      item => item.industry_code === currentIndustry.parent_code
    )

    if (!parentIndustry) {
      ElMessage.warning(`未找到父级行业：${currentIndustry.parent_code}`)
      return
    }

    await loadDialogIndustry(parentIndustry)
  } catch (error: any) {
    ElMessage.error(error?.message || '查找父级行业失败')
  }
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', resizeCharts)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})

watch([filteredBoardItems, selectedValuationMetric], () => {
  if (filteredBoardItems.value.length) void renderCharts()
  else disposeCharts()
})
</script>

<style scoped>
.sw-industry-valuation-view {
  padding: 16px;
  height: calc(100vh - 84px);
  box-sizing: border-box;
}

.valuation-shell {
  height: 100%;
}

:deep(.valuation-shell > .el-card__body) {
  height: calc(100% - 73px);
  padding-top: 16px;
  box-sizing: border-box;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.header-subtitle {
  font-size: 13px;
  color: #6b7280;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.level-select {
  width: 140px;
}

.metric-buttons,
.range-buttons {
  flex-wrap: nowrap;
}

.content-area {
  height: 100%;
  overflow: auto;
}

.chart-grid {
  min-height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 14px;
}

.chart-panel {
  min-width: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
  padding: 12px;
}

.chart-title {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.chart-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.color-note {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}

.note-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.note-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.note-dot.low {
  background: #3f9b63;
}

.note-dot.neutral {
  background: #b88228;
}

.note-dot.high {
  background: #c84f44;
}

/* 图例中“柱/线”的示意标记 */
.note-bar {
  width: 8px;
  height: 12px;
  border-radius: 2px 2px 0 0;
  background: #b88228;
  display: inline-block;
}

.note-line {
  width: 18px;
  height: 0;
  border-top: 2px solid #409eff;
  display: inline-block;
}

.bar-chart {
  width: 100%;
  height: 360px;
}

.empty-state {
  flex: 1;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.dialog-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.dialog-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.dialog-header-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dialog-body {
  min-height: 360px;
}

.dialog-basic {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dialog-descriptions {
  width: 100%;
}

.dialog-section-header {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
  border-left: 4px solid #409eff;
  padding-left: 10px;
}

.child-table :deep(.el-table__row) {
  cursor: pointer;
}

@media (max-width: 1200px) {
  .sw-industry-valuation-view {
    height: auto;
  }

  .valuation-shell {
    height: auto;
  }

  :deep(.valuation-shell > .el-card__body) {
    height: auto;
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .sw-industry-valuation-view {
    padding: 12px;
  }

  .card-header,
  .toolbar,
  .dialog-header {
    align-items: stretch;
    flex-direction: column;
  }

  .range-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .bar-chart {
    height: 360px;
  }

  :deep(.industry-drill-dialog) {
    width: 96vw !important;
  }

  /* 分级下拉在窄屏占满整行，不再是孤立的 140px */
  .level-select {
    width: 100% !important;
  }

  /* 详情描述在窄屏改为单列，标签/值不再被挤压 */
  .dialog-descriptions :deep(.el-descriptions__table) {
    table-layout: fixed;
  }
}
</style>

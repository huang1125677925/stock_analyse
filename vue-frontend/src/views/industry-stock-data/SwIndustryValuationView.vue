<template>
  <div class="sw-industry-valuation-view">
    <el-card shadow="hover" class="valuation-shell">
      <template #header>
        <div class="card-header">
          <div class="header-copy">
            <span class="header-title">申万行业估值分析</span>
            <span class="header-subtitle">一屏查看估值分层、行业差异和当前更适合的跟踪方向</span>
          </div>
          <div class="toolbar">
            <IndustryFilter v-model="selectedIndustries" />
            <el-select v-model="query.level" placeholder="选择分级" class="level-select">
              <el-option label="一级行业" value="L1" />
              <el-option label="二级行业" value="L2" />
            </el-select>
            <el-button-group class="range-buttons">
              <el-button :type="selectedRangeYears === 1 ? 'primary' : 'default'" @click="setYearRange(1)">最近一年</el-button>
              <el-button :type="selectedRangeYears === 3 ? 'primary' : 'default'" @click="setYearRange(3)">最近三年</el-button>
              <el-button :type="selectedRangeYears === 5 ? 'primary' : 'default'" @click="setYearRange(5)">最近五年</el-button>
              <el-button :type="selectedRangeYears === 10 ? 'primary' : 'default'" @click="setYearRange(10)">最近10年</el-button>
            </el-button-group>
            <el-button type="primary" :loading="loading" @click="fetchData">查询</el-button>
          </div>
        </div>
      </template>

      <div class="content-area" v-loading="loading">
        <div class="summary-grid">
          <section class="summary-card emphasis">
            <div class="summary-label">当前样本</div>
            <div class="summary-value">{{ filteredBoardItems.length }}</div>
            <div class="summary-meta">
              {{ levelLabel }} · {{ rangeLabel }}
              <span v-if="latestTradeDate"> · {{ latestTradeDate }}</span>
            </div>
          </section>

          <section class="summary-card positive">
            <div class="summary-label">偏低估</div>
            <div class="summary-value">{{ valuationSummary.low }}</div>
            <div class="summary-meta">优先看分位数低于 20 的行业</div>
          </section>

          <section class="summary-card neutral">
            <div class="summary-label">中性区间</div>
            <div class="summary-value">{{ valuationSummary.neutral }}</div>
            <div class="summary-meta">等待景气催化或估值进一步拉开</div>
          </section>

          <section class="summary-card negative">
            <div class="summary-label">偏高估</div>
            <div class="summary-value">{{ valuationSummary.high }}</div>
            <div class="summary-meta">优先控制节奏，避免追高</div>
          </section>
        </div>

        <div v-if="filteredBoardItems.length" class="board-layout">
          <aside class="insight-panel">
            <section class="insight-card">
              <div class="insight-title">方向指引</div>
              <div class="signal-list">
                <div class="signal-row">
                  <span class="signal-label">低估优先</span>
                  <span class="signal-text">分位数越低，越适合纳入观察和分批布局清单。</span>
                </div>
                <div class="signal-row">
                  <span class="signal-label">中性等待</span>
                  <span class="signal-text">估值不贵也不便宜，重点看景气、盈利和资金催化。</span>
                </div>
                <div class="signal-row">
                  <span class="signal-label">高估谨慎</span>
                  <span class="signal-text">分位数靠上时先看兑现风险，避免只凭情绪加仓。</span>
                </div>
              </div>
            </section>

            <section class="insight-card">
              <div class="insight-title">优先观察</div>
              <div class="rank-list">
                <div v-for="item in lowestItems" :key="item.ts_code" class="rank-row">
                  <div>
                    <div class="rank-name">{{ item.name }}</div>
                    <div class="rank-code">{{ item.ts_code }}</div>
                  </div>
                  <div class="rank-value positive-text">{{ item.avgPercentileText }}</div>
                </div>
              </div>
            </section>

            <section class="insight-card">
              <div class="insight-title">风险较高</div>
              <div class="rank-list">
                <div v-for="item in highestItems" :key="item.ts_code" class="rank-row">
                  <div>
                    <div class="rank-name">{{ item.name }}</div>
                    <div class="rank-code">{{ item.ts_code }}</div>
                  </div>
                  <div class="rank-value negative-text">{{ item.avgPercentileText }}</div>
                </div>
              </div>
            </section>
          </aside>

          <section class="board-panel">
            <div class="board-header">
              <div class="board-title">行业估值看板</div>
              <div class="board-legend">
                <span class="legend-item"><i class="legend-dot low"></i>偏低估</span>
                <span class="legend-item"><i class="legend-dot neutral"></i>中性</span>
                <span class="legend-item"><i class="legend-dot high"></i>偏高估</span>
              </div>
            </div>

            <div class="board-list">
              <article
                v-for="item in filteredBoardItems"
                :key="item.ts_code"
                class="board-row"
                :class="item.toneClass"
                @click="openIndustryDialog(item)"
              >
                <div class="industry-main">
                  <div class="industry-title-row">
                    <div class="industry-name">{{ item.name }}</div>
                    <el-tag size="small" :type="item.tagType" effect="dark">{{ item.direction }}</el-tag>
                  </div>
                  <div class="industry-subline">
                    <span>{{ item.ts_code }}</span>
                    <span>均值分位 {{ item.avgPercentileText }}</span>
                    <span>{{ item.actionText }}</span>
                  </div>
                </div>

                <div class="metric-block">
                  <div class="metric-top">
                    <span class="metric-label">PE</span>
                    <span class="metric-value">{{ formatNumber(item.pe) }}</span>
                    <span class="metric-percent">{{ item.pePercentileText }}</span>
                  </div>
                  <el-progress
                    :percentage="item.pePercentileBar"
                    :show-text="false"
                    :stroke-width="8"
                    :color="item.peBarColor"
                  />
                </div>

                <div class="metric-block">
                  <div class="metric-top">
                    <span class="metric-label">PB</span>
                    <span class="metric-value">{{ formatNumber(item.pb) }}</span>
                    <span class="metric-percent">{{ item.pbPercentileText }}</span>
                  </div>
                  <el-progress
                    :percentage="item.pbPercentileBar"
                    :show-text="false"
                    :stroke-width="8"
                    :color="item.pbBarColor"
                  />
                </div>
              </article>
            </div>
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
                <el-descriptions-item label="父级代码">{{ dialogIndustry.parent_code || '无' }}</el-descriptions-item>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getSwValuationAnalysis, type SwValuationAnalysisItem } from '@/services/industryApi'
import { fetchSwIndexClassify, type SwIndexClassifyItem } from '@/services/swIndexClassifyApi'
import SwIndustryTrendChart from './components/SwIndustryTrendChart.vue'
import SwIndustryMembersTab from './components/SwIndustryMembersTab.vue'
import IndustryFilter from '@/components/IndustryFilter.vue'

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

const loading = ref(false)
const tableData = ref<SwValuationAnalysisItem[]>([])
const selectedRangeYears = ref(10)
const selectedIndustries = ref<string[]>([])

const industryDialogVisible = ref(false)
const industryDialogLoading = ref(false)
const dialogIndustry = ref<SwIndexClassifyItem | null>(null)
const dialogChildren = ref<SwIndexClassifyItem[]>([])
const dialogValuationMap = ref<Map<string, SwValuationAnalysisItem>>(new Map())
const dialogActiveTab = ref('basic')

const query = reactive({
  level: 'L1'
})

const endDate = new Date()
const startDate = new Date()
startDate.setFullYear(startDate.getFullYear() - 10)

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

const levelLabel = computed(() => {
  if (query.level === 'L1') return '一级行业'
  if (query.level === 'L2') return '二级行业'
  return '三级行业'
})

const rangeLabel = computed(() => `最近${selectedRangeYears.value}年`)

const latestTradeDate = computed(() => {
  const dates = tableData.value.map(item => item.trade_date).filter(Boolean).sort()
  return dates.length ? dates[dates.length - 1] : ''
})

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

/**
 * 过滤后的行业看板：当selectedIndustries为空时显示全部，否则只显示选中的行业
 */
const filteredBoardItems = computed<BoardItem[]>(() => {
  if (!selectedIndustries.value.length) return boardItems.value
  const selectedSet = new Set(selectedIndustries.value)
  return boardItems.value.filter(item => selectedSet.has(item.name))
})

const valuationSummary = computed(() => {
  const summary = { low: 0, neutral: 0, high: 0 }
  for (const item of filteredBoardItems.value) {
    if (item.avgPercentile <= 20) summary.low += 1
    else if (item.avgPercentile < 70) summary.neutral += 1
    else summary.high += 1
  }
  return summary
})

const lowestItems = computed(() => filteredBoardItems.value.slice(0, 3))
const highestItems = computed(() => [...filteredBoardItems.value].reverse().slice(0, 3))

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

onMounted(() => {
  fetchData()
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

.range-buttons {
  flex-wrap: nowrap;
}

.content-area {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  min-height: 96px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.summary-card.emphasis {
  background: linear-gradient(135deg, #f8fafc, #eef4ff);
}

.summary-card.positive {
  background: linear-gradient(135deg, #f6fcf8, #ebf8ef);
}

.summary-card.neutral {
  background: linear-gradient(135deg, #fffaf1, #fff4db);
}

.summary-card.negative {
  background: linear-gradient(135deg, #fff7f6, #fdeceb);
}

.summary-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 28px;
  line-height: 1;
  font-weight: 700;
  color: #111827;
}

.summary-meta {
  margin-top: 10px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}

.board-layout {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 14px;
}

.insight-panel,
.board-panel {
  min-height: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.insight-panel {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

.insight-card {
  border: 1px solid #eef0f4;
  border-radius: 8px;
  padding: 12px;
  background: #fafbfd;
}

.insight-title,
.board-title {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.signal-list,
.rank-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rank-list {
  max-height: 180px;
  overflow: auto;
  padding-right: 4px;
}

.signal-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.signal-label {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
}

.signal-text,
.rank-code {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}

.rank-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rank-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.rank-value {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.positive-text {
  color: #26734d;
}

.negative-text {
  color: #b9382f;
}

.board-panel {
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.board-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #6b7280;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot.low {
  background: #3f9b63;
}

.legend-dot.neutral {
  background: #b88228;
}

.legend-dot.high {
  background: #c84f44;
}

.board-list {
  min-height: 0;
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.board-row {
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) minmax(180px, 1fr) minmax(180px, 1fr);
  gap: 14px;
  align-items: center;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  padding: 12px 14px;
  background: #fff;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.board-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  border-color: #d6dde8;
}

.board-row.tone-low {
  background: linear-gradient(90deg, rgba(63, 155, 99, 0.08), rgba(255, 255, 255, 0));
}

.board-row.tone-neutral {
  background: linear-gradient(90deg, rgba(184, 130, 40, 0.08), rgba(255, 255, 255, 0));
}

.board-row.tone-high {
  background: linear-gradient(90deg, rgba(200, 79, 68, 0.08), rgba(255, 255, 255, 0));
}

.industry-main {
  min-width: 0;
}

.industry-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.industry-name {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.industry-subline {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: #6b7280;
}

.metric-block {
  min-width: 0;
}

.metric-top {
  display: grid;
  grid-template-columns: 26px 1fr auto;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 6px;
}

.metric-label {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
}

.metric-value {
  font-size: 13px;
  color: #111827;
}

.metric-percent {
  font-size: 12px;
  font-weight: 700;
  color: #4b5563;
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

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .board-layout {
    grid-template-columns: 1fr;
  }

  .board-row {
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

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .range-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .board-header {
    flex-direction: column;
    align-items: flex-start;
  }

  :deep(.industry-drill-dialog) {
    width: 96vw !important;
  }
}
</style>

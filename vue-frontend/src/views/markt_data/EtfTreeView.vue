<template>
  <div class="etf-tree-view">
    <el-card class="left-panel">
      <template #header>
        <div class="card-header">
          <div>
            <div class="panel-title">基金管理人</div>
            <div class="panel-subtitle">先选 ETF 类型，再从管理人卡片下钻</div>
          </div>
        </div>
      </template>

      <div class="manager-panel" v-loading="etfBasicLoading">
        <div class="manager-toolbar">
          <el-button-group>
            <el-button
              v-for="type in etfTypes"
              :key="type"
              :type="selectedEtfType === type ? 'primary' : 'default'"
              size="small"
              @click="selectEtfType(type)"
            >
              {{ type }}
            </el-button>
          </el-button-group>
          <el-input
            v-model="managerKeyword"
            clearable
            size="small"
            placeholder="筛选管理人"
            class="manager-search"
          />
        </div>

        <div class="manager-summary">
          <span>管理人 {{ filteredManagerCards.length }} 家</span>
          <span>ETF {{ currentTypeItems.length }} 只</span>
        </div>

        <div class="manager-card-grid">
          <button
            v-for="card in filteredManagerCards"
            :key="card.key"
            type="button"
            class="manager-card"
            :class="{ active: detailDialogVisible && currentData?.key === card.key }"
            @click="selectManager(card)"
          >
            <div class="manager-card-name">{{ card.mgr_name }}</div>
            <div class="manager-card-meta">
              <span>{{ card.count }} 只 ETF</span>
              <span>{{ card.indexCount }} 个指数</span>
            </div>
            <div class="manager-card-stats">
              <span class="rise-text">涨 {{ card.upCount }}</span>
              <span class="fall-text">跌 {{ card.downCount }}</span>
              <span :class="pctClass(card.avgPctChg)">均涨幅 {{ formatPctChg(card.avgPctChg) }}</span>
            </div>
            <div class="manager-card-tags">
              <el-tag size="small" type="info" effect="plain">{{ card.categoryCount }} 个类别</el-tag>
              <el-tag size="small" type="success" effect="plain">{{ card.etf_type }}</el-tag>
            </div>
          </button>
        </div>
      </div>
    </el-card>

    <el-dialog
      v-model="detailDialogVisible"
      width="72vw"
      top="4vh"
      class="detail-dialog"
      destroy-on-close
    >
      <template #header>
        <div class="card-header detail-header">
          <div>
            <div class="panel-title">详情信息</div>
            <div v-if="currentData" class="breadcrumb-line">
              <el-breadcrumb separator="/">
                <el-breadcrumb-item
                  v-for="crumb in currentPath"
                  :key="crumb.key"
                >
                  <a href="#" @click.prevent="selectPathNode(crumb)">{{ crumb.label }}</a>
                </el-breadcrumb-item>
              </el-breadcrumb>
            </div>
          </div>
        </div>
      </template>

      <div v-if="currentData" class="detail-content">
          <el-tabs v-model="activeTab" class="detail-tabs">
            <el-tab-pane label="基本信息" name="basic">
              <div class="tab-content">
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="类型">
                    <el-tag v-if="currentData.nodeType === 'TYPE'" type="primary">ETF类型</el-tag>
                    <el-tag v-else-if="currentData.nodeType === 'INDEX'" type="warning">基准指数</el-tag>
                    <el-tag v-else-if="currentData.nodeType === 'CAT'" type="info">指数类别</el-tag>
                    <el-tag v-else-if="currentData.nodeType === 'MGR'" type="info">基金管理人</el-tag>
                    <el-tag v-else-if="currentData.nodeType === 'ETF'" type="success">ETF</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="名称">
                    <span class="detail-title">{{ currentData.label }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="currentData.etf_type" label="ETF类型">
                    <el-tag>{{ currentData.etf_type }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="currentData.index_code" label="指数代码">
                    <el-tag type="warning">{{ currentData.index_code }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="currentData.index_name" label="指数名称">
                    {{ currentData.index_name }}
                  </el-descriptions-item>
                  <el-descriptions-item v-if="currentData.mgr_name" label="基金管理人">
                    {{ currentData.mgr_name }}
                  </el-descriptions-item>
                  <template v-if="currentData.nodeType === 'ETF' && currentData.item">
                    <el-descriptions-item label="交易代码">
                      <el-tag type="success">{{ currentData.item.ts_code }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="简称">
                      {{ currentData.item.csname || currentData.item.extname }}
                    </el-descriptions-item>
                    <el-descriptions-item label="交易所">
                      {{ currentData.item.exchange }}
                    </el-descriptions-item>
                    <el-descriptions-item label="上市状态">
                      {{ currentData.item.list_status }}
                    </el-descriptions-item>
                    <el-descriptions-item label="上市日期">
                      {{ currentData.item.list_date || '--' }}
                    </el-descriptions-item>
                  </template>
                </el-descriptions>

                <div class="children-section" v-if="currentChildren.length > 0">
                  <div class="section-header">
                    <span>下级列表 ({{ currentChildren.length }})</span>
                  </div>

                  <template v-if="currentData.nodeType === 'MGR'">
                    <el-table
                      :data="managerIndexSummaryTable"
                      style="width: 100%"
                      height="280"
                      border
                      stripe
                      size="small"
                      @row-click="openManagerCategory"
                    >
                      <el-table-column prop="category" label="指数类别" min-width="180" />
                      <el-table-column prop="count" label="ETF数量" width="100" align="center" />
                      <el-table-column prop="upCount" label="上涨" width="80" align="center" />
                      <el-table-column prop="downCount" label="下跌" width="80" align="center" />
                      <el-table-column label="平均涨幅" width="110" align="right">
                        <template #default="scope">
                          <span :class="pctClass(scope.row.avgPctChg)">{{ formatPctChg(scope.row.avgPctChg) }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="最大上涨ETF" min-width="180" show-overflow-tooltip>
                        <template #default="scope">
                          <span :class="pctClass(scope.row.maxUpPctChg)">{{ formatSummaryEtf(scope.row.maxUpName, scope.row.maxUpPctChg) }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="最大下跌ETF" min-width="180" show-overflow-tooltip>
                        <template #default="scope">
                          <span :class="pctClass(scope.row.maxDownPctChg)">{{ formatSummaryEtf(scope.row.maxDownName, scope.row.maxDownPctChg) }}</span>
                        </template>
                      </el-table-column>
                    </el-table>
                    <div class="section-header">指数类别分布</div>
                    <el-row :gutter="20" class="mt-10">
                      <el-col :span="10">
                        <el-table
                          :data="managerIndexCategorySummary"
                          style="width: 100%"
                          height="240"
                          border
                          stripe
                          size="small"
                          @row-click="openManagerCategory"
                        >
                          <el-table-column prop="category" label="类别" min-width="160" show-overflow-tooltip />
                          <el-table-column prop="count" label="数量" width="100" align="center" />
                          <el-table-column prop="upCount" label="涨" width="70" align="center" />
                          <el-table-column prop="downCount" label="跌" width="70" align="center" />
                        </el-table>
                      </el-col>
                      <el-col :span="14">
                        <div ref="categoryChartRef" class="category-chart"></div>
                      </el-col>
                    </el-row>
                  </template>

                  <template v-else-if="currentData.nodeType === 'CAT'">
                    <el-table
                      :data="categoryIndexSummaryTable"
                      style="width: 100%"
                      height="300"
                      border
                      stripe
                      size="small"
                      @row-click="openCategoryIndex"
                    >
                      <el-table-column prop="index_code" label="指数代码" width="160" />
                      <el-table-column prop="index_name" label="指数名称" min-width="220" show-overflow-tooltip />
                      <el-table-column prop="count" label="ETF数量" width="100" align="center" />
                      <el-table-column prop="upCount" label="上涨" width="80" align="center" />
                      <el-table-column prop="downCount" label="下跌" width="80" align="center" />
                      <el-table-column label="平均涨幅" width="110" align="right">
                        <template #default="scope">
                          <span :class="pctClass(scope.row.avgPctChg)">{{ formatPctChg(scope.row.avgPctChg) }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="最大上涨ETF" min-width="180" show-overflow-tooltip>
                        <template #default="scope">
                          <span :class="pctClass(scope.row.maxUpPctChg)">{{ formatSummaryEtf(scope.row.maxUpName, scope.row.maxUpPctChg) }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="最大下跌ETF" min-width="180" show-overflow-tooltip>
                        <template #default="scope">
                          <span :class="pctClass(scope.row.maxDownPctChg)">{{ formatSummaryEtf(scope.row.maxDownName, scope.row.maxDownPctChg) }}</span>
                        </template>
                      </el-table-column>
                    </el-table>
                  </template>

                  <template v-else-if="currentData.nodeType === 'INDEX'">
                    <el-table
                      :data="etfListTable"
                      style="width: 100%"
                      height="360"
                      border
                      stripe
                      size="small"
                      @row-click="openEtfDetail"
                    >
                      <el-table-column prop="ts_code" label="交易代码" width="140" align="center" />
                      <el-table-column prop="csname" label="ETF简称" min-width="220" show-overflow-tooltip />
                      <el-table-column prop="extname" label="扩位简称" min-width="160" show-overflow-tooltip />
                      <el-table-column prop="exchange" label="交易所" width="100" align="center" />
                      <el-table-column prop="mgr_name" label="管理人" min-width="160" show-overflow-tooltip />
                      <el-table-column prop="list_status" label="上市状态" width="100" align="center" />
                      <el-table-column label="涨跌幅" width="100" align="right">
                        <template #default="scope">
                          <span :class="pctClass(scope.row.latest_pct_chg)">{{ formatPctChg(scope.row.latest_pct_chg) }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="涨跌额" width="100" align="right">
                        <template #default="scope">
                          <span :class="pctClass(scope.row.latest_change)">{{ formatChange(scope.row.latest_change) }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column prop="list_date" label="上市日期" width="120" align="center" />
                    </el-table>
                  </template>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="ETF总览" name="overview">
              <div class="tab-content">
                <el-card shadow="never" class="overview-filter-card">
                  <el-form :model="overviewQuery" label-width="90px" label-position="left" inline>
                    <el-form-item label="ETF代码">
                      <el-select
                        v-model="overviewQuery.ts_code"
                        placeholder="搜索 ETF"
                        filterable
                        remote
                        reserve-keyword
                        clearable
                        :remote-method="remoteSearchEtf"
                        :loading="selectLoading"
                        style="width: 220px"
                      >
                        <el-option
                          v-for="item in etfOptions"
                          :key="item.ts_code"
                          :label="`${item.extname || item.csname || item.cname || ''}（${item.ts_code}）`"
                          :value="item.ts_code"
                        />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="指数代码">
                      <el-input v-model="overviewQuery.index_code" clearable style="width: 180px" />
                    </el-form-item>
                    <el-form-item label="交易所">
                      <el-select v-model="overviewQuery.exchange" clearable style="width: 120px">
                        <el-option v-for="item in exchangeOptions" :key="item" :label="item" :value="item" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="上市状态">
                      <el-select v-model="overviewQuery.list_status" clearable style="width: 120px">
                        <el-option label="上市" value="L" />
                        <el-option label="退市" value="D" />
                        <el-option label="暂停" value="P" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="名称关键词">
                      <el-input v-model="overviewQuery.name" clearable style="width: 180px" />
                    </el-form-item>
                    <el-form-item>
                      <el-button type="primary" @click="resetOverviewPage">查询</el-button>
                      <el-button @click="resetOverviewFilters">重置</el-button>
                    </el-form-item>
                  </el-form>
                </el-card>

                <el-table :data="overviewPaginatedItems" border stripe height="420" size="small" @row-click="openEtfDetail">
                  <el-table-column prop="extname" label="ETF简称" min-width="160" />
                  <el-table-column prop="ts_code" label="ETF代码" min-width="140" />
                  <el-table-column prop="index_name" label="跟踪指数" min-width="160" />
                  <el-table-column prop="index_code" label="指数代码" min-width="140" />
                  <el-table-column prop="exchange" label="交易所" min-width="80" align="center" />
                  <el-table-column prop="csname" label="基金简称" min-width="140" />
                  <el-table-column prop="etf_type" label="ETF类型" min-width="120" align="center" />
                  <el-table-column prop="mgt_fee" label="管理费率" min-width="100" align="center" />
                  <el-table-column prop="list_date" label="上市日期" min-width="120" align="center" />
                  <el-table-column prop="custod_name" label="托管人" min-width="180" />
                </el-table>

                <div class="pagination">
                  <el-pagination
                    background
                    layout="total, sizes, prev, pager, next, jumper"
                    :total="overviewFilteredItems.length"
                    :page-sizes="[10, 20, 50, 100]"
                    v-model:page-size="overviewPagination.page_size"
                    v-model:current-page="overviewPagination.page"
                    @size-change="resetOverviewPage"
                    @current-change="syncOverviewPage"
                  />
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane
              v-if="currentData.nodeType === 'MGR' || currentData.nodeType === 'CAT'"
              label="相关性分析"
              name="correlation"
            >
              <div class="tab-content">
                <etf-correlation-tab :etf-codes="catEtfCodes" :code-name-map="catCodeNameMapObj" />
              </div>
            </el-tab-pane>

            <el-tab-pane
              v-if="currentData.nodeType === 'MGR' || currentData.nodeType === 'CAT'"
              label="波动性分析"
              name="volatility"
            >
              <div class="tab-content">
                <etf-category-volatility-tab :etf-codes="catEtfCodes" :code-name-map="catCodeNameMapObj" />
              </div>
            </el-tab-pane>

            <el-tab-pane v-if="currentData.nodeType === 'ETF'" label="趋势图" name="trend">
              <div class="tab-content">
                <div class="range-toolbar">
                  <span class="toolbar-label">日期范围</span>
                  <el-button-group>
                    <el-button :type="etfTrendRange === '1y' ? 'primary' : 'default'" size="small" @click="etfTrendRange = '1y'">一年</el-button>
                    <el-button :type="etfTrendRange === '3y' ? 'primary' : 'default'" size="small" @click="etfTrendRange = '3y'">三年</el-button>
                    <el-button :type="etfTrendRange === '5y' ? 'primary' : 'default'" size="small" @click="etfTrendRange = '5y'">五年</el-button>
                  </el-button-group>
                </div>
                <div v-if="etfTrendLoading" class="loading-block">
                  <el-skeleton :rows="8" animated />
                </div>
                <div v-else>
                  <stock-k-line-chart
                    v-if="etfKlineData.length > 0 && currentData?.item"
                    :stock-code="currentData.item.ts_code"
                    :stock-name="currentData.item.csname || currentData.item.extname"
                    :kline-data="etfKlineData"
                    height="420px"
                  />
                  <el-empty v-else description="暂无趋势数据" />
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane v-if="currentData.nodeType === 'INDEX'" label="成分与权重" name="weights">
              <div class="tab-content">
                <el-table
                  :data="displayIndexWeights"
                  v-loading="indexWeightLoading"
                  element-loading-text="加载指数成分权重..."
                  style="width: 100%"
                  height="360"
                  border
                  stripe
                  size="small"
                >
                  <el-table-column label="成分代码" width="140" align="center">
                    <template #default="scope">
                      <span>{{ scope.row.base_code }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="成分名称" min-width="200" show-overflow-tooltip>
                    <template #default="scope">
                      <span>{{ scope.row.stock_name || scope.row.con_name }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="weight" label="权重(%)" width="120" align="right">
                    <template #default="scope">
                      <span>{{ formatPercent(scope.row.weight) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="trade_date" label="交易日期" width="120" align="center" />
                </el-table>
                <div class="section-header">成分行业分布</div>
                <div ref="industryChartRef" class="industry-chart"></div>
              </div>
            </el-tab-pane>

            <el-tab-pane v-if="currentData.nodeType === 'INDEX'" label="趋势图" name="index-trend">
              <div class="tab-content">
                <div v-if="indexTrendLoading" class="loading-block">
                  <el-skeleton :rows="8" animated />
                </div>
                <div v-else>
                  <stock-k-line-chart
                    v-if="indexKlineData.length > 0 && currentData?.index_code"
                    :stock-code="currentData.index_code"
                    :stock-name="currentData.index_name || currentData.index_code"
                    :kline-data="indexKlineData"
                    height="420px"
                  />
                  <el-empty v-else description="暂无指数趋势数据" />
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
      </div>
      <div v-else class="empty-state">
        <el-empty description="请先从左侧选择基金管理人卡片" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { getEtfBasic, getEtfDailyLatest, type EtfBasicItem, getEtfDaily, type EtfDailyItem } from '@/services/etfApi'
import * as echarts from 'echarts'
import { fetchIndexBasicList, type IndexBasicItem, fetchIndexWeight, type IndexWeightItem } from '@/services/indexBasicApi'
import StockKLineChart from '@/components/StockKLineChart.vue'
import EtfCategoryVolatilityTab from '@/components/EtfCategoryVolatilityTab.vue'
import EtfCorrelationTab from '@/components/EtfCorrelationTab.vue'
import { fetchIndexDailyKline, type IndexDailyKlineItem } from '@/services/indexDailyApi'
import { getStockList } from '@/services/individualStockApi'

type NodeType = 'TYPE' | 'MGR' | 'CAT' | 'INDEX' | 'ETF'

interface TreeNodeData {
  key: string
  label: string
  nodeType: NodeType
  etf_type?: string
  index_code?: string
  index_name?: string
  mgr_name?: string
  category?: string
  item?: EtfBasicItem
}

interface ManagerCard {
  key: string
  mgr_name: string
  etf_type: string
  count: number
  indexCount: number
  categoryCount: number
  upCount: number
  downCount: number
  flatCount: number
  avgPctChg: number | null
  maxUpName: string
  maxUpPctChg: number | null
  maxDownName: string
  maxDownPctChg: number | null
}

interface RealtimeSummary {
  upCount: number
  downCount: number
  flatCount: number
  avgPctChg: number | null
  maxUpName: string
  maxUpPctChg: number | null
  maxDownName: string
  maxDownPctChg: number | null
}

const currentData = ref<TreeNodeData | null>(null)
const currentChildren = ref<TreeNodeData[]>([])
const activeTab = ref('basic')
const detailDialogVisible = ref(false)
const managerKeyword = ref('')
const selectedEtfType = ref('')
const etfBasicLoading = ref(false)
const selectLoading = ref(false)
let etfBasicLoadPromise: Promise<void> | null = null

const indexWeights = ref<IndexWeightItem[]>([])
type DisplayIndexWeight = IndexWeightItem & { base_code: string; stock_name?: string; industry?: string }
const displayIndexWeights = ref<DisplayIndexWeight[]>([])
const indexWeightLoading = ref(false)
const etfTrendLoading = ref(false)
const etfDailyItems = ref<EtfDailyItem[]>([])
const indexTrendLoading = ref(false)
const indexDailyItems = ref<IndexDailyKlineItem[]>([])
const etfTrendRange = ref<'1y' | '3y' | '5y'>('1y')
const latestRealtimeItems = ref<EtfDailyItem[]>([])
const realtimeLoading = ref(false)

const overviewQuery = reactive({
  ts_code: '',
  index_code: '',
  exchange: '',
  list_status: '',
  name: ''
})
const overviewPagination = reactive({ page: 1, page_size: 20 })
const etfOptions = ref<EtfBasicItem[]>([])
const exchangeOptions = ref<string[]>([])

const etfKlineData = computed(() =>
  (etfDailyItems.value || []).map(d => ({
    date: d.trade_date,
    open_price: d.open,
    close_price: d.close,
    high_price: d.high,
    low_price: d.low,
    volume: d.vol,
    amount: d.amount
  }))
)
const indexKlineData = computed(() =>
  (indexDailyItems.value || []).map(d => ({
    date: d.date,
    open_price: d.open,
    close_price: d.close,
    high_price: d.high,
    low_price: d.low,
    volume: d.vol ?? 0,
    amount: d.amount ?? 0
  }))
)

const typeCache = ref<Map<string, EtfBasicItem[]>>(new Map())
const indexBasicMap = ref<Map<string, IndexBasicItem>>(new Map())
const categoryChartRef = ref<HTMLElement>()
let categoryChart: echarts.ECharts | null = null
const industryChartRef = ref<HTMLElement>()
let industryChart: echarts.ECharts | null = null

const etfTypes = computed(() => Array.from(typeCache.value.keys()).sort((a, b) => a.localeCompare(b, 'zh-CN')))
const currentTypeItems = computed(() => typeCache.value.get(selectedEtfType.value) || [])
const latestRealtimeMap = computed(() => {
  const map = new Map<string, EtfDailyItem>()
  for (const item of latestRealtimeItems.value) {
    if (item.ts_code) map.set(item.ts_code, item)
  }
  return map
})

const getEtfDisplayName = (item: Partial<EtfBasicItem>) => item.extname || item.csname || item.cname || item.ts_code || '--'

const emptyRealtimeSummary = (): RealtimeSummary => ({
  upCount: 0,
  downCount: 0,
  flatCount: 0,
  avgPctChg: null,
  maxUpName: '--',
  maxUpPctChg: null,
  maxDownName: '--',
  maxDownPctChg: null
})

const summarizeRealtime = (items: EtfBasicItem[]): RealtimeSummary => {
  const summary = emptyRealtimeSummary()
  const realtimeRows = items
    .map(item => {
      const latest = latestRealtimeMap.value.get(item.ts_code)
      const pct = latest?.pct_chg
      if (pct === null || pct === undefined || Number.isNaN(Number(pct))) return null
      return {
        name: getEtfDisplayName(item),
        pct: Number(pct)
      }
    })
    .filter((item): item is { name: string; pct: number } => item !== null)

  if (realtimeRows.length === 0) return summary

  let pctSum = 0
  let maxUp: { name: string; pct: number } | null = null
  let maxDown: { name: string; pct: number } | null = null

  for (const row of realtimeRows) {
    pctSum += row.pct
    if (row.pct > 0) summary.upCount += 1
    else if (row.pct < 0) summary.downCount += 1
    else summary.flatCount += 1

    if (!maxUp || row.pct > maxUp.pct) maxUp = row
    if (!maxDown || row.pct < maxDown.pct) maxDown = row
  }

  summary.avgPctChg = pctSum / realtimeRows.length
  summary.maxUpName = maxUp?.name || '--'
  summary.maxUpPctChg = maxUp?.pct ?? null
  summary.maxDownName = maxDown?.name || '--'
  summary.maxDownPctChg = maxDown?.pct ?? null
  return summary
}

const managerCards = computed<ManagerCard[]>(() => {
  const managerMap = new Map<string, EtfBasicItem[]>()
  for (const item of currentTypeItems.value) {
    const key = item.mgr_name || '未知管理人'
    const list = managerMap.get(key) || []
    list.push(item)
    managerMap.set(key, list)
  }

  return Array.from(managerMap.entries())
    .map(([mgr_name, list]) => {
      const indexCodes = new Set(list.map(item => item.index_code).filter(Boolean))
      const categories = new Set(
        list.map(item => indexBasicMap.value.get(item.index_code || '')?.category || '未知').filter(Boolean)
      )
      const realtimeSummary = summarizeRealtime(list)
      return {
        key: `MGR:${selectedEtfType.value}:${mgr_name}`,
        mgr_name,
        etf_type: selectedEtfType.value,
        count: list.length,
        indexCount: indexCodes.size,
        categoryCount: categories.size,
        ...realtimeSummary
      }
    })
    .sort((a, b) => b.count - a.count)
})

const filteredManagerCards = computed(() => {
  const kw = managerKeyword.value.trim().toLowerCase()
  if (!kw) return managerCards.value
  return managerCards.value.filter(card => card.mgr_name.toLowerCase().includes(kw))
})

const currentPath = computed(() => {
  if (!currentData.value) return []
  const parts: TreeNodeData[] = []
  if (currentData.value.etf_type) {
    parts.push({
      key: `TYPE:${currentData.value.etf_type}`,
      label: currentData.value.etf_type,
      nodeType: 'TYPE',
      etf_type: currentData.value.etf_type
    })
  }
  if (currentData.value.mgr_name) {
    parts.push({
      key: `MGR:${currentData.value.etf_type}:${currentData.value.mgr_name}`,
      label: currentData.value.mgr_name,
      nodeType: 'MGR',
      etf_type: currentData.value.etf_type,
      mgr_name: currentData.value.mgr_name
    })
  }
  if (currentData.value.category) {
    parts.push({
      key: `CAT:${currentData.value.etf_type}:${currentData.value.mgr_name}:${currentData.value.category}`,
      label: currentData.value.category,
      nodeType: 'CAT',
      etf_type: currentData.value.etf_type,
      mgr_name: currentData.value.mgr_name,
      category: currentData.value.category
    })
  }
  if (currentData.value.index_code && currentData.value.nodeType !== 'ETF') {
    parts.push({
      key: `INDEX:${currentData.value.etf_type}:${currentData.value.mgr_name}:${currentData.value.category}:${currentData.value.index_code}`,
      label: currentData.value.index_name || currentData.value.index_code,
      nodeType: 'INDEX',
      etf_type: currentData.value.etf_type,
      mgr_name: currentData.value.mgr_name,
      category: currentData.value.category,
      index_code: currentData.value.index_code,
      index_name: currentData.value.index_name
    })
  }
  if (currentData.value.nodeType === 'ETF' && currentData.value.item) {
    parts.push(currentData.value)
  }
  return parts
})

const overviewBaseItems = computed(() => {
  if (!currentData.value) return currentTypeItems.value
  const list = currentTypeItems.value
  if (currentData.value.nodeType === 'MGR') return list.filter(i => i.mgr_name === currentData.value?.mgr_name)
  if (currentData.value.nodeType === 'CAT') {
    return list.filter(i => i.mgr_name === currentData.value?.mgr_name && getIndexCategory(i.index_code) === currentData.value?.category)
  }
  if (currentData.value.nodeType === 'INDEX') {
    return list.filter(i => i.mgr_name === currentData.value?.mgr_name && i.index_code === currentData.value?.index_code)
  }
  if (currentData.value.nodeType === 'ETF') {
    return currentData.value.item ? [currentData.value.item] : []
  }
  return list
})

const overviewFilteredItems = computed(() => {
  return overviewBaseItems.value.filter(item => {
    if (overviewQuery.ts_code && item.ts_code !== overviewQuery.ts_code) return false
    if (overviewQuery.index_code && !(item.index_code || '').includes(overviewQuery.index_code.trim())) return false
    if (overviewQuery.exchange && item.exchange !== overviewQuery.exchange) return false
    if (overviewQuery.list_status && item.list_status !== overviewQuery.list_status) return false
    if (overviewQuery.name) {
      const kw = overviewQuery.name.trim().toLowerCase()
      const text = `${item.extname || ''} ${item.csname || ''} ${item.cname || ''}`.toLowerCase()
      if (!text.includes(kw)) return false
    }
    return true
  })
})

const overviewPaginatedItems = computed(() => {
  const start = (overviewPagination.page - 1) * overviewPagination.page_size
  return overviewFilteredItems.value.slice(start, start + overviewPagination.page_size)
})

const managerIndexSummaryTable = computed(() => {
  if (!currentData.value || currentData.value.nodeType !== 'MGR') return []
  const list = overviewBaseItems.value
  const map = new Map<string, EtfBasicItem[]>()
  for (const i of list) {
    const category = getIndexCategory(i.index_code)
    const items = map.get(category) || []
    items.push(i)
    map.set(category, items)
  }
  return Array.from(map.entries())
    .map(([category, items]) => ({
      category,
      count: items.length,
      ...summarizeRealtime(items)
    }))
    .sort((a, b) => {
      const avgDiff = Number(b.avgPctChg ?? -999) - Number(a.avgPctChg ?? -999)
      if (avgDiff !== 0) return avgDiff
      const upDiff = b.upCount - a.upCount
      if (upDiff !== 0) return upDiff
      return b.count - a.count
    })
})

const managerIndexCategorySummary = managerIndexSummaryTable

const categoryIndexSummaryTable = computed(() => {
  if (!currentData.value || currentData.value.nodeType !== 'CAT') return []
  const map = new Map<string, { index_name: string; items: EtfBasicItem[] }>()
  for (const i of overviewBaseItems.value) {
    const code = i.index_code || ''
    if (!code) continue
    const entry = map.get(code) || { index_name: i.index_name || code, items: [] }
    entry.items.push(i)
    map.set(code, entry)
  }
  return Array.from(map.entries())
    .map(([index_code, v]) => ({
      index_code,
      index_name: v.index_name,
      count: v.items.length,
      ...summarizeRealtime(v.items)
    }))
    .sort((a, b) => {
      const avgDiff = Number(b.avgPctChg ?? -999) - Number(a.avgPctChg ?? -999)
      if (avgDiff !== 0) return avgDiff
      const upDiff = b.upCount - a.upCount
      if (upDiff !== 0) return upDiff
      return b.count - a.count
    })
})

const etfListTable = computed(() => {
  if (!currentData.value || currentData.value.nodeType !== 'INDEX') return []
  return overviewBaseItems.value.map(item => {
    const latest = latestRealtimeMap.value.get(item.ts_code)
    return {
      ...item,
      latest_pct_chg: latest?.pct_chg ?? null,
      latest_change: latest?.change ?? null
    }
  })
})

const catEtfCodes = computed(() => overviewBaseItems.value.map(item => item.ts_code).filter(Boolean))

const catEtfNameMap = computed(() => {
  const map = new Map<string, string>()
  for (const it of overviewBaseItems.value) {
    map.set(it.ts_code, it.extname || it.csname || it.cname || it.ts_code)
  }
  return map
})

const catCodeNameMapObj = computed(() => Object.fromEntries(catEtfNameMap.value as Map<string, string>))

const ensureEtfBasicLoaded = async () => {
  if (typeCache.value.size > 0) return
  if (etfBasicLoadPromise) return etfBasicLoadPromise

  etfBasicLoading.value = true
  etfBasicLoadPromise = (async () => {
    const pageSize = 5000
    let page = 1
    let totalPages = 1
    const grouped = new Map<string, EtfBasicItem[]>()
    const exchanges = new Set<string>()

    while (page <= totalPages) {
      const res = await getEtfBasic({ page, page_size: pageSize })
      const records = res.data || []
      for (const item of records) {
        const type = item.etf_type || '未知'
        const list = grouped.get(type) || []
        list.push(item)
        grouped.set(type, list)
        if (item.exchange) exchanges.add(item.exchange)
      }
      totalPages = res.pages || 1
      page += 1
    }

    typeCache.value = grouped
    exchangeOptions.value = Array.from(exchanges).sort()
  })()

  try {
    await etfBasicLoadPromise
  } catch (e) {
    ElMessage.error('加载ETF基础信息失败')
    throw e
  } finally {
    etfBasicLoading.value = false
    etfBasicLoadPromise = null
  }
}

const ensureIndexBasicLoaded = async () => {
  if (indexBasicMap.value.size > 0) return
  try {
    const list = await fetchIndexBasicList({ fields: 'ts_code,name,market,publisher,category' })
    const m = new Map<string, IndexBasicItem>()
    for (const it of list) m.set(it.ts_code, it)
    indexBasicMap.value = m
  } catch {
    ElMessage.error('加载指数基础信息失败')
  }
}

const loadLatestRealtime = async () => {
  realtimeLoading.value = true
  try {
    const res = await getEtfDailyLatest()
    latestRealtimeItems.value = res.data || []
  } catch {
    latestRealtimeItems.value = []
    ElMessage.error('加载ETF实时行情失败')
  } finally {
    realtimeLoading.value = false
  }
}

const getIndexCategory = (indexCode?: string | null) => indexBasicMap.value.get(indexCode || '')?.category || '未知'

const selectEtfType = (type: string) => {
  selectedEtfType.value = type
  managerKeyword.value = ''
  detailDialogVisible.value = false
  const first = managerCards.value[0]
  if (!first) {
    currentData.value = null
    currentChildren.value = []
  }
}

const selectManager = (card: ManagerCard) => {
  currentData.value = {
    key: card.key,
    label: card.mgr_name,
    nodeType: 'MGR',
    etf_type: card.etf_type,
    mgr_name: card.mgr_name
  }
  currentChildren.value = managerIndexSummaryTable.value.map(item => ({
    key: `CAT:${card.etf_type}:${card.mgr_name}:${item.category}`,
    label: item.category,
    nodeType: 'CAT',
    etf_type: card.etf_type,
    mgr_name: card.mgr_name,
    category: item.category
  }))
  detailDialogVisible.value = true
}

const openManagerCategory = (row: { category: string }) => {
  if (!currentData.value?.mgr_name) return
  currentData.value = {
    key: `CAT:${selectedEtfType.value}:${currentData.value.mgr_name}:${row.category}`,
    label: row.category,
    nodeType: 'CAT',
    etf_type: selectedEtfType.value,
    mgr_name: currentData.value.mgr_name,
    category: row.category
  }
  currentChildren.value = categoryIndexSummaryTable.value.map(item => ({
    key: `INDEX:${selectedEtfType.value}:${currentData.value?.mgr_name}:${row.category}:${item.index_code}`,
    label: item.index_name || item.index_code,
    nodeType: 'INDEX',
    etf_type: selectedEtfType.value,
    mgr_name: currentData.value?.mgr_name,
    category: row.category,
    index_code: item.index_code,
    index_name: item.index_name
  }))
  detailDialogVisible.value = true
}

const openCategoryIndex = (row: { index_code: string; index_name: string }) => {
  if (!currentData.value?.mgr_name || !currentData.value?.category) return
  currentData.value = {
    key: `INDEX:${selectedEtfType.value}:${currentData.value.mgr_name}:${currentData.value.category}:${row.index_code}`,
    label: row.index_name || row.index_code,
    nodeType: 'INDEX',
    etf_type: selectedEtfType.value,
    mgr_name: currentData.value.mgr_name,
    category: currentData.value.category,
    index_code: row.index_code,
    index_name: row.index_name
  }
  currentChildren.value = etfListTable.value.map(item => ({
    key: `ETF:${item.ts_code}`,
    label: item.csname || item.extname || item.ts_code,
    nodeType: 'ETF',
    etf_type: item.etf_type || selectedEtfType.value,
    mgr_name: item.mgr_name || currentData.value?.mgr_name,
    category: currentData.value?.category,
    index_code: item.index_code || row.index_code,
    index_name: item.index_name || row.index_name,
    item
  }))
  detailDialogVisible.value = true
}

const openEtfDetail = (row: EtfBasicItem) => {
  currentData.value = {
    key: `ETF:${row.ts_code}`,
    label: row.csname || row.extname || row.ts_code,
    nodeType: 'ETF',
    etf_type: row.etf_type || selectedEtfType.value,
    mgr_name: row.mgr_name || undefined,
    category: getIndexCategory(row.index_code),
    index_code: row.index_code || undefined,
    index_name: row.index_name || undefined,
    item: row
  }
  currentChildren.value = []
  activeTab.value = 'basic'
  detailDialogVisible.value = true
}

const selectPathNode = (node: TreeNodeData) => {
  if (node.nodeType === 'TYPE' && node.etf_type) {
    selectEtfType(node.etf_type)
    return
  }
  if (node.nodeType === 'MGR') {
    selectManager({
      key: node.key,
      mgr_name: node.mgr_name || '',
      etf_type: node.etf_type || selectedEtfType.value,
      count: 0,
      indexCount: 0,
      categoryCount: 0,
      ...emptyRealtimeSummary()
    })
    return
  }
  if (node.nodeType === 'CAT') {
    currentData.value = node
    currentChildren.value = categoryIndexSummaryTable.value.map(item => ({
      key: `INDEX:${node.etf_type}:${node.mgr_name}:${node.category}:${item.index_code}`,
      label: item.index_name || item.index_code,
      nodeType: 'INDEX',
      etf_type: node.etf_type,
      mgr_name: node.mgr_name,
      category: node.category,
      index_code: item.index_code,
      index_name: item.index_name
    }))
    return
  }
  if (node.nodeType === 'INDEX') {
    currentData.value = node
    currentChildren.value = etfListTable.value.map(item => ({
      key: `ETF:${item.ts_code}`,
      label: item.csname || item.extname || item.ts_code,
      nodeType: 'ETF',
      etf_type: item.etf_type || node.etf_type,
      mgr_name: item.mgr_name || node.mgr_name,
      category: node.category,
      index_code: item.index_code || node.index_code,
      index_name: item.index_name || node.index_name,
      item
    }))
    return
  }
  currentData.value = node
  currentChildren.value = []
  detailDialogVisible.value = true
}

const resetOverviewFilters = () => {
  overviewQuery.ts_code = ''
  overviewQuery.index_code = ''
  overviewQuery.exchange = ''
  overviewQuery.list_status = ''
  overviewQuery.name = ''
  overviewPagination.page = 1
}

const resetOverviewPage = () => {
  overviewPagination.page = 1
}

const syncOverviewPage = (page: number) => {
  overviewPagination.page = page
}

const remoteSearchEtf = async (keyword: string) => {
  const q = (keyword || '').trim()
  if (!q) return
  selectLoading.value = true
  try {
    const isTsCode = /^[0-9]{3,6}\.[A-Z]{2,3}$/.test(q)
    const res = await getEtfBasic({
      ts_code: isTsCode ? q : undefined,
      name: !isTsCode ? q : undefined,
      page: 1,
      page_size: 20,
    })
    etfOptions.value = res.data || []
  } catch (e: any) {
    ElMessage.error(e?.message || 'ETF 基础列表搜索失败')
  } finally {
    selectLoading.value = false
  }
}

watch(currentData, async () => {
  activeTab.value = 'basic'
  overviewPagination.page = 1
  if (currentData.value?.nodeType === 'MGR') {
    await ensureIndexBasicLoaded()
    await nextTick()
    updateCategoryChart()
  } else {
    if (categoryChart) {
      categoryChart.dispose()
      categoryChart = null
    }
  }
  if (currentData.value?.nodeType !== 'INDEX') {
    indexWeights.value = []
    indexWeightLoading.value = false
    if (industryChart) {
      industryChart.dispose()
      industryChart = null
    }
  }
  if (currentData.value?.nodeType !== 'INDEX') {
    indexDailyItems.value = []
    indexTrendLoading.value = false
  }
  if (currentData.value?.nodeType !== 'ETF') {
    etfDailyItems.value = []
    etfTrendLoading.value = false
  }
})

const updateCategoryChart = () => {
  if (!categoryChartRef.value) return
  if (!categoryChart) categoryChart = echarts.init(categoryChartRef.value)
  const data = managerIndexCategorySummary.value.map(d => ({ name: d.category, value: d.count }))
  categoryChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{ type: 'pie', radius: ['40%', '70%'], label: { show: true, formatter: '{b}: {d}%' }, data }]
  })
}

const loadIndexWeights = async () => {
  if (!currentData.value || currentData.value.nodeType !== 'INDEX') return
  const code = currentData.value.index_code || ''
  if (!code) return
  indexWeightLoading.value = true
  try {
    const list = await fetchIndexWeight({
      index_code: code,
      fields: 'index_code,con_code,con_name,weight,trade_date'
    })
    const norm = (d?: string) => (d || '').replace(/-/g, '')
    let latest = ''
    for (const it of list) {
      const d = norm(it.trade_date)
      if (d > latest) latest = d
    }
    const filtered = list.filter(it => norm(it.trade_date) === latest)
    indexWeights.value = [...filtered].sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0))
    const stripSuffix = (c?: string) => (c || '').replace(/\.[A-Z]+$/i, '')
    const baseCodes = Array.from(new Set(indexWeights.value.map(w => stripSuffix(w.con_code))))
    let codeToName = new Map<string, string>()
    let codeToIndustry = new Map<string, string>()
    if (baseCodes.length > 0) {
      try {
        const res = await getStockList({ codes: baseCodes.join(','), page_size: baseCodes.length })
        const list = res.data || []
        codeToName = new Map<string, string>(list.map(it => [it.code, it.name]))
        codeToIndustry = new Map<string, string>(list.map(it => [it.code, it.industry]))
      } catch {}
    }
    displayIndexWeights.value = indexWeights.value.map(w => {
      const base_code = stripSuffix(w.con_code)
      return {
        ...w,
        base_code,
        stock_name: base_code ? codeToName.get(base_code) || undefined : undefined,
        industry: base_code ? codeToIndustry.get(base_code) || undefined : undefined
      }
    })
  } catch {
    ElMessage.error('加载指数成分权重失败')
  } finally {
    indexWeightLoading.value = false
  }
}

const updateIndustryChart = () => {
  if (!industryChartRef.value) return
  if (!industryChart) industryChart = echarts.init(industryChartRef.value)
  const map = new Map<string, number>()
  for (const it of displayIndexWeights.value) {
    const key = it.industry || '未知'
    map.set(key, (map.get(key) || 0) + 1)
  }
  const data = Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  industryChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, type: 'scroll' },
    series: [{ type: 'pie', center: ['50%', '45%'], radius: ['40%', '70%'], label: { show: true, formatter: '{b}: {d}%' }, data }]
  })
}

watch(activeTab, async (tab) => {
  if (tab === 'weights') {
    await loadIndexWeights()
    await nextTick()
    updateIndustryChart()
  } else if (tab === 'trend') {
    await loadEtfTrend()
  } else if (tab === 'index-trend') {
    await loadIndexTrend()
  }
})

watch(etfTrendRange, async () => {
  if (activeTab.value === 'trend') await loadEtfTrend()
})

const formatPercent = (val?: number) => {
  const num = Number(val || 0)
  if (Number.isNaN(num)) return '--'
  return (num * 100).toFixed(2)
}

const formatPctChg = (val?: number | null) => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '--'
  const num = Number(val)
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`
}

const formatChange = (val?: number | null) => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '--'
  const num = Number(val)
  return `${num > 0 ? '+' : ''}${num.toFixed(3)}`
}

const pctClass = (val?: number | null) => {
  if (val === null || val === undefined || Number(val) === 0 || Number.isNaN(Number(val))) return 'neutral-text'
  return Number(val) > 0 ? 'rise-text' : 'fall-text'
}

const formatSummaryEtf = (name?: string, pct?: number | null) => {
  if (!name || name === '--') return '--'
  const pctText = formatPctChg(pct)
  return pctText === '--' ? name : `${name} ${pctText}`
}

const formatDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const loadEtfTrend = async () => {
  if (!currentData.value || currentData.value.nodeType !== 'ETF' || !currentData.value.item) return
  const ts_code = currentData.value.item.ts_code
  if (!ts_code) return
  etfTrendLoading.value = true
  try {
    const today = new Date()
    const start = new Date()
    const years = etfTrendRange.value === '1y' ? 1 : etfTrendRange.value === '3y' ? 3 : 5
    start.setFullYear(today.getFullYear() - years)
    etfDailyItems.value = await getEtfDaily({
      ts_code,
      start_date: formatDate(start),
      end_date: formatDate(today)
    })
  } catch {
    ElMessage.error('加载ETF趋势数据失败')
  } finally {
    etfTrendLoading.value = false
  }
}

const loadIndexTrend = async () => {
  if (!currentData.value || currentData.value.nodeType !== 'INDEX') return
  const ts_code = currentData.value.index_code || ''
  if (!ts_code) return
  indexTrendLoading.value = true
  try {
    const today = new Date()
    const start = new Date()
    start.setDate(today.getDate() - 180)
    indexDailyItems.value = await fetchIndexDailyKline(
      ts_code,
      formatDate(start).replace(/-/g, ''),
      formatDate(today).replace(/-/g, '')
    )
  } catch {
    ElMessage.error('加载指数趋势数据失败')
  } finally {
    indexTrendLoading.value = false
  }
}

// 窗口尺寸变化（含移动端旋转、对话框宽度变化）时让两个饼/柱图重排，避免变形
const handleChartsResize = () => {
  categoryChart?.resize()
  industryChart?.resize()
}

onMounted(async () => {
  window.addEventListener('resize', handleChartsResize)
  try {
    await Promise.all([ensureEtfBasicLoaded(), ensureIndexBasicLoaded(), loadLatestRealtime()])
    const firstType = etfTypes.value[0]
    if (firstType) selectEtfType(firstType)
  } catch {
    // handled above
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleChartsResize)
  if (categoryChart) categoryChart.dispose()
  if (industryChart) industryChart.dispose()
})
</script>

<style scoped>
.etf-tree-view {
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}

.left-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: calc(100vh - 140px);
}

.left-panel :deep(.el-card__body) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.left-panel :deep(.el-card__body) {
  padding: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.panel-subtitle,
.breadcrumb-line {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.manager-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.manager-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.manager-search {
  width: 100%;
}

.manager-summary {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
}

.rise-text {
  color: #dc2626;
}

.fall-text {
  color: #16a34a;
}

.neutral-text {
  color: #6b7280;
}

.manager-card-grid {
  min-height: 0;
  flex: 1;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}

.manager-card {
  text-align: left;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.manager-card:hover,
.manager-card.active {
  border-color: #409eff;
  box-shadow: 0 10px 24px rgba(64, 158, 255, 0.12);
  transform: translateY(-1px);
}

.manager-card-name {
  font-size: 12px;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
}

.manager-card-meta {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 10px;
  color: #6b7280;
}

.manager-card-stats {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 10px;
  font-weight: 600;
}

.manager-card-tags {
  margin-top: 4px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-tabs,
.tab-content {
  width: 100%;
}

.detail-title {
  font-size: 16px;
  font-weight: 700;
}

.children-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.section-header {
  font-weight: 700;
  font-size: 14px;
  border-left: 4px solid #409eff;
  padding-left: 10px;
  margin-top: 12px;
}

.overview-filter-card {
  margin-bottom: 12px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.range-toolbar {
  margin-bottom: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.toolbar-label {
  align-self: center;
  color: #606266;
  font-size: 13px;
}

.loading-block {
  padding: 20px;
}

.category-chart,
.industry-chart {
  width: 100%;
  height: 280px;
}

.detail-header a {
  color: #409eff;
  text-decoration: none;
}

.detail-dialog :deep(.el-dialog__body) {
  max-height: 78vh;
  overflow-y: auto;
  padding-top: 8px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
}

@media (max-width: 1200px) {
  .manager-card-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    max-height: 360px;
  }
}

@media (max-width: 768px) {
  .etf-tree-view {
    padding: 12px;
  }

  .left-panel {
    min-height: calc(100vh - 120px);
  }

  .manager-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .manager-card-meta {
    flex-direction: column;
    gap: 4px;
  }

  .detail-dialog {
    width: 96vw !important;
  }
}
</style>

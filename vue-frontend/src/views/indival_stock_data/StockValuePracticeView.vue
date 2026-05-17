<template>
  <div class="stock-value-practice-view" v-loading="loading" element-loading-text="正在加载高股息股票池...">
    <el-tabs v-model="activeTab" class="value-tabs">
      <el-tab-pane label="股息率分析" name="dividend">
        <el-card shadow="hover" class="analysis-card">
          <template #header>
            <div class="header-row">
              <div>
                <h2>高股息价值发现</h2>
                <p>基于股票股息率接口筛选兼顾估值、规模与稳定性的高分红股票。</p>
              </div>
              <el-button type="primary" @click="loadDividendCandidates" :loading="loading">刷新</el-button>
            </div>
          </template>

          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">候选股票</span>
              <strong class="summary-value">{{ summary.total }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">股息率≥5%</span>
              <strong class="summary-value">{{ summary.highDividend }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">低估高息</span>
              <strong class="summary-value">{{ summary.quality }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-label">平均股息率</span>
              <strong class="summary-value">{{ summary.avgDividendYield }}</strong>
            </div>
          </div>

          <div class="methodology">
            <p>候选池来源：股票股息率接口 `GET /django/api/stock/dividend-yield/` 的全市场快照。</p>
            <p>分析口径：优先使用 `股息率TTM(dv_ttm)`，并结合 `PE/PB/总市值` 做价值筛选；涨跌幅等实时字段由股票列表接口补充。</p>
          </div>

          <div class="filter-bar">
            <el-input
              v-model="filters.keyword"
              placeholder="搜索股票代码、名称或行业"
              clearable
              class="filter-item keyword-input"
            />
            <el-input-number v-model="filters.minDividendYield" :min="0" :step="0.5" :precision="1" class="filter-item" />
            <el-input-number v-model="filters.maxPeRatio" :min="0" :step="1" :precision="1" class="filter-item" />
            <el-input-number v-model="filters.maxPbRatio" :min="0" :step="0.1" :precision="1" class="filter-item" />
            <el-input-number v-model="filters.minMarketCapYi" :min="0" :step="10" :precision="0" class="filter-item" />
            <el-select v-model="sortField" class="filter-item">
              <el-option label="按股息率排序" value="dividendYield" />
              <el-option label="按股息质量分排序" value="qualityScore" />
              <el-option label="按总市值排序" value="totalMarketCap" />
              <el-option label="按市盈率排序" value="peRatio" />
              <el-option label="按市净率排序" value="pbRatio" />
            </el-select>
            <el-switch v-model="onlyQuality" inline-prompt active-text="优质" inactive-text="全部" class="filter-item" />
          </div>

          <div class="filter-labels">
            <span>关键词</span>
            <span>最低股息率(%)</span>
            <span>最高PE</span>
            <span>最高PB</span>
            <span>最低市值(亿)</span>
            <span>排序方式</span>
            <span>优质开关</span>
          </div>

          <div class="filter-help-grid">
            <div class="filter-help-item">
              <strong>关键词</strong>
              <span>按股票代码、名称、行业模糊搜索。</span>
            </div>
            <div class="filter-help-item">
              <strong>最低股息率</strong>
              <span>优先使用 `dv_ttm`，没有时回退到 `dv_ratio`，单位为 %。</span>
            </div>
            <div class="filter-help-item">
              <strong>最高PE</strong>
              <span>用于排除估值过高股票，优先使用 `PE(TTM)`。</span>
            </div>
            <div class="filter-help-item">
              <strong>最高PB</strong>
              <span>用于筛掉市净率过高样本，常配合价值风格使用。</span>
            </div>
            <div class="filter-help-item">
              <strong>最低市值</strong>
              <span>按总市值筛选，输入单位为“亿”。</span>
            </div>
            <div class="filter-help-item">
              <strong>排序方式</strong>
              <span>可按股息率、质量分、总市值、PE、PB排序。</span>
            </div>
            <div class="filter-help-item">
              <strong>优质开关</strong>
              <span>仅保留“高股息 + 低PE + 低PB + 大市值”组合。</span>
            </div>
          </div>

          <el-table :data="paginatedRows" border stripe style="width: 100%" empty-text="暂无符合条件的高股息股票">
            <el-table-column label="股票" min-width="180" fixed="left">
              <template #default="{ row }">
                <div class="stock-cell">
                  <el-button type="primary" link @click="viewStock(row.code)">{{ row.name }}</el-button>
                  <span class="stock-code">{{ row.code }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="industry" label="行业" min-width="120" />
            <el-table-column label="股息率" min-width="110" sortable>
              <template #default="{ row }">
                <span class="metric-strong">{{ formatPercentValue(row.dividendYield) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="质量分" min-width="100">
              <template #default="{ row }">
                {{ row.qualityScore.toFixed(1) }}
              </template>
            </el-table-column>
            <el-table-column label="PE" min-width="90">
              <template #default="{ row }">
                {{ formatNumber(row.peRatio) }}
              </template>
            </el-table-column>
            <el-table-column label="PB" min-width="90">
              <template #default="{ row }">
                {{ formatNumber(row.pbRatio) }}
              </template>
            </el-table-column>
            <el-table-column label="总市值" min-width="110">
              <template #default="{ row }">
                {{ formatYi(row.totalMarketCap) }}
              </template>
            </el-table-column>
            <el-table-column label="最新价" min-width="100">
              <template #default="{ row }">
                {{ formatNumber(row.latestPrice) }}
              </template>
            </el-table-column>
            <el-table-column label="近况" min-width="110">
              <template #default="{ row }">
                <span :class="row.changePercent === null ? '' : row.changePercent >= 0 ? 'text-up' : 'text-down'">
                  {{ formatSignedPercent(row.changePercent) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="标签" min-width="190">
              <template #default="{ row }">
                <div class="tag-group">
                  <el-tag v-if="row.dividendYield >= 5" type="danger" effect="plain">高股息</el-tag>
                  <el-tag v-if="row.pbRatio !== null && row.pbRatio <= 1.5" type="success" effect="plain">低PB</el-tag>
                  <el-tag v-if="row.peRatio !== null && row.peRatio > 0 && row.peRatio <= 20" type="warning" effect="plain">低PE</el-tag>
                  <el-tag v-if="row.totalMarketCap >= 100000000000" type="info" effect="plain">大市值</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="估值日期" min-width="110">
              <template #default="{ row }">
                {{ row.valuationDate || '-' }}
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-row">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="filteredRows.length"
              :page-sizes="[10, 20, 30, 50]"
              layout="total, sizes, prev, pager, next"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="选股思路" name="guide">
        <el-card shadow="hover" class="guide-card">
          <div class="guide-grid">
            <div class="guide-block">
              <h3>先看什么</h3>
              <p>先看股息率，再看市盈率、市净率和市值。高股息但估值过高，通常不是价值机会。</p>
            </div>
            <div class="guide-block">
              <h3>重点组合</h3>
              <p>更值得优先研究的是“股息率较高 + PE不高 + PB不高 + 市值不小”的组合，这类股票通常更接近稳定现金流资产。</p>
            </div>
            <div class="guide-block">
              <h3>需要回避</h3>
              <p>单纯高股息但盈利承压、周期波动过大或分红不可持续的股票，容易出现“高息陷阱”。</p>
            </div>
            <div class="guide-block">
              <h3>如何落地</h3>
              <p>把本页筛出的候选股再结合行业景气、分红连续性和现金流质量做二次研究，再决定是否进入观察池。</p>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getStockList, type StockInfo } from '@/services/individualStockApi'
import { getStockDividendYieldList } from '@/services/stockDividendYieldApi'

interface DividendCandidateRow {
  code: string
  name: string
  industry: string
  latestPrice: number | null
  changePercent: number | null
  totalMarketCap: number
  peRatio: number | null
  pbRatio: number | null
  dividendYield: number
  valuationDate: string
  qualityScore: number
}

const router = useRouter()
const activeTab = ref('dividend')
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const sortField = ref<'dividendYield' | 'qualityScore' | 'totalMarketCap' | 'peRatio' | 'pbRatio'>('dividendYield')
const onlyQuality = ref(false)
const rows = ref<DividendCandidateRow[]>([])

const filters = reactive({
  keyword: '',
  minDividendYield: 3.0,
  maxPeRatio: 25,
  maxPbRatio: 5,
  minMarketCapYi: 100
})

const normalizeNumber = (value: unknown): number | null => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const marketCapYiToYuan = (value: unknown) => {
  const num = normalizeNumber(value)
  return num === null ? null : num * 100000000
}

const marketCapWanToYuan = (value: unknown) => {
  const num = normalizeNumber(value)
  return num === null ? null : num * 10000
}

const formatNumber = (value: number | null) => value === null ? '-' : value.toFixed(2)
const formatYi = (value: number) => value ? `${(value / 100000000).toFixed(0)}亿` : '-'
const formatPercentValue = (value: number) => `${value.toFixed(2)}%`
const formatSignedPercent = (value: number | null) => value === null ? '-' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`

const isQualityCandidate = (row: DividendCandidateRow) => (
  row.dividendYield >= 3 &&
  row.peRatio !== null &&
  row.peRatio > 0 &&
  row.peRatio <= 20 &&
  row.pbRatio !== null &&
  row.pbRatio <= 1.5 &&
  row.totalMarketCap >= 100000000000
)

const filteredRows = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  return rows.value
    .filter(row => {
      if (keyword) {
        const matched = row.code.toLowerCase().includes(keyword)
          || row.name.toLowerCase().includes(keyword)
          || row.industry.toLowerCase().includes(keyword)
        if (!matched) return false
      }
      if (row.dividendYield < filters.minDividendYield) return false
      if (row.peRatio !== null && row.peRatio > filters.maxPeRatio) return false
      if (row.pbRatio !== null && row.pbRatio > filters.maxPbRatio) return false
      if (row.totalMarketCap < filters.minMarketCapYi * 100000000) return false
      if (onlyQuality.value && !isQualityCandidate(row)) return false
      return true
    })
    .sort((a, b) => {
      if (sortField.value === 'peRatio') return (a.peRatio ?? Number.POSITIVE_INFINITY) - (b.peRatio ?? Number.POSITIVE_INFINITY)
      if (sortField.value === 'pbRatio') return (a.pbRatio ?? Number.POSITIVE_INFINITY) - (b.pbRatio ?? Number.POSITIVE_INFINITY)
      return (b[sortField.value] ?? 0) - (a[sortField.value] ?? 0)
    })
})

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const summary = computed(() => {
  const total = rows.value.length
  const highDividend = rows.value.filter(row => row.dividendYield >= 5).length
  const quality = rows.value.filter(isQualityCandidate).length
  const avg = total > 0
    ? `${(rows.value.reduce((sum, row) => sum + row.dividendYield, 0) / total).toFixed(2)}%`
    : '-'
  return { total, highDividend, quality, avgDividendYield: avg }
})

const buildQualityScore = (dividendYield: number, pbRatio: number | null, peRatio: number | null, totalMarketCap: number) => {
  const pbPenalty = pbRatio && pbRatio > 0 ? pbRatio : 1
  const pePenalty = peRatio && peRatio > 0 ? Math.min(peRatio / 15, 2) : 1.5
  const marketCapBoost = Math.max(1, Math.log10(Math.max(totalMarketCap, 1000000000) / 100000000))
  return dividendYield * marketCapBoost / (pbPenalty * pePenalty)
}

const chunk = <T>(items: T[], size: number) => {
  const groups: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size))
  }
  return groups
}

const loadDividendCandidates = async () => {
  loading.value = true
  try {
    const dividendResponse = await getStockDividendYieldList({
      limit: 500,
      offset: 0,
      sort_by: 'dv_ttm',
      order: 'desc'
    })

    if (!Array.isArray(dividendResponse.items) || dividendResponse.items.length === 0) {
      rows.value = []
      return
    }

    const rankedItems = dividendResponse.items.filter(item => {
      const dividendYield = normalizeNumber(item.dv_ttm ?? item.dv_ratio)
      return item.code && dividendYield !== null && dividendYield > 0
    })

    if (rankedItems.length === 0) {
      rows.value = []
      ElMessage.warning('股息率接口已返回数据，但没有可用的股息率字段')
      return
    }

    const codes = rankedItems.map(item => item.code)
    const stockMap = new Map<string, StockInfo>()
    for (const codeGroup of chunk(codes, 80)) {
      const stockListResponse = await getStockList({
        codes: codeGroup.join(','),
        page: 1,
        page_size: Math.max(80, codeGroup.length)
      })
      stockListResponse.data.forEach((item: StockInfo) => {
        stockMap.set(item.code, item)
      })
    }

    rows.value = rankedItems
      .map(item => {
        const stock = stockMap.get(item.code)
        const peRatio = normalizeNumber(item.pe_ttm ?? item.pe)
        const pbRatio = normalizeNumber(item.pb)
        const totalMarketCap = marketCapYiToYuan(stock?.total_market_cap) ?? marketCapWanToYuan(item.total_mv) ?? 0
        const latestPrice = normalizeNumber(stock?.latest_price) ?? normalizeNumber(item.close)
        const changePercent = normalizeNumber(stock?.change_percent)
        const dividendYield = normalizeNumber(item.dv_ttm ?? item.dv_ratio)

        if (dividendYield === null) return null

        return {
          code: item.code,
          name: stock?.name || item.name || item.code,
          industry: stock?.industry || item.industry || '-',
          latestPrice,
          changePercent,
          totalMarketCap,
          peRatio,
          pbRatio,
          dividendYield,
          valuationDate: item.trade_date || '-',
          qualityScore: buildQualityScore(dividendYield, pbRatio, peRatio, totalMarketCap)
        } satisfies DividendCandidateRow
      })
      .filter((item): item is DividendCandidateRow => item !== null)

    currentPage.value = 1
  } catch (error) {
    console.error('加载高股息候选池失败:', error)
    ElMessage.error('加载高股息候选池失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const viewStock = (code: string) => {
  router.push(`/analysis/stock/${code}`)
}

watch([() => filters.keyword, () => filters.minDividendYield, () => filters.maxPeRatio, () => filters.maxPbRatio, () => filters.minMarketCapYi, onlyQuality, sortField], () => {
  currentPage.value = 1
})

onMounted(() => {
  loadDividendCandidates()
})
</script>

<style scoped lang="scss">
.stock-value-practice-view {
  padding: 20px;
}

.analysis-card,
.guide-card {
  border-radius: 8px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.header-row h2 {
  margin: 0 0 6px;
  font-size: 22px;
  color: #1f2937;
}

.header-row p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-item {
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.summary-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  color: #6b7280;
}

.summary-value {
  font-size: 24px;
  color: #111827;
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

.methodology p {
  margin: 0;
}

.methodology p + p {
  margin-top: 6px;
}

.filter-bar {
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) repeat(5, minmax(120px, 1fr)) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 6px;
}

.filter-item {
  width: 100%;
}

.keyword-input {
  min-width: 220px;
}

.filter-labels {
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) repeat(5, minmax(120px, 1fr)) auto;
  gap: 12px;
  margin-bottom: 12px;
  color: #9ca3af;
  font-size: 12px;
}

.filter-help-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 12px;
  margin-bottom: 16px;
}

.filter-help-item {
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
}

.filter-help-item strong {
  display: block;
  margin-bottom: 4px;
  color: #374151;
  font-size: 12px;
}

.filter-help-item span {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}

.stock-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.stock-code {
  font-size: 12px;
  color: #9ca3af;
}

.metric-strong {
  color: #b91c1c;
  font-weight: 700;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1200px) {
  .filter-help-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .summary-grid,
  .guide-grid,
  .filter-help-grid {
    grid-template-columns: 1fr;
  }

  .filter-bar,
  .filter-labels {
    grid-template-columns: 1fr;
  }
}

.guide-block {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}

.guide-block h3 {
  margin: 0 0 10px;
  font-size: 16px;
  color: #1f2937;
}

.guide-block p {
  margin: 0;
  line-height: 1.7;
  color: #4b5563;
}

.text-up {
  color: #dc2626;
}

.text-down {
  color: #16a34a;
}

@media (max-width: 960px) {
  .stock-value-practice-view {
    padding: 12px;
  }

  .summary-grid,
  .guide-grid,
  .filter-bar,
  .filter-labels {
    grid-template-columns: 1fr;
  }

  .filter-labels {
    display: none;
  }

  .header-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

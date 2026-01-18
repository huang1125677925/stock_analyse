<template>
  <div class="etf-volatility-view">
    <div class="page-header">
      <div class="header-content">
        <h2>ETF 波动性列表</h2>
        <el-space>
          <el-button type="primary" :loading="loading" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-space>
      </div>
    </div>

    <el-card class="search-card">
      <el-form :model="query" label-width="110px" label-position="left" inline>
        <el-form-item label="ETF列表" required>
          <el-select
            v-model="query.ts_codes"
            multiple
            placeholder="搜索并添加 ETF（可多选）"
            filterable
            remote
            reserve-keyword
            clearable
            :remote-method="remoteSearchEtf"
            :loading="selectLoading"
            style="width: 520px"
          >
            <el-option
              v-for="item in etfOptions"
              :key="item.ts_code"
              :label="`${item.extname || item.csname || item.cname || ''}（${item.ts_code}）`"
              :value="item.ts_code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker v-model="query.start_date" type="date" placeholder="选择开始日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker v-model="query.end_date" type="date" placeholder="选择结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="抽样点数">
          <el-input-number v-model="query.sample_n" :min="0" :max="1000" :step="10" controls-position="right" placeholder="可选" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <div class="table-toolbar">
        <el-radio-group v-model="columnGroup" size="small">
          <el-radio-button label="latest">最新价</el-radio-button>
          <el-radio-button label="extremes">极值</el-radio-button>
          <el-radio-button label="drawdown">最大回撤</el-radio-button>
          <el-radio-button label="rise">最大上涨</el-radio-button>
          <el-radio-button label="stats">统计量</el-radio-button>
          <el-radio-button label="trend">趋势网格</el-radio-button>
          <el-radio-button label="period">区间</el-radio-button>
          <el-radio-button label="all">全部</el-radio-button>
        </el-radio-group>
      </div>
      <el-table :data="displayItems" v-loading="loading" border style="width: 100%" :class="{ 'compact-table': columnGroup==='all' }">
        <el-table-column prop="etf_name" label="ETF名称" :min-width="columnMinWidth" />
        <el-table-column
          v-for="col in dynamicColumns"
          :key="col"
          :prop="col"
          :label="columnLabelMap[col] || col"
          :min-width="columnMinWidth"
        />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getEtfBasic, type EtfBasicItem } from '@/services/etfApi'
import { getEtfVolatility, type EtfVolatilityItem } from '@/services/etfApi'

const loading = ref(false)
const etfOptions = ref<EtfBasicItem[]>([])
const selectLoading = ref(false)
const rawItems = ref<EtfVolatilityItem[]>([])
const selectedEtfMap = ref<Record<string, EtfBasicItem>>({})
const STORAGE_KEY = 'etfVolatilitySelectedEtfs'
const columnGroup = ref<'latest' | 'extremes' | 'drawdown' | 'rise' | 'stats' | 'trend' | 'period' | 'all'>('latest')
const columnMinWidth = computed(() => (columnGroup.value === 'all' ? 95 : 120))

const query = reactive({
  ts_codes: [] as string[],
  start_date: '',
  end_date: '',
  sample_n: undefined as number | undefined,
})

const formatDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const setDefaultDates = () => {
  const today = new Date()
  const start = new Date()
  start.setDate(today.getDate() - 365)
  query.start_date = formatDate(start)
  query.end_date = formatDate(today)
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

const fetchAllEtfOptions = async () => {
  selectLoading.value = true
  try {
    const res = await getEtfBasic({ page: 1, page_size: 50 })
    etfOptions.value = res.data || []
  } catch (e: any) {
    ElMessage.error(e?.message || 'ETF 基础列表加载失败')
  } finally {
    selectLoading.value = false
  }
}

const ensureEtfDetails = async (codes: string[]) => {
  const missing = codes.filter(c => !selectedEtfMap.value[c])
  for (const code of missing) {
    try {
      const res = await getEtfBasic({ ts_code: code, page: 1, page_size: 1 })
      const item = (res.data || [])[0]
      if (item) selectedEtfMap.value[code] = item
    } catch {}
  }
}

const saveSelection = () => {
  const codes = query.ts_codes.slice()
  const details = codes.map(c => selectedEtfMap.value[c]).filter(Boolean) as EtfBasicItem[]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts_codes: codes, details }))
  } catch {}
}

watch(
  () => query.ts_codes.slice(),
  async (val) => {
    await ensureEtfDetails(val)
    saveSelection()
  }
)

const fetchVolatility = async () => {
  if (!query.ts_codes || query.ts_codes.length < 1) {
    ElMessage.warning('请至少选择一个ETF')
    return
  }
  loading.value = true
  try {
    rawItems.value = await getEtfVolatility({
      ts_codes: query.ts_codes,
      start_date: query.start_date || undefined,
      end_date: query.end_date || undefined,
      sample_n: query.sample_n,
    })
    await ensureEtfDetails(
      rawItems.value
        .map(it => it.ts_code)
        .filter((c: any) => typeof c === 'string')
    )
  } catch (e: any) {
    ElMessage.error(e?.message || '波动性数据查询失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => fetchVolatility()
const handleReset = () => {
  query.ts_codes = []
  rawItems.value = []
}

const codeToName = (code: string) => {
  const item = selectedEtfMap.value[code] || etfOptions.value.find(o => o.ts_code === code)
  return item ? (item.extname || item.csname || item.cname || code) : code
}

const displayItems = computed(() => {
  const list = Array.isArray(rawItems.value) ? rawItems.value : []
  return list.map((it: EtfVolatilityItem) => {
    const code = it.ts_code as string | undefined
    const name = code ? codeToName(code) : ''
    return { etf_name: name, ...it }
  })
})

const dynamicColumns = computed(() => {
  const groups: Record<string, string[]> = {
    period: ['start_date', 'end_date'],
    extremes: ['highest_value', 'highest_date', 'lowest_value', 'lowest_date'],
    drawdown: ['max_drawdown_pct', 'mdd_start_date', 'mdd_end_date', 'mdd_days'],
    rise: ['max_rise_pct', 'rise_start_date', 'rise_end_date', 'rise_days'],
    latest: ['latest_price', 'latest_date', 'percentile_between_min_max'],
    stats: ['mean', 'variance', 'stddev'],
    trend: ['trend', 'grid_applicable', 'sample_used', 'sample_n'],
    all: [
      'start_date', 'end_date',
      'highest_value', 'highest_date', 'lowest_value', 'lowest_date',
      'max_drawdown_pct', 'mdd_start_date', 'mdd_end_date', 'mdd_days',
      'max_rise_pct', 'rise_start_date', 'rise_end_date', 'rise_days',
      'latest_price', 'latest_date', 'percentile_between_min_max',
      'mean', 'variance', 'stddev',
      'trend', 'grid_applicable', 'sample_used', 'sample_n'
    ]
  }
  return groups[columnGroup.value] || []
})

const columnLabelMap: Record<string, string> = {
  ts_code: 'ETF代码',
  start_date: '开始日期',
  end_date: '结束日期',
  highest_value: '最高值',
  highest_date: '最高值日期',
  lowest_value: '最低值',
  lowest_date: '最低值日期',
  max_drawdown_pct: '最大回撤(%)',
  mdd_start_date: '回撤峰值开始',
  mdd_end_date: '回撤最低结束',
  mdd_days: '回撤交易日数',
  max_rise_pct: '最大上涨(%)',
  rise_start_date: '上涨谷底开始',
  rise_end_date: '上涨峰值结束',
  rise_days: '上涨交易日数',
  latest_price: '最新收盘价',
  latest_date: '最新价日期',
  percentile_between_min_max: '最新价区间百分位',
  mean: '均值',
  variance: '方差',
  stddev: '标准差',
  trend: '趋势',
  grid_applicable: '网格适配',
  sample_used: '使用抽样',
  sample_n: '抽样点数',
}

onMounted(async () => {
  setDefaultDates()
  await fetchAllEtfOptions()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { ts_codes?: string[]; details?: EtfBasicItem[] }
      if (Array.isArray(parsed.ts_codes)) query.ts_codes = parsed.ts_codes
      if (Array.isArray(parsed.details)) parsed.details.forEach(it => selectedEtfMap.value[it.ts_code] = it)
    }
  } catch {}
})
</script>

<style scoped>
.etf-volatility-view { padding: 20px; }
.page-header { margin-bottom: 12px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.search-card { margin-bottom: 12px; }
.table-card { margin-top: 8px; }
.table-toolbar { margin-bottom: 8px; display: flex; justify-content: flex-start; }
.compact-table .el-table__cell { padding: 4px 6px; font-size: 12px; }
</style>

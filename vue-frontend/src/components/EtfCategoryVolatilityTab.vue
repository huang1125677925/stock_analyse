<template>
  <div>
    <el-card class="search-card" shadow="never">
      <el-form :model="query" label-width="110px" label-position="left" inline>
        <el-form-item label="开始日期">
          <el-date-picker v-model="query.start_date" type="date" placeholder="选择开始日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker v-model="query.end_date" type="date" placeholder="选择结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="抽样点数">
          <el-input-number v-model="query.sample_n" :min="0" :max="1000" :step="10" controls-position="right" placeholder="可选" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="fetchVolatility">查询</el-button>
          <el-button @click="resetVolatility">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card class="table-card" shadow="never">
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
        <el-table-column prop="etf_name" label="ETF名称" :min-width="columnMinWidth" sortable :sort-method="getSortMethod('etf_name')" />
        <el-table-column
          v-for="col in dynamicColumns"
          :key="col"
          :prop="col"
          :label="columnLabelMap[col] || col"
          :min-width="columnMinWidth"
          sortable
          :sort-method="getSortMethod(col)"
        />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getEtfVolatility, type EtfVolatilityItem } from '@/services/etfApi'

const props = defineProps<{
  etfCodes: string[]
  codeNameMap: Record<string, string>
}>()

const loading = ref(false)
const items = ref<EtfVolatilityItem[]>([])
const columnGroup = ref<'latest' | 'extremes' | 'drawdown' | 'rise' | 'stats' | 'trend' | 'period' | 'all'>('latest')
const columnMinWidth = computed(() => (columnGroup.value === 'all' ? 95 : 120))
const query = ref<{ start_date: string; end_date: string; sample_n?: number }>({ start_date: '', end_date: '', sample_n: undefined })

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
  query.value.start_date = formatDate(start)
  query.value.end_date = formatDate(today)
}

const fetchVolatility = async () => {
  if (!props.etfCodes || props.etfCodes.length < 1) {
    ElMessage.warning('请至少选择一个ETF')
    return
  }
  loading.value = true
  try {
    items.value = await getEtfVolatility({
      ts_codes: props.etfCodes,
      start_date: query.value.start_date || undefined,
      end_date: query.value.end_date || undefined,
      sample_n: query.value.sample_n
    })
  } catch (e: any) {
    ElMessage.error(e?.message || '波动性数据查询失败')
  } finally {
    loading.value = false
  }
}

const resetVolatility = () => {
  query.value.start_date = ''
  query.value.end_date = ''
  query.value.sample_n = undefined
  items.value = []
}

const displayItems = computed(() => {
  const list = Array.isArray(items.value) ? items.value : []
  return list.map((it: EtfVolatilityItem) => {
    const code = it.ts_code as string | undefined
    const name = code ? (props.codeNameMap[code] || code) : ''
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

const sortMethod = (a: any, b: any, key: string) => {
  const va = a[key]
  const vb = b[key]
  const na = Number(va)
  const nb = Number(vb)
  const naValid = !Number.isNaN(na)
  const nbValid = !Number.isNaN(nb)
  if (naValid && nbValid) return na - nb
  const sa = String(va ?? '')
  const sb = String(vb ?? '')
  return sa.localeCompare(sb)
}

const getSortMethod = (key: string) => {
  return (a: Record<string, any>, b: Record<string, any>) => sortMethod(a, b, key)
}

onMounted(() => {
  setDefaultDates()
  if (props.etfCodes && props.etfCodes.length > 0) {
    fetchVolatility()
  }
})

watch(
  () => props.etfCodes.slice(),
  () => {
    if (props.etfCodes && props.etfCodes.length > 0) {
      fetchVolatility()
    } else {
      items.value = []
    }
  }
)
</script>

<style scoped>
.compact-table .el-table__cell { padding: 4px 6px; font-size: 12px; }
.table-toolbar { margin-bottom: 8px; display: flex; justify-content: flex-start; }
.search-card { margin-bottom: 12px; }
.table-card { margin-top: 8px; }
</style>

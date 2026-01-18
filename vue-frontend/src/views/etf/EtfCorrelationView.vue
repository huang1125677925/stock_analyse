<template>
  <div class="etf-correlation-view">
    <div class="page-header">
      <div class="header-content">
        <h2>ETF 相关性分析</h2>
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
      </el-form>
    </el-card>

    <el-card class="heatmap-card">
      <HeatmapChart :option="chartOption" />
    </el-card>
  </div>
  </template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import HeatmapChart from '@/components/HeatmapChart.vue'
import { getEtfBasic, type EtfBasicItem } from '@/services/etfApi'
import { getEtfCorrelation, type EtfCorrelationData } from '@/services/etfApi'
import type * as echarts from 'echarts'

const loading = ref(false)
const etfOptions = ref<EtfBasicItem[]>([])
const selectLoading = ref(false)
const correlation = ref<EtfCorrelationData | null>(null)
const selectedEtfMap = ref<Record<string, EtfBasicItem>>({})
const STORAGE_KEY = 'etfCorrelationSelectedEtfs'

const query = reactive({
  ts_codes: [] as string[],
  start_date: '',
  end_date: '',
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
  start.setDate(today.getDate() - 60)
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

const fetchCorrelation = async () => {
  if (!query.ts_codes || query.ts_codes.length < 2) {
    ElMessage.warning('请至少选择两个ETF进行相关性分析')
    return
  }
  loading.value = true
  try {
    correlation.value = await getEtfCorrelation({
      ts_codes: query.ts_codes,
      start_date: query.start_date || undefined,
      end_date: query.end_date || undefined,
    })
  } catch (e: any) {
    ElMessage.error(e?.message || '相关性数据查询失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => fetchCorrelation()
const handleReset = () => {
  query.ts_codes = []
  correlation.value = null
}

const ensureEtfDetails = async (codes: string[]) => {
  const missing = codes.filter(c => !selectedEtfMap.value[c])
  if (missing.length === 0) return
  for (const code of missing) {
    try {
      const res = await getEtfBasic({ ts_code: code, page: 1, page_size: 1 })
      const item = (res.data || [])[0]
      if (item) {
        selectedEtfMap.value[code] = item
      }
    } catch {}
  }
}

const saveSelection = () => {
  const codes = query.ts_codes.slice()
  const details = codes
    .map(c => selectedEtfMap.value[c])
    .filter(Boolean) as EtfBasicItem[]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts_codes: codes, details }))
  } catch {}
}

const codeToName = (code: string) => {
  const item = selectedEtfMap.value[code] || etfOptions.value.find(o => o.ts_code === code)
  return item ? (item.extname || item.csname || item.cname || code) : code
}

watch(
  () => query.ts_codes.slice(),
  async (val) => {
    await ensureEtfDetails(val)
    saveSelection()
  }
)

const chartOption = computed((): echarts.EChartsOption => {
  const data = correlation.value
  if (!data || !data.labels || !data.matrix || data.labels.length === 0) {
    return {
      title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { fontSize: 16, color: '#999' } }
    }
  }
  const xLabels = data.labels.map(codeToName)
  const yLabels = data.labels.map(codeToName)
  const heatmapData: [number, number, number][] = []
  let minV = Infinity
  let maxV = -Infinity
  for (let i = 0; i < yLabels.length; i++) {
    const row = data.matrix[i] || []
    for (let j = 0; j < xLabels.length; j++) {
      const v = typeof row[j] === 'number' ? row[j] : NaN
      if (!isNaN(v)) {
        heatmapData.push([j, i, +v.toFixed(3)])
        minV = Math.min(minV, v)
        maxV = Math.max(maxV, v)
      }
    }
  }
  if (!isFinite(minV) || !isFinite(maxV)) {
    minV = -1
    maxV = 1
  }
  return {
    tooltip: {
      position: 'top',
      formatter: (p: any) => {
        const [xIdx, yIdx, val] = p?.data ?? []
        const xl = xLabels[xIdx] ?? ''
        const yl = yLabels[yIdx] ?? ''
        return `${yl} vs ${xl}<br/>相关系数：${val}`
      }
    },
    grid: { left: '8%', right: '8%', top: '8%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: { rotate: 45, fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: yLabels,
      axisLabel: { fontSize: 11 },
    },
    visualMap: {
      min: Math.min(-1, Math.floor(minV * 10) / 10),
      max: Math.max(1, Math.ceil(maxV * 10) / 10),
      calculable: true,
      orient: 'vertical',
      right: '2%',
      top: '5%',
      inRange: {
        color: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c'] // 蓝->白->红
      },
      text: ['高', '低'],
    },
    series: [{
      name: '相关性矩阵',
      type: 'heatmap',
      data: heatmapData,
      label: { show: true, fontSize: 9, formatter: (p: any) => p?.data?.[2] },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } }
    }]
  }
})

onMounted(async () => {
  setDefaultDates()
  await fetchAllEtfOptions()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { ts_codes?: string[]; details?: EtfBasicItem[] }
      if (Array.isArray(parsed.ts_codes)) {
        query.ts_codes = parsed.ts_codes
      }
      if (Array.isArray(parsed.details)) {
        for (const it of parsed.details) {
          selectedEtfMap.value[it.ts_code] = it
        }
      }
    }
  } catch {}
})
</script>

<style scoped>
.etf-correlation-view { padding: 20px; }
.page-header { margin-bottom: 12px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.search-card { margin-bottom: 12px; }
.heatmap-card { margin-top: 8px; }
</style>

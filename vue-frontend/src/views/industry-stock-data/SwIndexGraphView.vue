<template>
  <div class="sw-index-graph-view">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>申万指数图谱</span>
          <el-button type="primary" :loading="loading" @click="fetchData" size="small">刷新</el-button>
        </div>
      </template>

      <el-alert v-if="error" type="error" :closable="false" :title="error" class="mb-12" />

      <el-skeleton v-if="loading && !error" rows="10" animated />

      <div v-else class="table-container">
        <el-table
          :data="tableData"
          border
          style="width: 100%"
          :span-method="spanMethod"
          height="calc(100vh - 200px)"
        >
          <el-table-column label="一级行业" min-width="250" align="center">
            <template #default="{ row }">
              <div class="cell-content">
                <span class="index-name">{{ row.l1?.industry_name }}</span>
                <span class="index-code" v-if="row.l1?.index_code">({{ row.l1?.index_code }})</span>
                <div class="valuation-info" v-if="row.l1?.pe !== undefined">
                  <div class="valuation-item">
                    <span>PE: {{ formatNumber(row.l1?.pe) }}</span>
                    <span :style="getPercentileStyle(row.l1?.pe_percentile)" class="percentile">({{ formatNumber(row.l1?.pe_percentile) }}%)</span>
                  </div>
                  <div class="valuation-item">
                    <span>PB: {{ formatNumber(row.l1?.pb) }}</span>
                    <span :style="getPercentileStyle(row.l1?.pb_percentile)" class="percentile">({{ formatNumber(row.l1?.pb_percentile) }}%)</span>
                  </div>
                </div>
                <div class="action-btn">
                  <el-button link type="primary" size="small" @click="viewTrend(row.l1!)">查看趋势</el-button>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="二级行业" min-width="250" align="center">
            <template #default="{ row }">
              <div class="cell-content" v-if="row.l2">
                <span class="index-name">{{ row.l2?.industry_name }}</span>
                <span class="index-code" v-if="row.l2?.index_code">({{ row.l2?.index_code }})</span>
                <div class="valuation-info" v-if="row.l2?.pe !== undefined">
                  <div class="valuation-item">
                    <span>PE: {{ formatNumber(row.l2?.pe) }}</span>
                    <span :style="getPercentileStyle(row.l2?.pe_percentile)" class="percentile">({{ formatNumber(row.l2?.pe_percentile) }}%)</span>
                  </div>
                  <div class="valuation-item">
                    <span>PB: {{ formatNumber(row.l2?.pb) }}</span>
                    <span :style="getPercentileStyle(row.l2?.pb_percentile)" class="percentile">({{ formatNumber(row.l2?.pb_percentile) }}%)</span>
                  </div>
                </div>
                <div class="action-btn">
                  <el-button link type="primary" size="small" @click="viewTrend(row.l2!)">查看趋势</el-button>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="三级行业" min-width="250" align="center">
            <template #default="{ row }">
              <div class="cell-content" v-if="row.l3">
                <span class="index-name">{{ row.l3?.industry_name }}</span>
                <span class="index-code" v-if="row.l3?.index_code">({{ row.l3?.index_code }})</span>
                <div class="valuation-info" v-if="row.l3?.pe !== undefined">
                  <div class="valuation-item">
                    <span>PE: {{ formatNumber(row.l3?.pe) }}</span>
                    <span :style="getPercentileStyle(row.l3?.pe_percentile)" class="percentile">({{ formatNumber(row.l3?.pe_percentile) }}%)</span>
                  </div>
                  <div class="valuation-item">
                    <span>PB: {{ formatNumber(row.l3?.pb) }}</span>
                    <span :style="getPercentileStyle(row.l3?.pb_percentile)" class="percentile">({{ formatNumber(row.l3?.pb_percentile) }}%)</span>
                  </div>
                </div>
                <div class="action-btn">
                  <el-button link type="primary" size="small" @click="viewTrend(row.l3!)">查看趋势</el-button>
                </div>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/services/axiosConfig'
import { getSwValuationAnalysis, type SwValuationAnalysisItem } from '@/services/industryApi'

const router = useRouter()

interface IndexItem {
  index_code: string
  industry_name: string
  level: string // L1, L2, L3
  parent_code: string
  industry_code: string
  pe?: number
  pe_percentile?: number
  pb?: number
  pb_percentile?: number
}

interface GraphRow {
  l1: IndexItem | null
  l2: IndexItem | null
  l3: IndexItem | null
}

const loading = ref(false)
const error = ref('')
const tableData = ref<GraphRow[]>([])

// Spanning rules cache
const spanCache = {
  l1: [] as number[],
  l2: [] as number[]
}

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

const getPercentileStyle = (percentile: number | undefined) => {
  if (percentile === undefined || percentile === null) {
    return {}
  }
  
  if (percentile >= 80) {
    return { color: '#F56C6C', fontWeight: 'bold' } // High - Red
  } else if (percentile <= 20) {
    return { color: '#67C23A', fontWeight: 'bold' } // Low - Green
  } else {
    return { color: '#409EFF', fontWeight: 'bold' } // Moderate - Blue
  }
}

const formatNumber = (num: number | undefined) => {
  return num !== undefined && num !== null ? num.toFixed(2) : '--'
}

const fetchData = async () => {
  loading.value = true
  error.value = ''
  try {
    // 1. Fetch classification structure
    const res = await axios.get('/django/api/index/sw-index-classify/', {
      params: { src: 'SW2021' }
    })
    
    const records: IndexItem[] = res.data?.records || []
    
    // 2. Prepare date range for valuation (last 5 years)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setFullYear(startDate.getFullYear() - 5)
    
    const dateParams = {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate)
    }

    // 3. Fetch valuation data sequentially for L1, L2, L3
    // We fetch all levels even if we process them later, but user asked for serial execution
    
    // Helper to merge valuation data
    const mergeValuation = (items: IndexItem[], valuationData: SwValuationAnalysisItem[]) => {
      const vMap = new Map(valuationData.map(v => [v.ts_code, v]))
      items.forEach(item => {
        const v = vMap.get(item.index_code) || vMap.get(item.industry_code)
        if (v) {
          item.pe = v.pe
          item.pe_percentile = v.pe_percentile
          item.pb = v.pb
          item.pb_percentile = v.pb_percentile
        }
      })
    }

    // Process classification data first to build the tree/lists
    const l1List: IndexItem[] = []
    const l2List: IndexItem[] = []
    const l3List: IndexItem[] = []
    
    records.forEach(item => {
      if (item.level === 'L1') l1List.push(item)
      else if (item.level === 'L2') l2List.push(item)
      else if (item.level === 'L3') l3List.push(item)
    })

    // Fetch L1 Valuation
    try {
      const l1Val = await getSwValuationAnalysis({ ...dateParams, level: 'L1' })
      if (Array.isArray(l1Val)) mergeValuation(l1List, l1Val)
    } catch (e) {
      console.error('Failed to fetch L1 valuation', e)
    }

    // Fetch L2 Valuation
    try {
      const l2Val = await getSwValuationAnalysis({ ...dateParams, level: 'L2' })
      if (Array.isArray(l2Val)) mergeValuation(l2List, l2Val)
    } catch (e) {
      console.error('Failed to fetch L2 valuation', e)
    }

    // Fetch L3 Valuation
    try {
      const l3Val = await getSwValuationAnalysis({ ...dateParams, level: 'L3' })
      if (Array.isArray(l3Val)) mergeValuation(l3List, l3Val)
    } catch (e) {
      console.error('Failed to fetch L3 valuation', e)
    }

    // Re-process data to build table rows with updated items
    processData(records)
    
  } catch (err: any) {
    error.value = err.message || '获取数据失败'
  } finally {
    loading.value = false
  }
}

const processData = (records: IndexItem[]) => {
  const l1List: IndexItem[] = []
  const l2Map = new Map<string, IndexItem[]>()
  const l3Map = new Map<string, IndexItem[]>()

  // 1. Classify records by level
  records.forEach(item => {
    if (item.level === 'L1') {
      l1List.push(item)
    } else if (item.level === 'L2') {
      const p = item.parent_code
      if (!l2Map.has(p)) l2Map.set(p, [])
      l2Map.get(p)?.push(item)
    } else if (item.level === 'L3') {
      const p = item.parent_code
      if (!l3Map.has(p)) l3Map.set(p, [])
      l3Map.get(p)?.push(item)
    }
  })

  // 2. Build rows
  const rows: GraphRow[] = []
  
  // Sort L1 for consistent display
  l1List.sort((a, b) => a.index_code.localeCompare(b.index_code))

  l1List.forEach(l1 => {
    let l2Children = l2Map.get(l1.index_code) || []
    if (l2Children.length === 0 && l1.industry_code) {
      l2Children = l2Map.get(l1.industry_code) || []
    }
    
    if (l2Children.length === 0) {
      rows.push({ l1, l2: null, l3: null })
      return
    }

    // Sort L2
    l2Children.sort((a, b) => a.index_code.localeCompare(b.index_code))

    l2Children.forEach(l2 => {
      let l3Children = l3Map.get(l2.index_code) || []
      if (l3Children.length === 0 && l2.industry_code) {
        l3Children = l3Map.get(l2.industry_code) || []
      }
      
      if (l3Children.length === 0) {
        rows.push({ l1, l2, l3: null })
        return
      }

      // Sort L3
      l3Children.sort((a, b) => a.index_code.localeCompare(b.index_code))

      l3Children.forEach(l3 => {
        rows.push({ l1, l2, l3 })
      })
    })
  })

  tableData.value = rows
  calculateSpans(rows)
}

const calculateSpans = (rows: GraphRow[]) => {
  spanCache.l1 = new Array(rows.length).fill(0)
  spanCache.l2 = new Array(rows.length).fill(0)

  let l1Start = 0
  let l2Start = 0

  for (let i = 0; i < rows.length; i++) {
    // L1 Spans
    if (i === 0 || rows[i].l1?.index_code !== rows[i - 1].l1?.index_code) {
      if (i > 0) {
        spanCache.l1[l1Start] = i - l1Start
      }
      l1Start = i
    }
    
    // L2 Spans
    // L2 span should only be within the same L1 group (though practically L2 codes are unique)
    // and distinct from previous L2
    const currentL2Code = rows[i].l2?.index_code
    const prevL2Code = rows[i - 1]?.l2?.index_code
    const currentL1Code = rows[i].l1?.index_code
    const prevL1Code = rows[i - 1]?.l1?.index_code

    if (i === 0 || currentL2Code !== prevL2Code || currentL1Code !== prevL1Code) {
      if (i > 0) {
        spanCache.l2[l2Start] = i - l2Start
      }
      l2Start = i
    }
  }
  // Handle last group
  spanCache.l1[l1Start] = rows.length - l1Start
  spanCache.l2[l2Start] = rows.length - l2Start
}

const spanMethod = ({ rowIndex, columnIndex }: { rowIndex: number, columnIndex: number }) => {
  if (columnIndex === 0) { // L1 Column
    const rowspan = spanCache.l1[rowIndex]
    if (rowspan > 0) {
      return { rowspan, colspan: 1 }
    } else {
      return { rowspan: 0, colspan: 0 }
    }
  } else if (columnIndex === 1) { // L2 Column
    const rowspan = spanCache.l2[rowIndex]
    if (rowspan > 0) {
      return { rowspan, colspan: 1 }
    } else {
      return { rowspan: 0, colspan: 0 }
    }
  }
}

const viewTrend = (row: IndexItem) => {
  // 假设 index_code 是用于查询日线行情的 ts_code
  router.push({
    name: 'sw-industry-daily',
    query: { 
      ts_code: row.index_code,
      industry_name: row.industry_name
    }
  })
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.sw-index-graph-view {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.index-name {
  font-weight: bold;
}
.index-code {
  font-size: 12px;
  color: #909399;
}
.mb-12 {
  margin-bottom: 12px;
}
.valuation-info {
  margin-top: 5px;
  font-size: 12px;
  width: 100%;
}
.valuation-item {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-top: 2px;
}
.percentile {
  margin-left: 2px;
}
.action-btn {
  margin-top: 5px;
}
</style>

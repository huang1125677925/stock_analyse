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
          <el-table-column label="一级行业" min-width="200" align="center">
            <template #default="{ row }">
              <div class="cell-content">
                <span class="index-name">{{ row.l1?.industry_name }}</span>
                <span class="index-code" v-if="row.l1?.index_code">({{ row.l1?.index_code }})</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="二级行业" min-width="200" align="center">
            <template #default="{ row }">
              <div class="cell-content" v-if="row.l2">
                <span class="index-name">{{ row.l2?.industry_name }}</span>
                <span class="index-code" v-if="row.l2?.index_code">({{ row.l2?.index_code }})</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="三级行业" min-width="200" align="center">
            <template #default="{ row }">
              <div class="cell-content" v-if="row.l3">
                <span class="index-name">{{ row.l3?.industry_name }}</span>
                <span class="index-code" v-if="row.l3?.index_code">({{ row.l3?.index_code }})</span>
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
import axios from '@/services/axiosConfig'

interface IndexItem {
  index_code: string
  industry_name: string
  level: string // L1, L2, L3
  parent_code: string
  industry_code: string
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

const fetchData = async () => {
  loading.value = true
  error.value = ''
  try {
    // Fetch all data. Assuming the API returns all records or supports a large page size.
    // Based on IndexClassifyView, it seems to do client-side pagination, so we assume one request gets enough data.
    // Explicitly requesting SW2021 source as per docs default, just to be safe.
    const res = await axios.get('/django/api/index/sw-index-classify/', {
      params: { src: 'SW2021' }
    })
    
    const records: IndexItem[] = res.data?.records || []
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
</style>

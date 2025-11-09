<template>
  <el-card class="page-card">
    <template #header>
      <div class="card-header">中结持股明细</div>
    </template>

    <el-form :inline="true" :model="query" class="query-form">
      <el-form-item label="快捷选择">
        <el-select v-model="quickRange" style="width: 180px" @change="onQuickRangeChange">
          <el-option label="最近一周" value="last7d" />
          <el-option label="最近1月" value="last1m" />
          <el-option label="最近三月" value="last3m" />
          <el-option label="最近半年" value="last6m" />
          <el-option label="最近一年" value="last1y" />
          <el-option label="最近三年" value="last3y" />
        </el-select>
      </el-form-item>
      <el-form-item label="股票代码">
        <el-input v-model="query.ts_code" placeholder="如 00960.HK 或 605009.SH" clearable />
      </el-form-item>
      <el-form-item label="港交所代码">
        <el-input v-model="query.hk_code" placeholder="如 95009" clearable />
      </el-form-item>
      <el-form-item label="日期范围">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYYMMDD"
          unlink-panels
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="rows" border stripe style="width: 100%">
      <el-table-column v-for="col in columns" :key="col" :prop="col" :label="col" min-width="120" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchCcassHoldDetail, type CcassHoldDetailQueryParams } from '@/services/ccassHoldDetailApi'

/**
 * 组件：CcassHoldDetailView
 * 功能：查询并展示中央结算系统持股明细（单一职责：仅处理 ccass-hold-detail 接口）
 * 参数：无（内部表单：ts_code、hk_code、start_date、end_date）
 * 返回值：无
 * 事件：
 *  - onSearch：发起查询
 *  - onReset：重置状态
 */

const loading = ref(false)
const dateRange = ref<[string, string] | null>(null)
const quickRange = ref<string>('last7d')
const query = ref<CcassHoldDetailQueryParams>({})
const rows = ref<Record<string, any>[]>([])
const columns = ref<string[]>([])

function normalizeToRows(data: any): Record<string, any>[] {
  if (!data) return []
  if (Array.isArray(data.records) && data.records.length > 0) return data.records
  if (Array.isArray(data.items) && Array.isArray(data.fields)) {
    const f = data.fields as string[]
    return (data.items as any[][]).map(arr => {
      const obj: Record<string, any> = {}
      f.forEach((k, i) => (obj[k] = arr[i]))
      return obj
    })
  }
  return []
}

async function onSearch() {
  loading.value = true
  try {
    const params: CcassHoldDetailQueryParams = { ...query.value }
    if (dateRange.value) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const data = await fetchCcassHoldDetail(params)
    const list = normalizeToRows(data)
    rows.value = list
    columns.value = list.length ? Object.keys(list[0]) : []
  } finally {
    loading.value = false
  }
}

function onReset() {
  query.value = {}
  dateRange.value = null
  rows.value = []
  columns.value = []
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function setDateRangeByPreset(preset: string) {
  const end = new Date()
  const start = new Date()
  switch (preset) {
    case 'last7d':
      start.setDate(end.getDate() - 6)
      break
    case 'last1m':
      start.setMonth(end.getMonth() - 1)
      break
    case 'last3m':
      start.setMonth(end.getMonth() - 3)
      break
    case 'last6m':
      start.setMonth(end.getMonth() - 6)
      break
    case 'last1y':
      start.setFullYear(end.getFullYear() - 1)
      break
    case 'last3y':
      start.setFullYear(end.getFullYear() - 3)
      break
  }
  dateRange.value = [formatDate(start), formatDate(end)]
}

function onQuickRangeChange(val: string) {
  setDateRangeByPreset(val)
}

onMounted(() => {
  // 页面挂载默认设置最近一周，并自动触发查询
  setDateRangeByPreset('last7d')
  onSearch()
})
</script>

<style scoped>
.page-card { margin: 12px; }
.card-header { font-weight: 600; }
.query-form { margin-bottom: 12px; }
</style>
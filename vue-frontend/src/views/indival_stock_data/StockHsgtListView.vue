<template>
  <div class="stock-hsgt-list-view">
    <el-card class="page-header">
      <div class="header-content">
        <h2>沪深港通股票列表</h2>
        <div class="header-actions">
          <el-button type="primary" :icon="Refresh" @click="refreshData" :loading="loading">刷新</el-button>
        </div>
      </div>
    </el-card>

    <el-card class="search-section">
      <template #header>
        <div class="card-header">
          <span>查询条件</span>
          <el-button type="primary" link :icon="Search" @click="handleSearch">搜索</el-button>
        </div>
      </template>
      <el-form :inline="true" :model="form" label-width="100px">
        <el-form-item label="类型">
          <el-select v-model="form.type" placeholder="选择类型" style="width: 200px">
            <el-option label="港股→深股通(HK_SZ)" value="HK_SZ" />
            <el-option label="深股通→港股(SZ_HK)" value="SZ_HK" />
            <el-option label="港股→沪股通(HK_SH)" value="HK_SH" />
            <el-option label="沪股通→港股(SH_HK)" value="SH_HK" />
          </el-select>
        </el-form-item>
        <el-form-item label="TS代码">
          <el-input v-model="form.ts_code" placeholder="选填，如 600000.SH" clearable />
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker v-model="form.start_date" type="date" format="YYYYMMDD" value-format="YYYYMMDD" />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker v-model="form.end_date" type="date" format="YYYYMMDD" value-format="YYYYMMDD" />
        </el-form-item>
        <el-form-item label="交易日期">
          <el-date-picker v-model="form.trade_date" type="date" format="YYYYMMDD" value-format="YYYYMMDD" />
        </el-form-item>
        <el-form-item label="字段列表">
          <el-input v-model="form.fields" placeholder="逗号分隔，可留空" clearable />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-section">
      <template #header>
        <div class="card-header">
          <span>数据列表</span>
        </div>
      </template>
      <el-table :data="records" v-loading="loading" height="560" style="width: 100%">
        <el-table-column v-for="col in dynamicColumns" :key="col" :prop="col" :label="col" min-width="120" />
      </el-table>
      <el-empty v-if="!loading && records.length === 0" description="暂无数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { fetchStockHsgt, type StockHsgtQueryParams, type StockHsgtData } from '@/services/stockHsgtApi'

/**
 * 组件：沪深港通股票列表视图（StockHsgtListView）
 * 功能：展示 /django/api/tasks/stock-hsgt/ 返回的股票列表数据，支持类型与日期筛选
 * 参数：无（通过表单内部维护查询参数 type、ts_code、start_date、end_date、trade_date、fields）
 * 返回值：无（直接展示 records 列表）
 * 事件：无
 */

const loading = ref(false)
const records = ref<Record<string, any>[]>([])
const dynamicColumns = ref<string[]>([])

function formatDateYYYYMMDD(d: Date): string {
  // 使用正则全局替换以兼容较低 TS lib，避免 replaceAll
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}
const todayStr = () => formatDateYYYYMMDD(new Date())
const daysAgoStr = (days: number) => formatDateYYYYMMDD(new Date(Date.now() - days * 24 * 60 * 60 * 1000))

const form = reactive<StockHsgtQueryParams>({
  type: 'HK_SZ',
  ts_code: '',
  start_date: daysAgoStr(30),
  end_date: todayStr(),
  trade_date: undefined,
  fields: undefined
})

function normalizeToRecords(data: StockHsgtData): Record<string, any>[] {
  if (data.records && Array.isArray(data.records)) return data.records
  if (data.fields && data.items) {
    const cols = data.fields
    return data.items.map(row => {
      const obj: Record<string, any> = {}
      cols.forEach((key, idx) => { obj[key] = row[idx] })
      return obj
    })
  }
  return []
}

async function fetchData() {
  loading.value = true
  try {
    const res = await fetchStockHsgt({ ...form })
    const list = normalizeToRecords(res)
    records.value = list
    dynamicColumns.value = list.length ? Object.keys(list[0]) : []
  } catch (e: any) {
    ElMessage.error(e?.message || '数据加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() { fetchData() }
function refreshData() { fetchData() }

onMounted(() => { fetchData() })
</script>

<style scoped>
.stock-hsgt-list-view { padding: 20px; }
.page-header, .search-section, .table-section { margin-bottom: 20px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
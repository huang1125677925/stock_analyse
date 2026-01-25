<template>
  <div class="hsgt-top10-view">
    <el-card class="page-header">
      <div class="header-content">
        <h2>沪深股通十大成交股</h2>
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
        <el-form-item label="市场类型">
          <el-select v-model="form.market_type" placeholder="选择市场" style="width: 160px">
            <el-option label="上交所(1)" value="1" />
            <el-option label="深交所(3)" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="股票代码">
          <el-input v-model="form.ts_code" placeholder="选填，如 600000.SH" clearable />
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker v-model="form.start_date" type="date" format="YYYYMMDD" value-format="YYYYMMDD" />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker v-model="form.end_date" type="date" format="YYYYMMDD" value-format="YYYYMMDD" />
        </el-form-item>
        <el-form-item label="交易日期">
          <el-date-picker v-model="form.trade_date" type="date" format="YYYYMMDD" value-format="YYYYMMDD" placeholder="单日查询" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-section">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="汇总统计" name="summary">
          <el-table :data="summaryRecords" v-loading="loading" height="560" style="width: 100%" :default-sort="{ prop: 'total_net_amount', order: 'descending' }">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="ts_code" label="代码" width="100" />
            <el-table-column prop="name" label="名称" width="100" />
            <el-table-column prop="count" label="上榜次数" width="100" sortable />
            <el-table-column prop="total_net_amount" label="净买入额(亿)" min-width="140" sortable>
              <template #default="{ row }">
                <span :class="getColorClass(row.total_net_amount)">{{ formatMoney(row.total_net_amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="total_buy" label="买入额(亿)" min-width="140" sortable>
              <template #default="{ row }">
                {{ formatMoney(row.total_buy) }}
              </template>
            </el-table-column>
            <el-table-column prop="total_sell" label="卖出额(亿)" min-width="140" sortable>
              <template #default="{ row }">
                {{ formatMoney(row.total_sell) }}
              </template>
            </el-table-column>
            <el-table-column prop="total_amount" label="成交总额(亿)" min-width="140" sortable>
              <template #default="{ row }">
                {{ formatMoney(row.total_amount) }}
              </template>
            </el-table-column>
             <el-table-column prop="latest_close" label="最新收盘价" width="120">
               <template #default="{ row }">
                 {{ row.latest_close }} ({{ row.latest_date }})
               </template>
             </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="明细数据" name="detail">
          <el-table :data="records" v-loading="loading" height="560" style="width: 100%">
            <!-- Fixed columns for better UX -->
            <el-table-column prop="trade_date" label="交易日期" width="100" sortable />
            <el-table-column prop="ts_code" label="代码" width="100" />
            <el-table-column prop="name" label="名称" width="100" />
            <el-table-column prop="close" label="收盘价" width="100" />
            <el-table-column prop="change" label="涨跌幅" width="100" />
            <el-table-column prop="rank" label="排名" width="80" sortable />
            <el-table-column prop="net_amount" label="净买入(亿)" min-width="120" sortable>
               <template #default="{ row }">
                <span :class="getColorClass(row.net_amount)">{{ formatMoney(row.net_amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="buy" label="买入(亿)" min-width="120" sortable>
               <template #default="{ row }">
                {{ formatMoney(row.buy) }}
              </template>
            </el-table-column>
            <el-table-column prop="sell" label="卖出(亿)" min-width="120" sortable>
               <template #default="{ row }">
                {{ formatMoney(row.sell) }}
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="成交额(亿)" min-width="120" sortable>
               <template #default="{ row }">
                {{ formatMoney(row.amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="market_type" label="市场" width="80">
              <template #default="{ row }">
                {{ row.market_type === '1' ? '沪' : '深' }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <el-empty v-if="!loading && records.length === 0" description="暂无数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { fetchHsgtTop10, type HsgtTop10QueryParams, type HsgtTop10Data } from '@/services/hsgtTop10Api'

/**
 * 组件：沪深股通十大成交股视图（HsgtTop10View）
 * 功能：展示 /django/api/tasks/hsgt-top10/ 返回的十大成交股数据，支持市场类型与日期筛选，并提供数据汇总统计功能。
 * 参数：无（通过表单内部维护查询参数 market_type、ts_code、start_date、end_date、trade_date、fields）
 * 返回值：无（展示 records 列表及 summaryRecords 汇总）
 * 事件：无
 */

const loading = ref(false)
const records = ref<Record<string, any>[]>([])
const activeTab = ref('summary')

function formatDateYYYYMMDD(d: Date): string {
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${year}${month}${day}`
}
const todayStr = () => formatDateYYYYMMDD(new Date())
const daysAgoStr = (days: number) => formatDateYYYYMMDD(new Date(Date.now() - days * 24 * 60 * 60 * 1000))

const form = reactive<HsgtTop10QueryParams>({
  market_type: 1, // Default to SH, user can change
  ts_code: '',
  start_date: daysAgoStr(30), // Default to last 30 days for better summary
  end_date: todayStr(),
  trade_date: undefined,
  fields: undefined
})

interface StockSummary {
  ts_code: string
  name: string
  count: number
  total_net_amount: number
  total_buy: number
  total_sell: number
  total_amount: number
  latest_close: number
  latest_date: string
}

const summaryRecords = computed(() => {
  const map = new Map<string, StockSummary>()

  records.value.forEach(row => {
    const code = row.ts_code
    if (!map.has(code)) {
      map.set(code, {
        ts_code: code,
        name: row.name,
        count: 0,
        total_net_amount: 0,
        total_buy: 0,
        total_sell: 0,
        total_amount: 0,
        latest_close: row.close,
        latest_date: row.trade_date
      })
    }
    const item = map.get(code)!
    item.count += 1
    item.total_net_amount += (Number(row.net_amount) || 0)
    item.total_buy += (Number(row.buy) || 0)
    item.total_sell += (Number(row.sell) || 0)
    item.total_amount += (Number(row.amount) || 0)

    // Update latest close if this row is newer
    if (row.trade_date > item.latest_date) {
      item.latest_date = row.trade_date
      item.latest_close = row.close
    }
  })

  return Array.from(map.values())
})

function formatMoney(num: number): string {
  if (!num) return '0.00'
  return (num / 100000000).toFixed(2)
}

function getColorClass(val: number): string {
  if (val > 0) return 'text-red'
  if (val < 0) return 'text-green'
  return ''
}

function normalizeToRecords(data: HsgtTop10Data): Record<string, any>[] {
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
    const res = await fetchHsgtTop10({ ...form })
    const list = normalizeToRecords(res)
    records.value = list
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
.hsgt-top10-view { padding: 20px; }
.page-header, .search-section, .table-section { margin-bottom: 20px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.text-red { color: #f56c6c; }
.text-green { color: #67c23a; }
</style>

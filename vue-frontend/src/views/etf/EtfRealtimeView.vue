<template>
  <div class="etf-realtime-view">
    <div class="page-header">
      <div class="header-content">
        <h2>ETF 实时行情（最近交易日）</h2>
        <el-space>
          <el-input v-model="keyword" placeholder="过滤 基金简称(csname)" clearable style="width: 240px" />
          <el-button type="primary" :loading="loading" @click="refreshData">
            <el-icon><Refresh /></el-icon>刷新
          </el-button>
        </el-space>
      </div>
      <div class="sub-info" v-if="latestDate">
        最近交易日：<span class="date">{{ latestDate }}</span>
      </div>
    </div>

    <el-card class="table-card">
      <el-table :data="filteredItems" v-loading="loading" border style="width: 100%">
        <el-table-column prop="ts_code" label="TS代码" min-width="140" />
        <el-table-column prop="csname" label="名称" min-width="140" />
        <el-table-column prop="trade_date" label="交易日" min-width="120" />
        <el-table-column prop="open" label="开盘" min-width="90" />
        <el-table-column prop="high" label="最高" min-width="90" />
        <el-table-column prop="low" label="最低" min-width="90" />
        <el-table-column prop="close" label="收盘" min-width="90" />
        <el-table-column prop="pre_close" label="昨收" min-width="90" />
        <el-table-column prop="change" label="涨跌额" min-width="90" sortable />
        <el-table-column prop="pct_chg" label="涨跌幅(%)" min-width="110" sortable>
          <template #default="{ row }">
            <span :class="pctClass(row.pct_chg)">{{ formatPct(row.pct_chg) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="vol" label="成交量(手)" min-width="120" sortable />
        <el-table-column prop="amount" label="成交额" min-width="120" sortable />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：EtfRealtimeView
 * 功能：
 * - 调用 `/django/api/etf/daily/latest/`，展示最近交易日所有ETF的日线行情列表。
 * - 支持前端关键字过滤（TS代码/名称片段）与刷新数据。
 * 参数：无（页面组件不接收外部 props）。
 * 返回值：无（页面不向父组件返回值）。
 * 事件：无（页面不主动对外 emit 事件）。
 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getEtfDailyLatest, type EtfDailyItem, type EtfBasicItem, getEtfBasic } from '@/services/etfApi'

// 加载状态与数据
const loading = ref(false)
const items = ref<EtfDailyItem[]>([])

// 用于过滤：拉取基础列表映射 ts_code -> 基金简称(csname)
const csnameMap = ref<Record<string, string>>({})

// 关键字过滤
const keyword = ref('')

// 最近交易日（从列表推断）
const latestDate = computed(() => {
  const dates = items.value.map(i => i.trade_date)
  return dates.length ? dates.sort().slice(-1)[0] : ''
})

// 过滤后的数据
const filteredItems = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return items.value
  return items.value.filter(i => {
    const name = i.csname || ''
    return name.toLowerCase().includes(kw)
  })
})

// 显示：涨跌幅颜色与格式
const pctClass = (v: number | null | undefined) => {
  if (v == null) return ''
  return v > 0 ? 'pct-up' : v < 0 ? 'pct-down' : ''
}
const formatPct = (v: number | null | undefined) => {
  if (v == null) return ''
  return `${v}`
}

// 拉取基础信息用于名称映射（优化用户过滤体验）
const fetchBasicMap = async () => {
  try {
    const pageSize = 500
    let page = 1
    const map: Record<string, string> = {}
    while (true) {
      const res = await getEtfBasic({ page, page_size: pageSize })
      const list: EtfBasicItem[] = res.data || []
      list.forEach(b => {
        map[b.ts_code] = b.csname || ''
      })
      if (page >= (res.pages || 1) || list.length === 0) break
      page += 1
    }
    csnameMap.value = map
  } catch (e: any) {
    // 基础映射失败不阻塞主流程
    console.warn('加载ETF基础映射失败:', e?.message)
  }
}

// 拉取最新行情
const fetchLatest = async () => {
  loading.value = true
  try {
    items.value = await getEtfDailyLatest()
  } catch (e: any) {
    ElMessage.error(e?.message || 'ETF 最近交易日行情获取失败')
  } finally {
    loading.value = false
  }
}

// 刷新
const refreshData = () => fetchLatest()

// 挂载时加载数据
onMounted(async () => {
  await Promise.all([fetchLatest(), fetchBasicMap()])
})
</script>

<style scoped>
.etf-realtime-view { padding: 20px; }
.page-header { margin-bottom: 12px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.sub-info { color: #666; margin-top: 4px; }
.sub-info .date { color: #333; font-weight: 500; }
.table-card { margin-top: 8px; }
.pct-up { color: #f56c6c; }
.pct-down { color: #67c23a; }
</style>
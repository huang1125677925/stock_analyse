<template>
  <div class="etf-daily-view">
    <div class="page-header">
      <div class="header-content">
        <h2>ETF 日线行情</h2>
        <el-space>
          <el-button type="primary" :loading="loading" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button @click="refreshData"><el-icon><Refresh /></el-icon>刷新</el-button>
        </el-space>
      </div>
    </div>

    <el-card class="search-card">
      <el-form :model="query" label-width="110px" label-position="left" inline>
        <el-form-item label="TS代码" required>
          <el-select
            v-model="query.ts_code"
            placeholder="选择或搜索 TS 代码/名称"
            filterable
            remote
            reserve-keyword
            clearable
            :remote-method="remoteSearchEtf"
            :loading="selectLoading"
            style="width: 280px"
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

    <!-- K线图展示 -->
    <el-card class="kline-card">
      <stock-k-line-chart
        :stock-code="query.ts_code"
        :stock-name="selectedEtfName"
        :kline-data="klineData"
        height="600px"
      />
    </el-card>

    <el-card class="table-card">
      <el-table :data="items" v-loading="loading" border style="width: 100%">
        <el-table-column prop="trade_date" label="交易日" min-width="120" />
        <el-table-column prop="open" label="开盘" min-width="90" />
        <el-table-column prop="high" label="最高" min-width="90" />
        <el-table-column prop="low" label="最低" min-width="90" />
        <el-table-column prop="close" label="收盘" min-width="90" />
        <el-table-column prop="pre_close" label="昨收" min-width="90" />
        <el-table-column prop="change" label="涨跌额" min-width="90" />
        <el-table-column prop="pct_chg" label="涨跌幅(%)" min-width="110" />
        <el-table-column prop="vol" label="成交量(手)" min-width="120" />
        <el-table-column prop="amount" label="成交额" min-width="120" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件名称：EtfDailyView
 * 功能：
 * - 调用 `/django/api/etf/daily/` 接口，按 ts_code 与日期范围展示 ETF 日线行情。
 * - 提供可搜索下拉（远程搜索）用于选择 ts_code，支持按 ts_code 或名称检索基础列表。
 * 参数：无（页面组件不接收外部 props）。
 * 返回值：无（页面不向父组件返回值）。
 * 事件：无（页面不主动对外 emit 事件）。
 */
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getEtfDaily, getEtfBasic, type EtfDailyItem, type EtfBasicItem } from '@/services/etfApi'
import StockKLineChart from '@/components/StockKLineChart.vue'

// 加载与数据
const loading = ref(false)
const items = ref<EtfDailyItem[]>([])
// 下拉选项与加载状态
const etfOptions = ref<EtfBasicItem[]>([])
const selectLoading = ref(false)

// 计算：将日线数据映射为 K 线组件需要的结构
const klineData = computed(() =>
  (items.value || []).map(d => ({
    date: d.trade_date,
    open_price: d.open,
    close_price: d.close,
    high_price: d.high,
    low_price: d.low,
    volume: d.vol,
    amount: d.amount,
  }))
)

// 当前选中 ETF 名称（优先 extname > csname > cname）
const selectedEtfName = computed(() => {
  const cur = etfOptions.value.find(o => o.ts_code === query.ts_code)
  return cur ? (cur.extname || cur.csname || cur.cname || '') : ''
})

// 查询条件
const query = reactive({
  ts_code: '',
  start_date: '',
  end_date: '',
})

// 远程搜索 ETF 基础列表，用于下拉选项
const remoteSearchEtf = async (keyword: string) => {
  const q = (keyword || '').trim()
  if (!q) {
    // 空关键字时保持已有全量列表，避免清空下拉
    return
  }
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

// 工具：格式化日期为 YYYY-MM-DD
const formatDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 设置默认日期范围为最近一月
const setDefaultDates = () => {
  const today = new Date()
  const start = new Date()
  start.setDate(today.getDate() - 30)
  query.start_date = formatDate(start)
  query.end_date = formatDate(today)
}

// 拉取全量 ETF 基础列表作为下拉选项
const fetchAllEtfOptions = async () => {
  selectLoading.value = true
  try {
    const pageSize = 200
    let page = 1
    const all: EtfBasicItem[] = []
    while (true) {
      const res = await getEtfBasic({ page, page_size: pageSize })
      const list = res.data || []
      all.push(...list)
      const pages = res.pages || 1
      if (page >= pages || list.length === 0) break
      page += 1
    }
    etfOptions.value = all
  } catch (e: any) {
    ElMessage.error(e?.message || 'ETF 基础列表加载失败')
  } finally {
    selectLoading.value = false
  }
}

// 拉取数据
const fetchList = async () => {
  if (!query.ts_code) {
    ElMessage.warning('请先选择 TS 代码')
    return
  }
  loading.value = true
  try {
    items.value = await getEtfDaily({
      ts_code: query.ts_code,
      start_date: query.start_date || undefined,
      end_date: query.end_date || undefined,
    })
  } catch (e: any) {
    ElMessage.error(e?.message || 'ETF 日线行情获取失败')
  } finally {
    loading.value = false
  }
}

// 操作
const handleSearch = () => fetchList()
const refreshData = () => fetchList()
const handleReset = () => {
  query.start_date = ''
  query.end_date = ''
  items.value = []
}


// 页面挂载：设置默认日期、加载下拉全量数据、设置默认 ts_code 并拉取日线
onMounted(async () => {
  setDefaultDates()
  await fetchAllEtfOptions()
  if (!query.ts_code && etfOptions.value.length > 0) {
    query.ts_code = etfOptions.value[0].ts_code
  }
})

// 监听 ts_code 变化，自动拉取日线数据
watch(
  () => query.ts_code,
  (val, old) => {
    if (val && val !== old) {
      fetchList()
    }
  }
)

</script>

<style scoped>
.etf-daily-view { padding: 20px; }
.page-header { margin-bottom: 12px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.search-card { margin-bottom: 12px; }
.table-card { margin-top: 8px; }
</style>
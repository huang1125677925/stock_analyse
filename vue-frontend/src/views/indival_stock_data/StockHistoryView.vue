<template>
  <div class="stock-history-view">
    <el-card class="page-header">
      <template #header>
        <div class="header-content">
          <div class="stock-info">
            <h2>{{ stockInfo.name }} <span class="stock-code">{{ stockInfo.code }}</span></h2>
            <p v-if="stockInfo.industry">{{ stockInfo.industry }}</p>
          </div>
          <div class="header-actions">
            <el-button type="primary" :icon="ArrowLeft" @click="goBack">返回</el-button>
            <el-button type="success" :icon="Refresh" @click="fetchHistoryData" :loading="loading">
              刷新数据
            </el-button>
          </div>
        </div>
      </template>

      <!-- 查询条件 -->
      <div class="query-section">
        <el-form :inline="true" :model="queryForm">
          <el-form-item label="股票代码">
            <el-select 
              v-model="queryForm.code" 
              filterable 
              remote 
              placeholder="请输入股票代码或名称" 
              :remote-method="searchStocks"
              :loading="searchLoading"
              @change="handleStockChange"
            >
              <el-option 
                v-for="item in stockOptions" 
                :key="item.code" 
                :label="`${item.name} (${item.code})`" 
                :value="item.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="日期范围">
            <el-date-picker
              v-model="queryForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYYMMDD"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
            <el-button :icon="RefreshLeft" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
      <div class="chart-container">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>K线形态识别热力图（最近一月）</span>
            </div>
          </template>
          <CandlestickPatternHeatmap
                  :stock-code="queryForm.code"
                  :start-date="recentMonthRange[0]"
                  :end-date="recentMonthRange[1]"
                />
        </el-card>
      </div>
      <!-- 历史行情图表 -->
      <div class="chart-container">
        <StockChart 
          :history-data="historyData" 
          :stock-info="stockInfo" 
          :loading="loading"
        />
      </div>
      

      <!-- 业绩数据趋势图 -->
      <div class="chart-container">
        <PerformanceChart 
          :performance-data="performanceData" 
          :stock-info="stockInfo" 
          :loading="performanceLoading"
        />
      </div>

      <!-- 数据展示区域 -->
      <div v-if="!loading && (historyData.length > 0 || queryForm.code)" class="data-container">
        <el-tabs v-model="activeTab" type="card" class="data-tabs">
          <!-- 历史行情标签页 -->
          <el-tab-pane label="历史行情" name="history">
            <HistoryDataTable 
              :history-data="historyData" 
              @refresh="handleSearch"
              @sort-change="handleSortChange"
            />
            
          </el-tab-pane>

          <!-- 业绩数据标签页 -->
          <el-tab-pane label="业绩数据" name="performance">
            <PerformanceDataTable 
              :performance-data="performanceData" 
              :loading="performanceLoading"
              @refresh="handleSearch"
              @sort-change="handleSortChange"
            />
          </el-tab-pane>

          <!-- 资产负债表标签页 -->
          <el-tab-pane label="资产负债表" name="balance-sheet">
            <BalanceSheetTable 
              :stock-code="queryForm.code" 
              @loading="handleFinancialLoading"
              @error="handleFinancialError"
            />
          </el-tab-pane>

          <!-- 利润表标签页 -->
          <el-tab-pane label="利润表" name="income-statement">
            <IncomeStatementTable 
              :stock-code="queryForm.code" 
              @loading="handleFinancialLoading"
              @error="handleFinancialError"
            />
          </el-tab-pane>

          <!-- 现金流量表标签页 -->
          <el-tab-pane label="现金流量表" name="cash-flow-statement">
            <CashFlowStatementTable 
              :stock-code="queryForm.code" 
              @loading="handleFinancialLoading"
              @error="handleFinancialError"
            />
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 加载中 -->
      <div v-else-if="loading" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>

      <!-- 无数据 -->
      <div v-else class="empty-container">
        <el-empty description="暂无历史行情数据">
          <el-button type="primary" @click="handleSearch">查询数据</el-button>
        </el-empty>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 股票历史行情页面
 * 
 * 功能：
 * 1. 展示单只股票的历史行情数据
 * 2. 支持股票切换
 * 3. 支持日期范围和周期选择
 * 4. 提供K线图表和数据表格两种展示方式
 * 5. 支持数据排序和分页
 */
import { ref, reactive, onMounted, watch, nextTick, computed, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Refresh, Search, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getStockList, getStockHistory, getStockPerformanceReports } from '@/services/individualStockApi'
import type { StockInfo, StockHistory, PerformanceReport } from '@/services/individualStockApi'
// 导入财报组件
import BalanceSheetTable from './components/BalanceSheetTable.vue'
import IncomeStatementTable from './components/IncomeStatementTable.vue'
import CashFlowStatementTable from './components/CashFlowStatementTable.vue'
import HistoryDataTable from './components/HistoryDataTable.vue'
import PerformanceDataTable from './components/PerformanceDataTable.vue'
// 导入图表组件
import StockChart from './components/StockChart.vue'
import PerformanceChart from './components/PerformanceChart.vue'
import CandlestickPatternHeatmap from './components/CandlestickPatternHeatmap.vue'

// 路由
const route = useRoute()
const router = useRouter()

// 数据加载状态
const loading = ref(false)
const searchLoading = ref(false)
const performanceLoading = ref(false)

// 股票信息
const stockInfo = reactive<StockInfo>({
  code: '',
  name: '',
  industry: '',
  total_shares: 0,
  circulating_shares: 0,
  list_date: '',
  pe_ratio: 0,
  pb_ratio: 0,
  total_market_cap: 0,
  circulating_market_cap: 0,
  created_at: '',
  updated_at: '',
  // 添加必要的字段以符合 StockInfo 类型
  latest_price: 0,
  change_percent: 0,
  change_amount: 0,
  volume: 0,
  amount: 0,
  amplitude: 0,
  high: 0,
  low: 0,
  open_price: 0,
  close_price: 0,
  volume_ratio: 0,
  turnover_rate: 0,
  price_change_speed: 0,
  change_5min: 0,
  change_60d: 0,
  change_ytd: 0
})

// 查询表单
const queryForm = reactive({
  code: route.params.code as string || '',
  dateRange: [] as string[]
})

// 最近一个月日期范围（相对于选择的结束日期或今天），格式：YYYYMMDD
const recentMonthRange = computed<[string, string]>(() => {
  const formatYmd = (d: Date): string => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  }
  const toDateFromYmd = (s: string): Date => {
    if (/^\d{8}$/.test(s)) {
      const y = Number(s.slice(0, 4))
      const m = Number(s.slice(4, 6)) - 1
      const d = Number(s.slice(6, 8))
      return new Date(y, m, d)
    }
    // 尝试按 YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s)
    return new Date()
  }
  const minusDays = (ymd: string, days: number): string => {
    const date = toDateFromYmd(ymd)
    date.setDate(date.getDate() - days)
    return formatYmd(date)
  }

  const end = queryForm.dateRange?.[1] ?? formatYmd(new Date())
  const endYmd = /^\d{8}$/.test(end) ? end : formatYmd(toDateFromYmd(end))
  const startYmd = minusDays(endYmd, 30)
  return [startYmd, endYmd]
})

// 历史行情数据
const historyData = ref<StockHistory[]>([])

// 业绩快报数据
const performanceData = ref<PerformanceReport[]>([])

// 股票选择
const stockOptions = ref<StockInfo[]>([])

// 排序
const sortField = ref('date')
const sortOrder = ref('desc')

// 标签页状态
const activeTab = ref('history')

// 财报组件加载状态
const financialLoading = ref(false)

// 计算属性：排序后的历史数据
const sortedHistoryData = computed(() => {
  if (!historyData.value.length) return []
  
  return [...historyData.value].sort((a, b) => {
    const fieldA = a[sortField.value as keyof StockHistory]
    const fieldB = b[sortField.value as keyof StockHistory]
    
    // 处理不同类型的字段
    if (typeof fieldA === 'string' && typeof fieldB === 'string') {
      return sortOrder.value === 'asc' 
        ? fieldA.localeCompare(fieldB) 
        : fieldB.localeCompare(fieldA)
    } else {
      // 数字类型
      const numA = fieldA === null || fieldA === undefined ? -Infinity : Number(fieldA)
      const numB = fieldB === null || fieldB === undefined ? -Infinity : Number(fieldB)
      return sortOrder.value === 'asc' ? numA - numB : numB - numA
    }
  })
})

// 方法：返回上一页
const goBack = () => {
  router.back()
}

// 方法：获取历史行情数据
const fetchHistoryData = async () => {
  if (!queryForm.code) {
    ElMessage.warning('请选择股票')
    return
  }
  
  loading.value = true
  try {
    // 处理日期范围
    const startDate = queryForm.dateRange[0] || ''
    const endDate = queryForm.dateRange[1] || ''
    
    console.log('StockHistoryView fetchHistoryData called', {
      code: queryForm.code,
      startDate,
      endDate
    })
    
    const response = await getStockHistory(queryForm.code, {
      start_date: startDate,
      end_date: endDate,
      adjust: ''
    })
    
    console.log('StockHistoryView getStockHistory response', {
      responseLength: response?.length,
      firstItem: response?.[0]
    })
    
    historyData.value = response
    
    // 更新股票基本信息
    if (response && response.length > 0) {
      const latestData = response[0]
      stockInfo.code = queryForm.code
      stockInfo.name = latestData.stock_name || ''
      
      console.log('StockHistoryView stockInfo updated', stockInfo)
    }
    
    // 同时获取业绩数据
    await fetchPerformanceData()
    
    ElMessage.success('历史行情数据加载成功')
  } catch (error) {
    console.error('获取历史行情数据失败:', error)
    ElMessage.error('获取历史行情数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

/**
 * 获取业绩快报数据
 * 功能：获取指定股票的业绩快报数据，用于展示业绩趋势
 */
const fetchPerformanceData = async () => {
  if (!queryForm.code) return
  
  performanceLoading.value = true
  try {
    const response = await getStockPerformanceReports(queryForm.code, {
      page: 1,
      page_size: 20
    })
    
    // 按报告日期排序（最新的在前）
    performanceData.value = response.reports.sort((a, b) => 
      b.report_date.localeCompare(a.report_date)
    )
    
    console.log('业绩数据加载成功:', performanceData.value.length, '条记录')
  } catch (error) {
    console.error('获取业绩数据失败:', error)
    // 不显示错误消息，因为业绩数据是可选的
  } finally {
    performanceLoading.value = false
  }
}



// 方法：搜索股票
const searchStocks = async (query: string) => {
  if (query.length < 2) return
  
  searchLoading.value = true
  try {
    const response = await getStockList()
    const allStocks = response.data
    
    // 过滤股票
    stockOptions.value = allStocks.filter(stock => 
      stock.code.includes(query) || 
      stock.name.includes(query)
    ).slice(0, 20) // 限制结果数量
  } catch (error) {
    console.error('搜索股票失败:', error)
  } finally {
    searchLoading.value = false
  }
}

// 方法：股票切换
const handleStockChange = (value: string) => {
  queryForm.code = value
  router.push(`/stock-history/${value}`)
}

// 方法：查询
const handleSearch = () => {
  fetchHistoryData()
}

// 方法：重置查询
const resetQuery = () => {
  queryForm.dateRange = []
}

// 方法：排序变化
const handleSortChange = ({ prop, order }: { prop: string; order: string | null }) => {
  sortField.value = prop || 'date'
  sortOrder.value = order === 'ascending' ? 'asc' : 'desc'
}

// 方法：处理财报组件加载状态
const handleFinancialLoading = (loading: boolean) => {
  financialLoading.value = loading
}

// 方法：处理财报组件错误
const handleFinancialError = (message: string) => {
  ElMessage.error(message)
}

// 监听路由参数变化
watch(
  () => route.params.code,
  (newCode) => {
    if (newCode && typeof newCode === 'string') {
      queryForm.code = newCode
      fetchHistoryData()
    }
  }
)

// 组件挂载
onMounted(() => {
  // 设置默认日期范围（最近30天）
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  
  queryForm.dateRange = [
    startDate.toISOString().split('T')[0].replace(/-/g, ''),
    endDate.toISOString().split('T')[0].replace(/-/g, '')
  ]
  
  if (queryForm.code) {
    fetchHistoryData()
  }
})
</script>

<style scoped>
.stock-history-view {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.stock-info h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.stock-info p {
  margin: 5px 0 0 0;
  color: #909399;
  font-size: 14px;
}

.stock-code {
  font-size: 16px;
  color: #909399;
  margin-left: 8px;
}

.query-section {
  margin-bottom: 20px;
}

.chart-container {
  margin-bottom: 30px;
}

.stock-chart {
  width: 100%;
  height: 500px;
}

.performance-chart {
  width: 100%;
  height: 400px;
}

.data-container {
  margin-top: 20px;
}

.data-tabs {
  margin-top: 20px;
}

.data-tabs .el-tabs__content {
  padding: 20px 0;
}

.table-container {
  width: 100%;
  overflow-x: auto;
}

.table-container h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: 600;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.price-up {
  color: #f56c6c;
}

.price-down {
  color: #67c23a;
}

.price-unchanged {
  color: #909399;
}

.loading-container,
.empty-container {
  padding: 40px 0;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stock-history-view {
    padding: 10px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .header-actions {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }
  
  .query-section .el-form {
    display: flex;
    flex-direction: column;
  }
  
  .query-section .el-form-item {
    margin-right: 0;
    margin-bottom: 15px;
  }
  
  .stock-chart {
    height: 350px;
  }
}
.chart-card {
  border: 1px solid #ebeef5;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-header span {
  font-size: 16px;
  font-weight: 600;
}
</style>
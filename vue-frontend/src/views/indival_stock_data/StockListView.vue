<template>
  <div class="stock-list-view">
    <el-card class="page-header">
      <template #header>
        <div class="header-content">
          <h2>股票列表</h2>
          <div class="header-actions">
            <el-button type="primary" :icon="Refresh" @click="fetchStockList" :loading="loading">
              刷新数据
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索和筛选区域 -->
      <div class="search-section">
        <el-form :inline="true" class="search-form">
          <el-form-item label="选择行业">
            <el-select
              v-model="industry"
              placeholder="请选择行业"
              style="width: 200px"
              clearable
              filterable
              @change="handleIndustryChange"
            >
              <el-option
                v-for="industryItem in industryList"
                :key="industryItem.name"
                :label="industryItem.name"
                :value="industryItem.name"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="东财概念">
            <el-select
              v-model="dcConcept"
              placeholder="请选择东财概念"
              style="width: 240px"
              clearable
              filterable
              @change="handleDcConceptChange"
            >
              <el-option
                v-for="concept in dcConceptList"
                :key="concept"
                :label="concept"
                :value="concept"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="股票代码/名称">
            <el-input v-model="searchKeyword" placeholder="请输入股票代码或名称" clearable @clear="handleSearch" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button :icon="RefreshLeft" @click="resetSearch">重置</el-button>
          </el-form-item>
          <el-form-item label="仅看我的">
            <el-checkbox v-model="onlyMine" @change="handleOnlyMineChange">仅看我的（持有/关注）</el-checkbox>
          </el-form-item>
        </el-form>
      </div>

      <!-- 数据表格 -->
      <div class="table-container">
        <el-table
          v-loading="loading"
          :data="filteredStocks"
          border
          stripe
          style="width: 100%"
          @sort-change="handleSortChange"
          fit
        >
          <el-table-column prop="code" label="股票代码" min-width="100" sortable align="center" header-align="center" />
          <el-table-column prop="name" label="股票名称" min-width="120" sortable align="center" header-align="center" />
          <el-table-column prop="industry" label="行业" min-width="120" align="center" header-align="center" />
          <el-table-column prop="total_market_cap" label="总市值" min-width="100" sortable align="center" header-align="center">
            <template #default="scope">
              {{ formatMarketCap(scope.row.total_market_cap) }}
            </template>
          </el-table-column>
          <el-table-column prop="pe_ratio" label="市盈率" min-width="80" sortable align="center" header-align="center" />
          <el-table-column prop="pb_ratio" label="市净率" min-width="80" sortable align="center" header-align="center" />
          <el-table-column prop="latest_price" label="最新价" min-width="100" sortable align="center" header-align="center" />
          <el-table-column prop="change_percent" label="涨跌幅" min-width="100" sortable align="center" header-align="center">
            <template #default="scope">
              <span :class="scope.row.change_percent >= 0 ? 'text-success' : 'text-danger'">
                {{ scope.row.change_percent ? scope.row.change_percent.toFixed(2) + '%' : '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="change_amount" label="涨跌额" min-width="100" sortable align="center" header-align="center">
            <template #default="scope">
              <span :class="scope.row.change_amount >= 0 ? 'text-success' : 'text-danger'">
                {{ scope.row.change_amount ? scope.row.change_amount.toFixed(2) : '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="volume" label="成交量" min-width="100" sortable align="center" header-align="center">
            <template #default="scope">
              {{ formatVolume(scope.row.volume) }}
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="成交额" min-width="100" sortable align="center" header-align="center">
            <template #default="scope">
              {{ formatMarketCap(scope.row.amount) }}
            </template>
          </el-table-column>
          <el-table-column prop="turnover_rate" label="换手率" min-width="80" sortable align="center" header-align="center">
            <template #default="scope">
              {{ scope.row.turnover_rate ? scope.row.turnover_rate.toFixed(2) + '%' : '-' }}
            </template>
          </el-table-column>
          
          <el-table-column label="操作" min-width="260" fixed="right" align="center" header-align="center">
            <template #default="scope">
              <el-button 
                type="primary" 
                size="small"
                @click="viewHistory(scope.row.code)"
              >
                股票详情
              </el-button>
              <el-button 
                type="success" 
                size="small"
                @click="addWatched(scope.row.code)"
              >
                添加关注
              </el-button>
              <el-button 
                type="warning" 
                size="small"
                @click="addHeld(scope.row.code)"
              >
                添加持有
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalStocks"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 股票列表页面
 * 
 * 功能：
 * 1. 展示所有股票的基本信息
 * 2. 支持按股票代码、名称进行后端搜索
 * 3. 支持东财概念筛选（下拉选择，后端模糊匹配）
 * 4. 支持排序和分页
 * 5. 提供跳转到实时行情和历史行情的入口
 * 6. 支持从路由参数接收行业筛选条件
 * 
 * 参数：
 * - searchKeyword: 搜索关键词，用于后端搜索
 * - currentPage: 当前页码
 * - pageSize: 每页显示数量
 * - industry: 行业筛选条件，可从路由参数获取
 * - dcConcept: 东财概念筛选条件（字符串）
 * 
 * 事件：
 * - handleSearch: 触发后端搜索
 * - resetSearch: 重置搜索条件并刷新数据
 * - fetchStockList: 从后端获取股票列表数据
 * - handleDcConceptChange: 概念筛选变化后刷新数据
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, RefreshLeft, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getStockList, getDcConceptList } from '@/services/individualStockApi'
import type { StockInfo } from '@/services/individualStockApi'
import { getIndustrySectors, type IndustrySector } from '@/services/industryAnalysisApi'
import { createPersonalHolding, type RelationType, getPersonalHoldings, type PersonalHoldingsListResponse } from '@/services/personalHoldingsApi'
import { isAuthenticated } from '@/services/auth'

// 路由
const router = useRouter()
const route = useRoute()

// 数据加载状态
const loading = ref(false)

// 股票数据
const stocks = ref<StockInfo[]>([])
const searchKeyword = ref('')

// 行业筛选
const industry = ref('')
const industryList = ref<IndustrySector[]>([])
// 东财概念筛选
const dcConcept = ref('')
const dcConceptList = ref<string[]>([])

// 仅看我的（持有/关注）
const onlyMine = ref(false)
const holdingsCodeSet = ref<Set<string>>(new Set()) // 保留：用于本地操作（如按钮状态）
const holdingsNameList = ref<string[]>([]) // 后端过滤使用的股票名称列表

// 排序
const sortField = ref('')
const sortOrder = ref('asc')

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const totalStocks = ref(0)

/**
 * 计算过滤后的股票列表（后端过滤）
 */
const filteredStocks = computed(() => stocks.value)

// 根据过滤结果更新总数（用于分页展示）
watch(filteredStocks, (list) => {
  if (onlyMine.value) {
    totalStocks.value = list.length
  }
})

// 切换“仅看我的”
const handleOnlyMineChange = async () => {
  if (onlyMine.value) {
    if (!isAuthenticated()) {
      ElMessage.error('请先登录后再启用“仅看我的”')
      onlyMine.value = false
      router.push('/login')
      return
    }
    try {
      const res: PersonalHoldingsListResponse = await getPersonalHoldings()
      const list = res.data?.list || []
      // 同时保留代码集合，核心使用名称集合进行后端过滤
      const codes = list
        .filter(item => ['WATCHED', 'HELD'].includes(item.relation_type))
        .map(item => item.stock_code?.trim())
        .filter(Boolean) as string[]
      holdingsCodeSet.value = new Set(codes)

      const names = list
        .filter(item => ['WATCHED', 'HELD'].includes(item.relation_type))
        .map(item => item.stock_name?.trim())
        .filter(Boolean) as string[]
      holdingsNameList.value = names

      currentPage.value = 1
      if (names.length === 0) {
        ElMessage.warning('您的持有/关注列表为空，暂无可展示数据')
        stocks.value = []
        totalStocks.value = 0
      } else {
        ElMessage.success(`已启用，仅展示与您相关的股票（${names.length} 条记录）`)
        // 触发后端过滤
        fetchStockList()
      }
    } catch (error) {
      console.error('获取个人持有/关注列表失败:', error)
      ElMessage.error('获取个人列表失败，请稍后重试')
      onlyMine.value = false
      holdingsCodeSet.value = new Set()
      holdingsNameList.value = []
    }
  } else {
    // 关闭时清空集合并刷新为全量
    holdingsCodeSet.value = new Set()
    holdingsNameList.value = []
    currentPage.value = 1
    fetchStockList()
  }
}

// 方法：获取股票列表
const fetchStockList = async () => {
  loading.value = true
  try {
    const response = await getStockList({
      page: currentPage.value,
      page_size: pageSize.value,
      keyword: searchKeyword.value,
      industry: industry.value || undefined,
      stock_names: onlyMine.value && holdingsNameList.value.length > 0 ? holdingsNameList.value.join(',') : undefined,
      dc_concept: dcConcept.value || undefined
    })
    stocks.value = response.data
    
    // 重置分页信息
    totalStocks.value = response.total
    
    ElMessage.success('股票数据加载成功')
  } catch (error) {
    console.error('获取股票列表失败:', error)
    ElMessage.error('获取股票列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 方法：获取行业列表
const fetchIndustryList = async () => {
  try {
    const response = await getIndustrySectors()
    industryList.value = response.sectors
  } catch (error) {
    console.error('获取行业列表失败:', error)
    ElMessage.error('获取行业列表失败')
  }
}

/**
 * 方法：获取东财概念列表
 * 功能：调用后端统一响应接口，填充下拉选项
 * 参数：无
 * 返回值：无（更新 dcConceptList）
 * 事件：无
 */
const fetchDcConceptList = async () => {
  try {
    const res = await getDcConceptList()
    dcConceptList.value = res.data || []
  } catch (error) {
    console.error('获取东财概念列表失败:', error)
    ElMessage.error('获取东财概念列表失败')
  }
}

// 方法：行业筛选变化
const handleIndustryChange = () => {
  currentPage.value = 1 // 重置到第一页
  fetchStockList() // 重新获取数据
}

// 方法：东财概念筛选变化
const handleDcConceptChange = () => {
  currentPage.value = 1 // 重置到第一页
  fetchStockList() // 重新获取数据
}

// 方法：搜索
const handleSearch = () => {
  currentPage.value = 1 // 重置到第一页
  fetchStockList() // 重新获取数据
}

// 方法：重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  industry.value = ''
  dcConcept.value = ''
  currentPage.value = 1
  fetchStockList() // 重置后调用后端搜索
}

// 方法：排序变化
const handleSortChange = ({ prop, order }: { prop: string; order: string | null }) => {
  sortField.value = prop || ''
  sortOrder.value = order === 'ascending' ? 'asc' : 'desc'
}

// 方法：页大小变化
const handleSizeChange = (newSize: number) => {
  pageSize.value = newSize
  currentPage.value = 1
  fetchStockList()
}

// 方法：当前页变化
const handleCurrentChange = (newPage: number) => {
  currentPage.value = newPage
  fetchStockList()
}

// 方法：查看实时行情
const viewRealtime = (code: string) => {
  router.push(`/stock-realtime/${code}`)
}

// 方法：查看历史行情
const viewHistory = (code: string) => {
  router.push(`/stock-history/${code}`)
}

// 新增：添加关注
const addWatched = async (code: string) => {
  if (!isAuthenticated()) {
    ElMessage.error('请先登录后再进行操作')
    router.push('/login')
    return
  }
  try {
    const res = await createPersonalHolding({ stock_code: code, relation_type: 'WATCHED' })
    ElMessage.success(res.message || '已添加关注')
  } catch (e: any) {
    ElMessage.error(e?.message || '添加关注失败')
  }
}

// 新增：添加持有
const addHeld = async (code: string) => {
  if (!isAuthenticated()) {
    ElMessage.error('请先登录后再进行操作')
    router.push('/login')
    return
  }
  try {
    const res = await createPersonalHolding({ stock_code: code, relation_type: 'HELD' })
    ElMessage.success(res.message || '已添加持有')
  } catch (e: any) {
    ElMessage.error(e?.message || '添加持有失败')
  }
}

// 方法：格式化市值
const formatMarketCap = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-'
  
  if (value >= 100000000000) {
    return (value / 100000000000).toFixed(2) + '千亿'
  } else if (value >= 100000000) {
    return (value / 100000000).toFixed(2) + '亿'
  } else if (value >= 10000) {
    return (value / 10000).toFixed(2) + '万'
  } else {
    return value.toString()
  }
}

// 方法：格式化成交量
const formatVolume = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-'
  
  if (value >= 100000000) {
    return (value / 100000000).toFixed(2) + '亿手'
  } else if (value >= 10000) {
    return (value / 10000).toFixed(2) + '万手'
  } else {
    return value.toString() + '手'
  }
}

// 生命周期：组件挂载时获取数据
onMounted(() => {
  fetchIndustryList()
  fetchDcConceptList()
  // 检查路由参数中是否有行业筛选条件
  const industryFromQuery = route.query.industry as string
  if (industryFromQuery) {
    industry.value = industryFromQuery
    ElMessage.success(`已自动筛选行业：${industryFromQuery}`)
  }
  // 检查路由参数中是否有东财概念筛选条件
  /**
   * 初始化路由参数中的东财概念
   * 功能：从 query 读取 dc_concept 并设置到筛选条件
   * 参数：无
   * 返回值：无
   * 事件：更新 dcConcept 后将触发列表刷新（下方调用）
   */
  const conceptFromQuery = route.query.dc_concept as string
  if (conceptFromQuery) {
    dcConcept.value = conceptFromQuery
    ElMessage.success(`已自动筛选概念：${conceptFromQuery}`)
  }
  
  fetchStockList()
})

// 监听路由参数变化
watch(() => route.query.industry, (newIndustry) => {
  if (newIndustry && typeof newIndustry === 'string') {
    industry.value = newIndustry
    currentPage.value = 1 // 重置到第一页
    fetchStockList() // 重新获取数据
    ElMessage.success(`已切换到行业：${newIndustry}`)
  }
}, { immediate: false })

// 监听路由参数中的东财概念变化
watch(() => route.query.dc_concept, (newConcept) => {
  if (newConcept && typeof newConcept === 'string') {
    dcConcept.value = newConcept
    currentPage.value = 1
    fetchStockList()
    ElMessage.success(`已切换到概念：${newConcept}`)
  }
}, { immediate: false })
</script>

<style scoped>
.stock-list-view {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.filter-section {
  margin-bottom: 16px;
}

.search-section {
  margin-bottom: 20px;
}

.table-container {
  margin-bottom: 20px;
  width: 100%;
  overflow-x: auto;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.text-success {
  color: #f56c6c; /* 红色表示上涨 */
}

.text-danger {
  color: #67c23a; /* 绿色表示下跌 */
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stock-list-view {
    padding: 10px;
  }
  
  .search-form {
    display: flex;
    flex-direction: column;
  }
  
  .el-form-item {
    margin-right: 0;
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  .pagination-container {
    flex-wrap: wrap;
  }
}

@media (max-width: 576px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions {
    margin-top: 10px;
  }
}
</style>
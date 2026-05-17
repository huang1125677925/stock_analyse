<template>
  <div class="quantitative-backtest-view">
    <div class="page-header">
      <h1>量化策略回测</h1>
      <p>选择股票和策略，进行量化回测分析</p>
    </div>
    
    <!-- 股票选择和K线图部分 -->
    <div class="control-panel">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>股票选择</span>
          </div>
        </template>
        
        <el-form :model="stockForm" label-width="100px" class="query-form">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="股票代码">
                <el-select
                  v-model="stockForm.stockCode"
                  placeholder="请选择或输入股票代码"
                  class="full-width"
                  @change="handleStockSelect"
                  filterable
                  remote
                  :remote-method="handleStockInputChange"
                  :loading="stockSearchLoading"
                  allow-create
                  default-first-option
                  :reserve-keyword="false"
                >
                  <el-option
                    v-for="item in stockList"
                    :key="item.code"
                    :label="`${item.code} ${item.name}`"
                    :value="item.code"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            
            <el-col :span="8">
              <el-form-item label="时间范围">
                <el-select v-model="stockForm.dateRangeType" @change="handleDateRangeChange" class="full-width">
                  <el-option label="最近一周" value="week" />
                  <el-option label="最近一月" value="month" />
                  <el-option label="最近三月" value="threeMonths" />
                  <el-option label="最近六月" value="sixMonths" />
                  <el-option label="最近一年" value="year" />
                  <el-option label="最近三年" value="threeYears" />
                  <el-option label="全部" value="all" />
                  <el-option label="自定义" value="custom" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20" v-if="stockForm.dateRangeType === 'custom'">
            <el-col :span="8">
              <el-form-item label="开始日期">
                <el-date-picker
                  v-model="stockForm.startDate"
                  type="date"
                  placeholder="选择开始日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  class="full-width"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="8">
              <el-form-item label="结束日期">
                <el-date-picker
                  v-model="stockForm.endDate"
                  type="date"
                  placeholder="选择结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  class="full-width"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item>
            <el-button type="primary" @click="fetchStockData">查询</el-button>
            <el-button @click="resetStockForm">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
    
    <!-- K线图展示 -->
    <div class="chart-container" v-if="stockHistoryData.length > 0">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>{{ selectedStockInfo.name }}({{ selectedStockInfo.code }}) K线图</span>
            <div class="stock-info">
              <span>行业: {{ selectedStockInfo.industry || '未知' }}</span>
              <span>上市日期: {{ selectedStockInfo.listDate || '未知' }}</span>
              <span>总市值: {{ formatMarketCap(selectedStockInfo.totalMarketCap) }}</span>
              <span>流通市值: {{ formatMarketCap(selectedStockInfo.circulatingMarketCap) }}</span>
            </div>
          </div>
        </template>
        
        <stock-k-line-chart
          :stock-code="selectedStockInfo.code"
          :stock-name="selectedStockInfo.name"
          :kline-data="stockHistoryData"
          :trade-signals="tradePoints"
          height="500px"
          :show-volume="true"
        />
      </el-card>
    </div>
    
    <div class="empty-state" v-if="stockHistoryData.length === 0">
      <el-empty description="请选择股票并查询数据" />
    </div>
    
    <!-- 策略选择和参数配置部分 -->
    <div class="strategy-panel" v-if="stockHistoryData.length > 0">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>策略配置</span>
          </div>
        </template>
        
        <el-form :model="strategyForm" label-width="120px" class="strategy-form">
          <el-form-item label="选择策略">
            <el-select
              v-model="strategyForm.strategyName"
              placeholder="请选择策略"
              class="full-width"
              @change="handleStrategySelect"
            >
              <el-option
                v-for="item in strategyList"
                :key="item.name"
                :label="item.description"
                :value="item.name"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="初始资金">
            <el-input-number
              v-model="strategyForm.initialCash"
              :min="10000"
              :step="10000"
              :precision="0"
              class="full-width"
            />
          </el-form-item>
          
          <!-- 动态生成策略参数表单 -->
          <template v-if="selectedStrategy && selectedStrategy.params">
            <el-form-item
              v-for="(param, key) in selectedStrategy.params"
              :key="key"
              :label="param.description"
            >
              <el-input-number
                v-if="param.type === 'int'"
                v-model="strategyForm.strategyParams[key]"
                :min="1"
                :precision="0"
                class="full-width"
              />
              <el-input
                v-else-if="param.type === 'string'"
                v-model="strategyForm.strategyParams[key]"
                class="full-width"
              />
              <el-input-number
                v-else-if="param.type === 'float'"
                v-model="strategyForm.strategyParams[key]"
                :precision="2"
                class="full-width"
              />
              <el-switch
                v-else-if="param.type === 'boolean'"
                v-model="strategyForm.strategyParams[key]"
              />
            </el-form-item>
          </template>
          
          <el-form-item>
            <el-button type="primary" @click="createBacktestTask" :disabled="!canCreateBacktest">创建回测任务</el-button>
            <el-button type="success" @click="runBacktestTask" :disabled="!backtestTaskId">运行回测</el-button>
            <el-button @click="resetStrategyForm">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
    
    <!-- 回测结果展示 -->
    <div class="result-container" v-if="backtestResult">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>回测结果</span>
            <el-tag v-if="backtestStatus" :type="getStatusTagType(backtestStatus)">{{ getStatusText(backtestStatus) }}</el-tag>
          </div>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="16">
            <!-- 交易记录表格 -->
            <div class="trades-table" v-if="(backtestResult.detailed_data?.trade_records && backtestResult.detailed_data.trade_records.length > 0) || (backtestResult.trades && backtestResult.trades.length > 0)">
              <h3>交易记录</h3>
              <el-table :data="backtestResult.detailed_data?.trade_records || backtestResult.trades" stripe style="width: 100%">
                <el-table-column label="日期" width="180">
                  <template #default="scope">
                    {{ scope.row.datetime || scope.row.date }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="80">
                  <template #default="scope">
                    <el-tag :type="(scope.row.type || scope.row.action) === 'buy' ? 'danger' : 'success'">
                      {{ (scope.row.type || scope.row.action) === 'buy' ? '买入' : '卖出' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="price" label="价格" width="100" />
                <el-table-column label="数量" width="100">
                  <template #default="scope">
                    {{ Math.abs(scope.row.size || scope.row.quantity) }}
                  </template>
                </el-table-column>
                <el-table-column label="金额" width="120">
                  <template #default="scope">
                    {{ formatCurrency(scope.row.value || scope.row.amount) }}
                  </template>
                </el-table-column>
                <el-table-column label="手续费" width="100" v-if="backtestResult.detailed_data?.trade_records">
                  <template #default="scope">
                    {{ formatCurrency(scope.row.commission) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
          
          <el-col :span="8">
            <!-- 回测绩效指标 -->
            <div class="performance-metrics">
              <h3>绩效指标</h3>
              <el-descriptions :column="1" border>
                <el-descriptions-item label="总收益率">{{ formatPercent(backtestResult.performance?.total_return) }}</el-descriptions-item>
                <el-descriptions-item label="年化收益率">{{ formatPercent(backtestResult.performance?.annual_return) }}</el-descriptions-item>
                <el-descriptions-item label="最大回撤">{{ formatPercent(backtestResult.performance?.max_drawdown) }}</el-descriptions-item>
                <el-descriptions-item label="夏普比率">{{ backtestResult.performance?.sharpe_ratio?.toFixed(2) || '-' }}</el-descriptions-item>
                <el-descriptions-item label="胜率">{{ formatPercent(backtestResult.performance?.win_rate) }}</el-descriptions-item>
                <el-descriptions-item label="交易次数">{{ backtestResult.performance?.total_trades }}</el-descriptions-item>
                <el-descriptions-item label="盈利交易">{{ backtestResult.performance?.winning_trades }}</el-descriptions-item>
                <el-descriptions-item label="亏损交易">{{ backtestResult.performance?.losing_trades }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-col>
        </el-row>
        
        <!-- 回测结果图表 -->
        <div class="result-chart" v-if="(backtestResult.detailed_data?.portfolio_values && backtestResult.detailed_data.portfolio_values.length > 0) || (backtestResult.portfolio_value && backtestResult.portfolio_value.length > 0)">
          <div ref="portfolioChartRef" style="height: 300px;"></div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 量化策略回测页面
 * 功能：
 * 1. 选择股票并展示K线图
 * 2. 选择量化策略并配置参数
 * 3. 创建并执行回测任务
 * 4. 展示回测结果和买卖点
 */
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import StockKLineChart from '@/components/StockKLineChart.vue'
import { fetchStockHistoryData, fetchStockInfo, fetchStockList, formatDateToYYYYMMDD, getDaysAgo } from '@/services/stockHistoryApi'
import type { StockHistoryDataItem, StockInfoItem } from '@/services/stockHistoryApi'
import { getStrategies, createBacktestTask as createBacktestTaskApi, runBacktestTask as runBacktestTaskApi, getBacktestStatus, getBacktestResult } from '@/services/quantBacktestApi'
import type { Strategy, BacktestCreateParams, BacktestTask, BacktestResult } from '@/services/quantBacktestApi'
import { getStockList } from '@/services/individualStockApi'
import type { StockListParams, StockInfo } from '@/services/individualStockApi'
import * as echarts from 'echarts'

// 股票选择表单
const stockForm = reactive({
  stockCode: '',
  stockName: '',
  dateRangeType: 'month',
  startDate: '',
  endDate: ''
})

// 策略选择表单
const strategyForm = reactive({
  strategyName: '',
  initialCash: 100000,
  strategyParams: {} as Record<string, any>
})

// 股票数据
const stockHistoryData = ref<StockHistoryDataItem[]>([])
const selectedStockInfo = reactive({
  code: '',
  name: '',
  industry: '',
  listDate: '',
  totalMarketCap: 0,
  circulatingMarketCap: 0
})

// 股票列表数据
const stockList = ref<StockInfo[]>([])
// 股票搜索关键词
const stockSearchKeyword = ref('')
// 股票搜索加载状态
const stockSearchLoading = ref(false)

// 策略数据
const strategyList = ref<Strategy[]>([])
const selectedStrategy = ref<Strategy | null>(null)

// 回测任务数据
const backtestTaskId = ref('')
const backtestStatus = ref('')
const backtestResult = ref<BacktestResult | null>(null)

// 交易点数据（用于在K线图上标记买卖点）
const tradePoints = ref<any[]>([])

// 图表引用
const portfolioChartRef = ref<HTMLElement | null>(null)

// 加载状态
const loading = ref(false)

// 计算属性：是否可以创建回测任务
const canCreateBacktest = computed(() => {
  return !!stockForm.stockCode && !!strategyForm.strategyName && stockHistoryData.value.length > 0
})

/**
 * 搜索股票列表
 * @param keyword 搜索关键词
 */
const searchStockList = async (keyword: string = '') => {
  try {
    stockSearchLoading.value = true
    const params: StockListParams = {
      page: 1,
      page_size: 50, // 增加返回数量以提供更多选择
      keyword: keyword.trim()
    }
    
    const response = await getStockList(params)
    stockList.value = response.data
  } catch (error) {
    console.error('搜索股票列表失败:', error)
    // 搜索失败时不显示错误消息，避免干扰用户输入体验
  } finally {
    stockSearchLoading.value = false
  }
}

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param delay 延迟时间（毫秒）
 */
const debounce = (func: Function, delay: number) => {
  let timeoutId: number
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

// 创建防抖的搜索函数
const debouncedSearchStockList = debounce(searchStockList, 300)

/**
 * 处理股票选择器输入变化
 * @param value 输入值
 */
const handleStockInputChange = (value: string) => {
  stockSearchKeyword.value = value
  // 当输入长度大于等于1时触发搜索，或者输入为空时显示默认列表
  if (value.length >= 1 || value.length === 0) {
    debouncedSearchStockList(value)
  }
}

// 选择股票
const handleStockSelect = (stockCode: string) => {
  // 从已加载的股票列表中查找股票信息
  const selectedStock = stockList.value.find(item => item.code === stockCode)
  
  if (selectedStock) {
    stockForm.stockCode = selectedStock.code
    stockForm.stockName = selectedStock.name
    
    // 获取股票详细信息
    fetchStockDetailInfo(selectedStock.code)
  }
}

// 获取股票详细信息
const fetchStockDetailInfo = async (stockCode: string) => {
  try {
    const stockInfo = await fetchStockInfo(stockCode)
    
    selectedStockInfo.code = stockInfo.code
    selectedStockInfo.name = stockInfo.name
    selectedStockInfo.industry = stockInfo.industry
    selectedStockInfo.listDate = stockInfo.list_date
    selectedStockInfo.totalMarketCap = stockInfo.total_market_cap
    selectedStockInfo.circulatingMarketCap = stockInfo.circulating_market_cap
  } catch (error) {
    console.error('获取股票详细信息失败:', error)
    ElMessage.error('获取股票详细信息失败')
  }
}

// 处理日期范围变化
const handleDateRangeChange = () => {
  const today = new Date()
  const endDateStr = formatDateToYYYYMMDD(today)
  
  // 设置结束日期为今天
  stockForm.endDate = endDateStr
  
  // 根据选择的时间范围设置开始日期
  switch (stockForm.dateRangeType) {
    case 'week':
      // 最近一周
      stockForm.startDate = formatDateToYYYYMMDD(getDaysAgo(7))
      break
    case 'month':
      // 最近一月
      stockForm.startDate = formatDateToYYYYMMDD(getDaysAgo(30))
      break
    case 'threeMonths':
      // 最近三月
      stockForm.startDate = formatDateToYYYYMMDD(getDaysAgo(90))
      break
    case 'sixMonths':
      // 最近六月
      stockForm.startDate = formatDateToYYYYMMDD(getDaysAgo(180))
      break
    case 'year':
      // 最近一年
      stockForm.startDate = formatDateToYYYYMMDD(getDaysAgo(365))
      break
    case 'threeYears':
      // 最近三年
      stockForm.startDate = formatDateToYYYYMMDD(getDaysAgo(365 * 3))
      break
    case 'all':
      // 全部，不设置开始日期
      stockForm.startDate = ''
      break
    case 'custom':
      // 自定义，不自动设置日期
      break
  }
}

// 获取股票数据
const fetchStockData = async () => {
  if (!stockForm.stockCode) {
    ElMessage.warning('请先选择股票')
    return
  }
  
  // 确保日期范围有效
  if (stockForm.dateRangeType === 'custom' && (!stockForm.startDate || !stockForm.endDate)) {
    ElMessage.warning('请选择完整的日期范围')
    return
  }
  
  loading.value = true
  
  try {
    // 转换日期格式
    let startDate = stockForm.startDate
    let endDate = stockForm.endDate
    
    if (startDate) {
      startDate = startDate.replace(/-/g, '')
    }
    
    if (endDate) {
      endDate = endDate.replace(/-/g, '')
    }
    
    // 获取股票历史数据
    const historyData = await fetchStockHistoryData(
      stockForm.stockCode,
      startDate,
      endDate
    )
    
    stockHistoryData.value = historyData
    
    if (historyData.length > 0) {
      ElMessage.success('股票数据获取成功')
    } else {
      ElMessage.warning('未查询到股票历史数据')
    }
    
    // 重置回测相关数据
    resetBacktestData()
  } catch (error) {
    console.error('获取股票数据失败:', error)
    ElMessage.error('获取股票数据失败')
    stockHistoryData.value = []
  } finally {
    loading.value = false
  }
}

// 重置股票表单
const resetStockForm = () => {
  stockForm.stockCode = ''
  stockForm.stockName = ''
  stockForm.dateRangeType = 'month'
  stockForm.startDate = ''
  stockForm.endDate = ''
  
  stockHistoryData.value = []
  
  // 重置选中的股票信息
  selectedStockInfo.code = ''
  selectedStockInfo.name = ''
  selectedStockInfo.industry = ''
  selectedStockInfo.listDate = ''
  selectedStockInfo.totalMarketCap = 0
  selectedStockInfo.circulatingMarketCap = 0
  
  // 重置回测相关数据
  resetBacktestData()
}

// 重置回测相关数据
const resetBacktestData = () => {
  strategyForm.strategyName = ''
  strategyForm.strategyParams = {}
  selectedStrategy.value = null
  backtestTaskId.value = ''
  backtestStatus.value = ''
  backtestResult.value = null
  tradePoints.value = []
}

// 重置策略表单
const resetStrategyForm = () => {
  strategyForm.strategyName = ''
  strategyForm.initialCash = 1000000
  strategyForm.strategyParams = {}
  selectedStrategy.value = null
  backtestTaskId.value = ''
  backtestStatus.value = ''
  backtestResult.value = null
  tradePoints.value = []
}

// 格式化市值
const formatMarketCap = (value: number): string => {
  if (!value) return '未知'
  
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(2)}亿`
  } else if (value >= 10000) {
    return `${(value / 10000).toFixed(2)}万`
  } else {
    return value.toString()
  }
}

// 格式化百分比
const formatPercent = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '-'
  return `${value.toFixed(2)}%`
}

// 格式化货币
const formatCurrency = (value: number): string => {
  if (!value) return '0.00'
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 获取状态标签类型
const getStatusTagType = (status: string): string => {
  switch (status) {
    case 'created':
      return 'info'
    case 'running':
      return 'warning'
    case 'completed':
      return 'success'
    case 'failed':
      return 'danger'
    default:
      return 'info'
  }
}

// 获取状态文本
const getStatusText = (status: string): string => {
  switch (status) {
    case 'created':
      return '已创建'
    case 'running':
      return '运行中'
    case 'completed':
      return '已完成'
    case 'failed':
      return '执行失败'
    default:
      return '未知状态'
  }
}

// 加载股票列表数据
const loadStockList = async () => {
  try {
    loading.value = true
    const response = await getStockList({ page: 1, page_size: 100 }) // 加载更多股票以供选择
    stockList.value = response.data
  } catch (error) {
    console.error('加载股票列表失败:', error)
    ElMessage.error('加载股票列表失败')
  } finally {
    loading.value = false
  }
}

// 加载策略列表
const loadStrategyList = async () => {
  try {
    loading.value = true
    const strategies = await getStrategies()
    strategyList.value = strategies
  } catch (error) {
    console.error('加载策略列表失败:', error)
    ElMessage.error('加载策略列表失败')
  } finally {
    loading.value = false
  }
}

// 选择策略
const handleStrategySelect = (strategyName: string) => {
  // 从已加载的策略列表中查找策略信息
  const strategy = strategyList.value.find(item => item.name === strategyName)
  
  if (strategy) {
    selectedStrategy.value = strategy
    console.log('选择策略:', strategy)
    // 初始化策略参数
    strategyForm.strategyParams = {}
    if (strategy.params) {
      Object.keys(strategy.params).forEach(key => {
        strategyForm.strategyParams[key] = strategy.params![key].default
      })
    }
  }
}

// 创建回测任务
const createBacktestTask = async () => {
  if (!stockForm.stockCode || !strategyForm.strategyName) {
    ElMessage.warning('请选择股票和策略')
    return
  }
  
  loading.value = true
  
  try {
    // 确保日期格式为 YYYY-MM-DD
    const formatDateForAPI = (dateStr: string): string => {
      if (!dateStr) return ''
      // 如果已经是 YYYY-MM-DD 格式，直接返回
      if (dateStr.includes('-')) return dateStr
      // 如果是 YYYYMMDD 格式，转换为 YYYY-MM-DD
      if (dateStr.length === 8) {
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
      }
      return dateStr
    }
    
    const requestData: BacktestCreateParams = {
      strategy_name: strategyForm.strategyName,
      stock_code: stockForm.stockCode,
      start_date: formatDateForAPI(stockForm.startDate),
      end_date: formatDateForAPI(stockForm.endDate),
      initial_cash: strategyForm.initialCash,
      strategy_params: strategyForm.strategyParams
    }
    
    const result = await createBacktestTaskApi(requestData)
    backtestTaskId.value = result.task_id
    backtestStatus.value = result.status
    ElMessage.success('回测任务创建成功')
  } catch (error) {
    console.error('创建回测任务失败:', error)
    ElMessage.error('创建回测任务失败')
  } finally {
    loading.value = false
  }
}

// 运行回测任务
const runBacktestTask = async () => {
  if (!backtestTaskId.value) {
    ElMessage.warning('请先创建回测任务')
    return
  }
  
  loading.value = true
  
  try {
    const result = await runBacktestTaskApi(backtestTaskId.value)
    backtestStatus.value = result.status
    ElMessage.success('回测任务已启动')
    
    // 开始轮询任务状态
    pollBacktestStatus()
  } catch (error) {
    console.error('启动回测任务失败:', error)
    ElMessage.error('启动回测任务失败')
  } finally {
    loading.value = false
  }
}

// 轮询回测任务状态
const pollBacktestStatus = async () => {
  if (!backtestTaskId.value) return
  
  try {
    const result = await getBacktestStatus(backtestTaskId.value)
    backtestStatus.value = result.status
    
    if (result.status === 'completed') {
      // 任务完成，获取回测结果
      fetchBacktestResult()
    } else if (result.status === 'failed') {
      ElMessage.error('回测任务执行失败')
    } else if (result.status === 'running') {
      // 继续轮询
      setTimeout(pollBacktestStatus, 2000)
    }
  } catch (error) {
    console.error('获取任务状态失败:', error)
    ElMessage.error('获取任务状态失败')
  }
}

// 获取回测结果
const fetchBacktestResult = async () => {
  if (!backtestTaskId.value) return
  
  try {
    const result = await getBacktestResult(backtestTaskId.value)
    backtestResult.value = result
    
    // 处理交易点数据，用于在K线图上标记
    processTradePoints()
    
    // 渲染回测结果图表
    renderPortfolioChart()
  } catch (error) {
    console.error('获取回测结果失败:', error)
    ElMessage.error('获取回测结果失败')
  }
}

// 处理交易点数据
const processTradePoints = () => {
  if (!backtestResult.value) return
  
  const points = []
  
  // 处理新数据格式 (detailed_data.trade_records)
  if (backtestResult.value.detailed_data?.trade_records) {
    const trades = backtestResult.value.detailed_data.trade_records
    for (const trade of trades) {
      points.push({
         date: trade.datetime.split('T')[0], // 转换日期格式：2025-09-10T00:00:00 -> 2025-09-10
         price: trade.price,
         type: trade.type,
         description: `${trade.type === 'buy' ? '买入' : '卖出'} ${Math.abs(trade.size)}股`
       })
    }
  }
  // 处理旧数据格式 (trades)
  else if (backtestResult.value.trades) {
    const trades = backtestResult.value.trades
    for (const trade of trades) {
      points.push({
        date: (trade as any).date,
        price: trade.price,
        type: (trade as any).action,
        description: `${(trade as any).action === 'buy' ? '买入' : '卖出'} ${Math.abs((trade as any).quantity)}股`
      })
    }
  }
  
  tradePoints.value = points
  console.log('交易点数据已更新:', tradePoints.value.length, '个交易点')
}

// 渲染回测结果图表
const renderPortfolioChart = () => {
  if (!portfolioChartRef.value || !backtestResult.value) return
  
  // 优先使用新的数据结构，如果不存在则使用旧的数据结构
  const portfolioData = backtestResult.value.detailed_data?.portfolio_values || backtestResult.value.portfolio_value
  if (!portfolioData || portfolioData.length === 0) return
  
  const chartInstance = echarts.init(portfolioChartRef.value)
  
  const dates = portfolioData.map((item: any) => item.date)
  const values = portfolioData.map((item: any) => item.value)
  
  const option = {
    title: {
      text: '投资组合价值变化',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const date = params[0].axisValue
        const value = params[0].data
        return `${date}<br/>组合价值: ${formatCurrency(value)}`
      }
    },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: {
      type: 'value',
      name: '组合价值',
      axisLabel: {
        formatter: (value: number) => formatCurrency(value)
      }
    },
    series: [
      {
        name: '组合价值',
        type: 'line',
        data: values,
        smooth: true,
        lineStyle: {
          width: 2,
          color: '#5470c6'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(84, 112, 198, 0.5)'
            },
            {
              offset: 1,
              color: 'rgba(84, 112, 198, 0.1)'
            }
          ])
        }
      }
    ]
  }
  
  chartInstance.setOption(option)
  
  // 监听窗口大小变化，调整图表大小
  window.addEventListener('resize', () => {
    chartInstance.resize()
  })
}

// 监听回测结果变化，更新图表
watch(() => backtestResult.value, () => {
  setTimeout(() => {
    renderPortfolioChart()
  }, 0)
})

// 组件挂载时初始化日期范围和加载股票列表
onMounted(() => {
  handleDateRangeChange()
  loadStockList() // 加载股票列表
  loadStrategyList() // 加载策略列表
})
</script>

<style scoped>
.quantitative-backtest-view {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 24px;
  margin: 0 0 10px 0;
}

.page-header p {
  color: #606266;
  margin: 0;
}

.control-panel {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stock-info {
  display: flex;
  gap: 15px;
  font-size: 14px;
  color: #606266;
}

.query-form,
.strategy-form {
  margin-top: 10px;
}

.full-width {
  width: 100%;
}

.chart-container {
  margin-bottom: 20px;
}

.strategy-panel {
  margin-bottom: 20px;
}

.result-container {
  margin-top: 20px;
}

.empty-state {
  margin: 50px 0;
  display: flex;
  justify-content: center;
}

.performance-metrics {
  padding: 10px;
}

.performance-metrics h3,
.trades-table h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: 600;
}

.trades-table {
  margin-top: 20px;
}
</style>

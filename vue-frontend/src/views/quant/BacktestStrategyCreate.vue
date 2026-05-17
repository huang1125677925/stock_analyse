<template>
  <div class="backtest-strategy-view">
    <!-- 策略选择和配置 -->
    <div class="strategy-config-panel">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>策略配置</span>
          </div>
        </template>
        
        <el-form :model="strategyForm" label-width="120px" class="strategy-form">
          <el-row :gutter="20">
            <!-- 新增：数据源选择（股票/ETF），默认股票 -->
            <el-col :span="8">
              <el-form-item label="数据源" required>
                <el-select
                  v-model="strategyForm.dataSource"
                  placeholder="请选择数据源"
                  class="full-width"
                  @change="handleDataSourceChange"
                >
                  <el-option label="股票" value="stock" />
                  <el-option label="ETF" value="etf" />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="8">
              <el-form-item label="选择策略" required>
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
            </el-col>
            
            <el-col :span="8">
              <el-form-item :label="symbolLabel" required>
                <el-select
                  v-model="strategyForm.symbol"
                  :placeholder="symbolPlaceholder"
                  filterable
                  remote
                  :remote-method="handleSymbolInputChange"
                  :loading="stockSearchLoading"
                  clearable
                  style="width: 100%"
                  @change="handleSymbolSelect"
                >
                  <el-option
                    v-for="stock in stockList"
                    :key="stock.code"
                    :label="`${stock.code} - ${stock.name}`"
                    :value="stock.code"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="回测区间" required>
                <el-radio-group v-model="dateRangeShortcut" class="date-range-shortcuts" @change="handleDateRangeShortcutChange">
                  <el-radio-button label="1y">最近1年</el-radio-button>
                  <el-radio-button label="3y">最近3年</el-radio-button>
                  <el-radio-button label="5y">最近5年</el-radio-button>
                </el-radio-group>
                <span class="date-range-display">{{ strategyForm.startDate }} 至 {{ strategyForm.endDate }}</span>
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="数据频率">
                <el-tag type="info" size="large" class="frequency-tag">日频</el-tag>
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="初始资金">
                <el-input-number
                  v-model="strategyForm.initialCash"
                  :min="10000"
                  :step="10000"
                  :precision="0"
                  class="full-width"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <!-- 策略参数配置 -->
          <div v-if="selectedStrategy && selectedStrategy.params" class="strategy-params">
            <h3>策略参数</h3>
            <el-row :gutter="20">
              <el-col :span="8" v-for="(param, key) in selectedStrategy.params" :key="key">
                <el-form-item :label="param.description">
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
              </el-col>
            </el-row>
          </div>
          
          <el-form-item>
            <el-button type="primary" @click="createBacktest" :loading="loading" :disabled="!canCreateBacktest">
              创建回测任务
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <div class="kline-preview-panel" v-if="strategyForm.symbol">
      <el-card v-loading="klinePreviewLoading">
        <template #header>
          <div class="card-header">
            <span>{{ klinePreviewTitle }}</span>
            <span class="preview-range">{{ strategyForm.startDate }} 至 {{ strategyForm.endDate }}</span>
          </div>
        </template>

        <StockKLineChart
          v-if="klinePreviewData.length"
          :stock-code="strategyForm.symbol"
          :stock-name="strategyForm.stockName"
          :kline-data="klinePreviewData"
          height="420px"
        />
        <el-empty
          v-else-if="!klinePreviewLoading"
          :description="klinePreviewEmptyText"
          :image-size="80"
        />
      </el-card>
    </div>
    
    <!-- 策略说明 -->
    <div class="strategy-description" v-if="selectedStrategy">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>策略说明</span>
          </div>
        </template>
        
        <div class="description-content">
          <h3>{{ selectedStrategy.description }}</h3>
          <div v-if="selectedStrategy.params" class="params-info">
            <h4>参数说明：</h4>
            <ul>
              <li v-for="(param, key) in selectedStrategy.params" :key="key">
                <strong>{{ param.description }}</strong>: {{ param.type }}类型，默认值: {{ param.default }}
              </li>
            </ul>
          </div>
        </div>
      </el-card>
    </div>
    

  </div>
</template>

<script setup lang="ts">
/**
 * 回测策略页面
 * 功能：
 * 1. 策略选择和参数配置
 * 2. 创建回测任务
 * 3. 显示最近创建的任务
 * 4. 使用固定日频数据创建回测任务
 * 
 * 参数：无
 * 返回值：无
 * 事件：无
 */
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import StockKLineChart from '@/components/StockKLineChart.vue'
import { 
  getStrategies, 
  createBacktestTask as createBacktestTaskApi, 
  runBacktestTask as runBacktestTaskApi,
  type Strategy
} from '@/services/quantBacktestApi'
import { fetchStockHistoryData } from '@/services/stockHistoryApi'
import type { StockHistoryDataItem } from '@/services/stockHistoryApi'
import { getStockList } from '@/services/individualStockApi'
import type { StockListParams, StockInfo } from '@/services/individualStockApi'
import { getEtfBasic, getEtfDaily, type EtfBasicItem, type EtfDailyItem } from '@/services/etfApi'

const router = useRouter()
const route = useRoute()

// 表单数据类型定义，当前创建任务固定使用日频
type BacktestFrequency = 'daily'
type DataSourceType = 'stock' | 'etf'
interface StrategyForm {
  strategyName: string
  symbol: string
  stockName?: string
  startDate: string
  endDate: string
  frequency: BacktestFrequency
  initialCash: number
  strategyParams: Record<string, any>
  dataSource: DataSourceType
}

// 表单数据
const strategyForm = reactive<StrategyForm>({
  strategyName: '',
  symbol: '',
  stockName: '',
  startDate: '',
  endDate: '',
  // 新增：回测数据频率，默认日频
  frequency: 'daily',
  initialCash: 100000,
  strategyParams: {} as Record<string, any>,
  // 新增：数据源（stock/etf），默认股票
  dataSource: 'stock'
})

// 数据状态
const strategyList = ref<Strategy[]>([])
const stockList = ref<StockInfo[]>([])
const selectedStrategy = ref<Strategy | null>(null)
const loading = ref(false)
const dateRangeShortcut = ref<'1y' | '3y' | '5y'>('1y')

// 股票搜索相关状态
const stockSearchKeyword = ref('')
const stockSearchLoading = ref(false)
// 输入最小长度：只有当输入长度达到该值时才触发远程搜索
const MIN_SEARCH_LENGTH = 2

const klinePreviewData = ref<StockHistoryDataItem[]>([])
const klinePreviewLoading = ref(false)
const klinePreviewError = ref('')
let klinePreviewRequestId = 0

// 计算属性：是否可以创建回测任务
const canCreateBacktest = computed(() => {
  return !!strategyForm.strategyName && 
         !!strategyForm.symbol && 
         !!strategyForm.startDate && 
         !!strategyForm.endDate
})

// 计算属性：根据数据源动态展示代码字段标签与占位
const symbolLabel = computed(() => strategyForm.dataSource === 'etf' ? 'ETF代码' : '股票代码')
const symbolPlaceholder = computed(() => strategyForm.dataSource === 'etf' ? '请选择ETF代码' : '请选择股票代码')
const klinePreviewTitle = computed(() => {
  const sourceName = strategyForm.dataSource === 'etf' ? 'ETF' : '股票'
  const symbolName = strategyForm.stockName ? `${strategyForm.stockName}(${strategyForm.symbol})` : strategyForm.symbol
  return `${sourceName}走势预览 - ${symbolName}`
})
const klinePreviewEmptyText = computed(() => klinePreviewError.value || '当前时间范围内暂无K线数据')

const formatDateToYYYYMMDDWithDash = (date: Date): string => date.toISOString().split('T')[0]

const applyDateRangeShortcut = (range: '1y' | '3y' | '5y') => {
  const yearMap = {
    '1y': 1,
    '3y': 3,
    '5y': 5
  }
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - yearMap[range])

  strategyForm.endDate = formatDateToYYYYMMDDWithDash(endDate)
  strategyForm.startDate = formatDateToYYYYMMDDWithDash(startDate)
  strategyForm.frequency = 'daily'
}

const handleDateRangeShortcutChange = (range: '1y' | '3y' | '5y') => {
  applyDateRangeShortcut(range)
}

/**
 * 搜索股票列表
 * 功能：根据关键词调用后端接口进行模糊搜索，并将结果写入 stockList 以供下拉展示
 * 参数：
 *  - keyword: string 搜索关键词
 * 返回值：Promise<void>（无显式返回值，异步更新 stockList）
 * 事件/副作用：
 *  - 更新 stockSearchLoading 的状态以驱动下拉框的 loading 效果
 *  - 更新 stockList（影响下拉选项展示）
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
 * 功能：延迟执行高频调用的函数，降低接口压力
 * 参数：
 *  - func: Function 需要防抖的函数
 *  - delay: number 延迟毫秒数
 * 返回值：(...args) => void 防抖后的函数
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
 * 搜索ETF列表
 * 功能：根据关键词调用 ETF 基本信息分页接口进行筛选，转换为通用下拉选项结构
 * 参数：
 *  - keyword: string 搜索关键词（用于 name 过滤）
 * 返回值：Promise<void>
 * 事件/副作用：更新 stockList（通用选项列表）与加载状态
 */
const searchEtfList = async (keyword: string = '') => {
  try {
    stockSearchLoading.value = true
    const params = {
      page: 1,
      page_size: 50,
      name: keyword.trim() || undefined
    }
    const resp = await getEtfBasic(params)
    const items = resp.data || []
    // 转换为通用结构 { code, name }
    stockList.value = items.map((item: EtfBasicItem) => ({
      code: item.ts_code,
      name: item.extname || item.csname || item.cname || ''
    })) as StockInfo[]
  } catch (error) {
    console.error('搜索ETF列表失败:', error)
  } finally {
    stockSearchLoading.value = false
  }
}

// 创建防抖的 ETF 搜索函数
const debouncedSearchEtfList = debounce(searchEtfList, 300)

/**
 * 处理股票选择器输入变化（el-select remote-method）
 * 功能：根据用户输入触发搜索逻辑；无输入时展示默认列表且不显示 loading
 * 参数：
 *  - value: string 输入值
 * 返回值：void
 * 事件/副作用：
 *  - 更新 stockSearchKeyword
 *  - 条件触发 debouncedSearchStockList 进行远程搜索
 *  - 当输入为空或长度不足时，确保不显示 loading，并保留默认列表
 */
const handleSymbolInputChange = (value: string) => {
  const keyword = (value ?? '').trim()
  stockSearchKeyword.value = keyword

  // 无输入：不触发搜索、不显示 loading，直接展示默认列表
  if (keyword.length === 0) {
    stockSearchLoading.value = false
    // 若默认列表尚未加载（极端情况下），补充加载一次
    if (stockList.value.length === 0) {
      // 非防抖，快速填充默认列表（根据数据源）
      if (strategyForm.dataSource === 'etf') {
        loadEtfList()
      } else {
        loadStockList()
      }
    }
    return
  }

  // 只有当输入长度达到 MIN_SEARCH_LENGTH 时才进行模糊搜索
  if (keyword.length >= MIN_SEARCH_LENGTH) {
    if (strategyForm.dataSource === 'etf') {
      debouncedSearchEtfList(keyword)
    } else {
      debouncedSearchStockList(keyword)
    }
  } else {
    // 输入长度不足：不搜索且不显示 loading
    stockSearchLoading.value = false
  }
}

/**
 * 处理代码选择事件
 * 功能：用户在下拉框选择代码后，自动为表单填充对应的名称
 * 参数：
 *  - code: string 选中的代码（股票或ETF）
 * 返回值：void
 * 事件/副作用：更新 strategyForm.stockName（用于任务创建时传递名称）
 */
const handleSymbolSelect = (code: string) => {
  const item = stockList.value.find(s => s.code === code)
  strategyForm.stockName = item ? (item.name || '') : ''
}

const formatDateForStockApi = (date: string): string => date.replace(/-/g, '')

const normalizeEtfDailyToKLine = (items: EtfDailyItem[]): StockHistoryDataItem[] => {
  return items.map(item => ({
    stock_code: item.ts_code,
    stock_name: item.csname || strategyForm.stockName || item.ts_code,
    date: item.trade_date,
    open_price: item.open,
    close_price: item.close,
    high_price: item.high,
    low_price: item.low,
    change_percent: item.pct_chg ?? 0,
    change_amount: item.change ?? 0,
    volume: item.vol,
    amount: item.amount,
    amplitude: 0,
    turnover_rate: 0,
    created_at: item.created_at
  }))
}

const loadKlinePreview = async () => {
  const requestId = ++klinePreviewRequestId
  klinePreviewError.value = ''

  if (!strategyForm.symbol || !strategyForm.startDate || !strategyForm.endDate) {
    klinePreviewData.value = []
    return
  }

  klinePreviewLoading.value = true
  try {
    const data = strategyForm.dataSource === 'etf'
      ? normalizeEtfDailyToKLine(await getEtfDaily({
          ts_code: strategyForm.symbol,
          start_date: strategyForm.startDate,
          end_date: strategyForm.endDate
        }))
      : await fetchStockHistoryData(
          strategyForm.symbol,
          formatDateForStockApi(strategyForm.startDate),
          formatDateForStockApi(strategyForm.endDate),
          'qfq'
        )

    if (requestId !== klinePreviewRequestId) return
    klinePreviewData.value = [...data].sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    if (requestId !== klinePreviewRequestId) return
    console.error('加载K线预览失败:', error)
    klinePreviewData.value = []
    klinePreviewError.value = 'K线数据加载失败'
  } finally {
    if (requestId === klinePreviewRequestId) {
      klinePreviewLoading.value = false
    }
  }
}

const debouncedLoadKlinePreview = debounce(loadKlinePreview, 300)

/**
 * 加载ETF默认列表
 * 功能：加载第一页 ETF 基本信息并转换为通用选项结构
 * 参数：无
 * 返回值：Promise<void>
 * 事件/副作用：更新 stockList
 */
const loadEtfList = async () => {
  try {
    const resp = await getEtfBasic({ page: 1, page_size: 100 })
    const items = resp.data || []
    stockList.value = items.map((item: EtfBasicItem) => ({
      code: item.ts_code,
      name: item.extname || item.csname || item.cname || ''
    })) as StockInfo[]
  } catch (error) {
    console.error('加载ETF列表失败:', error)
    ElMessage.error('加载ETF列表失败')
  }
}

/**
 * 切换数据源处理
 * 功能：切换数据源后重置代码选择并加载相应默认列表
 * 参数：val: DataSourceType
 * 返回值：void
 * 事件/副作用：清空 symbol，刷新 stockList
 */
const handleDataSourceChange = (val: DataSourceType) => {
  strategyForm.symbol = ''
  stockList.value = []
  klinePreviewData.value = []
  klinePreviewError.value = ''
  if (val === 'etf') {
    loadEtfList()
  } else {
    loadStockList()
  }
}

// 选择策略
const handleStrategySelect = (strategyName: string) => {
  const strategy = strategyList.value.find((item: Strategy) => item.name === strategyName)
  
  if (strategy) {
    selectedStrategy.value = strategy
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
const createBacktest = async () => {
  if (!canCreateBacktest.value) {
    ElMessage.warning('请填写完整的回测配置')
    return
  }
  
  loading.value = true
  
  try {
    const params = {
      strategy_name: strategyForm.strategyName,
      stock_code: strategyForm.symbol,
      stock_name: strategyForm.stockName,
      start_date: strategyForm.startDate,
      end_date: strategyForm.endDate,
      // 创建回测任务固定使用日频数据
      frequency: strategyForm.frequency,
      initial_cash: strategyForm.initialCash,
      strategy_params: strategyForm.strategyParams,
      // 新增：数据源（stock 或 etf）
      data_source: strategyForm.dataSource
    }
    
    const task = await createBacktestTaskApi(params)
    
    ElMessage.success('回测任务创建成功')
    

    
    // 询问是否立即运行
    ElMessageBox.confirm('回测任务已创建，是否立即运行？', '提示', {
      confirmButtonText: '立即运行',
      cancelButtonText: '稍后运行',
      type: 'info'
    }).then(async () => {
      await runTask(task.task_id)
      // 运行成功后跳转到回测历史页面，便于用户查看任务状态
      router.push('/backtest-history')
    }).catch(() => {
      // 用户选择稍后运行
    })
    
  } catch (error) {
    console.error('创建回测任务失败:', error)
    ElMessage.error('创建回测任务失败')
  } finally {
    loading.value = false
  }
}

// 运行任务
const runTask = async (taskId: string) => {
  try {
    await runBacktestTaskApi(taskId)
    ElMessage.success('回测任务已启动')
    
  } catch (error) {
    console.error('运行回测任务失败:', error)
    ElMessage.error('运行回测任务失败')
  }
}

// 查看结果
const viewResult = (taskId: string) => {
  router.push(`/quant/backtest-result/${taskId}`)
}

// 重置表单
const resetForm = () => {
  strategyForm.strategyName = ''
  strategyForm.symbol = ''
  strategyForm.stockName = ''
  dateRangeShortcut.value = '1y'
  applyDateRangeShortcut('1y')
  strategyForm.frequency = 'daily'
  strategyForm.initialCash = 1000000
  strategyForm.strategyParams = {}
  selectedStrategy.value = null
}

// 加载策略列表
const loadStrategyList = async () => {
  try {
    const strategies = await getStrategies()
    strategyList.value = strategies
  } catch (error) {
    console.error('加载策略列表失败:', error)
    ElMessage.error('加载策略列表失败')
  }
}

// 加载股票列表
const loadStockList = async () => {
  try {
    const params: StockListParams = {
      page: 1,
      page_size: 100
    }
    const response = await getStockList(params)
    stockList.value = response.data
  } catch (error) {
    console.error('加载股票列表失败:', error)
    ElMessage.error('加载股票列表失败')
  }
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

// 格式化日期时间
const formatDateTime = (dateTime: string): string => {
  return new Date(dateTime).toLocaleString('zh-CN')
}

// 页面初始化
onMounted(async () => {
  await Promise.all([
    loadStrategyList(),
    loadStockList()
  ])
  
  applyDateRangeShortcut('1y')
  
  // 检查URL参数中是否有预选策略
  const strategyParam = route.query.strategy as string
  if (strategyParam) {
    strategyForm.strategyName = strategyParam
    handleStrategySelect(strategyParam)
  }

  /**
   * 从路由查询参数预填表单
   * 功能：解析路由 query，支持预填策略、代码、日期、资金、频率以及策略参数。
   * 参数：无（使用 route.query）
   * 返回值：void
   * 事件/副作用：更新 strategyForm 字段；可能触发数据源加载逻辑（后续可扩展）。
   */
  const applyPrefillFromQuery = () => {
    const q = route.query as Record<string, any>
    // 解析数据源并根据数据源加载对应的默认列表
    if (q.data_source) {
      const ds = String(q.data_source)
      if (ds === 'stock' || ds === 'etf') {
        strategyForm.dataSource = ds as DataSourceType
      }
    }
    if (q.symbol) {
      strategyForm.symbol = String(q.symbol)
    }
    if (q.stock_name) {
      strategyForm.stockName = String(q.stock_name)
    }
    if (q.start_date) {
      strategyForm.startDate = String(q.start_date)
    }
    if (q.end_date) {
      strategyForm.endDate = String(q.end_date)
    }
    if (q.initial_cash !== undefined) {
      const cashNum = Number(q.initial_cash)
      if (!Number.isNaN(cashNum) && cashNum > 0) {
        strategyForm.initialCash = Math.round(cashNum)
      }
    }
    strategyForm.frequency = 'daily'
    if (q.strategy_params) {
      try {
        const decoded = decodeURIComponent(String(q.strategy_params))
        const parsed = JSON.parse(decoded)
        if (parsed && typeof parsed === 'object') {
          strategyForm.strategyParams = parsed
        }
      } catch (e) {
        console.error('解析策略参数失败:', e)
      }
    }
    // 根据数据源刷新默认列表（若为 ETF 则覆盖股票列表）
    if (strategyForm.dataSource === 'etf') {
      // 加载ETF默认列表以便下拉选择
      loadEtfList()
    }
  }

  applyPrefillFromQuery()
})

watch(
  () => [strategyForm.dataSource, strategyForm.symbol, strategyForm.startDate, strategyForm.endDate],
  () => {
    debouncedLoadKlinePreview()
  }
)
</script>

<style scoped>
.backtest-strategy-view {
  padding: 20px;
}

.strategy-config-panel {
  margin-bottom: 20px;
}

.kline-preview-panel {
  margin-bottom: 20px;
}

.preview-range {
  color: #909399;
  font-size: 13px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.strategy-form .full-width {
  width: 100%;
}

.date-range-shortcuts {
  margin-right: 12px;
}

.date-range-display {
  color: #606266;
  font-size: 13px;
}

.frequency-tag {
  min-width: 64px;
  justify-content: center;
}

.strategy-params {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.strategy-params h3 {
  margin: 0 0 16px 0;
  color: #303133;
}

.strategy-description {
  margin-bottom: 20px;
}

.description-content h3 {
  margin: 0 0 16px 0;
  color: #303133;
}

.description-content h4 {
  margin: 16px 0 8px 0;
  color: #606266;
}

.params-info ul {
  margin: 0;
  padding-left: 20px;
}

.params-info li {
  margin: 8px 0;
  line-height: 1.6;
}

.recent-tasks {
  margin-bottom: 20px;
}
</style>

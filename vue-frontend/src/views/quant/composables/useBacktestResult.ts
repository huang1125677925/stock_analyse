import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getBacktestResult,
  getStrategies,
  type BacktestResult as ApiBacktestResult,
  type Strategy
} from '@/services/quantBacktestApi'

export interface TradeRecord {
  pnl?: number
  size: number
  type: string
  price: number
  value: number
  pnl_pct?: number
  pnlcomm?: number
  datetime: string
  commission: number
  trade_closed: boolean
}

interface DetailedData {
  daily_returns: unknown[]
  portfolio_values: Array<{ date: string; value: number }>
  trade_records: TradeRecord[]
}

export interface BacktestResultViewData {
  task_id: string
  strategy_name: string
  symbol: string
  period: {
    start_date: string
    end_date: string
  }
  detailed_data: DetailedData
  performance: {
    initial_value: number
    final_value: number
    total_return: number
    annual_return: number
    sharpe_ratio: number
    max_drawdown: number
    volatility: number
    total_trades: number
    winning_trades: number
    losing_trades: number
    win_rate: number
  }
  portfolio_value: Array<{
    date: string
    value: number
  }>
  trades: TradeRecord[]
}

export interface Timereturn {
  return: number
  datetime: string
  portfolio_value: number
  cumulative_return: number
}

export interface ObserverData {
  task_info: ApiBacktestResult['task_info']
  observer_data: {
    broker: Array<{
      datetime: string
      cash: number
      value: number
    }>
    trades: Array<{
      ref: number
      size: number
      price: number
      value: number
      commission: number
      pnl: number
      pnlcomm: number
    }>
    buysell: Array<{
      datetime: string
      size: number
      price: number
      value: number
      commission: number
    }>
    timereturn: Timereturn[]
    drawdown: Array<{
      datetime: string
      len: number
      drawdown: number
      maxdrawdown: number
    }>
    benchmark: unknown[]
  }
}

export interface RawIndicatorData {
  task_info: ApiBacktestResult['task_info']
  raw_data: {
    datetime: string[]
    open: number[]
    high: number[]
    low: number[]
    close: number[]
    volume: number[]
  }
  indicator_data: Record<string, number[]>
}

const toViewData = (result: ApiBacktestResult): BacktestResultViewData => {
  return {
    task_id: result.task_info.task_id,
    strategy_name: result.task_info.strategy_name,
    symbol: result.task_info.stock_code,
    period: {
      start_date: result.task_info.start_date,
      end_date: result.task_info.end_date
    },
    detailed_data: {
      daily_returns: result.detailed_data?.daily_returns ?? [],
      portfolio_values: result.detailed_data?.portfolio_values ?? [],
      trade_records: (result.detailed_data?.trade_records ?? []) as TradeRecord[]
    },
    performance: {
      total_return: result.performance.total_return,
      annual_return: result.performance.annual_return,
      max_drawdown: result.performance.max_drawdown,
      sharpe_ratio: result.performance.sharpe_ratio ?? 0,
      win_rate: result.performance.win_rate ?? 0,
      total_trades: result.performance.total_trades,
      winning_trades: result.performance.winning_trades,
      losing_trades: result.performance.losing_trades,
      initial_value: result.performance.initial_value,
      final_value: result.performance.final_value,
      volatility: result.performance.volatility ?? 0
    },
    portfolio_value: result.detailed_data?.portfolio_values ?? result.portfolio_value ?? [],
    trades: (result.detailed_data?.trade_records ?? result.trades ?? []) as TradeRecord[]
  }
}

export const useBacktestResult = () => {
  const route = useRoute()
  const router = useRouter()
  const loading = ref(false)
  const taskId = ref('')
  const backtestResult = ref<BacktestResultViewData | null>(null)
  const observerData = ref<ObserverData | null>(null)
  const rawIndicatorData = ref<RawIndicatorData | null>(null)
  const taskInfo = ref<ApiBacktestResult['task_info'] | null>(null)
  const strategyDefinition = ref<Strategy | null>(null)

  const filteredTrades = computed(() => backtestResult.value?.trades ?? [])
  const filteredTradesTotal = computed(() => filteredTrades.value.length)
  const buyTradesCount = computed(() => filteredTrades.value.filter((trade) => trade.type === 'buy').length)
  const sellTradesCount = computed(() => filteredTrades.value.filter((trade) => trade.type === 'sell').length)
  const totalTradeAmount = computed(() => filteredTrades.value.reduce((sum, trade) => sum + Number(trade.value ?? 0), 0))

  const getReturnClass = (value: number): string => {
    if (value > 0) return 'positive'
    if (value < 0) return 'negative'
    return ''
  }

  const formatPercent = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0.00%'
    return `${value.toFixed(2)}%`
  }

  const formatMoney = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0.00'
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-'
    return dateStr.split('T')[0]
  }

  const goBack = () => {
    router.push({ name: 'BacktestHistory' })
  }

  const fetchBacktestResultData = async () => {
    const result = await getBacktestResult(taskId.value)
    backtestResult.value = toViewData(result)
    taskInfo.value = result.task_info

    try {
      const strategies = await getStrategies()
      strategyDefinition.value = strategies.find((strategy) => strategy.name === result.task_info.strategy_name) ?? null
    } catch (error) {
      console.error('获取策略定义失败:', error)
      strategyDefinition.value = null
    }

    const mergedResult = result as ApiBacktestResult & {
      observer_data?: ObserverData['observer_data']
      raw_data?: RawIndicatorData['raw_data']
      indicator_data?: RawIndicatorData['indicator_data']
    }

    observerData.value = mergedResult.observer_data
      ? {
          task_info: result.task_info,
          observer_data: mergedResult.observer_data
        }
      : null

    rawIndicatorData.value =
      mergedResult.raw_data || mergedResult.indicator_data
        ? {
            task_info: result.task_info,
            raw_data: mergedResult.raw_data ?? { datetime: [], open: [], high: [], low: [], close: [], volume: [] },
            indicator_data: mergedResult.indicator_data ?? {}
          }
        : null
  }

  const initializePage = async () => {
    taskId.value = String(route.params.taskId ?? '')
    if (!taskId.value) {
      ElMessage.error('缺少任务ID参数')
      goBack()
      return
    }
    loading.value = true
    try {
      await fetchBacktestResultData()
    } catch (error) {
      console.error('获取回测结果失败:', error)
      ElMessage.error('获取回测结果失败')
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    taskInfo,
    strategyDefinition,
    backtestResult,
    observerData,
    rawIndicatorData,
    filteredTrades,
    filteredTradesTotal,
    buyTradesCount,
    sellTradesCount,
    totalTradeAmount,
    getReturnClass,
    formatPercent,
    formatMoney,
    formatDate,
    goBack,
    initializePage
  }
}

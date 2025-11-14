import axios from './axiosConfig'

/**
 * 量化回测相关API接口
 * 功能：
 * 1. 获取策略列表
 * 2. 创建回测任务
 * 3. 运行回测任务
 * 4. 获取回测任务状态
 * 5. 获取回测结果
 */

// 策略接口类型定义
export interface Strategy {
  name: string
  description: string
  params?: Record<string, {
    type: 'int' | 'float' | 'string' | 'boolean'
    description: string
    default: any
  }>
}

// 回测任务创建参数
export interface BacktestCreateParams {
  strategy_name: string
  stock_code: string
  start_date: string
  end_date: string
  /**
   * 回测数据频率
   * 可选：'daily'（默认）或 'weekly'（周频）
   * 由前端用户选择决定使用日级别数据或周级别数据
   */
  frequency?: 'daily' | 'weekly'
  initial_cash: number
  strategy_params: Record<string, any>
}

// 回测任务信息
export interface BacktestTask {
  task_id: string
  strategy_name: string
  stock_code: string
  stock_name?: string
  start_date: string
  end_date: string
  initial_cash: number
  commission?: number
  status: 'created' | 'running' | 'completed' | 'failed'
  created_at: string
  updated_at?: string
  frequency?: string
  completed_at?: string
  result_summary?: {
    total_return: number
    annual_return: number
    sharpe_ratio: number | null
    max_drawdown: number | null
    total_trades: number
    win_rate: number | null
  }
}

// 回测任务列表查询参数
export interface BacktestTasksParams {
  current_page?: number
  page_size?: number
  strategy_name?: string
  symbol?: string
  status?: string
  start_date?: string
  end_date?: string
}

// 回测任务列表响应
export interface BacktestTasksResponse {
    tasks: BacktestTask[]
    total: number
}

// 回测结果
export interface BacktestResult {
  task_info: {
    task_id: string
    strategy_name: string
    stock_code: string
    stock_name: string
    start_date: string
    end_date: string
    initial_cash: number
    commission: number
    strategy_params: Record<string, any>
    created_at: string
    completed_at: string
  }
  performance: {
    initial_value: number
    final_value: number
    total_return: number
    annual_return: number
    sharpe_ratio: number | null
    max_drawdown: number
    volatility: number | null
    total_trades: number
    winning_trades: number
    losing_trades: number
    win_rate: number | null
  }
  detailed_data: {
    daily_returns: any[]
    portfolio_values: Array<{
      date: string
      value: number
    }>
    trade_records: Array<{
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
    }>
  }
  // 保持向后兼容性
  portfolio_value?: Array<{
    date: string
    value: number
  }>
  trades?: Array<{
    date: string
    action: 'buy' | 'sell'
    price: number
    quantity: number
    amount: number
  }>
}

/**
 * 获取策略列表
 * @returns Promise<Strategy[]> 策略列表
 */
export const getStrategies = async (): Promise<Strategy[]> => {
  const response = await axios.get('/django/api/quant/strategies/')
  return response.data.strategies
}

/**
 * 创建回测任务
 * @param params 回测任务创建参数
 * @returns Promise<BacktestTask> 回测任务信息
 */
export const createBacktestTask = async (params: BacktestCreateParams): Promise<BacktestTask> => {
  const response = await axios.post('/django/api/quant/backtest/create/', params)
  return response.data
}

/**
 * 运行回测任务
 * @param taskId 任务ID
 * @returns Promise<BacktestTask> 回测任务信息
 */
export const runBacktestTask = async (taskId: string): Promise<BacktestTask> => {
  const response = await axios.post(`/django/api/quant/backtest/${taskId}/run/`)
  return response.data
}

/**
 * 获取回测任务状态
 * @param taskId 任务ID
 * @returns Promise<BacktestTask> 回测任务状态
 */
export const getBacktestStatus = async (taskId: string): Promise<BacktestTask> => {
  const response = await axios.get(`/django/api/quant/backtest/${taskId}/status/`)
  return response.data
}

/**
 * 获取回测任务列表
 * @param params 查询参数
 * @returns Promise<BacktestTasksResponse> 回测任务列表
 */
export const getBacktestTasks = async (params: BacktestTasksParams = {}): Promise<BacktestTasksResponse> => {
  const response = await axios.get('/django/api/quant/backtest/history/', { params })
  return response.data
}

/**
 * 获取回测结果
 * @param taskId 任务ID
 * @returns Promise<BacktestResult> 回测结果
 */
export const getBacktestResult = async (taskId: string): Promise<BacktestResult> => {
  const response = await axios.get(`/django/api/quant/backtest/${taskId}/result/`)
  return response.data
}

/**
 * 获取观测器数据
 * @param taskId 任务ID
 * @param observerType 观测器类型过滤（可选）
 * @returns Promise<any> 观测器数据
 */
export const getBacktestObserver = async (taskId: string, observerType?: string): Promise<any> => {
  const params = observerType ? { observer_type: observerType } : {}
  const response = await axios.get(`/django/api/quant/backtest/${taskId}/observer/`, { params })
  return response
}

/**
 * 获取原始数据和指标数据
 * @param taskId 任务ID
 * @param dataType 数据类型过滤（可选）
 * @returns Promise<any> 原始数据和指标数据
 */
export const getBacktestRawIndicator = async (taskId: string, dataType?: string): Promise<any> => {
  const params = dataType ? { data_type: dataType } : {}
  const response = await axios.get(`/django/api/quant/backtest/${taskId}/raw-indicator/`, { params })
  return response
}
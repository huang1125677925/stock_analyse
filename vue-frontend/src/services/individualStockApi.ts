import axios from './axiosConfig'

/**
 * 个股数据相关API接口
 * 功能：
 * 1. 获取股票列表
 * 2. 获取所有股票实时行情
 * 3. 获取单只股票实时行情
 * 4. 获取股票历史行情数据
 * 5. 获取股票详细信息
 * 6. 手动更新股票数据
 */

// API基础URL
const API_BASE_URL = '/django/api/individual_stock/stocks'

// 股票基本信息接口
export interface StockInfo {
  code: string
  name: string
  industry: string
  total_shares: number
  circulating_shares: number
  list_date: string
  pe_ratio: number
  pb_ratio: number
  total_market_cap: number
  circulating_market_cap: number
  created_at: string
  updated_at: string
  
  // akshare数据字段
  latest_price: number
  change_percent: number
  change_amount: number
  volume: number
  amount: number
  amplitude: number
  high: number
  low: number
  open_price: number
  close_price: number
  volume_ratio: number
  turnover_rate: number
  price_change_speed: number
  change_5min: number
  change_60d: number
  change_ytd: number
}

// 股票实时行情接口
export interface StockRealtime {
  stock_code: string
  stock_name: string
  latest_price: number
  change_percent: number
  change_amount: number
  volume: number
  amount: number
  amplitude: number
  high: number
  low: number
  open_price: number
  close_price: number
  turnover_rate: number
  timestamp: string
}

// 股票历史行情接口
export interface StockHistory {
  stock_code: string
  stock_name: string
  date: string
  open_price: number
  close_price: number
  high_price: number
  low_price: number
  change_percent: number
  change_amount: number
  volume: number
  amount: number
  amplitude: number
  turnover_rate: number
  created_at: string
}

// 业绩快报数据接口
export interface PerformanceReport {
  id: number
  stock_code: string
  stock_name: string
  report_date: string
  earnings_per_share: number
  operating_revenue: number
  operating_revenue_growth_rate: number
  operating_revenue_quarter_growth: number
  net_profit: number
  net_profit_growth_rate: number
  net_profit_quarter_growth: number
  net_assets_per_share: number
  roe: number
  operating_cash_flow_per_share: number
  gross_profit_margin: number | null
  industry: string
  announcement_date: string
  created_at: string
  updated_at: string
}

// 业绩快报响应接口
export interface PerformanceReportResponse {
  stock_code: string
  reports: PerformanceReport[]
  pagination: {
    current_page: number
    total_pages: number
    total_count: number
    page_size: number
    has_next: boolean
    has_previous: boolean
  }
}

// 资产负债表数据接口
export interface BalanceSheet {
  id: number
  stock_code: string
  stock_name: string
  report_date: string
  monetary_funds: number
  accounts_receivable: number
  inventory: number
  total_assets: number
  total_assets_growth_rate: number
  accounts_payable: number
  total_liabilities: number
  advance_receipts: number
  total_liabilities_growth_rate: number
  debt_to_asset_ratio: number
  total_equity: number
  announcement_date: string
  created_at: string
  updated_at: string
}

// 利润表数据接口
export interface IncomeStatement {
  id: number
  stock_code: string
  stock_name: string
  report_date: string
  net_profit: number
  net_profit_growth_rate: number
  operating_revenue: number
  operating_revenue_growth_rate: number
  operating_expenses: number
  sales_expenses: number
  management_expenses: number
  financial_expenses: number
  total_operating_expenses: number
  operating_profit: number
  total_profit: number
  announcement_date: string
  created_at: string
  updated_at: string
}

// 现金流量表数据接口
export interface CashFlowStatement {
  id: number
  stock_code: string
  stock_name: string
  report_date: string
  net_cash_flow: number
  net_cash_flow_growth_rate: number
  operating_cash_flow: number
  operating_cash_flow_ratio: number
  investing_cash_flow: number
  investing_cash_flow_ratio: number
  financing_cash_flow: number
  financing_cash_flow_ratio: number
  announcement_date: string
  created_at: string
  updated_at: string
}

// 财报数据查询参数
export interface FinancialStatementParams extends PageParams {
  date?: string // 报告期，格式：YYYYMMDD
}

// 财报数据响应接口
export interface FinancialStatementResponse<T> {
  total: number
  page: number
  page_size: number
  total_pages: number
  data: T[]
}

// 分页查询参数
export interface PageParams {
  page?: number
  page_size?: number
}

// 股票列表响应
export interface StockListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  data: StockInfo[]
}

// 股票实时行情列表响应
export interface StockRealtimeListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  data: StockRealtime[]
}

// 股票历史行情查询参数
export interface StockHistoryParams {
  start_date?: string
  end_date?: string
  adjust?: '' | 'qfq' | 'hfq'
}

// 股票数据更新参数
export interface StockUpdateParams {
  stock_code?: string
  update_type?: 'all' | 'realtime' | 'history'
  days?: number
}

// 股票数据更新响应
export interface StockUpdateResponse {
  result: {
    realtime: {
      updated: number
      created: number
      failed: number
    }
    history: {
      updated_stocks: number
      updated_history: number
    }
  }
}

// API响应基础接口
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/**
 * 获取股票列表
 * @param params 分页和搜索参数
 * @returns Promise<StockListResponse> 股票列表
 */
export interface StockListParams extends PageParams {
  keyword?: string; // 搜索关键词，可以是股票代码或名称
  industry?: string; // 行业筛选
  stock_names?: string; // 仅看我的：以逗号分隔的股票名称列表
  dc_concept?: string; // 东财概念筛选（模糊匹配）
}

export const getStockList = async (params: StockListParams = {}): Promise<StockListResponse> => {
  const { page, page_size, keyword, industry, stock_names, dc_concept } = params
  const queryParams = new URLSearchParams()
  
  if (page !== undefined) {
    queryParams.append('page', page.toString())
  }
  
  if (page_size !== undefined) {
    queryParams.append('page_size', page_size.toString())
  }
  
  if (keyword) {
    queryParams.append('keyword', keyword)
  }

  if (industry) {
    queryParams.append('industry', industry)
  }

  if (stock_names) {
    queryParams.append('stock_names', stock_names)
  }
  
  if (dc_concept) {
    queryParams.append('dc_concept', dc_concept)
  }
  
  const queryString = queryParams.toString()
  const url = queryString ? `${API_BASE_URL}/?${queryString}` : `${API_BASE_URL}/`
  
  const response = await axios.get<StockListResponse>(url)
  return response.data
}

/**
 * 东财概念列表响应结构
 * 功能：描述接口返回的统一结构，其中 data 为概念字符串数组。
 * 参数：无
 * 返回值：
 * - code (int): 状态码
 * - message (str): 信息
 * - timestamp (str): 时间戳（ISO 格式）
 * - data (string[]): 概念名称列表
 * 事件：无
 */
export interface ConceptListResponse {
  code: number
  message: string
  timestamp: string
  data: string[]
}

/**
 * 获取东财概念列表
 * @returns Promise<ConceptListResponse> 概念列表统一响应
 */
export const getDcConceptList = async (): Promise<ConceptListResponse> => {
  const response = await axios.get<ConceptListResponse, ConceptListResponse>('/django/api/individual_stock/dc-concepts/')
  return response
}

/**
 * 获取所有股票实时行情
 * @param params 分页参数
 * @returns Promise<StockRealtimeListResponse> 股票实时行情列表
 */
export const getAllStockRealtime = async (params: PageParams = {}): Promise<StockRealtimeListResponse> => {
  const response = await axios.get<ApiResponse<StockRealtimeListResponse>>(`${API_BASE_URL}/realtime/`, { params })
  return response.data.data
}

/**
 * 获取单只股票实时行情
 * @param stockCode 股票代码
 * @returns Promise<StockRealtime> 股票实时行情
 */
export const getStockRealtime = async (stockCode: string): Promise<StockRealtime> => {
  const response = await axios.get<StockRealtime>(`${API_BASE_URL}/${stockCode}/realtime/`)
  return response.data
}

/**
 * 获取股票历史行情数据
 * @param stockCode 股票代码
 * @param params 查询参数
 * @returns Promise<StockHistory[]> 股票历史行情数据
 */
export const getStockHistory = async (stockCode: string, params: StockHistoryParams = {}): Promise<StockHistory[]> => {
  const response = await axios.get<StockHistory[]>(`${API_BASE_URL}/${stockCode}/history/`, { params })
  return response.data
}

/**
 * 获取股票详细信息
 * @param stockCode 股票代码
 * @returns Promise<StockInfo> 股票详细信息
 */
export const getStockInfo = async (stockCode: string): Promise<StockInfo> => {
  const response = await axios.get<StockInfo>(`${API_BASE_URL}/${stockCode}/info/`)
  return response.data
}

/**
 * 手动更新股票数据
 * @param params 更新参数
 * @returns Promise<StockUpdateResponse> 更新结果
 */
export const updateStockData = async (params: StockUpdateParams = {}): Promise<StockUpdateResponse> => {
  const response = await axios.post<ApiResponse<StockUpdateResponse>>(`${API_BASE_URL}/update/`, params)
  return response.data.data
}

/**
 * 获取指定股票的业绩快报数据
 * @param stockCode 股票代码
 * @param params 分页参数
 * @returns Promise<PerformanceReportResponse> 业绩快报数据
 */
export const getStockPerformanceReports = async (stockCode: string, params: PageParams = {}): Promise<PerformanceReportResponse> => {
  const response = await axios.get<PerformanceReportResponse>(`${API_BASE_URL}/${stockCode}/performance-reports/`, { params })
  return response.data
}

/**
 * 获取所有股票的资产负债表数据
 * @param params 查询参数
 * @returns Promise<FinancialStatementResponse<BalanceSheet>> 资产负债表数据
 */
export const getBalanceSheets = async (params: FinancialStatementParams = {}): Promise<BalanceSheet[]> => {
  const response = await axios.get<BalanceSheet[]>('/django/api/individual_stock/balance-sheets/', { params })
  return response.data
}

/**
 * 获取指定股票的资产负债表数据
 * @param stockCode 股票代码
 * @param params 查询参数
 * @returns Promise<FinancialStatementResponse<BalanceSheet>> 资产负债表数据
 */
export const getStockBalanceSheets = async (stockCode: string, params: FinancialStatementParams = {}): Promise<FinancialStatementResponse<BalanceSheet>> => {
  const response = await axios.get<FinancialStatementResponse<BalanceSheet>>(`${API_BASE_URL}/${stockCode}/balance-sheets/`, { params })
  return response.data
}

/**
 * 获取所有股票的利润表数据
 * @param params 查询参数
 * @returns Promise<FinancialStatementResponse<IncomeStatement>> 利润表数据
 */
export const getIncomeStatements = async (params: FinancialStatementParams = {}): Promise<IncomeStatement[]> => {
  const response = await axios.get<IncomeStatement[]>('/django/api/individual_stock/income-statements/', { params })
  return response.data
}

/**
 * 获取指定股票的利润表数据
 * @param stockCode 股票代码
 * @param params 查询参数
 * @returns Promise<FinancialStatementResponse<IncomeStatement>> 利润表数据
 */
export const getStockIncomeStatements = async (stockCode: string, params: FinancialStatementParams = {}): Promise<FinancialStatementResponse<IncomeStatement>> => {
  const response = await axios.get<FinancialStatementResponse<IncomeStatement>>(`${API_BASE_URL}/${stockCode}/income-statements/`, { params })
  return response.data
}

/**
 * 获取所有股票的现金流量表数据
 * @param params 查询参数
 * @returns Promise<CashFlowStatement[]> 现金流量表数据
 */
export const getCashFlowStatements = async (params: FinancialStatementParams = {}): Promise<CashFlowStatement[]> => {
  const response = await axios.get<CashFlowStatement[]>(`/django/api/individual_stock/cash-flow-statements/`, { params })
  return response.data
}

/**
 * 获取指定股票的现金流量表数据
 * @param stockCode 股票代码
 * @param params 查询参数
 * @returns Promise<FinancialStatementResponse<CashFlowStatement>> 现金流量表数据
 */
export const getStockCashFlowStatements = async (stockCode: string, params: FinancialStatementParams = {}): Promise<FinancialStatementResponse<CashFlowStatement>> => {
  const response = await axios.get<FinancialStatementResponse<CashFlowStatement>>(`${API_BASE_URL}/${stockCode}/cash-flow-statements/`, { params })
  return response.data
}
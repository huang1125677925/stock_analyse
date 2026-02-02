/**
 * 行业数据API服务
 * 功能：
 * 1. 获取行业板块列表
 * 2. 获取行业板块详情
 * 3. 获取行业板块成分股
 * 4. 获取行业板块实时行情
 */
import axios from './axiosConfig'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

// 行业板块基本信息接口
export interface IndustrySector {
  code: string
  name: string
  description?: string | null
  total_market_value?: number
  turnover_rate?: number
  rise_count?: number
  fall_count?: number
  leading_stock?: string
  leading_stock_change_percent?: number
  stock_count: number
  latest_price?: number
  change_amount?: number
  change_percent?: number
  created_at?: string
  updated_at?: string
}

// 行业板块成分股接口
export interface Stock {
  code: string
  name: string
  price: number
  change_percent: number
  weight?: number
  latest_price?: number
  change_amount?: number
  volume?: number
  amount?: number
  amplitude?: number
  high?: number
  low?: number
  open?: number
  close?: number
  volume_ratio?: number
  turnover_rate?: number
  pe_ratio?: number
  pb_ratio?: number
  total_market_cap?: number
  circulation_market_cap?: number
  speed?: number
  change_5min?: number
  change_60day?: number
  change_ytd?: number
  timestamp?: string
}

// 申万行业估值分析接口参数
export interface SwValuationAnalysisParams {
  start_date: string
  end_date: string
  level: string // L1/L2/L3
  index_codes?: string // 行业代码列表，逗号分隔
}

export interface SwValuationAnalysisResponse {
  records: SwValuationAnalysisItem[]
}

// 申万行业估值分析响应项
export interface SwValuationAnalysisItem {
  ts_code: string
  name: string // 行业名称
  pe: number
  pe_percentile: number
  pb: number
  pb_percentile: number
  trade_date: string
  // 可能还有其他字段，根据实际返回补充
}

/**
 * 获取申万行业估值分析数据
 */
export async function getSwValuationAnalysis(params: SwValuationAnalysisParams) {
  const res = await axios.get<SwValuationAnalysisResponse>('/django/api/index/sw-valuation-analysis/', {
    params
  })
  return res.data.records
}

// 行业详情接口（包含统计数据）
export interface Industry {
  industry: string
  code?: string
  count: number
  stocks: Stock[]
  avgChangePercent?: number
  avgPeRatio?: number
  avgPbRatio?: number
  avgChange60Day?: number
  avgChangeYtd?: number
  latest_price?: number
  change_amount?: number
  change_percent?: number
  open?: number
  high?: number
  low?: number
  volume?: number
  amount?: number
  turnover_rate?: number
  rising_stocks?: number
  falling_stocks?: number
  unchanged_stocks?: number
  total_market_value?: number
  rise_count?: number
  fall_count?: number
  leading_stock?: string
  leading_stock_change_percent?: number
  description?: string | null
  created_at?: string
  updated_at?: string
}

// 行业板块列表API响应
export interface IndustrySectorListResponse {
  code: number
  message: string
  timestamp: string
  data: {
    total: number
    sectors: IndustrySector[]
    query_time: string
  }
}

// 行业板块成分股API响应
export interface IndustrySectorConstituentsResponse {
  code: number
  message: string
  timestamp: string
  data: {
    sector_code: string
    sector_name: string
    constituents: Stock[]
    total: number
    query_time: string
  }
}

// 行业板块实时行情API响应
export interface IndustrySectorRealtimeResponse {
  code: number
  message: string
  timestamp: string
  data: {
    sector_code: string
    sector_name: string
    latest_price: number
    change: number
    change_percent: number
    open: number
    high: number
    low: number
    volume: number
    amount: number
    turnover_rate: number
    rising_stocks: number
    falling_stocks: number
    unchanged_stocks: number
  }
}

// API基础URL
const API_BASE_URL = '/django/api/stock'

// 行业板块日频数据项接口
export interface IndustrySectorDailyItem {
  sector_code: string
  sector_name: string
  date: string
  open_price: number
  close_price: number
  high_price: number
  low_price: number
  change_percent: number
  change_amount: number
  total_volume: number
  total_amount: number
  total_market_cap?: number | null
  amplitude: number
  turnover_rate: number
  rising_stocks: number
  falling_stocks: number
  flat_stocks: number
  created_at: string
}

// 行业板块日频数据响应的data结构
export interface IndustrySectorDailyData {
  sector_code: string
  sector_name: string
  daily_data: IndustrySectorDailyItem[]
  query_time: string
}

// 行业板块日频数据完整响应
export interface IndustrySectorDailyResponse {
  code: number
  message: string
  timestamp: string
  data: IndustrySectorDailyData
}

/**
 * 获取行业板块日频数据（用于K线）
 * @param code 行业板块代码，如"BK0001"
 * @param params 可选时间范围参数：start_date/end_date（YYYYMMDD）
 * @returns Promise<IndustrySectorDailyData> 行业板块日频数据
 */
export async function getIndustrySectorDaily(
  code: string,
  params?: { start_date?: string; end_date?: string }
): Promise<IndustrySectorDailyData> {
  const response = await axios.get<IndustrySectorDailyData>(
    `${API_BASE_URL}/industry-sector/daily/${code}/`,
    { params }
  )
  return response.data
}

/**
 * 获取行业板块列表（不包含成分股）
 * @param limit 返回行业板块数量限制，默认返回全部
 * @param offset 偏移量，默认0
 * @returns Promise<Industry[]> 行业板块列表（不包含成分股）
 */
export async function fetchIndustriesData(limit?: number, offset?: number): Promise<Industry[]> {
  try {
    const params: any = {}
    if (limit !== undefined) params.limit = limit
    if (offset !== undefined) params.offset = offset

    const response = await axios.get<IndustrySectorListResponse, IndustrySectorListResponse>(`${API_BASE_URL}/industry-sectors/`, {
      params
    })
    
    if (response.code !== 200) {
      throw new Error(response.message || '获取行业板块列表失败')
    }
    
    // 转换数据格式以兼容现有组件
    const industries: Industry[] = []
    
    for (const sector of response.data.sectors) {
      // 只添加基本信息，不获取成分股
      industries.push({
        industry: sector.name,
        code: sector.code,
        count: sector.stock_count,
        stocks: [], // 空数组，不包含成分股
        latest_price: sector.latest_price,
        change_amount: sector.change_amount,
        change_percent: sector.change_percent,
        total_market_value: sector.total_market_value,
        turnover_rate: sector.turnover_rate,
        rise_count: sector.rise_count,
        fall_count: sector.fall_count,
        leading_stock: sector.leading_stock,
        leading_stock_change_percent: sector.leading_stock_change_percent,
        description: sector.description,
        created_at: sector.created_at,
        updated_at: sector.updated_at
      })
    }
    
    return industries
  } catch (error) {
    console.error('获取行业板块列表错误:', error)
    throw error
  }
}

/**
 * 获取行业板块成分股
 * @param sectorCode 行业板块代码
 * @returns Promise<Stock[]> 行业板块成分股列表
 */
export async function fetchIndustrySectorStocks(sectorCode: string): Promise<{stocks: Stock[], stats: any}> {
  try {
    // 获取行业板块成分股
    const constituentsResponse = await axios.get<IndustrySectorConstituentsResponse, IndustrySectorConstituentsResponse>(
      `${API_BASE_URL}/industry-sector/constituents/${sectorCode}/`
    )
    
    if (constituentsResponse.code !== 200) {
      throw new Error(constituentsResponse.message || '获取行业成分股失败')
    }
    
    const constituents = constituentsResponse.data.constituents
    
    // 计算统计数据
    const stats = calculateIndustryStats(constituents)
    
    return {
      stocks: constituents,
      stats
    }
  } catch (error) {
    console.error(`获取行业板块 ${sectorCode} 成分股失败:`, error)
    throw error
  }
}

/**
 * 计算行业统计数据
 * @param stocks 股票列表
 * @returns 统计数据
 */
function calculateIndustryStats(stocks: Stock[]) {
  if (!stocks || stocks.length === 0) {
    return {
      avgChangePercent: 0,
      avgPeRatio: 0,
      avgPbRatio: 0,
      avgChange60Day: 0,
      avgChangeYtd: 0
    }
  }

  let totalChangePercent = 0
  let totalPeRatio = 0
  let totalPbRatio = 0
  let totalChange60Day = 0
  let totalChangeYtd = 0
  let validStocksCount = 0
  let validPeCount = 0
  let validPbCount = 0
  let valid60DayCount = 0
  let validYtdCount = 0
  
  stocks.forEach((stock: Stock) => {
    // 计算涨跌幅平均值
    if (typeof stock.change_percent === 'number') {
      totalChangePercent += stock.change_percent
      validStocksCount++
    }
    
    // 计算PE平均值
    if (typeof stock.pe_ratio === 'number' && stock.pe_ratio > 0) {
      totalPeRatio += stock.pe_ratio
      validPeCount++
    }
    
    // 计算PB平均值
    if (typeof stock.pb_ratio === 'number' && stock.pb_ratio > 0) {
      totalPbRatio += stock.pb_ratio
      validPbCount++
    }
    
    // 计算60天涨跌幅平均值
    if (typeof stock.change_60day === 'number') {
      totalChange60Day += stock.change_60day
      valid60DayCount++
    }
    
    // 计算年初至今涨跌幅平均值
    if (typeof stock.change_ytd === 'number') {
      totalChangeYtd += stock.change_ytd
      validYtdCount++
    }
  })
  
  // 返回计算的平均值
  return {
    avgChangePercent: validStocksCount > 0 ? totalChangePercent / validStocksCount : 0,
    avgPeRatio: validPeCount > 0 ? totalPeRatio / validPeCount : 0,
    avgPbRatio: validPbCount > 0 ? totalPbRatio / validPbCount : 0,
    avgChange60Day: valid60DayCount > 0 ? totalChange60Day / valid60DayCount : 0,
    avgChangeYtd: validYtdCount > 0 ? totalChangeYtd / validYtdCount : 0
  }
}

/**
 * 获取单个行业的详细数据
 * @param industryName 行业名称
 * @returns Promise<Industry | null> 行业详细数据
 */
export async function fetchIndustryDetail(industryName: string): Promise<Industry | null> {
  try {
    // 首先获取所有行业板块列表，找到对应的行业代码
    const response = await axios.get<IndustrySectorListResponse, IndustrySectorListResponse>(`${API_BASE_URL}/industry-sectors/`)
    
    if (response.code !== 200) {
      throw new Error(response.message || '获取行业板块列表失败')
    }
    
    // 查找匹配的行业板块
    const sector = response.data.sectors.find((s: IndustrySector) => s.name === industryName)
    if (!sector) {
      console.warn(`未找到行业: ${industryName}`)
      return null
    }
    
    // 获取行业板块成分股
    const constituentsResponse = await axios.get<IndustrySectorConstituentsResponse, IndustrySectorConstituentsResponse>(
      `${API_BASE_URL}/industry-sector/constituents/${sector.code}/`
    )
    
    if (constituentsResponse.code !== 200) {
      throw new Error(constituentsResponse.message || '获取行业成分股失败')
    }
    
    const constituents = constituentsResponse.data.constituents
    
    // 尝试获取实时行情数据
    let realtimeData = null
    try {
      const realtimeResponse = await axios.get<IndustrySectorRealtimeResponse, IndustrySectorRealtimeResponse>(
        `${API_BASE_URL}/industry-sector/realtime/${sector.code}/`
      )
      if (realtimeResponse.code === 200) {
        realtimeData = realtimeResponse.data
      }
    } catch (error) {
      console.warn(`获取行业 ${sector.code} 实时行情失败:`, error)
    }
    
    // 计算统计数据
    const stats = calculateIndustryStats(constituents)
    
    return {
      industry: sector.name,
      code: sector.code,
      count: sector.stock_count,
      stocks: constituents,
      ...stats,
      latest_price: realtimeData?.latest_price || sector.latest_price,
      change_amount: realtimeData?.change,
      change_percent: realtimeData?.change_percent || sector.change_percent,
      open: realtimeData?.open,
      high: realtimeData?.high,
      low: realtimeData?.low,
      volume: realtimeData?.volume,
      amount: realtimeData?.amount,
      turnover_rate: realtimeData?.turnover_rate,
      rising_stocks: realtimeData?.rising_stocks,
      falling_stocks: realtimeData?.falling_stocks,
      unchanged_stocks: realtimeData?.unchanged_stocks
    }
  } catch (error) {
    console.error('获取行业详情错误:', error)
    throw error
  }
}

// 行业统计数据接口
export interface IndustryStatistics {
  industry: string
  stock_count: number
  total_market_cap_sum: number
  circulating_market_cap_sum: number
  avg_latest_price: number
  avg_change_percent: number
  avg_change_amount: number
  total_volume: number
  total_amount: number
  avg_amplitude: number
  avg_turnover_rate: number
  avg_pe_ratio: number
  avg_pb_ratio: number
  avg_volume_ratio: number
  avg_price_change_speed: number
  avg_change_5min: number
  avg_change_60d: number
  avg_change_ytd: number
  max_high: number
  min_low: number
  avg_open_price: number
  avg_close_price: number
  total_shares_sum: number
  circulating_shares_sum: number
  avg_listing_years: number
}

// 行业统计数据响应接口
export interface IndustryStatisticsResponse {
  code: number
  message: string
  timestamp: string
  data: IndustryStatisticsData
}

export interface IndustryStatisticsData {
  industries: IndustryStatistics[]
  total_industries: number
  timestamp: string
}

/**
 * 获取行业统计数据
 * @param industry 行业名称，可选参数，不传则返回所有行业
 * @returns 行业统计数据
 */
export async function fetchIndustryStatistics(industry?: string): Promise<IndustryStatisticsData> {
  try {
    const params = industry ? { industry } : {}
    const response = await axios.get<IndustryStatisticsData>(`${API_BASE_URL}/industry/statistics/`, {
      params
    })
    
    return response.data
  } catch (error) {
    console.error('Error fetching industry statistics:', error)
    throw error
  }
}
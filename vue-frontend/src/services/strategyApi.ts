// 股票策略API服务
import axios from './axiosConfig'

export interface IndexRpsItem {
  ts_code: string
  name: string
  return_5: number
  RPS_5: number  
  return_20: number
  RPS_20: number  
  return_60: number
  RPS_60: number  
}
// 独立出来的IndexRps数据结构
export interface IndexRpsData {
  total: number
  data: IndexRpsItem[]
  periods: number[]
  saved_count: number
  errors: string[]
  query_time: string
}

export interface IndexRpsResponse {
  code: number
  message: string
  timestamp: string
  data: IndexRpsData
}

// 历史RPS数据接口类型定义
export interface HistoricalRpsItem {
  index_code: string
  index_name: string
  period: number
  change_percent: number
  rps_value: number
  created_at: string
}

// 独立出来的HistoricalRps数据结构
export interface HistoricalRpsData {
  total: number
  data: HistoricalRpsItem[]
  period: number
  query_time: string
}

export interface HistoricalRpsResponse {
  code: number
  message: string
  timestamp: string
  data: HistoricalRpsData
}

/**
 * 获取实时指数RPS强度排名
 * @param periods 时间周期，多个周期用逗号分隔
 * @param save 是否保存到数据库
 * @returns Promise<IndexRpsResponse>
 */
export async function getIndexRps(
  periods: string = "5,20,60",
  save: boolean = false,
  idx_type: '概念板块' | '行业板块' | '地域板块' = '行业板块'
): Promise<IndexRpsData> {
  try {
    const response = await axios.get<IndexRpsData>(
      `/django/api/strategy/index-rps/`,
      {
        params: {
          periods,
          save,
          idx_type
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('获取实时指数RPS强度排名失败:', error)
    throw error
  }
}

/**
 * 获取历史RPS数据
 * @param period 时间周期
 * @param limit 返回数量限制
 * @param offset 偏移量
 * @returns Promise<HistoricalRpsResponse>
 */
export async function getHistoricalRps(
  period: number = 20,
  limit: number = 100,
  offset: number = 0
): Promise<HistoricalRpsResponse> {
  try {
    const response = await axios.get<HistoricalRpsResponse>(
      `/django/api/strategy/historical-rps/`,
      {
        params: {
          period,
          limit,
          offset
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('获取历史RPS数据失败:', error)
    throw error
  }
}

// 新增：个股K线形态识别API类型与方法
export interface CandlestickPatternItem {
  date: string
  hammer: number
  morning_star: number
  piercing: number
  kicking: number
  inverted_hammer: number
  engulfing: number
  harami: number
  hanging_man: number
  evening_star: number
  dark_cloud_cover: number
  three_black_crows: number
  identical_three_crows: number
  doji: number
  long_legged_doji: number
  gravestone_doji: number
}

export interface CandlestickPatternData {
  stock_code: string
  stock_name: string
  total: number
  patterns: CandlestickPatternItem[]
}

export interface CandlestickPatternResponse {
  code: number
  message: string
  timestamp: string
  data: CandlestickPatternData
}

export interface CandlestickPatternParams {
  start_date?: string // 格式：YYYY-MM-DD
  end_date?: string   // 格式：YYYY-MM-DD
}

/**
 * 获取指定股票的K线形态识别结果
 * @param stockCode 股票代码
 * @param params 查询参数（start_date, end_date）
 * @returns Promise<CandlestickPatternData>
 */
export async function getCandlestickPatterns(
  stockCode: string,
  params: CandlestickPatternParams = {}
): Promise<CandlestickPatternData> {
  try {
    const response = await axios.get<CandlestickPatternData>(
      `/django/api/strategy/individual-analysis/candlestick/${stockCode}/`,
      {
        params: {
          start_date: params.start_date,
          end_date: params.end_date
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('获取个股K线形态识别结果失败:', error)
    throw error
  }
}
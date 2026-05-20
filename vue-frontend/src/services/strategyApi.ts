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

export type DcIndustryLevel = '东财一级行业' | '东财二级行业' | '东财三级行业'
export type IndexRpsIdxType = '概念板块' | '行业板块' | '地域板块'

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
  idx_type: IndexRpsIdxType = '行业板块',
  level?: DcIndustryLevel
): Promise<IndexRpsData> {
  try {
    const response = await axios.get<IndexRpsData>(
      `/django/api/strategy/index-rps/`,
      {
        params: {
          periods,
          save,
          idx_type,
          ...(level ? { level } : {})
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
  type?: SwingTargetType
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
          end_date: params.end_date,
          type: params.type
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('获取个股K线形态识别结果失败:', error)
    throw error
  }
}

export interface ValueStockItem {
  ts_code: string
  stock_code: string
  stock_name: string | null
  report_period: string
  ann_date: string | null
  f_ann_date: string | null
  total_revenue: number | null
  net_profit: number | null
  revenue_growth_rate: number | null
  net_profit_growth_rate: number | null
  roe: number | null
  gross_profit_margin: number | null
}

export interface ValueStockFilters {
  min_revenue_growth: number
  min_net_profit: number
  limit: number
  lookback_periods: number
}

export interface ValueStocksData {
  report_period: string
  total: number
  matched_total: number
  filters: ValueStockFilters
  data: ValueStockItem[]
  errors: string[]
  query_time: string
}

export interface ValueStocksParams {
  report_period?: string
  min_revenue_growth?: number
  min_net_profit?: number
  limit?: number
  lookback_periods?: number
}

export async function getValueStocks(
  params: ValueStocksParams = {}
): Promise<ValueStocksData> {
  try {
    const response = await axios.get<ValueStocksData>(
      '/django/api/strategy/value-stocks/',
      { params }
    )
    return response.data
  } catch (error) {
    console.error('获取价值股候选列表失败:', error)
    throw error
  }
}

export type SwingTargetType = 'stock' | 'etf'
export type SwingAdjustType = '' | 'qfq' | 'hfq'

export interface SwingAnalysisMa {
  ma5: number | null
  ma10: number | null
  ma20: number | null
  ma60: number | null
}

export interface SwingAnalysisMomentum {
  momentum_5d_pct: number | null
  momentum_20d_pct: number | null
}

export interface SwingAnalysisVolatility {
  atr14: number | null
  atr14_pct: number | null
}

export interface SwingAnalysisVolume {
  latest_vol: number | null
  avg_vol20: number | null
  volume_ratio_20: number | null
}

export interface SwingAnalysisLevels {
  support_20d: number | null
  resistance_20d: number | null
}

export interface SwingDecisionHint {
  bias: string
  reasons: string[]
  risk_flags: string[]
}

export interface SwingAnalysisSnapshot {
  latest_trade_date: string
  latest_close: number | null
  period_return_pct: number | null
  period_high: number | null
  period_high_date: string | null
  period_low: number | null
  period_low_date: string | null
  position_percentile: number | null
  pullback_from_high_pct: number | null
  rebound_from_low_pct: number | null
  ma: SwingAnalysisMa
  momentum: SwingAnalysisMomentum
  volatility: SwingAnalysisVolatility
  volume: SwingAnalysisVolume
  levels: SwingAnalysisLevels
  wave_stage: string
  decision_hint: SwingDecisionHint
}

export interface SwingTheoryItem {
  name: string
  basis: string
  related_fields: string[]
}

export interface SwingAnalysisData {
  target_type: SwingTargetType
  ts_code: string
  start_date: string
  end_date: string
  adjust: SwingAdjustType | string
  data_source: string
  data_interface: string
  data_points: number
  analysis: SwingAnalysisSnapshot | null
  theory: SwingTheoryItem[]
}

export interface SwingAnalysisParams {
  target_type?: SwingTargetType
  code: string
  start_date?: string
  end_date?: string
  adjust?: SwingAdjustType
}

export async function getSwingAnalysis(
  params: SwingAnalysisParams
): Promise<SwingAnalysisData> {
  try {
    const response = await axios.get<SwingAnalysisData>(
      '/django/api/strategy/swing-analysis/',
      { params }
    )
    return response.data
  } catch (error) {
    console.error('获取波段分析数据失败:', error)
    throw error
  }
}

export interface SwingChannelCandidateAnalysis {
  latest_trade_date: string
  latest_close: number | null
  channel_window: number
  lower_line_latest: number | null
  upper_line_latest: number | null
  channel_width_pct: number | null
  distance_to_lower_pct: number | null
  channel_position_pct: number | null
  lower_slope: number | null
  upper_slope: number | null
  lower_slope_pct_per_day: number | null
  upper_slope_pct_per_day: number | null
  is_channel_up: boolean
}

export interface SwingChannelCandidateItem {
  target_type: SwingTargetType
  ts_code: string
  code: string
  name: string
  index_code?: string | null
  index_name?: string | null
  exchange?: string | null
  list_date?: string | null
  etf_type?: string | null
  amount?: number | null
  analysis: SwingChannelCandidateAnalysis
  score: number
}

export interface SwingChannelCandidateFilters {
  channel_window: number
  max_distance_pct: number
  max_channel_position_pct: number
  min_slope_pct: number
  universe_limit: number
  limit: number
  adjust?: SwingAdjustType | null
  codes: string[]
}

export interface SwingChannelSkippedItem {
  ts_code: string
  reason: string
}

export interface SwingChannelCandidatesData {
  target_type: SwingTargetType
  data_source: string
  universe_trade_date: string
  start_date: string
  end_date: string
  filters: SwingChannelCandidateFilters
  total: number
  matched_total: number
  scanned_total: number
  skipped_total: number
  data: SwingChannelCandidateItem[]
  skipped_sample: SwingChannelSkippedItem[]
  theory: string[]
  query_time: string
}

export interface SwingChannelCandidatesParams {
  target_type?: SwingTargetType
  codes?: string
  start_date?: string
  end_date?: string
  channel_window?: number
  max_distance_pct?: number
  max_channel_position_pct?: number
  min_slope_pct?: number
  universe_limit?: number
  limit?: number
  adjust?: SwingAdjustType
}

export async function getSwingChannelCandidates(
  params: SwingChannelCandidatesParams = {}
): Promise<SwingChannelCandidatesData> {
  try {
    const response = await axios.get<SwingChannelCandidatesData>(
      '/django/api/strategy/swing-channel-candidates/',
      { params }
    )
    return response.data
  } catch (error) {
    console.error('获取波段选股候选列表失败:', error)
    throw error
  }
}

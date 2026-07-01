import axios from './axiosConfig'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface LimitBoardBaseParams {
  trade_date: string
  token?: string
}

export interface LimitBoardTopParams extends LimitBoardBaseParams {
  top_n?: number
}

export interface LimitBoardRangeParams {
  start_date: string
  end_date: string
  token?: string
}

export interface AuctionCandidatesParams extends LimitBoardTopParams {
  auction_max_retries?: number
  auction_base_wait?: number
}

export interface DailySentimentData {
  trade_date: string
  summary?: Record<string, any>
  board_distribution?: Record<string, any>[]
  top_concepts?: Record<string, any>[]
  source_counts?: Record<string, number>
  query_time?: string
}

export interface AuctionCandidatesData {
  summary?: Record<string, any>
  market_sentiment?: Record<string, any>
  top_candidates?: Record<string, any>[]
  candidates?: Record<string, any>[]
  statistics?: Record<string, any>
  params?: Record<string, any>
}

export interface ThemeLadderData {
  trade_date: string
  total?: number
  themes?: Record<string, any>[]
  source_counts?: Record<string, number>
  query_time?: string
}

export interface BreakResealData {
  trade_date: string
  summary?: Record<string, any>
  resealed?: Record<string, any>[]
  failed?: Record<string, any>[]
  source_counts?: Record<string, number>
  query_time?: string
}

export interface HotMoneyReviewData {
  trade_date: string
  summary?: Record<string, any>
  active_hot_money?: Record<string, any>[]
  records?: Record<string, any>[]
  source_counts?: Record<string, number>
  query_time?: string
}

export interface IndustryTrendStrengthItem {
  trade_date: string
  industry: string
  limit_up_count?: number
  avg_turnover_ratio?: number
  avg_first_limit_minutes?: number
  total_amount?: number
  avg_open_times?: number
  avg_limit_times?: number
  avg_up_stat_n?: number
  avg_up_stat_t?: number
  avg_up_stat_ratio_pct?: number
}

export interface IndustryTrendStrengthSummary {
  trade_day_count?: number
  industry_count?: number
  record_count?: number
  total_limit_up_count?: number
  top_industries?: Array<{
    industry: string
    trade_day_count?: number
    total_limit_up_count?: number
    avg_daily_limit_up_count?: number
    total_amount?: number
  }>
}

export interface IndustryTrendStrengthData {
  start_date: string
  end_date: string
  summary?: IndustryTrendStrengthSummary
  data?: IndustryTrendStrengthItem[]
  source_counts?: Record<string, number>
  query_time?: string
}

function parseLimitBoardResponse(data: unknown): unknown {
  if (typeof data !== 'string') return data
  if (!data.trim()) return data
  const normalized = data.replace(/([:[,]\s*)(NaN|Infinity|-Infinity)(?=\s*[,}\]])/g, '$1null')
  return JSON.parse(normalized)
}

function getLimitBoard<T>(url: string, params: Record<string, any>): Promise<T> {
  return axios
    .get<ApiResponse<T>, ApiResponse<T>>(url, {
      params,
      transformResponse: [parseLimitBoardResponse]
    })
    .then(res => res.data)
}

export function fetchDailySentiment(params: LimitBoardBaseParams): Promise<DailySentimentData> {
  return getLimitBoard<DailySentimentData>('/django/api/strategy/limit-board/daily-sentiment/', params)
}

export function fetchAuctionCandidates(params: AuctionCandidatesParams): Promise<AuctionCandidatesData> {
  return getLimitBoard<AuctionCandidatesData>('/django/api/strategy/limit-board/auction-candidates/', params)
}

export function fetchThemeLadder(params: LimitBoardTopParams): Promise<ThemeLadderData> {
  return getLimitBoard<ThemeLadderData>('/django/api/strategy/limit-board/theme-ladder/', params)
}

export function fetchBreakReseal(params: LimitBoardTopParams): Promise<BreakResealData> {
  return getLimitBoard<BreakResealData>('/django/api/strategy/limit-board/break-reseal/', params)
}

export function fetchHotMoneyReview(params: LimitBoardTopParams): Promise<HotMoneyReviewData> {
  return getLimitBoard<HotMoneyReviewData>('/django/api/strategy/limit-board/hot-money-review/', params)
}

export function fetchIndustryTrendStrength(params: LimitBoardRangeParams): Promise<IndustryTrendStrengthData> {
  return getLimitBoard<IndustryTrendStrengthData>('/django/api/strategy/limit-board/industry-trend-strength/', params)
}

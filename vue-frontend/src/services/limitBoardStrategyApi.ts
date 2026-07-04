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

/** 行业趋势强度的行业映射方式：default 为 limit_list_d 按日动态映射，dc_* 为东财板块成分快照映射 */
export type IndustryMapping = 'default' | 'dc_concept' | 'dc_region' | 'dc_l1' | 'dc_l2' | 'dc_l3'

export interface IndustryTrendStrengthParams extends LimitBoardRangeParams {
  /** 行业映射方式，默认 default */
  industry_mapping?: IndustryMapping
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

/** 涨停个股，保留 limit_list_ths 原始字段并补充所属行业 */
export interface IndustryTrendStock {
  ts_code?: string
  name?: string
  industry?: string
  /** 涨停原因 */
  lu_desc?: string
  /** 涨停标签，如「首板」「2天2板」 */
  tag?: string
  /** 涨停状态，如「换手板」「一字板」「T字板」 */
  status?: string
  /** 涨停原因/题材类型 */
  limit_type?: string
  /** 题材 */
  theme?: string
  /** 连板数 */
  limit_times?: number
  /** 换手率（%），部分数据源字段为 turnover_ratio */
  turnover_rate?: number
  /** 换手率（%），limit_list_ths 原始字段 */
  turnover_ratio?: number
  /** 开板次数 */
  open_num?: number
  /** 首次封板时间 */
  lu_time?: string
  /** 首次涨停时间 */
  first_lu_time?: string
  /** 涨速 */
  rise_rate?: number
  /** 涨跌幅（%） */
  pct_chg?: number
  /** 最新价 */
  price?: number
  /** 封单量（股/手，取决于数据源） */
  limit_order?: number
  /** 封单额（元） */
  limit_amount?: number
  /** 流通市值（元） */
  free_float?: number
  /** 近一年涨停封板率，0-1 */
  limit_up_suc_rate?: number
  /** 换手率占比 */
  turnover?: number
  /** 股票类型：HS 沪深主板、GEM 创业板、STAR 科创板 */
  market_type?: string
  [key: string]: any
}

/** 单个交易日的整体维度 */
export interface IndustryTrendDailyOverall {
  limit_up_count: number
  industry_count: number
}

/** 行业涨停状态数量统计（固定三种状态，未出现计为 0） */
export interface IndustryTrendStatusCounts {
  /** T 字板数量 */
  'T字板': number
  /** 一字板数量 */
  '一字板': number
  /** 换手板数量 */
  '换手板': number
}

/** 单个交易日的行业维度条目 */
export interface IndustryTrendDailyIndustry {
  industry: string
  limit_up_count: number
  /** 该日该行业涨停股按涨停状态分类的数量统计 */
  status_counts?: IndustryTrendStatusCounts
}

/** 单个交易日的三维明细：整体、行业、个股 */
export interface IndustryTrendDaily {
  trade_date: string
  overall: IndustryTrendDailyOverall
  industries: IndustryTrendDailyIndustry[]
  /** 以行业名称为 key 的涨停个股列表 */
  stocks: Record<string, IndustryTrendStock[]>
}

export interface IndustryTrendStrengthSummary {
  trade_day_count?: number
  industry_count?: number
  total_limit_up_count?: number
  industry_matched_count?: number
  /** 因 ST/退市被剔除的个股数 */
  excluded_st_count?: number
  /** 因无法归类到具体行业被剔除的个股数 */
  excluded_unknown_industry_count?: number
  /** 本次使用的行业映射方式 */
  industry_mapping?: IndustryMapping
  /** 行业映射方式的中文标签 */
  industry_mapping_label?: string
  top_industries?: Array<{
    industry: string
    trade_day_count?: number
    total_limit_up_count?: number
    avg_daily_limit_up_count?: number
  }>
}

export interface IndustryTrendStrengthData {
  start_date: string
  end_date: string
  summary?: IndustryTrendStrengthSummary
  /** 以交易日 YYYYMMDD 为 key 的日度明细 */
  data?: Record<string, IndustryTrendDaily>
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

export function fetchIndustryTrendStrength(params: IndustryTrendStrengthParams): Promise<IndustryTrendStrengthData> {
  return getLimitBoard<IndustryTrendStrengthData>('/django/api/strategy/limit-board/industry-trend-strength/', params)
}

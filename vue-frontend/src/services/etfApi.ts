import axios from './axiosConfig'

/**
 * 组件/服务名称：etfApi
 * 功能：封装 ETF 相关后端接口调用，包括基础信息分页查询、日线行情查询与最近交易日全量行情查询。
 * 参数：
 * - getEtfBasic: 过滤条件（ts_code, index_code, exchange, list_status, mgr_name, etf_type, name, page, page_size）
 * - getEtfDaily: ts_code（必填），start_date（可选），end_date（可选）
 * - getEtfDailyLatest: 无参数，返回最近交易日所有ETF的日线行情列表
 * 返回值：统一响应结构，data 字段根据接口定义返回分页载荷或列表。
 * 事件：无（服务函数不触发事件）。
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

// Etf 基本信息项
export interface EtfBasicItem {
  id: number
  /** 基金交易代码（类型：str，默认显示：Y） */
  ts_code: string
  /** ETF扩位简称(对应交易所简称)（类型：str，默认显示：Y） */
  extname: string
  /** ETF中文简称（类型：str，默认显示：Y） */
  csname?: string | null
  /** 基金中文全称（类型：str，默认显示：Y） */
  cname?: string | null
  /** ETF基准指数代码（类型：str，默认显示：Y） */
  index_code?: string | null
  /** ETF基准指数中文全称（类型：str，默认显示：Y） */
  index_name?: string | null
  /** 交易所（上交所SH 深交所SZ）（类型：str，默认显示：Y） */
  exchange?: string | null
  /** 存续状态（L上市 D退市 P待上市）（类型：str，默认显示：Y） */
  list_status?: 'L' | 'D' | 'P' | string | null
  /** 基金投资通道类型（境内、QDII）（类型：str，默认显示：Y） */
  etf_type?: string | null
  /** 基金管理人简称（类型：str，默认显示：Y） */
  mgr_name?: string | null
  /** 基金托管人名称（类型：str，默认显示：Y） */
  custod_name?: string | null
  /** 设立日期（格式：YYYYMMDD）（类型：str，默认显示：Y） */
  setup_date?: string | null
  /** 上市日期（格式：YYYYMMDD）（类型：str，默认显示：Y） */
  list_date?: string | null
  delist_date?: string | null
  /** 基金管理人收取的费用（类型：float，默认显示：Y） */
  mgt_fee?: number | null
  created_at: string
  updated_at: string
}

// Etf 基本信息分页载荷
export interface EtfBasicListPayload {
  data: EtfBasicItem[]
  page: number
  page_size: number
  total: number
  pages: number
}

export interface GetEtfBasicParams {
  ts_code?: string
  index_code?: string
  exchange?: string
  list_status?: string
  mgr_name?: string
  etf_type?: string
  name?: string
  page?: number
  page_size?: number
}

// Etf 日线数据项
export interface EtfDailyItem {
  id: number
  csname: string
  ts_code: string
  trade_date: string // YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  pre_close?: number | null
  change?: number | null
  pct_chg?: number | null
  amount: number
  vol: number // 成交量(手)
  created_at: string
}

export interface GetEtfDailyParams {
  ts_code: string
  start_date?: string // YYYY-MM-DD
  end_date?: string // YYYY-MM-DD
}

// 获取 ETF 基本信息（分页）
export async function getEtfBasic(
  params: GetEtfBasicParams
): Promise<EtfBasicListPayload> {
  const res = await axios.get<EtfBasicListPayload>(
    '/django/api/etf/basic/',
    { params }
  )
  return res.data
}

// 获取 ETF 日线行情（列表）
export async function getEtfDaily(
  params: GetEtfDailyParams
): Promise<EtfDailyItem[]> {
  const res = await axios.get<ApiResponse<EtfDailyItem[]>, ApiResponse<EtfDailyItem[]>>(
    '/django/api/etf/daily/',
    { params }
  )
  return res.data
}

// 获取最近交易日所有ETF的日线行情（列表）
export async function getEtfDailyLatest(): Promise<EtfDailyItem[]> {
  /**
   * 函数名称：getEtfDailyLatest
   * 功能：调用 `/django/api/etf/daily/latest/` 接口，获取数据库中最近交易日的所有ETF日线行情列表。
   * 参数：无
   * 返回值：`EtfDailyItem[]` 列表（统一响应结构中的 data 字段）
   * 事件：无
   */
  const res = await axios.get<ApiResponse<EtfDailyItem[]>, ApiResponse<EtfDailyItem[]>>(
    '/django/api/etf/daily/latest/'
  )
  return res.data
}

// ETF 收盘价相关性矩阵
export interface EtfCorrelationData {
  labels: string[]
  matrix: number[][]
}

export interface GetEtfCorrelationParams {
  ts_codes: string[] | string
  start_date?: string
  end_date?: string
}

export async function getEtfCorrelation(
  params: GetEtfCorrelationParams
): Promise<EtfCorrelationData> {
  const query = {
    ts_codes: Array.isArray(params.ts_codes) ? params.ts_codes.join(',') : params.ts_codes,
    start_date: params.start_date,
    end_date: params.end_date,
  }
  const res = await axios.get<ApiResponse<EtfCorrelationData>, ApiResponse<EtfCorrelationData>>(
    '/django/api/etf/daily/correlation/',
    { params: query }
  )
  return res.data
}

// ETF 区间波动度统计
export interface EtfVolatilityItem {
  [key: string]: any
  ts_code?: string
}

export interface GetEtfVolatilityParams {
  ts_codes: string[] | string
  start_date?: string
  end_date?: string
  sample_n?: number
}

export async function getEtfVolatility(
  params: GetEtfVolatilityParams
): Promise<EtfVolatilityItem[]> {
  const query = {
    ts_codes: Array.isArray(params.ts_codes) ? params.ts_codes.join(',') : params.ts_codes,
    start_date: params.start_date,
    end_date: params.end_date,
    sample_n: params.sample_n,
  }
  const res = await axios.get<ApiResponse<{ items: EtfVolatilityItem[] }>, ApiResponse<{ items: EtfVolatilityItem[] }>>(
    '/django/api/etf/daily/volatility/',
    { params: query }
  )
  return (res.data as any)?.items ?? []
}

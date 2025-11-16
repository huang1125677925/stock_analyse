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
  ts_code: string
  extname: string
  csname?: string | null
  cname?: string | null
  index_code?: string | null
  index_name?: string | null
  exchange?: string | null
  list_status?: 'L' | 'D' | 'P' | string | null
  etf_type?: string | null
  mgr_name?: string | null
  custod_name?: string | null
  setup_date?: string | null
  list_date?: string | null
  delist_date?: string | null
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
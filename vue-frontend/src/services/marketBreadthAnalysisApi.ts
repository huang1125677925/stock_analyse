import axios from './axiosConfig'

// API Base for market breadth strategy
const API_BASE_URL = '/django/api/strategy/market-analysis'

// ---------------------- ADR ----------------------
export interface AdrQuery {
  days?: number
  start_date?: string
  end_date?: string
}

export interface AdrDailyItem {
  date: string
  adv_count: number
  decl_count: number
  flat_count: number
  daily_adr: number | null
}

export interface AdrAggregated {
  adv_sum: number
  decl_sum: number
  adr: number | null
  typical_range: [number, number]
}

export interface AdrResponseData {
  query: { days?: number; start_date?: string; end_date?: string }
  aggregated: AdrAggregated
  daily: AdrDailyItem[]
  total_days: number
}

export interface ApiResponse<T = any> {
  code: number
  message: string
  timestamp: string
  data: T
}

export async function fetchAdr(params: AdrQuery = { days: 30 }): Promise<AdrResponseData> {
  const res = await axios.get<ApiResponse<AdrResponseData>, ApiResponse<AdrResponseData>>(`${API_BASE_URL}/adr/`, { params })
  return res.data
}

// ---------------------- ADL ----------------------
export interface AdlQuery {
  days?: number
  start_date?: string
  end_date?: string
}

export interface AdlDailyItem {
  date: string
  advance_count: number
  decline_count: number
  flat_count: number
  daily_diff: number
  adl_cumulative: number
}

export interface AdlResponseData {
  query: { days?: number; start_date?: string; end_date?: string }
  adl: AdlDailyItem[]
  final_adl: number
}

export async function fetchAdl(params: AdlQuery = { days: 30 }): Promise<AdlResponseData> {
  const res = await axios.get<ApiResponse<AdlResponseData>, ApiResponse<AdlResponseData>>(`${API_BASE_URL}/adl/`, { params })
  return res.data
}
import axios from './axiosConfig'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface IndexBasicItem {
  ts_code: string
  name?: string
  market?: string // MSCI/CSI/SSE/SZSE/CICC/SW/OTH
  publisher?: string
  category?: string
}

export interface IndexBasicData {
  count: number
  interface: string
  records: IndexBasicItem[]
}

export interface FetchIndexBasicParams {
  category?: string
  market?: string
  name?: string
  publisher?: string
  fields?: string
}

/**
 * 获取指数基本信息列表（Tushare index_basic 代理）
 */
export async function fetchIndexBasicList(params: FetchIndexBasicParams = {}): Promise<IndexBasicItem[]> {
  const res = await axios.get<ApiResponse<IndexBasicData>, ApiResponse<IndexBasicData>>(
    '/django/api/index/index-basic/',
    {
      params: {
        fields: params.fields ?? 'ts_code,name,market,publisher,category',
        category: params.category,
        market: params.market,
        name: params.name,
        publisher: params.publisher
      }
    }
  )

  const list = res.data?.records || []
  // 简单排序：按名称升序，其次按代码
  return [...list].sort((a, b) => {
    const an = (a.name || '').localeCompare(b.name || '')
    if (an !== 0) return an
    return a.ts_code.localeCompare(b.ts_code)
  })
}

export interface IndexWeightItem {
  index_code: string
  con_code: string
  con_name?: string
  weight?: number
  in_date?: string
  out_date?: string
  trade_date?: string
}

export interface IndexWeightData {
  count: number
  interface: string
  records: IndexWeightItem[]
}

export interface FetchIndexWeightParams {
  index_code: string
  trade_date?: string
  start_date?: string
  end_date?: string
  fields?: string
  token?: string
}

export async function fetchIndexWeight(params: FetchIndexWeightParams): Promise<IndexWeightItem[]> {
  const res = await axios.get<ApiResponse<IndexWeightData>, ApiResponse<IndexWeightData>>(
    '/django/api/index/index-weight/',
    {
      params: {
        index_code: params.index_code,
        trade_date: params.trade_date,
        start_date: params.start_date,
        end_date: params.end_date,
        fields: params.fields,
        token: params.token
      }
    }
  )
  return res.data?.records || []
}

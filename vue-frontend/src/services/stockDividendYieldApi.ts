import axios from './axiosConfig'

interface ApiResponse<T> {
  code: number | string
  message: string
  timestamp: string
  data: T
}

export interface StockDividendYieldItem {
  ts_code: string
  code: string
  name: string | null
  industry: string | null
  trade_date: string
  close: number | null
  pe: number | null
  pe_ttm: number | null
  pb: number | null
  ps: number | null
  ps_ttm: number | null
  dv_ratio: number | null
  dv_ttm: number | null
  total_mv: number | null
  circ_mv: number | null
}

interface StockDividendYieldData {
  total: number
  items: StockDividendYieldItem[]
  filters?: Record<string, unknown>
}

export interface StockDividendYieldParams {
  ts_code?: string
  trade_date?: string
  limit?: number
  offset?: number
  sort_by?: 'dv_ttm' | 'dv_ratio' | 'pe' | 'pe_ttm' | 'pb' | 'ps_ttm' | 'total_mv' | 'circ_mv' | 'close'
  order?: 'asc' | 'desc'
  min_dv_ttm?: number
  min_dv_ratio?: number
}

const API_BASE_URL = '/django/api/stock/dividend-yield/'

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeItem = (item: Record<string, unknown>): StockDividendYieldItem => ({
  ts_code: String(item.ts_code ?? ''),
  code: String(item.code ?? ''),
  name: item.name == null ? null : String(item.name),
  industry: item.industry == null ? null : String(item.industry),
  trade_date: String(item.trade_date ?? ''),
  close: toNullableNumber(item.close),
  pe: toNullableNumber(item.pe),
  pe_ttm: toNullableNumber(item.pe_ttm),
  pb: toNullableNumber(item.pb),
  ps: toNullableNumber(item.ps),
  ps_ttm: toNullableNumber(item.ps_ttm),
  dv_ratio: toNullableNumber(item.dv_ratio),
  dv_ttm: toNullableNumber(item.dv_ttm),
  total_mv: toNullableNumber(item.total_mv),
  circ_mv: toNullableNumber(item.circ_mv),
})

export const getStockDividendYieldList = async (
  params: StockDividendYieldParams = {}
): Promise<StockDividendYieldData> => {
  const response = await axios.get<ApiResponse<StockDividendYieldData> | StockDividendYieldData, ApiResponse<StockDividendYieldData> | StockDividendYieldData>(
    API_BASE_URL,
    { params }
  )

  const payload = (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    response.data &&
    typeof response.data === 'object' &&
    !Array.isArray(response.data)
  )
    ? response.data as StockDividendYieldData
    : response as StockDividendYieldData

  return {
    total: Number(payload.total ?? 0),
    items: Array.isArray(payload.items)
      ? (payload.items as unknown[])
          .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
          .map(normalizeItem)
      : [],
    filters: payload.filters
  }
}

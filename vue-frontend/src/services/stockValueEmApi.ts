import axios from './axiosConfig'

interface ApiResponse<T> {
  code: number
  message: string
  timestamp: string
  data: T
}

export interface StockValueEmItem {
  date: string
  市盈率?: number | null
  市净率?: number | null
  市销率?: number | null
  市现率?: number | null
  股息率?: number | null
}

type StockValueEmPayload =
  | ApiResponse<StockValueEmItem[] | { data?: StockValueEmItem[]; results?: StockValueEmItem[]; items?: StockValueEmItem[] }>
  | StockValueEmItem[]
  | { data?: StockValueEmItem[]; results?: StockValueEmItem[]; items?: StockValueEmItem[] }

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeValueSeries = (payload: unknown): StockValueEmItem[] => {
  const source = (
    Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: unknown[] }).data
        : payload && typeof payload === 'object' && 'results' in payload && Array.isArray((payload as { results?: unknown }).results)
          ? (payload as { results: unknown[] }).results
          : payload && typeof payload === 'object' && 'items' in payload && Array.isArray((payload as { items?: unknown }).items)
            ? (payload as { items: unknown[] }).items
            : []
  )

  return source
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      date: String(item.date ?? item.trade_date ?? item.report_date ?? ''),
      市盈率: item['市盈率'] == null ? toNullableNumber(item.pe ?? item.pe_ttm ?? item.pe_ratio) : toNullableNumber(item['市盈率']),
      市净率: item['市净率'] == null ? toNullableNumber(item.pb ?? item.pb_ratio) : toNullableNumber(item['市净率']),
      市销率: item['市销率'] == null ? toNullableNumber(item.ps ?? item.ps_ratio) : toNullableNumber(item['市销率']),
      市现率: item['市现率'] == null ? toNullableNumber(item.pcf ?? item.pcf_ratio) : toNullableNumber(item['市现率']),
      股息率: item['股息率'] == null
        ? toNullableNumber(item.dividend_yield ?? item.dv_ratio ?? item.dv_ttm)
        : toNullableNumber(item['股息率'])
    }))
    .filter(item => item.date)
}

const buildCodeCandidates = (code: string) => {
  const trimmed = code.trim()
  const bareCode = trimmed.match(/\d{6}/)?.[0] || trimmed
  return Array.from(new Set([trimmed, bareCode]))
}

export const getStockValueEm = async (code: string): Promise<StockValueEmItem[]> => {
  for (const candidate of buildCodeCandidates(code)) {
    const response = await axios.get<StockValueEmPayload, StockValueEmPayload>(
      `/django/api/stock/stock/stock-value-em/${candidate}/`
    )
    const series = Array.isArray(response)
      ? normalizeValueSeries(response)
      : normalizeValueSeries(response.data ?? response)

    if (series.length > 0) {
      return series
    }
  }
  return []
}

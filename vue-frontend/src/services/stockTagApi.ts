/**
 * 股票标记（因子选股）API服务
 * 功能：
 * 1. 获取股票标记列表（支持多因子组合筛选与分页）
 * 2. 获取可选的因子枚举项（choices）用于前端多选控件
 * 3. 获取单个股票标记详情（预留）
 *
 * 代码风格参考项目现有 services 模块，使用 axios 封装实例与严格的 TypeScript 类型。
 */
import axios from './axiosConfig'

/** 基础响应结构 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp: string
  data: T
}

/** 分页响应结构 */
export interface PaginatedData<T> {
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next?: boolean
  has_previous?: boolean
  results: T[]
}

/** 分页响应结构（因子选股） */
export interface PaginatedFactorStockTagData<T> {
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next?: boolean
  has_previous?: boolean
  data: T[]
}

/** 股票标记实体（简化为页面展示常用字段） */
export interface StockTag {
  id: number
  created_at: string
  updated_at: string
  stock_code: string
  stock_name: string
  pattern_type?: string
  pattern_type_display?: string
  technical_indicator_type?: string
  technical_indicator_type_display?: string
  stock_type?: string
  stock_type_display?: string
  market_cap_type?: string
  market_cap_type_display?: string
  pe_range_type?: string
  pe_range_type_display?: string
  pb_range_type?: string
  pb_range_type_display?: string
  industry_type?: string
  industry_type_display?: string
  volume_type?: string
  volume_type_display?: string
  volatility_type?: string
  volatility_type_display?: string
  trend_type?: string
  trend_type_display?: string
  stock?: number
}

/** 多因子筛选参数 */
export interface StockTagListParams {
  stock_codes?: string[]
  pattern_types?: string[]
  technical_indicator_types?: string[]
  stock_types?: string[]
  market_cap_types?: string[]
  pe_range_types?: string[]
  pb_range_types?: string[]
  industry_types?: string[]
  volume_types?: string[]
  volatility_types?: string[]
  trend_types?: string[]
  start_date?: string // YYYY-MM-DD（基于创建时间）
  end_date?: string   // YYYY-MM-DD（基于创建时间）
  page?: number
  page_size?: number
}

/** choices枚举项（用于下拉多选） */
export interface ChoiceItem {
  value: string
  label: string
}

export interface StockTagChoices {
  pattern_types: ChoiceItem[]
  technical_indicator_types: ChoiceItem[]
  stock_types: ChoiceItem[]
  market_cap_types: ChoiceItem[]
  pe_range_types: ChoiceItem[]
  pb_range_types: ChoiceItem[]
  industry_types: ChoiceItem[]
  volume_types: ChoiceItem[]
  volatility_types: ChoiceItem[]
  trend_types: ChoiceItem[]
}

// 原始choices类型（后端返回为二维数组，例如 [["BREAKOUT", "突破形态"]]）
export interface RawStockTagChoices {
  pattern_types?: [string, string][]
  technical_indicator_types?: [string, string][]
  stock_types?: [string, string][]
  market_cap_types?: [string, string][]
  pe_range_types?: [string, string][]
  pb_range_types?: [string, string][]
  industry_types?: [string, string][]
  volume_types?: [string, string][]
  volatility_types?: [string, string][]
  trend_types?: [string, string][]
}

// 规范化函数：将二维数组转换为 { value, label } 数组
const normalizeChoices = (raw: RawStockTagChoices): StockTagChoices => {
  const toItems = (arr?: [string, string][]) => (arr ? arr.map(([value, label]) => ({ value, label })) : [])
  return {
    pattern_types: toItems(raw.pattern_types),
    technical_indicator_types: toItems(raw.technical_indicator_types),
    stock_types: toItems(raw.stock_types),
    market_cap_types: toItems(raw.market_cap_types),
    pe_range_types: toItems(raw.pe_range_types),
    pb_range_types: toItems(raw.pb_range_types),
    industry_types: toItems(raw.industry_types),
    volume_types: toItems(raw.volume_types),
    volatility_types: toItems(raw.volatility_types),
    trend_types: toItems(raw.trend_types),
  }
}

/** API基础URL（与项目其它 individual_stock 模块保持一致） */
const API_BASE_URL = '/django/api/individual_stock/stock-tags'

/** 获取股票标记列表（多因子筛选 + 分页） */
export const getStockTagList = async (
  params: StockTagListParams = {}
): Promise<PaginatedFactorStockTagData<StockTag>> => {
  const response = await axios.get<PaginatedFactorStockTagData<StockTag>>(`${API_BASE_URL}/`, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      stock_codes: params.stock_codes,
      pattern_types: params.pattern_types,
      technical_indicator_types: params.technical_indicator_types,
      stock_types: params.stock_types,
      market_cap_types: params.market_cap_types,
      pe_range_types: params.pe_range_types,
      pb_range_types: params.pb_range_types,
      industry_types: params.industry_types,
      volume_types: params.volume_types,
      volatility_types: params.volatility_types,
      trend_types: params.trend_types,
      start_date: params.start_date,
      end_date: params.end_date,
    }
  })
  return response.data
}

/** 获取枚举项choices，用于前端选项填充 */
export const getStockTagChoices = async (): Promise<ApiResponse<StockTagChoices>> => {
  const response = await axios.get<ApiResponse<RawStockTagChoices>, ApiResponse<RawStockTagChoices>>(`${API_BASE_URL}/choices/`)
  // 将后端返回的二维数组结构映射为 Element Plus 可用的 { value, label }
  return {
    code: response.code,
    message: response.message,
    timestamp: response.timestamp,
    data: normalizeChoices(response.data || {})
  }
}

/** 获取单个股票标记详情（预留） */
export const getStockTagDetail = async (tagId: number): Promise<ApiResponse<StockTag>> => {
  const response = await axios.get<ApiResponse<StockTag>, ApiResponse<StockTag>>(`${API_BASE_URL}/${tagId}/`)
  return response
}
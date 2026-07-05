// 行业宽度与规模相关策略API服务
// 说明：封装行业MA宽度、行业规模宽度与行业实际产出估算三个接口，统一使用 axiosConfig，并返回 data 字段中的业务数据
import axios from './axiosConfig'

interface ApiResponse<T> {
  code: number
  message: string
  timestamp?: string
  data: T
}

interface AxiosLikeResponse<T> {
  status?: number
  statusText?: string
  data: T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function unwrapBusinessData<T>(
  payload: ApiResponse<T> | AxiosLikeResponse<ApiResponse<T> | T> | T
): T {
  if (
    isRecord(payload) &&
    'status' in payload &&
    'data' in payload
  ) {
    return unwrapBusinessData((payload as unknown as AxiosLikeResponse<ApiResponse<T> | T>).data)
  }

  if (
    isRecord(payload) &&
    'code' in payload &&
    'data' in payload
  ) {
    return (payload as unknown as ApiResponse<T>).data
  }
  return payload as T
}

/**
 * 行业MA宽度数据项
 */
export interface IndustryMaBreadthItem {
  date: string
  sector_code: string
  sector_name: string
  count_above_ma: number
  eligible_count: number
  breadth_ratio: number
}

/**
 * 行业MA宽度板块类型
 */
export type IndustryMaBreadthIdxType = '行业板块' | '概念板块' | '地域板块'

/**
 * 东方财富行业层级
 */
export type EastMoneyIndustryLevel = '东财一级行业' | '东财二级行业' | '东财三级行业'

/**
 * 行业MA宽度响应数据
 */
export interface IndustryMaBreadthData {
  total: number
  data: IndustryMaBreadthItem[]
  start_date: string
  end_date: string
  ma_window: number
  idx_type: IndustryMaBreadthIdxType
  level?: EastMoneyIndustryLevel
  query_time: string
}

/**
 * 行业MA宽度查询参数
 */
export interface IndustryMaBreadthQuery {
  startDate?: string
  endDate?: string
  maWindow?: number
  idxType?: IndustryMaBreadthIdxType
  level?: EastMoneyIndustryLevel
  /**
   * 东财板块代码，例如 BK1462.DC。
   * 传入后进入单行业模式：仅计算该板块并按成分股逐只拉取因子数据，
   * 请求次数与时间跨度无关，适合长区间查询；此时忽略 idxType/level。
   */
  sectorCode?: string
}

/**
 * 获取行业MA宽度数据
 * @param query 查询参数，支持日期范围、均线窗口、板块类型与行业层级；传入 sectorCode 时进入单行业模式
 * @returns IndustryMaBreadthData
 */
export async function fetchIndustryMaBreadth(
  query: IndustryMaBreadthQuery = {}
): Promise<IndustryMaBreadthData> {
  const params: Record<string, any> = {}
  if (query.startDate) params.start_date = query.startDate
  if (query.endDate) params.end_date = query.endDate
  params.ma_window = query.maWindow ?? 20
  // 单行业模式下 idx_type/level 会被后端忽略，此处保留传参不影响结果
  params.idx_type = query.idxType ?? '行业板块'
  if (query.level) params.level = query.level
  if (query.sectorCode) params.sector_code = query.sectorCode

  const res = await axios.get<
    ApiResponse<IndustryMaBreadthData> | IndustryMaBreadthData,
    ApiResponse<IndustryMaBreadthData> | AxiosLikeResponse<ApiResponse<IndustryMaBreadthData> | IndustryMaBreadthData> | IndustryMaBreadthData
  >(
    '/django/api/strategy/industry-ma-breadth/',
    { params }
  )
  return unwrapBusinessData(res)
}

/**
 * 行业规模宽度数据项
 */
export interface IndustryScaleBreadthItem {
  sector_code: string
  sector_name: string
  industry_total_market_value: number
  market_total_market_value: number
  industry_company_count: number
  market_total_company_count: number
  market_cap_ratio: number
  company_ratio: number
  scale_breadth: number
}

/**
 * 行业规模宽度响应数据
 */
export interface IndustryScaleBreadthData {
  total: number
  data: IndustryScaleBreadthItem[]
  sector_codes: string[]
  query_time: string
}

/**
 * 获取行业规模宽度数据
 * @param sectorCodes 行业板块代码列表，可选
 * @returns IndustryScaleBreadthData
 */
export async function fetchIndustryScaleBreadth(
  sectorCodes?: string[]
): Promise<IndustryScaleBreadthData> {
  const params: Record<string, any> = {}
  if (sectorCodes && sectorCodes.length > 0) params.sector_codes = sectorCodes.join(',')

  const res = await axios.get<
    ApiResponse<IndustryScaleBreadthData> | IndustryScaleBreadthData,
    ApiResponse<IndustryScaleBreadthData> | AxiosLikeResponse<ApiResponse<IndustryScaleBreadthData> | IndustryScaleBreadthData> | IndustryScaleBreadthData
  >(
    '/django/api/strategy/industry-scale-breadth/',
    { params }
  )
  return unwrapBusinessData(res)
}

/**
 * 行业实际产出估算数据项
 */
export interface IndustryActualOutputItem {
  sector_code: string
  sector_name: string
  top_n: number
  report_date: string
  top_n_revenue_sum: number
  crn_ratio: number
  estimated_industry_output: number
  industry_total_revenue: number
  company_count_with_reports: number
}

/**
 * 行业实际产出估算响应数据
 */
export interface IndustryActualOutputData {
  total: number
  data: IndustryActualOutputItem[]
  sector_codes: string[]
  top_n: number
  report_date: string | null
  query_time: string
}

/**
 * 获取行业实际产出估算数据
 * @param sectorCodes 行业板块代码列表，可选
 * @param topN 前N企业数量，默认为3
 * @param reportDate 报告期 YYYYMMDD，可选
 * @returns IndustryActualOutputData
 */
export async function fetchIndustryActualOutput(
  sectorCodes?: string[],
  topN: number = 3,
  reportDate?: string
): Promise<IndustryActualOutputData> {
  const params: Record<string, any> = { top_n: topN }
  if (sectorCodes && sectorCodes.length > 0) params.sector_codes = sectorCodes.join(',')
  if (reportDate) params.report_date = reportDate

  const res = await axios.get<
    ApiResponse<IndustryActualOutputData> | IndustryActualOutputData,
    ApiResponse<IndustryActualOutputData> | AxiosLikeResponse<ApiResponse<IndustryActualOutputData> | IndustryActualOutputData> | IndustryActualOutputData
  >(
    '/django/api/strategy/industry-actual-output/',
    { params }
  )
  return unwrapBusinessData(res)
}

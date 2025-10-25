// 行业宽度与规模相关策略API服务
// 说明：封装行业MA宽度、行业规模宽度与行业实际产出估算三个接口，统一使用 axiosConfig，并返回 data 字段中的业务数据
import axios from './axiosConfig'

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
 * 行业MA宽度响应数据
 */
export interface IndustryMaBreadthData {
  total: number
  data: IndustryMaBreadthItem[]
  start_date: string
  end_date: string
  ma_window: number
  sector_codes: string[]
  query_time: string
}

/**
 * 获取行业MA宽度数据
 * @param startDate 开始日期 YYYY-MM-DD，可选
 * @param endDate 结束日期 YYYY-MM-DD，可选
 * @param maWindow 移动平均窗口，默认20
 * @param sectorCodes 行业板块代码列表，可选
 * @returns IndustryMaBreadthData
 */
export async function fetchIndustryMaBreadth(
  startDate?: string,
  endDate?: string,
  maWindow: number = 20,
  sectorCodes?: string[]
): Promise<IndustryMaBreadthData> {
  const params: Record<string, any> = {}
  if (startDate) params.start_date = startDate
  if (endDate) params.end_date = endDate
  if (maWindow) params.ma_window = maWindow
  if (sectorCodes && sectorCodes.length > 0) params.sector_codes = sectorCodes.join(',')

  const res = await axios.get<IndustryMaBreadthData>(
    '/django/api/strategy/industry-ma-breadth/',
    { params }
  )
  return res.data
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

  const res = await axios.get<IndustryScaleBreadthData>(
    '/django/api/strategy/industry-scale-breadth/',
    { params }
  )
  return res.data
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
  report_date: string
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

  const res = await axios.get<IndustryActualOutputData>(
    '/django/api/strategy/industry-actual-output/',
    { params }
  )
  return res.data
}
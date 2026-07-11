// 大盘指数 MA 市场宽度策略API服务
// 说明：封装 /django/api/strategy/index-ma-breadth/ 接口，返回各大盘指数“收盘价高于 N 日均线”的成分股占比（市场宽度）
// 统一使用 axiosConfig，并解包 data 字段中的业务数据
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
  if (isRecord(payload) && 'status' in payload && 'data' in payload) {
    return unwrapBusinessData((payload as unknown as AxiosLikeResponse<ApiResponse<T> | T>).data)
  }

  if (isRecord(payload) && 'code' in payload && 'data' in payload) {
    return (payload as unknown as ApiResponse<T>).data
  }
  return payload as T
}

/**
 * 指数 MA 宽度数据项（每日每指数一条）
 */
export interface IndexMaBreadthItem {
  date: string
  index_code: string
  index_name: string
  count_above_ma: number
  eligible_count: number
  breadth_ratio: number
}

/**
 * 指数 MA 宽度响应数据
 */
export interface IndexMaBreadthData {
  total: number
  data: IndexMaBreadthItem[]
  start_date: string
  end_date: string
  ma_window: number
  index_codes: string[] | null
  errors: string[]
  query_time: string
}

/**
 * 指数 MA 宽度查询参数
 */
export interface IndexMaBreadthQuery {
  /** 开始日期 YYYY-MM-DD，缺省为过去 90 天 */
  startDate?: string
  /** 结束日期 YYYY-MM-DD，缺省为当天 */
  endDate?: string
  /** 移动平均窗口（交易日），建议使用 5/10/20/30/60/90/250 */
  maWindow?: number
  /** 指数代码列表；为空则使用与 major-index-rps 一致的默认指数列表 */
  indexCodes?: string[]
}

/**
 * 获取大盘指数 MA 市场宽度数据
 * @param query 查询参数，支持日期范围、均线窗口与指数代码列表
 * @returns IndexMaBreadthData
 */
export async function fetchIndexMaBreadth(
  query: IndexMaBreadthQuery = {}
): Promise<IndexMaBreadthData> {
  const params: Record<string, any> = {}
  if (query.startDate) params.start_date = query.startDate
  if (query.endDate) params.end_date = query.endDate
  params.ma_window = query.maWindow ?? 20
  if (query.indexCodes && query.indexCodes.length > 0) {
    params.index_codes = query.indexCodes.join(',')
  }

  const res = await axios.get<
    ApiResponse<IndexMaBreadthData> | IndexMaBreadthData,
    ApiResponse<IndexMaBreadthData> | AxiosLikeResponse<ApiResponse<IndexMaBreadthData> | IndexMaBreadthData> | IndexMaBreadthData
  >(
    '/django/api/strategy/index-ma-breadth/',
    { params }
  )
  return unwrapBusinessData(res)
}

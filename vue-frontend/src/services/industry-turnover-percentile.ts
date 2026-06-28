// 行业成交金额占比分位数API服务
import axios from './axiosConfig'
import type { EastMoneyIndustryLevel, IndustryMaBreadthIdxType } from './strategyBreadthApi'

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
 * 行业成交金额占比分位数数据项
 * 兼容后端新旧字段命名，便于前端平滑过渡到最新接口描述。
 */
export interface IndustryTurnoverPercentileItem {
  date: string
  sector_code: string
  sector_name: string
  idx_type?: IndustryMaBreadthIdxType
  level?: EastMoneyIndustryLevel
  amount?: number
  total_amount?: number
  daily_total_amount: number
  amount_ratio?: number
  turnover_ratio?: number
  amount_percentile?: number
  turnover_ratio_percentile?: number
}

/**
 * 行业成交金额占比分位数响应数据
 */
export interface IndustryTurnoverPercentileData {
  total: number
  data: IndustryTurnoverPercentileItem[]
  start_date: string
  end_date: string
  actual_end_date?: string
  idx_type: IndustryMaBreadthIdxType
  level?: EastMoneyIndustryLevel
  query_time?: string
}

/**
 * 行业成交金额占比分位数查询参数
 */
export interface IndustryTurnoverPercentileQuery {
  startDate?: string
  endDate?: string
  idxType?: IndustryMaBreadthIdxType
  level?: EastMoneyIndustryLevel
}

/**
 * 获取行业成交金额占比分位数数据
 * @param query 查询参数，支持日期范围、东财板块类型与行业层级
 * @returns Promise<IndustryTurnoverPercentileData> 行业成交金额占比分位数数据
 */
export async function fetchIndustryTurnoverPercentile(
  query: IndustryTurnoverPercentileQuery = {}
): Promise<IndustryTurnoverPercentileData> {
  const params: Record<string, any> = {
    idx_type: query.idxType ?? '行业板块'
  }

  if (query.startDate) params.start_date = query.startDate
  if (query.endDate) params.end_date = query.endDate
  if (query.level) params.level = query.level

  try {
    const response = await axios.get<
      ApiResponse<IndustryTurnoverPercentileData> | IndustryTurnoverPercentileData,
      ApiResponse<IndustryTurnoverPercentileData> | AxiosLikeResponse<ApiResponse<IndustryTurnoverPercentileData> | IndustryTurnoverPercentileData> | IndustryTurnoverPercentileData
    >(
      '/django/api/strategy/industry-turnover-percentile/',
      { params }
    )

    return unwrapBusinessData(response)
  } catch (error) {
    console.error('获取行业成交金额占比分位数数据失败:', error)
    throw error
  }
}

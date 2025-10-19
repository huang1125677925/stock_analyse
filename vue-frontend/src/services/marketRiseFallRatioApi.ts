/**
 * 涨跌比数据API服务
 * 功能：
 * 1. 获取指定指数在日期范围内的涨跌比数据
 * 2. 返回用于前端热力图的原始数据列表
 */
import axios from './axiosConfig'

// API基础URL
const API_BASE_URL = '/django/api/market'

/**
 * 涨跌比数据项接口
 */
export interface RiseFallRatioItem {
  id: number
  date: string
  index_code: string
  index_name: string
  close: number
  high20: number
  low20: number
  high60: number
  low60: number
  high120: number
  low120: number
  rise_fall_ratio_20: number
  rise_fall_ratio_60: number
  rise_fall_ratio_120: number
  created_at: string
  updated_at: string
}

/**
 * 涨跌比列表响应数据
 */
export interface RiseFallRatioListResponse {
  count: number
  results: RiseFallRatioItem[]
}

/**
 * API通用响应结构
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  timestamp: string
  data: T
}

/**
 * 获取涨跌比数据列表
 * @param params.indexCode 指数代码，可选：'all' | 'sz50' | 'hs300' | 'zz500'
 * @param params.startDate 开始日期，格式：YYYY-MM-DD
 * @param params.endDate 结束日期，格式：YYYY-MM-DD
 * @param params.limit 返回数量限制（可选）
 * @returns Promise<RiseFallRatioItem[]> 涨跌比数据列表
 */
export async function fetchRiseFallRatioData(params: {
  indexCode: 'all' | 'sz50' | 'hs300' | 'zz500'
  startDate: string
  endDate: string
  limit?: number
}): Promise<RiseFallRatioItem[]> {
  const { indexCode, startDate, endDate, limit } = params

  // 这里的axios实例在响应拦截器中返回的是后端的“data”字段，因此泛型指定为内部数据结构
  const response = await axios.get<RiseFallRatioListResponse>(
    `${API_BASE_URL}/rise-fall-ratio/`,
    {
      params: {
        index_code: indexCode,
        start_date: startDate,
        end_date: endDate,
        limit
      }
    }
  )

  return response.data?.results ?? []
}
import axios from './axiosConfig'

/**
 * 接口：券商月度金股（broker_recommend 直通代理）
 * 功能：封装 /django/api/tasks/broker-recommend/ 接口调用，用于查询券商推荐股票（按月）
 * 参数：
 *  - month: 月度（YYYYMM，必填）
 *  - fields?: 字段列表（逗号分隔）
 * 返回值：BrokerRecommendData（包含 records 列表或 fields+items 结构）
 * 事件：无
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface BrokerRecommendQueryParams {
  month: string
  fields?: string
}

export interface BrokerRecommendData {
  interface: string
  count: number
  records?: Record<string, any>[]
  fields?: string[]
  items?: (string | number)[][]
}

export async function fetchBrokerRecommend(params: BrokerRecommendQueryParams): Promise<BrokerRecommendData> {
  const res = await axios.get<ApiResponse<BrokerRecommendData>, ApiResponse<BrokerRecommendData>>('/django/api/tasks/broker-recommend/', {
    params
  })
  return res.data
}
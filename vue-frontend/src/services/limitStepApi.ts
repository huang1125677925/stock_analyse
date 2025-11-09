import axios from './axiosConfig'

/**
 * 接口：连板天梯（limit_step 直通代理）
 * 功能：封装 /django/api/tasks/limit-step/ 接口调用，用于查询市场连板梯度数据
 * 参数：
 *  - trade_date?: 交易日期 YYYYMMDD
 *  - start_date?: 开始日期 YYYYMMDD
 *  - end_date?: 结束日期 YYYYMMDD
 *  - fields?: 字段列表（逗号分隔）
 * 返回值：LimitStepData（包含 records 列表或 fields+items 结构）
 * 事件：无
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface LimitStepQueryParams {
  trade_date?: string
  start_date?: string
  end_date?: string
  fields?: string
}

export interface LimitStepData {
  interface: string
  count: number
  records?: Record<string, any>[]
  fields?: string[]
  items?: (string | number)[][]
}

export async function fetchLimitStep(params: LimitStepQueryParams): Promise<LimitStepData> {
  const res = await axios.get<ApiResponse<LimitStepData>, ApiResponse<LimitStepData>>('/django/api/tasks/limit-step/', {
    params
  })
  return res.data
}
import axios from './axiosConfig'

/**
 * 接口：AH股比价（stk_ah_comparison 直通代理）
 * 功能：封装 /django/api/tasks/ah-comparison/ 接口调用，用于查询 A/H 股比价数据
 * 参数：
 *  - ts_code?: A股股票代码（xxxxxx.SH/SZ/BJ）
 *  - hk_code?: 港股股票代码（xxxxx.HK）
 *  - trade_date?: 交易日期 YYYYMMDD
 *  - start_date?: 开始日期 YYYYMMDD
 *  - end_date?: 结束日期 YYYYMMDD
 *  - fields?: 字段列表（逗号分隔）
 * 返回值：AhComparisonData（包含 records 列表或 fields+items 结构）
 * 事件：无（仅请求数据，不触发外部事件）
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface AhComparisonQueryParams {
  ts_code?: string
  hk_code?: string
  trade_date?: string
  start_date?: string
  end_date?: string
  fields?: string
}

export interface AhComparisonData {
  interface: string
  count: number
  // 首选对象数组返回
  records?: Record<string, any>[]
  // 兼容 Tushare 原始形态
  fields?: string[]
  items?: (string | number)[][]
}

export async function fetchAhComparison(params: AhComparisonQueryParams): Promise<AhComparisonData> {
  const res = await axios.get<ApiResponse<AhComparisonData>, ApiResponse<AhComparisonData>>('/django/api/tasks/ah-comparison/', {
    params
  })
  return res.data
}
import axios from './axiosConfig'

/**
 * 接口：每日筹码及胜率（cyq_perf 直通代理）
 * 功能：封装 /django/api/tasks/cyq-perf/ 接口调用，用于查询每日筹码分布与胜率
 * 参数：
 *  - ts_code?: 股票代码（xxxxxx.SH/SZ/BJ）
 *  - trade_date?: 交易日期 YYYYMMDD
 *  - start_date?: 开始日期 YYYYMMDD
 *  - end_date?: 结束日期 YYYYMMDD
 *  - fields?: 字段列表（逗号分隔）
 * 返回值：CyqPerfData（包含 records 列表或 fields+items 结构）
 * 事件：无
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface CyqPerfQueryParams {
  ts_code?: string
  trade_date?: string
  start_date?: string
  end_date?: string
  fields?: string
}

export interface CyqPerfData {
  interface: string
  count: number
  records?: Record<string, any>[]
  fields?: string[]
  items?: (string | number)[][]
}

export async function fetchCyqPerf(params: CyqPerfQueryParams): Promise<CyqPerfData> {
  const res = await axios.get<ApiResponse<CyqPerfData>, ApiResponse<CyqPerfData>>('/django/api/tasks/cyq-perf/', {
    params
  })
  return res.data
}
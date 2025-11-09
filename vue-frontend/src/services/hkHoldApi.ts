import axios from './axiosConfig'

/**
 * 接口：沪深港股通持股明细（hk_hold 直通代理）
 * 功能：封装 /django/api/tasks/hk-hold/ 接口调用，用于查询沪深港股通持股明细（港交所来源）
 * 参数：
 *  - code?: 交易所代码
 *  - ts_code?: TS股票代码（xxxxxx.SH/SZ/HK）
 *  - trade_date?: 交易日期 YYYYMMDD
 *  - start_date?: 开始日期 YYYYMMDD
 *  - end_date?: 结束日期 YYYYMMDD
 *  - exchange?: SH/SZ/HK
 *  - fields?: 字段列表（逗号分隔）
 * 返回值：HkHoldData（包含 records 列表或 fields+items 结构）
 * 事件：无
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface HkHoldQueryParams {
  code?: string
  ts_code?: string
  trade_date?: string
  start_date?: string
  end_date?: string
  exchange?: 'SH' | 'SZ' | 'HK'
  fields?: string
}

export interface HkHoldData {
  interface: string
  count: number
  records?: Record<string, any>[]
  fields?: string[]
  items?: (string | number)[][]
}

export async function fetchHkHold(params: HkHoldQueryParams): Promise<HkHoldData> {
  const res = await axios.get<ApiResponse<HkHoldData>, ApiResponse<HkHoldData>>('/django/api/tasks/hk-hold/', {
    params
  })
  return res.data
}
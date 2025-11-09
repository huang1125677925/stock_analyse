import axios from './axiosConfig'

/**
 * 接口：沪深股通十大成交股（hsgt_top10 直通代理）
 * 功能：封装 /django/api/tasks/hsgt-top10/ 接口调用，用于查询每日沪深股通十大成交股
 * 参数：
 *  - ts_code?: 股票代码
 *  - trade_date?: 交易日期 YYYYMMDD
 *  - start_date?: 开始日期 YYYYMMDD
 *  - end_date?: 结束日期 YYYYMMDD
 *  - market_type?: 市场类型 1(上交所)/3(深交所)
 *  - fields?: 字段列表（逗号分隔）
 * 返回值：HsgtTop10Data（包含 records 列表或 fields+items 结构）
 * 事件：无
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface HsgtTop10QueryParams {
  ts_code?: string
  trade_date?: string
  start_date?: string
  end_date?: string
  market_type?: 1 | 3
  fields?: string
}

export interface HsgtTop10Data {
  interface: string
  count: number
  records?: Record<string, any>[]
  fields?: string[]
  items?: (string | number)[][]
}

export async function fetchHsgtTop10(params: HsgtTop10QueryParams): Promise<HsgtTop10Data> {
  const res = await axios.get<ApiResponse<HsgtTop10Data>, ApiResponse<HsgtTop10Data>>('/django/api/tasks/hsgt-top10/', {
    params
  })
  return res.data
}
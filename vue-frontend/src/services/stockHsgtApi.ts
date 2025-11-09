import axios from './axiosConfig'

/**
 * 接口：沪深港通股票列表（stock_hsgt 直通代理）
 * 功能：封装 /django/api/tasks/stock-hsgt/ 接口调用，用于查询沪深港通股票列表
 * 参数：
 *  - type: 类型（必选）HK_SZ/SZ_HK/HK_SH/SH_HK
 *  - ts_code?: 股票代码
 *  - trade_date?: 交易日期 YYYYMMDD
 *  - start_date?: 开始日期 YYYYMMDD
 *  - end_date?: 结束日期 YYYYMMDD
 *  - fields?: 字段列表（逗号分隔）
 * 返回值：StockHsgtData（包含 records 列表或 fields+items 结构）
 * 事件：无
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export type StockHsgtType = 'HK_SZ' | 'SZ_HK' | 'HK_SH' | 'SH_HK'

export interface StockHsgtQueryParams {
  type: StockHsgtType
  ts_code?: string
  trade_date?: string
  start_date?: string
  end_date?: string
  fields?: string
}

export interface StockHsgtData {
  interface: string
  count: number
  records?: Record<string, any>[]
  fields?: string[]
  items?: (string | number)[][]
}

export async function fetchStockHsgt(params: StockHsgtQueryParams): Promise<StockHsgtData> {
  const res = await axios.get<ApiResponse<StockHsgtData>, ApiResponse<StockHsgtData>>('/django/api/tasks/stock-hsgt/', {
    params
  })
  return res.data
}
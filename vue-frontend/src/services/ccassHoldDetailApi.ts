import axios from './axiosConfig'

/**
 * 接口：中央结算系统持股明细（ccass_hold_detail 直通代理）
 * 功能：封装 /django/api/tasks/ccass-hold-detail/ 接口调用，用于查询港股中央结算系统持股明细数据
 * 参数：
 *  - ts_code?: 股票代码（e.g. 605009.SH / 00960.HK）
 *  - hk_code?: 港交所代码（e.g. 95009）
 *  - trade_date?: 交易日期 YYYYMMDD
 *  - start_date?: 开始日期 YYYYMMDD
 *  - end_date?: 结束日期 YYYYMMDD
 *  - fields?: 字段列表（逗号分隔）
 * 返回值：CcassHoldDetailData（包含 records 列表或 fields+items 结构）
 * 事件：无
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface CcassHoldDetailQueryParams {
  ts_code?: string
  hk_code?: string
  trade_date?: string
  start_date?: string
  end_date?: string
  fields?: string
}

export interface CcassHoldDetailData {
  interface: string
  count: number
  records?: Record<string, any>[]
  fields?: string[]
  items?: (string | number)[][]
}

export async function fetchCcassHoldDetail(params: CcassHoldDetailQueryParams): Promise<CcassHoldDetailData> {
  const res = await axios.get<ApiResponse<CcassHoldDetailData>, ApiResponse<CcassHoldDetailData>>('/django/api/tasks/ccass-hold-detail/', {
    params
  })
  return res.data
}
import axios from './axiosConfig'

/**
 * 接口：游资每日明细（hm_detail 直通代理）
 * 功能：封装 /django/api/tasks/hm-detail/ 接口调用，用于查询游资每日的交易明细（可按股票或游资名称）
 * 参数：
 *  - ts_code?: 股票代码
 *  - hm_name?: 游资名称
 *  - trade_date?: 交易日期 YYYYMMDD
 *  - start_date?: 开始日期 YYYYMMDD
 *  - end_date?: 结束日期 YYYYMMDD
 *  - fields?: 字段列表（逗号分隔）
 * 返回值：HmDetailData（包含 records 列表或 fields+items 结构）
 * 事件：无
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface HmDetailQueryParams {
  ts_code?: string
  hm_name?: string
  trade_date?: string
  start_date?: string
  end_date?: string
  fields?: string
}

export interface HmDetailData {
  interface: string
  count: number
  records?: Record<string, any>[]
  fields?: string[]
  items?: (string | number)[][]
}

export async function fetchHmDetail(params: HmDetailQueryParams): Promise<HmDetailData> {
  const res = await axios.get<ApiResponse<HmDetailData>, ApiResponse<HmDetailData>>('/django/api/tasks/hm-detail/', {
    params
  })
  return res.data
}
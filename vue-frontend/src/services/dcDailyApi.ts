import axios from './axiosConfig'

/**
 * 接口：东财板块日频行情（dc_daily）
 * 功能：封装 /django/api/tasks/dc-daily/ 接口调用，用于获取板块近 N 天的日频数据
 * 参数：
 *  - tsCode: 板块代码（格式：xxxxx.DC）
 *  - idxType: 板块类型（概念板块/行业板块/地域板块）
 *  - startDate: 开始日期 YYYYMMDD
 *  - endDate: 结束日期 YYYYMMDD
 *  - fields?: 字段列表（逗号分隔）
 * 返回值：DcDailyData（包含 records 列表）
 * 事件：无（仅请求数据，不触发外部事件）
 */

export interface DcDailyRecord {
  ts_code: string
  trade_date: string
  close: number
  open: number
  high: number
  low: number
  change: number
  pct_change: number
  vol: number
  amount: number
  swing: number
  turnover_rate: number
}

export interface DcDailyData {
  interface: string
  count: number
  records: DcDailyRecord[]
}

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp: string
  data: T
}

export interface DcDailyQueryParams {
  ts_code: string
  idx_type: string
  start_date: string
  end_date: string
  fields?: string
}

export async function fetchDcDaily(params: DcDailyQueryParams): Promise<DcDailyData> {
  const res = await axios.get<ApiResponse<DcDailyData>, ApiResponse<DcDailyData>>('/django/api/tasks/dc-daily/', {
    params
  })
  return res.data
}

/**
 * 获取最近 N 天的 dc_daily 数据（默认 30 天）
 */
export async function fetchDcDailyLastNDays(
  tsCode: string,
  idxType: string,
  days: number = 30,
  fields: string = 'trade_date,close,open,high,low,pct_change,vol,amount,turnover_rate'
): Promise<DcDailyData> {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - Math.max(0, days - 1))

  const toYmd = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  }

  return fetchDcDaily({
    ts_code: tsCode,
    idx_type: idxType,
    start_date: toYmd(start),
    end_date: toYmd(end),
    fields
  })
}
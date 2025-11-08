import axios from './axiosConfig'

/**
 * 接口：东方财富概念板块（dc_index）
 * 功能：封装 /django/api/tasks/dc-index/ 接口调用，用于获取概念板块的领涨数据（可按日期范围）
 * 参数：
 *  - ts_code?: 概念代码（支持多个，逗号分隔），优先使用
 *  - name?: 概念名称（例如：人形机器人），当没有 ts_code 时使用
 *  - start_date/end_date: 日期范围 YYYYMMDD
 *  - fields?: 字段列表（逗号分隔）
 * 返回值：DcIndexData（包含 records 列表）
 * 事件：无
 */

export interface DcIndexRecord {
  ts_code: string
  trade_date: string
  name: string
  leading: string
  leading_code: string
  pct_change: number
  leading_pct: number
  total_mv: number
  turnover_rate: number
  up_num: number
  down_num: number
}

export interface DcIndexData {
  interface: string
  count: number
  records: DcIndexRecord[]
}

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp: string
  data: T
}

export interface DcIndexQueryParams {
  ts_code?: string
  name?: string
  start_date?: string
  end_date?: string
  fields?: string
}

export async function fetchDcIndex(params: DcIndexQueryParams): Promise<DcIndexData> {
  const res = await axios.get<ApiResponse<DcIndexData>, ApiResponse<DcIndexData>>('/django/api/tasks/dc-index/', {
    params
  })
  return res.data
}

/**
 * 获取最近 N 天的 dc_index 数据（默认 30 天）
 */
export async function fetchDcIndexLastNDays(
  { tsCode, name }: { tsCode?: string; name?: string },
  days: number = 30,
  fields: string = 'trade_date,name,leading,leading_code,leading_pct,pct_change,total_mv,turnover_rate,up_num,down_num'
): Promise<DcIndexData> {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - Math.max(0, days - 1))

  const toYmd = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  }

  const params: DcIndexQueryParams = {
    start_date: toYmd(start),
    end_date: toYmd(end),
    fields
  }
  if (tsCode) params.ts_code = tsCode
  else if (name) params.name = name

  return fetchDcIndex(params)
}
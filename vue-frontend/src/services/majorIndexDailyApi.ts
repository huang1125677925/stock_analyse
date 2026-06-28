import axios from './axiosConfig'

/**
 * 服务名称：majorIndexDailyApi
 * 功能：
 * - 封装调用 `/django/api/index/major-index-daily/` 接口
 * - 获取国内/国际主要指数在指定时间范围内的日线行情数据
 * 参数：
 * - scope?: 返回范围，支持 `domestic` / `global` / `all`
 * - tradeDate?: 指定交易日，格式 `YYYYMMDD`
 * - startDate?: 开始日期，格式 `YYYYMMDD`
 * - endDate?: 结束日期，格式 `YYYYMMDD`
 * - domesticCodes?: 国内指数代码列表，逗号分隔
 * - globalCodes?: 国际指数代码列表，逗号分隔
 * 返回值：
 * - `MajorIndexDailyData`，包含 records 与 meta 信息
 * 事件：无
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export type MajorIndexDailyScope = 'domestic' | 'global' | 'all'

export interface MajorIndexDailyRecord {
  source: 'domestic' | 'global' | string
  name: string
  ts_code: string
  trade_date: string
  open: number | null
  close: number | null
  high: number | null
  low: number | null
  pre_close?: number | null
  change?: number | null
  pct_chg?: number | null
  swing?: number | null
  vol?: number | null
  amount?: number | null
}

export interface MajorIndexDailyMeta {
  scope: MajorIndexDailyScope | string
  domestic_codes?: string[]
  global_codes?: string[]
  errors?: string[]
}

export interface MajorIndexDailyData {
  interface: string
  count: number
  records: MajorIndexDailyRecord[]
  meta?: MajorIndexDailyMeta
}

export interface FetchMajorIndexDailyParams {
  scope?: MajorIndexDailyScope
  tradeDate?: string
  startDate?: string
  endDate?: string
  domesticCodes?: string
  globalCodes?: string
}

/**
 * 获取主要指数日线行情
 * 参数：
 * - params(FetchMajorIndexDailyParams): 查询参数
 * 返回值：
 * - Promise<MajorIndexDailyData>
 * 事件：无
 */
export async function fetchMajorIndexDaily(
  params: FetchMajorIndexDailyParams
): Promise<MajorIndexDailyData> {
  const response = await axios.get<ApiResponse<MajorIndexDailyData>, ApiResponse<MajorIndexDailyData>>(
    '/django/api/index/major-index-daily/',
    {
      params: {
        scope: params.scope,
        trade_date: params.tradeDate,
        start_date: params.startDate,
        end_date: params.endDate,
        domestic_codes: params.domesticCodes,
        global_codes: params.globalCodes,
      },
    }
  )

  return response.data
}

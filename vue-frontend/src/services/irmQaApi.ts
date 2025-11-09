import axios from './axiosConfig'

/**
 * 组件/服务名称：irmQaApi
 * 功能：封装调用后端 `/django/api/tasks/irm-qa-sh/` 与 `/django/api/tasks/irm-qa-sz/` 接口，获取上证/深证互动问答数据。
 * 参数：
 * - tsCode?: 股票代码
 * - startDate?: 开始日期，`YYYYMMDD`
 * - endDate?: 结束日期，`YYYYMMDD`
 * - tradeDate?: 交易日期，`YYYYMMDD`
 * - pubDateStart?: 发布开始日期，`YYYY-MM-DD HH:MM:SS`
 * - pubDateEnd?: 发布结束日期，`YYYY-MM-DD HH:MM:SS`
 * - fields?: 限定返回字段列表（逗号分隔）
 * 返回值：标准响应结构，包含 `records` 列表和统计信息。
 * 事件：无（服务函数不触发事件）。
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface IrmQaItem {
  [key: string]: string | number | null
}

export interface IrmQaData {
  count: number
  interface: string
  records: IrmQaItem[]
}

export interface FetchIrmQaParams {
  tsCode?: string
  startDate?: string
  endDate?: string
  tradeDate?: string
  pubDateStart?: string
  pubDateEnd?: string
  fields?: string
}

export async function fetchIrmQaSh(params: FetchIrmQaParams): Promise<IrmQaData> {
  const res = await axios.get<ApiResponse<IrmQaData>, ApiResponse<IrmQaData>>(
    '/django/api/tasks/irm-qa-sh/',
    {
      params: {
        ts_code: params.tsCode,
        start_date: params.startDate,
        end_date: params.endDate,
        trade_date: params.tradeDate,
        pub_date_start: params.pubDateStart,
        pub_date_end: params.pubDateEnd,
        fields: params.fields,
      },
    }
  )
  return res.data
}

export async function fetchIrmQaSz(params: FetchIrmQaParams): Promise<IrmQaData> {
  const res = await axios.get<ApiResponse<IrmQaData>, ApiResponse<IrmQaData>>(
    '/django/api/tasks/irm-qa-sz/',
    {
      params: {
        ts_code: params.tsCode,
        start_date: params.startDate,
        end_date: params.endDate,
        trade_date: params.tradeDate,
        pub_date_start: params.pubDateStart,
        pub_date_end: params.pubDateEnd,
        fields: params.fields,
      },
    }
  )
  return res.data
}
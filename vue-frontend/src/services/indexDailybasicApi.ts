import axios from './axiosConfig'

/**
 * 组件/服务名称：indexDailybasicApi
 * 功能：封装调用后端 `/django/api/index/index-dailybasic/` 接口，获取大盘指数每日基础指标数据。
 * 参数：
 * - tsCode?: 指数代码，如 `000001.SH`
 * - startDate?: 开始日期，`YYYYMMDD`
 * - endDate?: 结束日期，`YYYYMMDD`
 * - tradeDate?: 指定交易日，`YYYYMMDD`
 * - fields?: 限定返回字段列表（逗号分隔）
 * 返回值：标准响应结构，包含 `records` 列表和统计信息。
 * 事件：无（服务函数不触发事件）。
 */

// 通用响应结构（保持与项目其余 services 一致）
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

// 后端统一数据结构（常见形态）
export interface IndexDailybasicData {
  count: number
  interface: string
  records: IndexDailybasicItem[]
}

// 记录项：字段可能随后端配置变化，使用可扩展结构
export interface IndexDailybasicItem {
  [key: string]: string | number | null
}

export interface FetchIndexDailybasicParams {
  tsCode?: string
  startDate?: string
  endDate?: string
  tradeDate?: string
  fields?: string
}

/**
 * 获取指数每日基础指标数据
 */
export async function fetchIndexDailybasic(
  params: FetchIndexDailybasicParams
): Promise<IndexDailybasicData> {
  const res = await axios.get<ApiResponse<IndexDailybasicData>, ApiResponse<IndexDailybasicData>>(
    '/django/api/index/index-dailybasic/',
    {
      params: {
        ts_code: params.tsCode,
        start_date: params.startDate,
        end_date: params.endDate,
        trade_date: params.tradeDate,
        fields: params.fields,
      },
    }
  )
  return res.data
}
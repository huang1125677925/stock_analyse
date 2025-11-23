import axios from './axiosConfig'

/**
 * 组件/服务名称：strategyIndexAnalysisApi
 * 功能：封装调用后端 `/django/api/strategy/index-analysis/macd-up-prediction/{stock_code}/` 接口，
 *       获取指定指数最近 N 天预测上涨的交易日期列表（基于已保存的 MACD XGBoost 模型）。
 * 参数：
 * - stockCode: 指数 TS 代码（必填），例如 `000001.SH`
 * - days?: 查询天数（可选，默认 30）
 * - token?: 令牌（可选，用于覆盖环境变量）
 * 返回值：`MacdXgbGrowthDatesData`，包含 `ts_code`、`list`（日期列表）、`count`、`params`。
 * 事件：无（服务函数不触发事件）。
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface MacdXgbGrowthDatesData {
  ts_code: string
  list: string[]
  count: number
  params: {
    days?: number
    token?: string
  }
}

/**
 * 获取指数 MACD XGBoost 最近上涨日预测列表
 */
export async function fetchIndexMacdUpPredictionDates(
  stockCode: string,
  days: number = 30,
  token?: string
): Promise<MacdXgbGrowthDatesData> {
  const url = `/django/api/strategy/index-analysis/macd-up-prediction/${stockCode}/`
  const res = await axios.get<ApiResponse<MacdXgbGrowthDatesData>, ApiResponse<MacdXgbGrowthDatesData>>(url, {
    params: {
      token
    }
  })
  return res.data
}
import axios from './axiosConfig'

/**
 * 服务名称：mlApi
 * 功能：封装机器学习相关接口调用。
 *  - actual-rise-ratio：查询选股记录中的5日实际上涨比例，支持日期区间与预测类型过滤。
 * 参数：
 *  - stockCode: string 路径参数（必填）
 *  - params: { startDate?: string; endDate?: string; predictionType?: string }
 * 返回值：统一响应结构（code、message、data）。
 * 事件：无
 */

export interface ApiResponseAny<T = any> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface ActualRiseRatioParams {
  stockCode: string
  startDate?: string
  endDate?: string
  predictionType?: string
}

/**
 * 查询5日实际上涨比例
 */
export async function fetchActualRiseRatio(
  stockCode: string,
  params: { startDate?: string; endDate?: string; predictionType?: string } = {}
): Promise<ApiResponseAny> {
  const url = `/django/api/strategy/individual-analysis/actual-rise-ratio/`
  const res = await axios.get<ApiResponseAny, ApiResponseAny>(url, {
    params: {
      start_date: params.startDate,
      end_date: params.endDate,
      prediction_type: params.predictionType
    }
  })
  return res
}
import axios from './axiosConfig'

/**
 * AI 分析请求参数
 */
export interface AiAnalyzeRequest {
  data: any
  interface_name?: string
  prompt?: string
}

/**
 * AI 分析响应
 */
export interface AiAnalyzeResponse {
  result: string
  // 其他可能的字段
}

/**
 * 提交数据进行 AI 分析
 * @param data 需要分析的数据
 * @param interfaceName 接口名称，默认为 'default'
 * @returns 分析结果
 */
export const analyzeData = async (data: any, interfaceName: string = 'default') => {
  // 设置较长的超时时间，因为 AI 分析可能需要较长时间
  const timeout = 120000 // 120 秒

  const response = await axios.post<AiAnalyzeResponse>('/django/api/ai/analyze/', {
    data,
    interface_name: interfaceName
  }, {
    timeout
  })
  
  return response.data
}

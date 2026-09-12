/**
 * 兼容层：早期版本的 AI 分析调用
 *
 * 背景：旧实现请求后端 `/django/api/ai/analyze/`（该接口当前并不存在，返回 404）。
 * 现在前端改为「浏览器直连 DeepSeek」，配置入口在「DeepSeek 设置」弹窗中，
 * 全局入口按钮见 components/AiAnalysisButton.vue。
 *
 * 本文件保留旧的导出名以兼容可能的外部引用，内部已转发到新的直连实现。
 */
import { runPageAnalysis } from './aiAnalysis'
import {
  getAiAnalysisPageTitle,
  getAiAnalysisRoutePath,
  safeStringify,
  type AiAnalysisPayload,
} from './aiPageDataStore'

/** 旧版请求参数（已废弃，仅用于类型兼容） */
export interface AiAnalyzeRequest {
  data: unknown
  interface_name?: string
  prompt?: string
}

/** 旧版响应结构（result 为分析文本） */
export interface AiAnalyzeResponse {
  result: string
}

/**
 * 提交数据进行 DeepSeek 分析（兼容旧签名）。
 * 参数：data 需要分析的数据；interfaceName 数据名称，作为分析数据来源标题；prompt 分析方向。
 * 返回值：{ result } —— 分析结果文本。
 * @deprecated 请使用 services/aiAnalysis.ts 的 runPageAnalysis，或页面顶部的全局分析按钮。
 */
export const analyzeData = async (
  data: unknown,
  interfaceName: string = 'default',
  prompt: string = '',
): Promise<AiAnalyzeResponse> => {
  const payload: AiAnalysisPayload = {
    routePath: getAiAnalysisRoutePath(),
    pageTitle: getAiAnalysisPageTitle() || interfaceName,
    collectedAt: Date.now(),
    sources: [
      {
        id: `legacy:${interfaceName}`,
        name: interfaceName,
        kind: 'page',
        capturedAt: Date.now(),
        data,
      },
    ],
    charLength: safeStringify(data).length,
  }

  const result = await runPageAnalysis({ payload, direction: prompt })
  return { result: result.content }
}

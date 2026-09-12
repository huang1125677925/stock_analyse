/**
 * 页面数据分析编排
 *
 * 功能：
 * - 把「当前页面采集到的数据 + 用户填写分析方向」组装成 DeepSeek 对话消息
 * - 调用 DeepSeek 直连客户端，支持流式回调，供弹窗实时渲染结果
 *
 * 与界面解耦：组件只负责展示状态与文本，数据采集、提示词构造、错误处理都在这里。
 */
import { chatCompletion, type ChatMessage } from './deepseekApi'
import { deepseekConfig } from './deepseekConfig'
import {
  collectAiAnalysisPayload,
  safeStringify,
  type AiAnalysisPayload,
  type AiAnalysisSource,
} from './aiPageDataStore'

/** 未填写分析方向时的默认指令 */
export const DEFAULT_ANALYSIS_DIRECTION =
  '请先总结当前页面数据反映的市场状态，再指出关键指标的变化方向、显著异常与需要关注的风险。'

/** 常用分析方向快捷选项，供弹窗一键填入 */
export const ANALYSIS_DIRECTION_PRESETS = [
  '总结当前页面数据反映的市场状态与主要矛盾',
  '挑出数据中的显著异常与背离，并说明可能原因',
  '按强弱排序，指出当前最强的行业/指数及其驱动因素',
  '结合数据给出后续跟踪要点与风险提示',
] as const

/** 运行参数 */
export interface RunPageAnalysisOptions {
  /** 用户填写的分析方向 */
  direction?: string
  /** 预先采集好的数据包（不传则现采） */
  payload?: AiAnalysisPayload
  /** 流式正文回调 */
  onDelta?: (delta: string, full: string) => void
  /** 推理模型思维链回调 */
  onReasoningDelta?: (delta: string, full: string) => void
  /** 取消信号 */
  signal?: AbortSignal
}

/** 运行结果 */
export interface PageAnalysisResult {
  content: string
  reasoning: string
  model: string
  latencyMs: number
  payload: AiAnalysisPayload
  direction: string
  /** 实际发送的提示词字符数 */
  promptChars: number
}

/**
 * 格式化时间戳为 YYYY-MM-DD HH:mm:ss。
 * 参数：timestamp 毫秒时间戳。
 * 返回值：可读时间字符串。
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/**
 * 描述单个数据来源的标题行，包含接口、参数与采集时间。
 * 参数：source 数据来源；index 序号。
 * 返回值：Markdown 小标题。
 */
function describeSource(source: AiAnalysisSource, index: number): string {
  const parts: string[] = [`### 数据来源 ${index}：${source.name}`]
  const meta: string[] = []
  if (source.kind === 'api' && source.endpoint) meta.push(`接口：${source.endpoint}`)
  if (source.params && Object.keys(source.params).length > 0) {
    meta.push(`请求参数：${safeStringify(source.params)}`)
  }
  meta.push(`采集时间：${formatTime(source.capturedAt)}`)
  if (meta.length) parts.push(meta.join('；'))
  return parts.join('\n')
}

/**
 * 构造发送给 DeepSeek 的消息列表。
 * 参数：payload 数据包；direction 用户分析方向。
 * 返回值：system + user 两条消息。
 */
export function buildAnalysisMessages(
  payload: AiAnalysisPayload,
  direction: string,
): ChatMessage[] {
  const effectiveDirection = direction.trim() || DEFAULT_ANALYSIS_DIRECTION
  const apiCount = payload.sources.filter((source) => source.kind === 'api').length
  const pageCount = payload.sources.length - apiCount

  const header = [
    '## 页面信息',
    `- 页面名称：${payload.pageTitle || '未命名页面'}`,
    `- 页面路由：${payload.routePath || '/'}`,
    `- 采集时间：${formatTime(payload.collectedAt)}`,
    `- 数据来源：共 ${payload.sources.length} 项（页面注册 ${pageCount} 项、接口自动采集 ${apiCount} 项）`,
    `- 数据体量：约 ${payload.charLength} 字符`,
    '',
    '## 分析方向（用户要求）',
    effectiveDirection,
    '',
  ]

  const body =
    payload.sources.length === 0
      ? [
          '## 页面数据',
          '（未采集到任何数据：页面可能尚未加载完成、接口尚未返回，或该页面不依赖后端接口。请在回答中说明这一点，并给出用户可以采取的下一步动作。）',
        ]
      : [
          '## 页面数据',
          ...payload.sources.map((source, index) =>
            [describeSource(source, index + 1), '```json', safeStringify(source.data), '```', ''].join(
              '\n',
            ),
          ),
        ]

  const userContent = [...header, ...body].join('\n')

  return [
    { role: 'system', content: deepseekConfig.systemPrompt },
    { role: 'user', content: userContent },
  ]
}

/**
 * 采集当前页面数据并请求 DeepSeek 分析。
 * 参数：options 见 RunPageAnalysisOptions。
 * 返回值：分析结果（含正文、思维链、耗时与所用数据包）。
 * 事件：流式模式下通过 onDelta / onReasoningDelta 回调增量文本。
 */
export async function runPageAnalysis(
  options: RunPageAnalysisOptions = {},
): Promise<PageAnalysisResult> {
  const payload = options.payload ?? (await collectAiAnalysisPayload())
  const direction = (options.direction ?? '').trim()
  const messages = buildAnalysisMessages(payload, direction)

  const result = await chatCompletion({
    messages,
    stream: deepseekConfig.stream,
    signal: options.signal,
    onDelta: options.onDelta,
    onReasoningDelta: options.onReasoningDelta,
  })

  return {
    content: result.content,
    reasoning: result.reasoning,
    model: result.model,
    latencyMs: result.latencyMs,
    payload,
    direction,
    promptChars: messages.reduce((total, message) => total + message.content.length, 0),
  }
}

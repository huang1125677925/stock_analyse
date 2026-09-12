/**
 * DeepSeek Chat Completions 直连客户端
 *
 * 功能：
 * - 通过浏览器 fetch 直接调用 DeepSeek 官方（或自定义网关）的 /chat/completions 接口
 * - 支持流式 SSE 输出（打字机效果）与非流式一次性返回
 * - 统一把 HTTP 错误、网络错误、超时、主动取消转换为带中文提示的错误对象
 *
 * 说明：
 * - 官方接口已返回 CORS 允许头（access-control-allow-origin 回显来源域），
 *   因此浏览器直连可用；若使用自建网关，需保证网关同样开启 CORS。
 * - apiKey 仅保存在本机 localStorage，随请求头 Authorization 发送。
 */
import {
  deepseekConfig,
  resolveChatCompletionsUrl,
} from './deepseekConfig'

/** 对话消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 调用选项 */
export interface ChatCompletionOptions {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  /** 外部取消信号（用户点击停止时触发） */
  signal?: AbortSignal
  /** 流式增量回调 */
  onDelta?: (delta: string, full: string) => void
  /** 推理模型思维链增量回调（deepseek-reasoner） */
  onReasoningDelta?: (delta: string, full: string) => void
  /** 首字节等待上限，毫秒 */
  timeoutMs?: number
  /** 流式过程中相邻数据块的最大间隔，毫秒 */
  idleTimeoutMs?: number
}

/** 调用结果 */
export interface ChatCompletionResult {
  content: string
  reasoning: string
  model: string
  usage: Record<string, unknown> | null
  latencyMs: number
}

/** DeepSeek 调用错误：带 HTTP 状态与可读提示 */
export class DeepSeekError extends Error {
  status: number | null
  code: string | null
  /** 是否由用户主动取消触发 */
  canceled: boolean

  constructor(
    message: string,
    options: { status?: number | null; code?: string | null; canceled?: boolean } = {},
  ) {
    super(message)
    this.name = 'DeepSeekError'
    this.status = options.status ?? null
    this.code = options.code ?? null
    this.canceled = options.canceled ?? false
  }
}

const DEFAULT_TIMEOUT_MS = 120_000
const DEFAULT_IDLE_TIMEOUT_MS = 90_000

/**
 * 把 HTTP 状态码与接口错误信息转换为面向用户的中文提示。
 * 参数：status HTTP 状态码；serverMessage 接口返回的 error.message。
 * 返回值：可直接展示的错误文案。
 */
function toFriendlyMessage(status: number | null, serverMessage?: string): string {
  const detail = (serverMessage || '').trim()
  const suffix = detail ? `（${detail}）` : ''
  switch (status) {
    case 400:
      return `请求参数有误，请检查模型名称与输入数据${suffix}`
    case 401:
      return 'API Key 无效或已失效，请在「DeepSeek 设置」中重新填写'
    case 402:
      return `账户余额不足，请前往 DeepSeek 平台充值后重试${suffix}`
    case 403:
      return `该 API Key 无权访问所选模型，请确认模型名称${suffix}`
    case 404:
      return '接口地址不存在，请检查「API 基址」是否填写正确'
    case 422:
      return `请求参数校验失败，请确认模型名称是否受支持${suffix}`
    case 429:
      return '请求过于频繁或额度受限，请稍后重试'
    case 500:
    case 502:
    case 503:
    case 504:
      return 'DeepSeek 服务暂时不可用，请稍后重试'
    default:
      if (status === null) return '无法连接 DeepSeek 服务，请检查网络或 API 基址'
      return `分析请求失败（HTTP ${status}）${suffix}`
  }
}

/**
 * 解析接口返回体中的错误信息。
 * 参数：payload 已解析的响应体。
 * 返回值：错误描述文本，取不到时返回空串。
 */
function extractServerMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const error = (payload as { error?: unknown }).error
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  const message = (payload as { message?: unknown }).message
  return typeof message === 'string' ? message : ''
}

/**
 * 读取一个 SSE 数据块中的文本内容。
 * 参数：data SSE 的 data 字段原文（已去掉前缀）。
 * 返回值：{ content, reasoning, model }，无有效内容时文本为空串。
 */
function readSseChunk(data: string): { content: string; reasoning: string; model: string } {
  if (!data || data === '[DONE]') return { content: '', reasoning: '', model: '' }
  try {
    const parsed = JSON.parse(data) as {
      model?: string
      choices?: Array<{
        delta?: { content?: string | null; reasoning_content?: string | null }
        message?: { content?: string | null; reasoning_content?: string | null }
      }>
    }
    const choice = parsed.choices?.[0]
    return {
      content: choice?.delta?.content ?? choice?.message?.content ?? '',
      reasoning: choice?.delta?.reasoning_content ?? choice?.message?.reasoning_content ?? '',
      model: parsed.model ?? '',
    }
  } catch {
    return { content: '', reasoning: '', model: '' }
  }
}

/**
 * 创建带首字节超时与空闲超时的 AbortController，并级联外部取消信号。
 * 参数：external 外部取消信号；timeoutMs 首字节超时；idleTimeoutMs 空闲超时。
 * 返回值：{ controller, markActivity, dispose, timedOut }。
 */
function createGuardedController(
  external: AbortSignal | undefined,
  timeoutMs: number,
  idleTimeoutMs: number,
) {
  const controller = new AbortController()
  const state = { reason: '' as '' | 'timeout' | 'external' }

  let timer: ReturnType<typeof setTimeout> | null = null
  const arm = (ms: number, reason: 'timeout') => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      state.reason = reason
      controller.abort()
    }, ms)
  }

  const onExternalAbort = () => {
    state.reason = 'external'
    controller.abort()
  }

  if (external) {
    if (external.aborted) onExternalAbort()
    else external.addEventListener('abort', onExternalAbort, { once: true })
  }
  arm(timeoutMs, 'timeout')

  return {
    controller,
    state,
    /** 每收到一块数据就重置空闲计时 */
    markActivity: () => arm(idleTimeoutMs, 'timeout'),
    dispose: () => {
      if (timer) clearTimeout(timer)
      timer = null
      external?.removeEventListener('abort', onExternalAbort)
    },
  }
}

/**
 * 调用 DeepSeek chat/completions。
 * 参数：options 见 ChatCompletionOptions。
 * 返回值：聚合后的完整回答、思维链、模型名与耗时。
 * 事件：流式模式下通过 onDelta / onReasoningDelta 逐块回调。
 */
export async function chatCompletion(
  options: ChatCompletionOptions,
): Promise<ChatCompletionResult> {
  const apiKey = deepseekConfig.apiKey.trim()
  if (!apiKey) {
    throw new DeepSeekError('尚未配置 DeepSeek API Key，请先在设置中填写', { status: 401 })
  }

  const model = (options.model ?? deepseekConfig.model).trim() || deepseekConfig.model
  const useStream = options.stream ?? deepseekConfig.stream
  const temperature = options.temperature ?? deepseekConfig.temperature
  const maxTokens = options.maxTokens ?? deepseekConfig.maxTokens

  const payload: Record<string, unknown> = {
    model,
    messages: options.messages,
    stream: useStream,
  }
  // 推理模型不支持采样温度，避免部分网关直接报 400
  if (!model.includes('reasoner')) payload.temperature = temperature
  if (maxTokens > 0) payload.max_tokens = maxTokens

  const startedAt = Date.now()
  const guard = createGuardedController(
    options.signal,
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS,
  )

  let response: Response
  try {
    response = await fetch(resolveChatCompletionsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: guard.controller.signal,
    })
  } catch (error) {
    guard.dispose()
    if (guard.state.reason === 'external') {
      throw new DeepSeekError('分析已取消', { canceled: true })
    }
    if (guard.state.reason === 'timeout') {
      throw new DeepSeekError('等待 DeepSeek 响应超时，请稍后重试或改用更快的模型')
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new DeepSeekError(
      `无法连接 DeepSeek 服务（${message}），请检查网络、代理或 API 基址`,
    )
  }

  if (!response.ok) {
    guard.dispose()
    let serverMessage = ''
    try {
      serverMessage = extractServerMessage(await response.json())
    } catch {
      serverMessage = ''
    }
    throw new DeepSeekError(toFriendlyMessage(response.status, serverMessage), {
      status: response.status,
    })
  }

  // 非流式或浏览器不支持流式读取时，退化为一次性解析
  if (!useStream || !response.body) {
    try {
      const json = (await response.json()) as {
        model?: string
        usage?: Record<string, unknown>
        choices?: Array<{
          message?: { content?: string | null; reasoning_content?: string | null }
        }>
      }
      const message = json.choices?.[0]?.message
      const content = message?.content ?? ''
      const reasoning = message?.reasoning_content ?? ''
      if (content) options.onDelta?.(content, content)
      if (reasoning) options.onReasoningDelta?.(reasoning, reasoning)
      guard.dispose()
      return {
        content,
        reasoning,
        model: json.model ?? model,
        usage: json.usage ?? null,
        latencyMs: Date.now() - startedAt,
      }
    } catch (error) {
      guard.dispose()
      if (guard.state.reason === 'external') {
        throw new DeepSeekError('分析已取消', { canceled: true })
      }
      const message = error instanceof Error ? error.message : String(error)
      throw new DeepSeekError(`解析 DeepSeek 响应失败：${message}`)
    }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let content = ''
  let reasoning = ''
  let resolvedModel = model

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      guard.markActivity()
      buffer += decoder.decode(value, { stream: true })

      // SSE 以空行分帧，这里按行处理并保留最后一行残缺数据
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || line.startsWith(':')) continue
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') continue
        const chunk = readSseChunk(data)
        if (chunk.content) {
          content += chunk.content
          options.onDelta?.(chunk.content, content)
        }
        if (chunk.reasoning) {
          reasoning += chunk.reasoning
          options.onReasoningDelta?.(chunk.reasoning, reasoning)
        }
        if (chunk.model) resolvedModel = chunk.model
      }
    }
  } catch (error) {
    if (guard.state.reason === 'external') {
      throw new DeepSeekError('分析已取消', { canceled: true })
    }
    if (guard.state.reason === 'timeout') {
      throw new DeepSeekError('分析响应中断（长时间无数据返回），请重试')
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new DeepSeekError(`读取分析结果失败：${message}`)
  } finally {
    guard.dispose()
    try {
      reader.releaseLock()
    } catch {
      /* 仍有未决读取时释放锁会抛错，忽略即可 */
    }
  }

  if (!content && !reasoning) {
    throw new DeepSeekError('DeepSeek 返回内容为空，请重试或更换模型')
  }

  return {
    content,
    reasoning,
    model: resolvedModel,
    usage: null,
    latencyMs: Date.now() - startedAt,
  }
}

/**
 * 测试当前配置是否可用：发起一次极短的流式请求。
 * 参数：无（读取全局配置）。
 * 返回值：模型名、往返耗时与模型回复片段。
 */
export async function testDeepSeekConnection(): Promise<{
  model: string
  latencyMs: number
  reply: string
}> {
  const result = await chatCompletion({
    messages: [
      { role: 'system', content: '你是连通性测试助手，只回复“连接成功”。' },
      { role: 'user', content: '请回复：连接成功' },
    ],
    stream: false,
    maxTokens: 32,
    temperature: 0,
    timeoutMs: 30_000,
  })
  return {
    model: result.model,
    latencyMs: result.latencyMs,
    reply: (result.content || result.reasoning || '').trim().slice(0, 50),
  }
}

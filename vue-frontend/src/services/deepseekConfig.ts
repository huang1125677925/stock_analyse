/**
 * DeepSeek 分析全局配置
 *
 * 功能：
 * - 维护 DeepSeek 直连所需的 apiKey / model / baseUrl / 采样参数等全局配置
 * - 配置持久化在本机浏览器 localStorage，页面刷新后仍然生效
 * - 提供响应式的配置对象与「是否已配置」判断，供按钮、弹窗、分析请求复用
 *
 * 说明：apiKey 只保存在浏览器本地，请求由浏览器直接发往 DeepSeek（或自定义网关），
 * 不会经过本站后端；请勿在公共设备上保存。
 */
import { computed, reactive } from 'vue'

/** 配置持久化的 localStorage key */
const STORAGE_KEY = 'deepseek_analysis_config'

/** DeepSeek 官方 API 基址 */
export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'

/** 内置模型选项，模型名仍允许用户自由填写（兼容中转网关的自定义模型名） */
export const DEEPSEEK_MODEL_OPTIONS = [
  {
    label: 'deepseek-chat',
    value: 'deepseek-chat',
    description: '通用对话模型，速度快，适合行情解读与总结',
  },
  {
    label: 'deepseek-reasoner',
    value: 'deepseek-reasoner',
    description: '深度推理模型，思考更充分，适合策略推演（耗时更长）',
  },
] as const

/** 默认系统提示词，约束模型只基于页面数据分析、不编造数据、输出 Markdown */
export const DEFAULT_SYSTEM_PROMPT = [
  '你是一名严谨的 A 股市场数据分析师，服务于一个股票数据分析系统。',
  '用户会给你「当前页面采集到的数据」（接口返回的 JSON、页面上下文）以及一个「分析方向」。',
  '',
  '请遵守以下要求：',
  '1. 只依据给定数据下结论，数据中没有的内容必须明确说明「数据未覆盖」，严禁编造数字、日期或事实。',
  '2. 结论先行：先给出 2-4 条核心结论，再展开依据。',
  '3. 引用数字时保留原始口径与单位，必要时指出样本区间、样本量或数据缺失。',
  '4. 涉及行业/个股对比时，按数值排序或分组呈现，指出显著异常值与背离。',
  '5. 若数据被截断（出现「已省略」等标记），说明结论的局限。',
  '6. 输出使用 Markdown：`##` 小节标题、必要的表格、要点列表；不要输出 JSON 代码块包裹整篇回答。',
  '7. 结尾固定给出「风险提示」小节，说明分析局限与市场风险。',
  '8. 不做买卖点位的确定性承诺，不构成投资建议。',
].join('\n')

/** DeepSeek 全局配置结构 */
export interface DeepSeekConfig {
  /** API Key，形如 sk-xxxx */
  apiKey: string
  /** 模型名，如 deepseek-chat / deepseek-reasoner */
  model: string
  /** API 基址，默认官方地址；中转网关可自定义 */
  baseUrl: string
  /** 采样温度 0-2 */
  temperature: number
  /** 单次回答最大 token 数，0 表示不限制（交给服务端默认值） */
  maxTokens: number
  /** 是否流式输出（打字机效果） */
  stream: boolean
  /** 系统提示词 */
  systemPrompt: string
}

const DEFAULT_CONFIG: DeepSeekConfig = {
  apiKey: '',
  model: 'deepseek-chat',
  baseUrl: DEFAULT_DEEPSEEK_BASE_URL,
  temperature: 1,
  maxTokens: 0,
  stream: true,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
}

/** 全局响应式配置，所有组件共享同一份 */
export const deepseekConfig = reactive<DeepSeekConfig>({ ...DEFAULT_CONFIG })

/** 是否已完成必要配置（apiKey + model） */
export const isDeepSeekConfigured = computed(
  () => deepseekConfig.apiKey.trim().length > 0 && deepseekConfig.model.trim().length > 0,
)

/**
 * 规范化基址：去空格、去末尾斜杠；用户误填到 /chat/completions 时自动截断。
 * 保留 /v1 等路径前缀，以兼容需要 OpenAI 兼容路径的中转网关。
 * 参数：url 用户输入的基址。
 * 返回值：规范化后的基址，空输入返回默认官方地址。
 */
export function normalizeBaseUrl(url: string): string {
  const trimmed = (url || '').trim()
  if (!trimmed) return DEFAULT_DEEPSEEK_BASE_URL
  return trimmed.replace(/\/+$/, '').replace(/\/chat\/completions$/i, '').replace(/\/+$/, '')
}

/**
 * 拼接 chat/completions 完整地址。
 * 参数：baseUrl 基址（可空，使用当前配置）。
 * 返回值：完整请求地址。
 */
export function resolveChatCompletionsUrl(baseUrl?: string): string {
  const base = normalizeBaseUrl(baseUrl ?? deepseekConfig.baseUrl)
  return `${base}/chat/completions`
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

/**
 * 从 localStorage 载入配置并写入全局响应式对象。
 * 返回值：当前配置的浅拷贝。
 */
export function loadDeepSeekConfig(): DeepSeekConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...deepseekConfig }
    const parsed = JSON.parse(raw) as Partial<DeepSeekConfig>
    deepseekConfig.apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : ''
    deepseekConfig.model =
      typeof parsed.model === 'string' && parsed.model.trim()
        ? parsed.model.trim()
        : DEFAULT_CONFIG.model
    deepseekConfig.baseUrl = normalizeBaseUrl(String(parsed.baseUrl ?? ''))
    deepseekConfig.temperature = clamp(
      Number(parsed.temperature ?? DEFAULT_CONFIG.temperature),
      0,
      2,
      DEFAULT_CONFIG.temperature,
    )
    deepseekConfig.maxTokens = Math.max(
      0,
      Math.floor(Number(parsed.maxTokens ?? DEFAULT_CONFIG.maxTokens)) || 0,
    )
    deepseekConfig.stream = parsed.stream !== false
    deepseekConfig.systemPrompt =
      typeof parsed.systemPrompt === 'string' && parsed.systemPrompt.trim()
        ? parsed.systemPrompt
        : DEFAULT_SYSTEM_PROMPT
  } catch (error) {
    console.warn('[deepseek] 读取本地配置失败，已回退默认值:', error)
  }
  return { ...deepseekConfig }
}

/**
 * 保存配置（支持部分字段更新）并持久化。
 * 参数：patch 需要更新的字段。
 * 返回值：保存后的配置浅拷贝。
 */
export function saveDeepSeekConfig(patch: Partial<DeepSeekConfig>): DeepSeekConfig {
  if (patch.apiKey !== undefined) deepseekConfig.apiKey = patch.apiKey.trim()
  if (patch.model !== undefined) {
    deepseekConfig.model = patch.model.trim() || DEFAULT_CONFIG.model
  }
  if (patch.baseUrl !== undefined) deepseekConfig.baseUrl = normalizeBaseUrl(patch.baseUrl)
  if (patch.temperature !== undefined) {
    deepseekConfig.temperature = clamp(Number(patch.temperature), 0, 2, DEFAULT_CONFIG.temperature)
  }
  if (patch.maxTokens !== undefined) {
    deepseekConfig.maxTokens = Math.max(0, Math.floor(Number(patch.maxTokens)) || 0)
  }
  if (patch.stream !== undefined) deepseekConfig.stream = Boolean(patch.stream)
  if (patch.systemPrompt !== undefined) {
    deepseekConfig.systemPrompt = patch.systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...deepseekConfig }))
  } catch (error) {
    console.warn('[deepseek] 配置持久化失败（可能是隐私模式）:', error)
  }
  return { ...deepseekConfig }
}

/**
 * 恢复默认配置（保留 apiKey 之外的字段全部重置，apiKey 需显式清除）。
 * 参数：options.clearApiKey 为 true 时同时清空 API Key。
 * 返回值：重置后的配置浅拷贝。
 */
export function resetDeepSeekConfig(options: { clearApiKey?: boolean } = {}): DeepSeekConfig {
  const keepApiKey = options.clearApiKey ? '' : deepseekConfig.apiKey
  Object.assign(deepseekConfig, { ...DEFAULT_CONFIG, apiKey: keepApiKey })
  return saveDeepSeekConfig({})
}

/**
 * 生成用于界面展示的脱敏 Key。
 * 参数：key 原始 Key（可空，默认取当前配置）。
 * 返回值：形如 sk-ab****yz 的脱敏串，未配置时返回空串。
 */
export function maskApiKey(key?: string): string {
  const value = (key ?? deepseekConfig.apiKey).trim()
  if (!value) return ''
  if (value.length <= 8) return `${value.slice(0, 2)}****`
  return `${value.slice(0, 5)}****${value.slice(-4)}`
}

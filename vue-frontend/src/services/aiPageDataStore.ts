/**
 * 页面数据分析数据采集仓库
 *
 * 功能：
 * - 自动采集：由 axios 响应拦截器调用 recordApiResponse，缓存「当前页面」最近各接口的返回数据
 * - 显式注册：页面通过 useAiPageData / registerAiPageDataProvider 提供更精炼的分析数据（优先级更高）
 * - 统一裁剪：对超长字符串、超大数组做递归裁剪并插入「已省略」标记，控制送入模型的体量
 *
 * 采集范围仅限浏览器内存 + 当前路由：切换路由即清空，不会把上一页数据混入本次分析。
 */

/** 单条数据来源 */
export interface AiAnalysisSource {
  /** 稳定唯一标识，供列表渲染作为 key 使用（同名接口/同一时间戳也不重复） */
  id: string
  /** 展示名，如接口路径或页面注册名 */
  name: string
  /** 来源类型 */
  kind: 'page' | 'api'
  /** 接口路径（api 来源才有） */
  endpoint?: string
  /** 请求参数（api 来源才有） */
  params?: Record<string, unknown>
  /** 采集时间戳 */
  capturedAt: number
  /** 裁剪后的数据 */
  data: unknown
}

/** 一次分析所需的完整数据包 */
export interface AiAnalysisPayload {
  /** 当前路由 fullPath */
  routePath: string
  /** 页面标题（取自路由 meta.title） */
  pageTitle: string
  /** 采集时间戳 */
  collectedAt: number
  /** 数据来源列表（已按优先级排序） */
  sources: AiAnalysisSource[]
  /** 序列化后的字符数，用于界面展示与判断是否被裁剪 */
  charLength: number
}

/** 页面显式注册的数据结构 */
export interface AiPageDataInput {
  /** 数据名称，默认取页面标题 */
  title?: string
  /** 一句话说明数据口径（会一起送给模型） */
  summary?: string
  /** 实际数据 */
  data: unknown
}

/** 页面数据提供函数，分析时实时调用 */
export type AiPageDataProvider = () =>
  | AiPageDataInput
  | null
  | undefined
  | Promise<AiPageDataInput | null | undefined>

/** 自动采集的最大接口条数（超出后丢弃最旧的） */
const MAX_RECORDS = 12
interface ShrinkLimits {
  maxDepth: number
  maxArrayLength: number
  maxObjectKeys: number
  maxStringLength: number
}

/** 递归裁剪参数 */
const SHRINK_LIMITS: ShrinkLimits = {
  maxDepth: 6,
  maxArrayLength: 60,
  maxObjectKeys: 80,
  maxStringLength: 1500,
}
/** 送入模型的整体字符预算 */
const MAX_TOTAL_CHARS = 120_000
/** 超出整体预算时的二次压缩档位，确保不会把超大数据源整条丢弃 */
const BUDGET_SHRINK_STEPS: ShrinkLimits[] = [
  { maxDepth: 5, maxArrayLength: 40, maxObjectKeys: 50, maxStringLength: 800 },
  { maxDepth: 4, maxArrayLength: 25, maxObjectKeys: 35, maxStringLength: 500 },
  { maxDepth: 4, maxArrayLength: 15, maxObjectKeys: 25, maxStringLength: 300 },
  { maxDepth: 3, maxArrayLength: 8, maxObjectKeys: 16, maxStringLength: 180 },
  { maxDepth: 2, maxArrayLength: 5, maxObjectKeys: 12, maxStringLength: 120 },
]

/** 不参与自动采集的接口关键字（鉴权、统计等与分析无关或涉及隐私） */
const EXCLUDED_URL_PATTERNS = [
  '/ai/',
  'site-stats',
  'site_stats',
  'visit',
  'auth',
  'login',
  'register',
  'invite',
  'password',
  'captcha',
  'user',
  'token',
  'feedback',
]

interface CapturedRecord {
  key: string
  source: AiAnalysisSource
}

const capturedRecords: CapturedRecord[] = []
const pageProviders = new Set<AiPageDataProvider>()
const captureListeners = new Set<() => void>()

let currentRoutePath = ''
let currentPageTitle = ''

/**
 * 订阅「有新接口数据被采集」事件。
 * 用途：分析弹窗早于页面数据加载完成打开时，数据到位后自动刷新数据概览。
 * 参数：listener 回调。
 * 返回值：取消订阅函数。
 */
export function onApiDataCaptured(listener: () => void): () => void {
  captureListeners.add(listener)
  return () => {
    captureListeners.delete(listener)
  }
}

function notifyCaptured(): void {
  for (const listener of Array.from(captureListeners)) {
    try {
      listener()
    } catch (error) {
      console.warn('[ai-analysis] 采集订阅回调失败:', error)
    }
  }
}

/**
 * 记录当前路由信息，供采集时过滤与展示。
 * 参数：route 当前路由的 fullPath 与标题。
 * 返回值：无
 */
export function setAiAnalysisRoute(route: { fullPath: string; title?: string }): void {
  currentRoutePath = route.fullPath
  currentPageTitle = route.title || ''
}

/** 读取当前路由 fullPath（供调试与组件展示） */
export function getAiAnalysisRoutePath(): string {
  return currentRoutePath
}

/** 读取当前页面标题 */
export function getAiAnalysisPageTitle(): string {
  return currentPageTitle
}

/**
 * 判断接口是否需要跳过自动采集。
 * 参数：url 接口地址。
 * 返回值：true 表示跳过。
 */
function isExcludedUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return EXCLUDED_URL_PATTERNS.some((pattern) => lower.includes(pattern))
}

/**
 * 把接口地址转换为简短易读的名称，便于模型理解数据出处。
 * 参数：url 接口地址。
 * 返回值：形如 industry/trend 的短名。
 */
function shortenEndpoint(url: string): string {
  return url
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/django\/api\//, '')
    .replace(/^\/api\//, '')
    .replace(/^\//, '')
}

/**
 * 递归裁剪数据：限制深度、数组长度、对象键数量与字符串长度，
 * 被裁掉的部分插入可读标记，让模型知道数据不完整。
 * 参数：value 任意数据；depth 当前深度。
 * 返回值：裁剪后的可序列化数据。
 */
function shrinkValue(value: unknown, depth = 0, limits: ShrinkLimits = SHRINK_LIMITS): unknown {
  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    if (value.length <= limits.maxStringLength) return value
    return `${value.slice(0, limits.maxStringLength)}……[字符串过长已省略 ${value.length - limits.maxStringLength} 字符]`
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value

  if (typeof value !== 'object') return String(value)

  if (depth >= limits.maxDepth) return '[层级过深已省略]'

  if (Array.isArray(value)) {
    const limited = value
      .slice(0, limits.maxArrayLength)
      .map((item) => shrinkValue(item, depth + 1, limits))
    if (value.length > limits.maxArrayLength) {
      limited.push(`[共 ${value.length} 条，已省略后 ${value.length - limits.maxArrayLength} 条]`)
    }
    return limited
  }

  const entries = Object.entries(value as Record<string, unknown>)
  const result: Record<string, unknown> = {}
  for (const [key, item] of entries.slice(0, limits.maxObjectKeys)) {
    result[key] = shrinkValue(item, depth + 1, limits)
  }
  if (entries.length > limits.maxObjectKeys) {
    result.__omitted_keys__ = `[共 ${entries.length} 个字段，已省略 ${entries.length - limits.maxObjectKeys} 个]`
  }
  return result
}

/**
 * 生成超大数据源的结构说明。
 * 参数：value 任意数据；depth 当前递归深度。
 * 返回值：字段、数组长度等轻量信息，作为极限压缩兜底。
 */
function describeValueShape(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return typeof value
  if (depth >= 3) return Array.isArray(value) ? `[数组，长度 ${value.length}]` : '[对象，层级已省略]'

  if (Array.isArray(value)) {
    return {
      类型: '数组',
      条数: value.length,
      首条结构: value.length ? describeValueShape(value[0], depth + 1) : null,
    }
  }

  const entries = Object.entries(value as Record<string, unknown>)
  const fields = entries.slice(0, 30).map(([key]) => key)
  return {
    类型: '对象',
    字段数: entries.length,
    字段: fields,
    示例结构: Object.fromEntries(
      entries.slice(0, 8).map(([key, item]) => [key, describeValueShape(item, depth + 1)]),
    ),
    ...(entries.length > fields.length
      ? { 省略字段: `已省略 ${entries.length - fields.length} 个字段名` }
      : {}),
  }
}

function withBudgetNotice(data: unknown, originalSize: number): unknown {
  return {
    数据已裁剪: `原数据约 ${originalSize} 字符，因超过单次分析预算已压缩保留代表性样本。`,
    数据: data,
  }
}

/**
 * 将单个超大来源压缩到剩余预算内。
 * 参数：source 原来源；remainingChars 剩余字符预算；originalSize 原数据字符数。
 * 返回值：可纳入 payload 的压缩来源；预算过低时返回 null。
 */
function compactSourceToFit(
  source: AiAnalysisSource,
  remainingChars: number,
  originalSize: number,
): { source: AiAnalysisSource; size: number } | null {
  if (remainingChars < 800) return null

  for (const limits of BUDGET_SHRINK_STEPS) {
    const data = withBudgetNotice(shrinkValue(source.data, 0, limits), originalSize)
    const size = safeStringify(data).length
    if (size <= remainingChars) {
      return {
        source: {
          ...source,
          id: `${source.id}:compact`,
          name: `${source.name}（已压缩）`,
          data,
        },
        size,
      }
    }
  }

  const shapeData = {
    数据已裁剪: `原数据约 ${originalSize} 字符，体量过大，已保留数据结构和字段信息。`,
    数据结构: describeValueShape(source.data),
  }
  const shapeSize = safeStringify(shapeData).length
  if (shapeSize <= remainingChars) {
    return {
      source: {
        ...source,
        id: `${source.id}:shape`,
        name: `${source.name}（结构摘要）`,
        data: shapeData,
      },
      size: shapeSize,
    }
  }

  const textData = `[${source.name} 原数据约 ${originalSize} 字符，超过剩余分析预算；请缩小日期区间或筛选条件后重新采集。]`
  const textSize = safeStringify(textData).length
  if (textSize <= remainingChars) {
    return {
      source: {
        ...source,
        id: `${source.id}:notice`,
        name: `${source.name}（超限提示）`,
        data: textData,
      },
      size: textSize,
    }
  }

  return null
}

/**
 * 记录一次接口响应（由 axios 响应拦截器调用）。
 * 参数：input.url 接口地址；input.method 请求方法；input.params 请求参数；input.data 响应数据。
 * 返回值：无
 */
export function recordApiResponse(input: {
  url?: string
  method?: string
  params?: Record<string, unknown> | null
  data: unknown
}): void {
  const url = (input.url || '').trim()
  if (!url || isExcludedUrl(url)) return
  if (input.data === null || input.data === undefined || input.data === '') return

  const method = (input.method || 'GET').toUpperCase()
  const params = input.params ? (shrinkValue(input.params, 1) as Record<string, unknown>) : undefined
  const key = `${method} ${url} ${params ? JSON.stringify(params) : ''}`

  // 同一接口重复请求时保留最新一次，并移动到队尾
  const existingIndex = capturedRecords.findIndex((record) => record.key === key)
  if (existingIndex >= 0) capturedRecords.splice(existingIndex, 1)

  capturedRecords.push({
    key,
    source: {
      id: `api:${key}`,
      name: `${method} ${shortenEndpoint(url)}`,
      kind: 'api',
      endpoint: url,
      params,
      capturedAt: Date.now(),
      data: shrinkValue(input.data),
    },
  })

  while (capturedRecords.length > MAX_RECORDS) capturedRecords.shift()

  notifyCaptured()
}

/**
 * 读取当前路由下已采集的接口数据（最新的在前）。
 * 参数：无
 * 返回值：采集到的数据来源列表。
 */
export function getCapturedSources(): AiAnalysisSource[] {
  return capturedRecords.map((record) => record.source).reverse()
}

/** 清空自动采集缓存（切换路由时调用） */
export function clearCapturedRecords(): void {
  capturedRecords.length = 0
}

/**
 * 注册页面级数据提供者。
 * 参数：provider 返回页面数据的函数。
 * 返回值：注销函数。
 */
export function registerAiPageDataProvider(provider: AiPageDataProvider): () => void {
  pageProviders.add(provider)
  return () => {
    pageProviders.delete(provider)
  }
}

/** 当前是否有页面级数据提供者（供界面提示用） */
export function hasPageDataProvider(): boolean {
  return pageProviders.size > 0
}

/**
 * 采集页面级注册数据。
 * 参数：无
 * 返回值：页面提供的数据来源列表，单个 provider 失败不影响其他 provider。
 */
async function collectPageSources(): Promise<AiAnalysisSource[]> {
  const sources: AiAnalysisSource[] = []
  let index = 0
  for (const provider of Array.from(pageProviders)) {
    index += 1
    try {
      const result = await provider()
      if (!result || result.data === null || result.data === undefined) continue
      const name = result.title || currentPageTitle || '页面注册数据'
      sources.push({
        id: `page:${index}:${name}`,
        name,
        kind: 'page',
        capturedAt: Date.now(),
        data: shrinkValue(
          result.summary ? { 数据说明: result.summary, 数据: result.data } : result.data,
        ),
      })
    } catch (error) {
      console.warn('[ai-analysis] 页面数据提供者执行失败:', error)
    }
  }
  return sources
}

/**
 * 汇总一次分析所需的全部数据。
 * 参数：无
 * 返回值：数据包（页面注册数据优先，其后是自动采集的接口数据，受总字符预算约束）。
 */
export async function collectAiAnalysisPayload(): Promise<AiAnalysisPayload> {
  const pageSources = await collectPageSources()
  const apiSources = getCapturedSources()

  const sources: AiAnalysisSource[] = []
  let charLength = 0
  let truncated = false

  for (const source of [...pageSources, ...apiSources]) {
    const size = safeStringify(source.data).length
    if (charLength + size > MAX_TOTAL_CHARS) {
      truncated = true
      const compacted = compactSourceToFit(source, MAX_TOTAL_CHARS - charLength, size)
      if (compacted) {
        sources.push(compacted.source)
        charLength += compacted.size
      }
      continue
    }
    charLength += size
    sources.push(source)
  }

  if (truncated) {
    const source: AiAnalysisSource = {
      id: 'system:truncated',
      name: '系统提示',
      kind: 'api',
      capturedAt: Date.now(),
      data: '[部分数据因体量过大已压缩或未纳入本次分析，如需完整分析请缩小日期区间或减少筛选条件]',
    }
    sources.push(source)
    charLength += safeStringify(source.data).length
  }

  return {
    routePath: currentRoutePath,
    pageTitle: currentPageTitle,
    collectedAt: Date.now(),
    sources,
    charLength,
  }
}

/**
 * 安全序列化：循环引用或含 BigInt 的数据不应导致采集失败。
 * 参数：value 任意数据。
 * 返回值：JSON 字符串。
 */
export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? ''
  } catch {
    try {
      const seen = new WeakSet<object>()
      return (
        JSON.stringify(value, (_key, val) => {
          if (val && typeof val === 'object') {
            if (seen.has(val as object)) return '[循环引用]'
            seen.add(val as object)
          }
          if (typeof val === 'bigint') return val.toString()
          return val
        }) ?? ''
      )
    } catch {
      return String(value)
    }
  }
}

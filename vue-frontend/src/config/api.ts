/**
 * API 基址与路径配置。
 *
 * 优先级：运行时 app-config.js > VITE_API_BASE_URL > 生产默认同源相对路径
 *
 * 本地开发：npm run dev 后访问 http://localhost:5173（.env.development 默认指向 127.0.0.1:8000）
 * 勿在浏览器打开 https://47.120.53.64，那是线上静态资源，请求会跟页面同源发到该 IP。
 */

export interface StockAppRuntimeConfig {
  apiBaseUrl?: string
}

declare global {
  interface Window {
    __STOCK_APP_CONFIG__?: StockAppRuntimeConfig
  }
}

function normalizeBase(url: string): string {
  return url.trim().replace(/\/$/, '')
}

function readRuntimeBase(): string {
  if (typeof window === 'undefined') return ''
  const runtime = window.__STOCK_APP_CONFIG__?.apiBaseUrl
  if (runtime === undefined || runtime === null) return ''
  return normalizeBase(String(runtime))
}

function readEnvBase(): string {
  return normalizeBase(import.meta.env.VITE_API_BASE_URL ?? '')
}

/** axios baseURL；空字符串表示使用相对路径 */
export const API_BASE_URL = (() => {
  const runtime = readRuntimeBase()
  if (runtime) return runtime
  const env = readEnvBase()
  if (env) return env
  return ''
})()

export const DJANGO_API_PREFIX = '/django/api'

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized
}

/** 开发环境且当前页面不是本机 dev server 时提示 */
export function warnIfMisconfiguredDevHost(): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return
  const { hostname, port, protocol } = window.location
  const isLocalDevServer = (hostname === 'localhost' || hostname === '127.0.0.1') && port === '5173'
  const isRemoteIp = /^\d+\.\d+\.\d+\.\d+$/.test(hostname) && hostname !== '127.0.0.1'
  if (!isLocalDevServer && (isRemoteIp || protocol === 'https:')) {
    console.warn(
      `[stock-analyse] 当前从 ${window.location.origin} 打开页面，API 不会走本机 Vite。` +
        `本地开发请使用: http://localhost:5173 （API 目标: ${API_BASE_URL || '相对路径'})`
    )
  }
}

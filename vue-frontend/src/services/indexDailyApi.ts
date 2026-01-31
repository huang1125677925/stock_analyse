import axios from './axiosConfig'

// 通用响应结构（与项目其他 services 保持一致）
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

// Tushare index_daily 直通代理的统一数据结构（常见形态）
export interface IndexDailyRaw {
  fields: string[]
  items: (string | number)[][]
}

export interface IndexDailyVolumeData {
  count: number
  interface: string
  records: IndexDailyVolumeItem[]
}

// 前端使用的简化数据结构
export interface IndexDailyVolumeItem {
  date: string // YYYY-MM-DD
  volume: number
  amount?: number
  close?: number
}

function formatYYYYMMDDToISO(dateStr: string): string {
  if (!dateStr) return ''
  const s = String(dateStr)
  if (s.length === 8 && /^\d{8}$/.test(s)) {
    const y = s.slice(0, 4)
    const m = s.slice(4, 6)
    const d = s.slice(6, 8)
    return `${y}-${m}-${d}`
  }
  // 已是 ISO 或其他格式，直接返回字符串化结果
  return s
}

/**
 * 获取指数成交量（index_daily）
 * @param tsCode 指数代码，如 000001.SH
 * @param startDate 开始日期，格式：YYYYMMDD
 * @param endDate 结束日期，格式：YYYYMMDD
 */
export async function fetchIndexDailyVolume(
  tsCode: string,
  startDate?: string,
  endDate?: string
): Promise<IndexDailyVolumeItem[]> {
  const res = await axios.get<ApiResponse<IndexDailyVolumeData>, ApiResponse<IndexDailyVolumeData>>(
    '/django/api/index/index-daily/',
    {
      params: {
        ts_code: tsCode,
        start_date: startDate,
        end_date: endDate,
        fields: 'trade_date,vol,amount,close'
      }
    }
  )

  const raw = res.data?.records || []
  const mapped: IndexDailyVolumeItem[] = raw
    .map(item => {
      const dateRaw = (item as any).date ?? (item as any).trade_date
      const volRaw = (item as any).volume ?? (item as any).vol
      const amountRaw = (item as any).amount
      const closeRaw = (item as any).close
      const date = formatYYYYMMDDToISO(dateRaw)
      const volume = Number(volRaw ?? 0)
      const amount = amountRaw != null ? Number(amountRaw) : undefined
      const close = closeRaw != null ? Number(closeRaw) : undefined
      return { date, volume, amount, close }
    })
    // 过滤无效日期，避免排序报错
    .filter(d => !!d.date)
    // 默认按日期升序
    .sort((a, b) => a.date.localeCompare(b.date))

  return mapped
}
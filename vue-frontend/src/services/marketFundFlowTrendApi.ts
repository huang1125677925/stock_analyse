/**
 * 大盘资金趋势分析 API 服务
 * 功能：
 * - 请求大盘资金趋势数据接口 `/django/api/market/fund-flow/trend/`
 * - 兼容数组、`list`、`records`、`data.records` 等常见返回结构
 * - 提供金额与比例维度的对象配置和通用格式化方法
 */
import axios from './axiosConfig'

const API_URL = '/django/api/market/fund-flow/trend/'

export interface MarketFundFlowTrendItem {
  date: string
  main_net_inflow_amount: number | null
  super_large_net_inflow_amount: number | null
  large_net_inflow_amount: number | null
  medium_net_inflow_amount: number | null
  small_net_inflow_amount: number | null
  main_net_inflow_ratio: number | null
  super_large_net_inflow_ratio: number | null
  large_net_inflow_ratio: number | null
  medium_net_inflow_ratio: number | null
  small_net_inflow_ratio: number | null
  shanghai_close_price: number | null
  shanghai_change_rate: number | null
  shenzhen_close_price: number | null
  shenzhen_change_rate: number | null
}

export interface MarketFundFlowTrendQuery {
  startDate?: string
  endDate?: string
}

export type MarketFundFlowObjectKey =
  | 'main_net_inflow_amount'
  | 'super_large_net_inflow_amount'
  | 'large_net_inflow_amount'
  | 'medium_net_inflow_amount'
  | 'small_net_inflow_amount'
  | 'main_net_inflow_ratio'
  | 'super_large_net_inflow_ratio'
  | 'large_net_inflow_ratio'
  | 'medium_net_inflow_ratio'
  | 'small_net_inflow_ratio'

export type MarketFundFlowMetricGroup = 'amount' | 'ratio'

export interface MarketFundFlowObjectOption {
  key: MarketFundFlowObjectKey
  label: string
  unit: '元' | '%'
}

export const MARKET_FUND_FLOW_OBJECT_GROUPS: Record<MarketFundFlowMetricGroup, MarketFundFlowObjectOption[]> = {
  amount: [
    { key: 'main_net_inflow_amount', label: '主力净流入金额', unit: '元' },
    { key: 'super_large_net_inflow_amount', label: '超大单净流入金额', unit: '元' },
    { key: 'large_net_inflow_amount', label: '大单净流入金额', unit: '元' },
    { key: 'medium_net_inflow_amount', label: '中单净流入金额', unit: '元' },
    { key: 'small_net_inflow_amount', label: '小单净流入金额', unit: '元' },
  ],
  ratio: [
    { key: 'main_net_inflow_ratio', label: '主力净流入占比', unit: '%' },
    { key: 'super_large_net_inflow_ratio', label: '超大单净流入占比', unit: '%' },
    { key: 'large_net_inflow_ratio', label: '大单净流入占比', unit: '%' },
    { key: 'medium_net_inflow_ratio', label: '中单净流入占比', unit: '%' },
    { key: 'small_net_inflow_ratio', label: '小单净流入占比', unit: '%' },
  ],
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function unwrapList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[]
  }

  if (!payload || typeof payload !== 'object') {
    return []
  }

  const candidates = [
    (payload as Record<string, unknown>).list,
    (payload as Record<string, unknown>).records,
    (payload as Record<string, unknown>).results,
    (payload as Record<string, unknown>).rows,
    (payload as Record<string, unknown>).data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as Record<string, unknown>[]
    }

    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>
      if (Array.isArray(nested.list)) {
        return nested.list as Record<string, unknown>[]
      }
      if (Array.isArray(nested.records)) {
        return nested.records as Record<string, unknown>[]
      }
      if (Array.isArray(nested.results)) {
        return nested.results as Record<string, unknown>[]
      }
      if (Array.isArray(nested.rows)) {
        return nested.rows as Record<string, unknown>[]
      }
    }
  }

  return []
}

function normalizeItem(item: Record<string, unknown>): MarketFundFlowTrendItem {
  return {
    date: String(item.date ?? item.trade_date ?? ''),
    main_net_inflow_amount: normalizeNumber(item.main_net_inflow_amount ?? item.net_amount),
    super_large_net_inflow_amount: normalizeNumber(item.super_large_net_inflow_amount ?? item.buy_elg_amount),
    large_net_inflow_amount: normalizeNumber(item.large_net_inflow_amount ?? item.buy_lg_amount),
    medium_net_inflow_amount: normalizeNumber(item.medium_net_inflow_amount ?? item.buy_md_amount),
    small_net_inflow_amount: normalizeNumber(item.small_net_inflow_amount ?? item.buy_sm_amount),
    main_net_inflow_ratio: normalizeNumber(item.main_net_inflow_ratio ?? item.net_amount_rate),
    super_large_net_inflow_ratio: normalizeNumber(item.super_large_net_inflow_ratio ?? item.buy_elg_amount_rate),
    large_net_inflow_ratio: normalizeNumber(item.large_net_inflow_ratio ?? item.buy_lg_amount_rate),
    medium_net_inflow_ratio: normalizeNumber(item.medium_net_inflow_ratio ?? item.buy_md_amount_rate),
    small_net_inflow_ratio: normalizeNumber(item.small_net_inflow_ratio ?? item.buy_sm_amount_rate),
    shanghai_close_price: normalizeNumber(item.shanghai_close_price ?? item.close_sh),
    shanghai_change_rate: normalizeNumber(item.shanghai_change_rate ?? item.pct_change_sh),
    shenzhen_close_price: normalizeNumber(item.shenzhen_close_price ?? item.close_sz),
    shenzhen_change_rate: normalizeNumber(item.shenzhen_change_rate ?? item.pct_change_sz),
  }
}

/**
 * 获取大盘资金趋势数据
 * @param query 查询参数，支持开始和结束日期
 * @returns 按日期升序整理后的大盘资金趋势数据列表
 */
export async function fetchMarketFundFlowTrend(query: MarketFundFlowTrendQuery = {}): Promise<MarketFundFlowTrendItem[]> {
  const params: Record<string, string> = {}

  if (query.startDate) {
    params.start_date = query.startDate
  }
  if (query.endDate) {
    params.end_date = query.endDate
  }

  const response = await axios.get<unknown>(API_URL, { params })
  const rows = unwrapList(response)

  return rows
    .map(normalizeItem)
    .filter(item => item.date)
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime()
      const timeB = new Date(b.date).getTime()

      if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
        return a.date.localeCompare(b.date)
      }

      return timeA - timeB
    })
}

/**
 * 格式化金额，按量级动态换算单位
 * @param value 原始金额，单位为元
 * @returns 带单位的字符串
 */
export function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '--'
  }

  const absValue = Math.abs(value)

  if (absValue >= 100000000) {
    return `${(value / 100000000).toFixed(2)}亿`
  }
  if (absValue >= 10000) {
    return `${(value / 10000).toFixed(2)}万`
  }

  return `${value.toFixed(2)}元`
}

/**
 * 格式化百分比
 * @param value 百分比数值
 * @returns 百分比字符串
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '--'
  }

  return `${value.toFixed(2)}%`
}

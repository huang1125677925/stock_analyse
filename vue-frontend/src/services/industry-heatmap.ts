// 行业热力图数据API服务
import axios from './axiosConfig';

// API基础URL
const API_BASE_URL = '/django/api/stock';

// 行业代码和名称映射接口
export interface SwCodeName {
  indexCode: string
  indexName: string
}

// 行业热力图数据项接口
export interface IndustryHeatmapDataItem {
  avg_operating_revenue_growth_rate: number
  avg_net_profit_growth_rate: number
  total_operating_revenue: number
  total_net_profit: number
  avg_earnings_per_share: number
  avg_roe: number
  avg_gross_profit_margin: number
  avg_net_assets_per_share: number
  avg_operating_cash_flow_per_share: number
}

// 行业热力图响应数据接口
export interface IndustryHeatmapData {
  dates: string[]
  swCodeNames: SwCodeName[]
  congestions: Record<string, IndustryHeatmapDataItem[]>
}

// API响应接口定义
export interface ApiResponse<T = any> {
  code: number
  message: string
  timestamp: string
  data?: T
}

// 行业热力图响应接口定义
export interface IndustryHeatmapResponse {
  code: number
  message: string
  timestamp: string
  data: IndustryHeatmapData
}

/**
 * 获取行业热力图数据
 * @param industry 行业名称，支持模糊匹配，可选
 * @param reportType 报告类型，可选值：annual(年报)、semi_annual(中报)、q1(一季报)、q3(三季报)、quarterly(季报)，可选
 * @param startDate 开始日期，格式：YYYYMMDD，可选
 * @param endDate 结束日期，格式：YYYYMMDD，可选
 * @returns Promise<IndustryHeatmapResponse> 行业热力图数据
 */
export async function fetchIndustryHeatmapData(
  industry?: string,
  reportType?: string,
  startDate?: string,
  endDate?: string
): Promise<IndustryHeatmapData> {
  try {
    const params: Record<string, string> = {}
    
    if (industry) params.industry = industry
    if (reportType) params.report_type = reportType
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    
    const response = await axios.get<IndustryHeatmapData>(`${API_BASE_URL}/industry/heatmap-data/`, {
      params
    })
    
    return response.data
  } catch (error) {
    console.error('获取行业热力图数据失败:', error)
    throw error
  }
}

// 热力图指标类型枚举
export enum HeatmapMetricType {
  OPERATING_REVENUE_GROWTH = 'avg_operating_revenue_growth_rate',
  NET_PROFIT_GROWTH = 'avg_net_profit_growth_rate',
  TOTAL_OPERATING_REVENUE = 'total_operating_revenue',
  TOTAL_NET_PROFIT = 'total_net_profit',
  EARNINGS_PER_SHARE = 'avg_earnings_per_share',
  ROE = 'avg_roe',
  GROSS_PROFIT_MARGIN = 'avg_gross_profit_margin',
  NET_ASSETS_PER_SHARE = 'avg_net_assets_per_share',
  OPERATING_CASH_FLOW_PER_SHARE = 'avg_operating_cash_flow_per_share'
}

// 热力图指标配置接口
export interface HeatmapMetricConfig {
  name: string
  unit: string
  description: string
  formatter?: (value: number) => string
}

// 热力图指标配置
export const HEATMAP_METRICS: Record<HeatmapMetricType, HeatmapMetricConfig> = {
  [HeatmapMetricType.OPERATING_REVENUE_GROWTH]: {
    name: '营业收入增长率',
    unit: '%',
    description: '平均营业收入增长率',
    formatter: (value: number) => value.toFixed(2)
  },
  [HeatmapMetricType.NET_PROFIT_GROWTH]: {
    name: '净利润增长率',
    unit: '%',
    description: '平均净利润增长率',
    formatter: (value: number) => value.toFixed(2)
  },
  [HeatmapMetricType.TOTAL_OPERATING_REVENUE]: {
    name: '总营业收入',
    unit: '亿元',
    description: '总营业收入',
    formatter: (value: number) => (value / 100000000).toFixed(2)
  },
  [HeatmapMetricType.TOTAL_NET_PROFIT]: {
    name: '总净利润',
    unit: '亿元',
    description: '总净利润',
    formatter: (value: number) => (value / 100000000).toFixed(2)
  },
  [HeatmapMetricType.EARNINGS_PER_SHARE]: {
    name: '每股收益',
    unit: '元',
    description: '平均每股收益',
    formatter: (value: number) => value.toFixed(2)
  },
  [HeatmapMetricType.ROE]: {
    name: '净资产收益率',
    unit: '%',
    description: '平均净资产收益率',
    formatter: (value: number) => value.toFixed(2)
  },
  [HeatmapMetricType.GROSS_PROFIT_MARGIN]: {
    name: '毛利率',
    unit: '%',
    description: '平均毛利率',
    formatter: (value: number) => value.toFixed(2)
  },
  [HeatmapMetricType.NET_ASSETS_PER_SHARE]: {
    name: '每股净资产',
    unit: '元',
    description: '平均每股净资产',
    formatter: (value: number) => value.toFixed(2)
  },
  [HeatmapMetricType.OPERATING_CASH_FLOW_PER_SHARE]: {
    name: '每股经营现金流',
    unit: '元',
    description: '平均每股经营现金流',
    formatter: (value: number) => value.toFixed(2)
  }
}
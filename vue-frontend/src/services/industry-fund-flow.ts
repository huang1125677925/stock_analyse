/**
 * 行业资金流数据API服务
 * 功能：
 * 1. 获取行业板块的资金流向数据
 * 2. 支持时间范围查询
 * 3. 返回格式化的资金流向数据结构
 */
import axios from './axiosConfig';

// API基础URL
const API_BASE_URL = '/django/api/stock';

// 行业代码和名称映射接口
export interface SwCodeName {
  indexCode: string
  indexName: string
}

// 行业资金流数据项接口
export interface IndustryFundFlowDataItem {
  total_net_inflow_amount?: number        // 全部净流入金额（元）- 计算字段
  total_net_inflow_ratio?: number         // 全部净流入占比（%）- 计算字段
  main_net_inflow_amount: number          // 主力净流入金额（元）
  main_net_inflow_ratio: number           // 主力净流入占比（%）
  super_large_net_inflow_amount: number   // 超大单净流入金额（元）
  super_large_net_inflow_ratio: number    // 超大单净流入占比（%）
  large_net_inflow_amount: number         // 大单净流入金额（元）
  large_net_inflow_ratio: number          // 大单净流入占比（%）
  medium_net_inflow_amount: number        // 中单净流入金额（元）
  medium_net_inflow_ratio: number         // 中单净流入占比（%）
  small_net_inflow_amount: number         // 小单净流入金额（元）
  small_net_inflow_ratio: number          // 小单净流入占比（%）
}

// 行业资金流响应数据接口
export interface IndustryFundFlowData {
  dates: string[]
  swCodeNames: SwCodeName[]
  congestions: Record<string, IndustryFundFlowDataItem[]>
}

// API响应接口定义
export interface ApiResponse<T = any> {
  code: number
  message: string
  timestamp: string
  data?: T
}

// 行业资金流响应接口定义
export interface IndustryFundFlowResponse {
  code: number
  message: string
  timestamp: string
  data: IndustryFundFlowData
}

// 资金流指标类型枚举
export enum FundFlowMetricType {
  TOTAL_NET_INFLOW_AMOUNT = 'total_net_inflow_amount',
  TOTAL_NET_INFLOW_RATIO = 'total_net_inflow_ratio',
  MAIN_NET_INFLOW_AMOUNT = 'main_net_inflow_amount',
  MAIN_NET_INFLOW_RATIO = 'main_net_inflow_ratio',
  SUPER_LARGE_NET_INFLOW_AMOUNT = 'super_large_net_inflow_amount',
  SUPER_LARGE_NET_INFLOW_RATIO = 'super_large_net_inflow_ratio',
  LARGE_NET_INFLOW_AMOUNT = 'large_net_inflow_amount',
  LARGE_NET_INFLOW_RATIO = 'large_net_inflow_ratio',
  MEDIUM_NET_INFLOW_AMOUNT = 'medium_net_inflow_amount',
  MEDIUM_NET_INFLOW_RATIO = 'medium_net_inflow_ratio',
  SMALL_NET_INFLOW_AMOUNT = 'small_net_inflow_amount',
  SMALL_NET_INFLOW_RATIO = 'small_net_inflow_ratio'
}

// 资金流指标配置接口
export interface FundFlowMetricConfig {
  name: string
  unit: string
  formatter?: (value: number) => string
}

// 资金流指标配置映射
export const FUND_FLOW_METRICS: Record<FundFlowMetricType, FundFlowMetricConfig> = {
  [FundFlowMetricType.TOTAL_NET_INFLOW_AMOUNT]: {
    name: '全部净流入金额',
    unit: '元',
    formatter: (value: number) => {
      if (Math.abs(value) >= 100000000) {
        return (value / 100000000).toFixed(2) + '亿'
      } else if (Math.abs(value) >= 10000) {
        return (value / 10000).toFixed(2) + '万'
      }
      return value.toFixed(2)
    }
  },
  [FundFlowMetricType.TOTAL_NET_INFLOW_RATIO]: {
    name: '全部净流入占比',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  },
  [FundFlowMetricType.MAIN_NET_INFLOW_AMOUNT]: {
    name: '主力净流入金额',
    unit: '元',
    formatter: (value: number) => {
      if (Math.abs(value) >= 100000000) {
        return (value / 100000000).toFixed(2) + '亿'
      } else if (Math.abs(value) >= 10000) {
        return (value / 10000).toFixed(2) + '万'
      }
      return value.toFixed(2)
    }
  },
  [FundFlowMetricType.MAIN_NET_INFLOW_RATIO]: {
    name: '主力净流入占比',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  },
  [FundFlowMetricType.SUPER_LARGE_NET_INFLOW_AMOUNT]: {
    name: '超大单净流入金额',
    unit: '元',
    formatter: (value: number) => {
      if (Math.abs(value) >= 100000000) {
        return (value / 100000000).toFixed(2) + '亿'
      } else if (Math.abs(value) >= 10000) {
        return (value / 10000).toFixed(2) + '万'
      }
      return value.toFixed(2)
    }
  },
  [FundFlowMetricType.SUPER_LARGE_NET_INFLOW_RATIO]: {
    name: '超大单净流入占比',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  },
  [FundFlowMetricType.LARGE_NET_INFLOW_AMOUNT]: {
    name: '大单净流入金额',
    unit: '元',
    formatter: (value: number) => {
      if (Math.abs(value) >= 100000000) {
        return (value / 100000000).toFixed(2) + '亿'
      } else if (Math.abs(value) >= 10000) {
        return (value / 10000).toFixed(2) + '万'
      }
      return value.toFixed(2)
    }
  },
  [FundFlowMetricType.LARGE_NET_INFLOW_RATIO]: {
    name: '大单净流入占比',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  },
  [FundFlowMetricType.MEDIUM_NET_INFLOW_AMOUNT]: {
    name: '中单净流入金额',
    unit: '元',
    formatter: (value: number) => {
      if (Math.abs(value) >= 100000000) {
        return (value / 100000000).toFixed(2) + '亿'
      } else if (Math.abs(value) >= 10000) {
        return (value / 10000).toFixed(2) + '万'
      }
      return value.toFixed(2)
    }
  },
  [FundFlowMetricType.MEDIUM_NET_INFLOW_RATIO]: {
    name: '中单净流入占比',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  },
  [FundFlowMetricType.SMALL_NET_INFLOW_AMOUNT]: {
    name: '小单净流入金额',
    unit: '元',
    formatter: (value: number) => {
      if (Math.abs(value) >= 100000000) {
        return (value / 100000000).toFixed(2) + '亿'
      } else if (Math.abs(value) >= 10000) {
        return (value / 10000).toFixed(2) + '万'
      }
      return value.toFixed(2)
    }
  },
  [FundFlowMetricType.SMALL_NET_INFLOW_RATIO]: {
    name: '小单净流入占比',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  }
}

/**
 * 获取行业资金流数据
 * @param startDate 开始日期，格式：YYYY-MM-DD，默认为30天前
 * @param endDate 结束日期，格式：YYYY-MM-DD，默认为当前日期
 * @returns Promise<IndustryFundFlowData | null> 行业资金流数据
 */
export async function fetchIndustryFundFlowData(
  startDate?: string,
  endDate?: string
): Promise<IndustryFundFlowData | null> {
  try {
    const params: any = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate

    const response = await axios.get<IndustryFundFlowData>(`${API_BASE_URL}/industry/fund-flow/data/`, {
      params
    })
    
    return response.data
  } catch (error) {
    console.error('获取行业资金流数据失败:', error)
    throw error
  }
}
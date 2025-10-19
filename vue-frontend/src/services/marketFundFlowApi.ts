/**
 * 大盘资金流数据API服务
 * 功能：
 * 1. 获取大盘资金流数据
 * 2. 支持时间范围查询和分页
 * 3. 返回格式化的资金流数据结构
 */
import axios from './axiosConfig'

// API基础URL
const API_BASE_URL = '/django/api/market'

// 大盘资金流数据项接口
export interface MarketFundFlowDataItem {
  id: number
  date: string
  main_net_inflow_amount: number          // 主力净流入金额
  small_net_inflow_amount: number         // 小单净流入金额
  medium_net_inflow_amount: number        // 中单净流入金额
  large_net_inflow_amount: number         // 大单净流入金额
  super_large_net_inflow_amount: number   // 超大单净流入金额
  main_net_inflow_ratio: number           // 主力净流入比例
  small_net_inflow_ratio: number          // 小单净流入比例
  medium_net_inflow_ratio: number         // 中单净流入比例
  large_net_inflow_ratio: number          // 大单净流入比例
  super_large_net_inflow_ratio: number    // 超大单净流入比例
  shanghai_close_price: number            // 上证收盘价
  shanghai_change_rate: number            // 上证涨跌幅
  shenzhen_close_price: number            // 深证收盘价
  shenzhen_change_rate: number            // 深证涨跌幅
  created_at: string
  updated_at: string
}

// 分页信息接口
export interface PaginationInfo {
  current_page: number
  total_pages: number
  total_count: number
  page_size: number
  has_next: boolean
  has_previous: boolean
}

// 大盘资金流响应数据接口
export interface MarketFundFlowResponse {
  code: number
  message: string
  data: MarketFundFlowData
}

export interface MarketFundFlowData {
    list: MarketFundFlowDataItem[]
    pagination: PaginationInfo
  }

// 资金流指标类型
export type FundFlowMetricType = 
  | 'main_net_inflow_amount'
  | 'small_net_inflow_amount'
  | 'medium_net_inflow_amount'
  | 'large_net_inflow_amount'
  | 'super_large_net_inflow_amount'
  | 'main_net_inflow_ratio'
  | 'small_net_inflow_ratio'
  | 'medium_net_inflow_ratio'
  | 'large_net_inflow_ratio'
  | 'super_large_net_inflow_ratio'
  | 'shanghai_close_price'
  | 'shanghai_change_rate'
  | 'shenzhen_close_price'
  | 'shenzhen_change_rate'

// 资金流指标配置
export interface FundFlowMetricConfig {
  name: string
  unit: string
  formatter?: (value: number) => string
}

// 资金流指标配置映射
export const FUND_FLOW_METRICS: Record<FundFlowMetricType, FundFlowMetricConfig> = {
  main_net_inflow_amount: {
    name: '主力净流入金额',
    unit: '元',
    formatter: (value: number) => {
      if (value >= 100000000) {
        return (value / 100000000).toFixed(2) + '亿'
      } else if (value >= 10000) {
        return (value / 10000).toFixed(2) + '万'
      } else {
        return value.toFixed(2)
      }
    }
  },
  small_net_inflow_amount: {
    name: '小单净流入金额',
    unit: '元',
    formatter: (value: number) => {
      if (value >= 100000000) {
        return (value / 100000000).toFixed(2) + '亿'
      } else if (value >= 10000) {
        return (value / 10000).toFixed(2) + '万'
      } else {
        return value.toFixed(2)
      }
    }
  },
  medium_net_inflow_amount: {
    name: '中单净流入金额',
    unit: '元',
    formatter: (value: number) => {
      if (value >= 100000000) {
        return (value / 100000000).toFixed(2) + '亿'
      } else if (value >= 10000) {
        return (value / 10000).toFixed(2) + '万'
      } else {
        return value.toFixed(2)
      }
    }
  },
  large_net_inflow_amount: {
    name: '大单净流入金额',
    unit: '元',
    formatter: (value: number) => {
      if (value >= 100000000) {
        return (value / 100000000).toFixed(2) + '亿'
      } else if (value >= 10000) {
        return (value / 10000).toFixed(2) + '万'
      } else {
        return value.toFixed(2)
      }
    }
  },
  super_large_net_inflow_amount: {
    name: '超大单净流入金额',
    unit: '元',
    formatter: (value: number) => {
      if (value >= 100000000) {
        return (value / 100000000).toFixed(2) + '亿'
      } else if (value >= 10000) {
        return (value / 10000).toFixed(2) + '万'
      } else {
        return value.toFixed(2)
      }
    }
  },
  main_net_inflow_ratio: {
    name: '主力净流入比例',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  },
  small_net_inflow_ratio: {
    name: '小单净流入比例',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  },
  medium_net_inflow_ratio: {
    name: '中单净流入比例',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  },
  large_net_inflow_ratio: {
    name: '大单净流入比例',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  },
  super_large_net_inflow_ratio: {
    name: '超大单净流入比例',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  },
  shanghai_close_price: {
    name: '上证收盘价',
    unit: '点',
    formatter: (value: number) => value.toFixed(2)
  },
  shanghai_change_rate: {
    name: '上证涨跌幅',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  },
  shenzhen_close_price: {
    name: '深证收盘价',
    unit: '点',
    formatter: (value: number) => value.toFixed(2)
  },
  shenzhen_change_rate: {
    name: '深证涨跌幅',
    unit: '%',
    formatter: (value: number) => value.toFixed(2)
  }
}

/**
 * 获取大盘资金流数据
 * @param startDate 开始日期，格式：YYYY-MM-DD
 * @param endDate 结束日期，格式：YYYY-MM-DD
 * @param page 页码，默认为1
 * @param pageSize 每页数量，默认为20
 * @param orderBy 排序字段，默认为-date（按日期倒序）
 * @returns Promise<MarketFundFlowResponse> 大盘资金流数据
 */
export async function fetchMarketFundFlowData(
  startDate?: string,
  endDate?: string,
  page: number = 1,
  pageSize: number = 20,
  orderBy: string = '-date'
): Promise<MarketFundFlowData> {
  try {
    const params: any = {
      page,
      page_size: pageSize,
      order_by: orderBy
    }
    
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate

    const response = await axios.get<MarketFundFlowData>(`${API_BASE_URL}/fund-flow/`, {
      params
    })
    
    return response.data
  } catch (error) {
    console.error('获取大盘资金流数据失败:', error)
    throw error
  }
}

/**
 * 格式化大盘资金流数据，用于热力图展示
 * @param data 原始数据
 * @returns 格式化后的数据
 */
export function formatMarketFundFlowData(data: MarketFundFlowDataItem[]) {
  return data.map(item => ({
    date: item.date,
    main_net_inflow_amount: item.main_net_inflow_amount,
    small_net_inflow_amount: item.small_net_inflow_amount,
    medium_net_inflow_amount: item.medium_net_inflow_amount,
    large_net_inflow_amount: item.large_net_inflow_amount,
    super_large_net_inflow_amount: item.super_large_net_inflow_amount,
    main_net_inflow_ratio: item.main_net_inflow_ratio,
    small_net_inflow_ratio: item.small_net_inflow_ratio,
    medium_net_inflow_ratio: item.medium_net_inflow_ratio,
    large_net_inflow_ratio: item.large_net_inflow_ratio,
    super_large_net_inflow_ratio: item.super_large_net_inflow_ratio,
    shanghai_close_price: item.shanghai_close_price,
    shanghai_change_rate: item.shanghai_change_rate,
    shenzhen_close_price: item.shenzhen_close_price,
    shenzhen_change_rate: item.shenzhen_change_rate
  }))
}

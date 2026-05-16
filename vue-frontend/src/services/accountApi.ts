// 股票账户数据API服务
import axios from './axiosConfig'

// 股票账户统计数据接口类型定义
export interface StockAccountData {
  date: string
  '上证指数-收盘': number
  '上证指数-涨跌幅': number
  '数据日期': string
  '新增投资者-同比': number | null
  '新增投资者-数量': number
  '新增投资者-环比': number | null
  '期末投资者-A股账户': number
  '期末投资者-B股账户': number
  '期末投资者-总量': number
  '沪深总市值': number
  '沪深户均市值': number
}

export interface StockAccountApiResponse {
  code: number
  message: string
  data: StockAccountData[]
  timestamp: string
}

/**
 * 获取股票账户统计数据
 * @returns Promise<StockAccountApiResponse>
 */
export async function getStockAccountStatistics(): Promise<StockAccountApiResponse> {
  try {
    const response = await axios.get<StockAccountApiResponse>(
      `/api/sh-a/stock/account/statistics`
    )
    return response.data
  } catch (error) {
    console.error('获取股票账户统计数据失败:', error)
    throw error
  }
}

/**
 * 格式化股票账户数据用于图表展示
 * @param data 原始股票账户数据
 * @returns 格式化后的数据
 */
export function formatAccountData(data: StockAccountData[]) {
  return data.map(item => ({
    date: item.date,
    'A股账户数': item['期末投资者-A股账户'],
    'B股账户数': item['期末投资者-B股账户'],
    '账户总量': item['期末投资者-总量'],
    '新增投资者': item['新增投资者-数量'],
    '沪深总市值': item['沪深总市值'],
    '沪深户均市值': item['沪深户均市值'],
    '上证指数': item['上证指数-收盘']
  }))
}
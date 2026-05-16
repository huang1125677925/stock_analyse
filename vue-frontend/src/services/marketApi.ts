// 大盘数据API服务
import axios from './axiosConfig'

// 上证A股指数历史数据接口类型定义
export interface IndexHistData {
  date: string
  开盘: number
  成交量: number
  成交额: number
  振幅: number
  换手率: number
  收盘: number
  日期: string
  最低: number
  最高: number
  涨跌幅: number
  涨跌额: number
}

export interface IndexHistApiResponse {
  code: number
  message: string
  data: IndexHistData[]
  timestamp: string
}

/**
 * 获取上证A股指数历史数据
 * @param startDate 开始日期，格式：YYYY-MM-DD
 * @param endDate 结束日期，格式：YYYY-MM-DD
 * @returns Promise<IndexHistApiResponse>
 */
export async function getShIndexHistory(startDate: string, endDate: string): Promise<IndexHistApiResponse> {
  try {
    const response = await axios.get<IndexHistApiResponse>(
      `/api/sh-a/stock/000001/index_zh_a_hist`,
      {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('获取上证A股指数历史数据失败:', error)
    throw error
  }
}

/**
 * 格式化大盘数据，用于图表展示
 * @param data 原始数据
 * @returns 格式化后的数据
 */
export function formatIndexData(data: IndexHistData[]) {
  return data.map(item => ({
    date: item.date,
    日期: item.日期,
    开盘点位: item.开盘,
    收盘点位: item.收盘,
    最低点位: item.最低,
    最高点位: item.最高,
    成交量: item.成交量,
    成交额: item.成交额,
    涨跌幅: item.涨跌幅,
    涨跌额: item.涨跌额,
    振幅: item.振幅,
    换手率: item.换手率
  }))
}
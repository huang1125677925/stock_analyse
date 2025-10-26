import axios from './axiosConfig'

// 指数基础数据项
export interface IndexItem {
  id: number
  code: string
  name: string
  created_at: string
  updated_at: string
}

// 分页信息
export interface PaginationInfo {
  current_page: number
  total_pages: number
  total_count: number
  page_size: number
  has_next: boolean
  has_previous: boolean
}

// 指数列表响应
export interface IndexListResponse {
  code: number
  message: string
  data: IndexListData
}

export interface IndexListData {
  list: IndexItem[]
  pagination: PaginationInfo
}

export interface IndexListParams {
  page: number
  page_size: number
  search?: string
  code?: string
}

/**
 * 获取指数基础数据列表
 * 使用 axiosConfig 实例，支持分页与搜索
 */
export async function getIndexBasicData(params: IndexListParams): Promise<IndexListData> {
  const response = await axios.get<IndexListData>('/django/api/market/index-basic-data/', { params })
  return response.data
}
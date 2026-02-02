import axios from './axiosConfig'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

export interface SwIndexClassifyData<T = unknown> {
  count: number
  interface: string
  records: T
}

export interface SwIndexClassifyItem {
  index_code: string
  industry_code: string
  industry_name: string
  level: string
  parent_code?: string
  src?: string
}

export interface FetchSwIndexClassifyParams {
  index_code?: string
  level?: string
  parent_code?: string
  src?: string // Default SW2021
}

/**
 * 获取申万行业分类信息
 * @param params 查询参数
 * @returns 行业分类列表
 */
export async function fetchSwIndexClassify(params: FetchSwIndexClassifyParams): Promise<SwIndexClassifyItem[]> {
  const res = await axios.get<SwIndexClassifyData<SwIndexClassifyItem[]>>('/django/api/index/sw-index-classify/', {
    params
  })
  return res.data.records
}

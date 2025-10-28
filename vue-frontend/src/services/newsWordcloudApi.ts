import axios from './axiosConfig'

// 新闻词云词项
export interface WordItem {
  word: string
  count: number
}

// 请求参数
export interface WordcloudQuery {
  start_date: string
  end_date: string
  top_n?: number
  min_len?: number
}

// 响应结构
export interface NewsWordcloudData {
  total: number
  words: WordItem[]
  query: {
    start_date: string
    end_date: string
    top_n: number
    min_len: number
  }
}

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp: string
  data: T
}

// 获取新闻词云数据
export async function fetchNewsWordcloud(params: WordcloudQuery): Promise<NewsWordcloudData> {
  const response = await axios.get<NewsWordcloudData>('/django/api/news/wordcloud/', { params })
  return response.data
}
import axios from './axiosConfig'

interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp: string
  data?: T
}

export interface SiteVisitData {
  total_visits: number
}

export async function recordSiteVisit(): Promise<SiteVisitData> {
  const response = await axios.post<ApiResponse<SiteVisitData>, ApiResponse<SiteVisitData>>('/django/api/site/visit/')
  return response.data ?? { total_visits: 0 }
}

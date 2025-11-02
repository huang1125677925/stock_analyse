import axios from './axiosConfig'

// 通用响应结构（保持与项目其余 services 一致）
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp?: string
  data: T
}

// Git 提交记录
export interface GitCommitRecord {
  authored_datetime: string
  message: string
}

// Git 信息数据
export interface GitInfoData {
  interface: string
  count: number
  records: GitCommitRecord[]
}

// 获取指定仓库的提交信息（最近提交在前）
export async function getGitInfo(repoPath: string, limit = 50): Promise<GitInfoData> {
  const res = await axios.get<ApiResponse<GitInfoData>, ApiResponse<GitInfoData>>(
    '/django/api/tasks/git-info/',
    { params: { repo_path: repoPath, limit } }
  )
  return res.data
}
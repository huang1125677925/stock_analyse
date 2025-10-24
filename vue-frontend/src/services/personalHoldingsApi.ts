/**
 * 个人中心持有/关注股票管理 API 服务
 * 功能：
 * 1. 获取当前用户的持有/关注股票列表（GET /django/api/personal/holdings/）
 * 2. 新增一条持有/关注记录（POST /django/api/personal/holdings/）
 * 3. 删除一条持有/关注记录（DELETE /django/api/personal/holdings/{id}/）
 * 
 * 说明：
 * - 请求需携带 Authorization: Bearer <token>，axiosConfig 已统一处理
 * - 返回结构遵循后端统一格式（code/message/timestamp/data）
 */
import axios from './axiosConfig'

/** 关系类型 */
export type RelationType = 'WATCHED' | 'HELD'

/** 持有/关注记录实体 */
export interface PersonalHoldingItem {
  id: number
  stock_code: string
  stock_name: string
  industry: string
  relation_type: RelationType
  created_at: string
}

/** 列表响应数据 */
export interface PersonalHoldingsListData {
  list: PersonalHoldingItem[]
  total: number
}

/** 基础响应结构 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  timestamp: string
  data: T
}

/** 获取列表响应 */
export type PersonalHoldingsListResponse = ApiResponse<PersonalHoldingsListData>

/** 新增响应 */
export type CreatePersonalHoldingResponse = ApiResponse<PersonalHoldingItem>

/** 删除响应（data 为 null） */
export type DeletePersonalHoldingResponse = ApiResponse<null>

/** 新增请求体 */
export interface CreatePersonalHoldingRequest {
  stock_code: string
  relation_type?: RelationType // 默认 WATCHED
}

/**
 * 获取当前用户的持有/关注列表
 */
export async function getPersonalHoldings() {
  const res = await axios.get<PersonalHoldingsListResponse, PersonalHoldingsListResponse>(
    '/django/api/personal/holdings/'
  )
  return res
}

/**
 * 新增一条持有/关注记录
 * @param payload { stock_code, relation_type }
 */
export async function createPersonalHolding(payload: CreatePersonalHoldingRequest) {
  const res = await axios.post<CreatePersonalHoldingResponse, CreatePersonalHoldingResponse>(
    '/django/api/personal/holdings/',
    payload
  )
  return res
}

/**
 * 删除一条持有/关注记录
 * @param id 记录主键ID
 */
export async function deletePersonalHolding(id: number) {
  const res = await axios.delete<DeletePersonalHoldingResponse, DeletePersonalHoldingResponse>(
    `/django/api/personal/holdings/${id}/`
  )
  return res
}
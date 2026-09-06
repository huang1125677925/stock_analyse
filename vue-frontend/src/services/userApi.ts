import axios from './axiosConfig';

// API基础URL
const API_BASE_URL = '/django/api/user';

// 通用响应格式
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  timestamp: string;
  data?: T;
}

// 重置密码请求接口
export interface ResetPasswordRequest {
  email: string;
  new_password: string;
}

// 用户接口定义
export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  is_admin?: boolean;
  last_login?: string;
  created_at: string;
}

// 注册请求接口
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
  invitation_code?: string;
}

// 登录请求接口
export interface LoginRequest {
  username: string; // 用户名或邮箱
  password: string;
}

// 认证响应数据
export interface AuthResponseData {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
}

// 邀请码接口
export interface InvitationCode {
  id?: number;
  code: string;
  is_used?: boolean;
  used_by?: string | null;
  expires_at?: string;
  created_at?: string;
}

/**
 * 用户注册
 * @param data 注册信息
 * @returns 认证响应
 */
export async function register(data: RegisterRequest): Promise<User> {
  try {
    const response = await axios.post(`${API_BASE_URL}/register/`, data);
    return response.data;
  } catch (error) {
    console.error('注册失败:', error);
    throw error;
  }
}

/**
 * 用户登录
 * @param data 登录信息
 * @returns 认证响应
 */
export async function login(data: LoginRequest): Promise<AuthResponseData> {
  try {
    const response = await axios.post(`${API_BASE_URL}/login/`, data);
    return response.data;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}

/**
 * 验证邀请码
 * @param code 邀请码
 * @returns 邀请码验证响应
 */
export async function validateInviteCode(code: string): Promise<ApiResponse> {
  try {
    const response = await axios.post(`${API_BASE_URL}/invitation/validate/`, { code });
    return response.data;
  } catch (error) {
    console.error('邀请码验证失败:', error);
    throw error;
  }
}

/**
 * 获取当前用户信息
 * @returns 用户信息
 */
export async function getCurrentUser(): Promise<ApiResponse<User>> {
  try {
    const response = await axios.get(`${API_BASE_URL}/info/`);
    return response.data;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
}

/**
 * 用户登出
 * @returns 登出响应
 */
export async function logoutApi(): Promise<ApiResponse> {
  try {
    const response = await axios.post(`${API_BASE_URL}/logout/`, {});
    return response.data;
  } catch (error) {
    console.error('登出失败:', error);
    throw error;
  }
}

/**
 * 检查用户是否已认证
 * @returns 是否已认证
 */
export function isAuthenticated(): boolean {
  return false;
}

/**
 * 本地登出（清除本地存储）
 */
export function clearAuthStorage() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// 重置密码API
export async function resetPasswordApi(data: ResetPasswordRequest): Promise<ApiResponse> {
  const response = await axios.post<ApiResponse>(`${API_BASE_URL}/reset-password/`, data);
  return response.data;
}

/**
 * 获取邀请码列表
 * @returns 邀请码列表
 */
export async function getInvitationCodes(): Promise<InvitationCode[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/invitation/`);
    return response.data;
  } catch (error) {
    console.error('获取邀请码列表失败:', error);
    throw error;
  }
}

/**
 * 生成邀请码
 * @returns 新生成的邀请码
 */
export async function generateInvitationCode(): Promise<InvitationCode> {
  try {
    const response = await axios.post(`${API_BASE_URL}/invitation/`, {});
    return response.data;
  } catch (error) {
    console.error('生成邀请码失败:', error);
    throw error;
  }
}

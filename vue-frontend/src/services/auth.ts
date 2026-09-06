import { ref, reactive } from 'vue';
import type { User, AuthResponseData } from './userApi';
import { 
  login as apiLogin, 
  register as apiRegister, 
  getCurrentUser, 
  logoutApi, 
  clearAuthStorage,
  resetPasswordApi
} from './userApi';

// 创建响应式状态
const currentUser = ref<User | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

// 初始化函数，从localStorage加载用户信息
export function initAuth() {
  const userJson = localStorage.getItem('user');
  if (userJson) {
    try {
      currentUser.value = JSON.parse(userJson);
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      localStorage.removeItem('user');
    }
  }
}

// 登录函数
export async function login(username: string, password: string) {
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await apiLogin({ username, password });
    console.log('登录响应:', response);
    
    // 构建用户对象
    const user: User = {
      id: response.id,
      username: response.username,
      email: response.email,
      is_admin: response.is_admin,
      created_at: new Date().toISOString() // 后端没有返回created_at，使用当前时间
    };
    
    localStorage.setItem('user', JSON.stringify(user));
    
    // 更新当前用户
    currentUser.value = user;
    
    return response;
  } catch (e: any) {
    error.value = e.response?.data?.message || e.message || '登录失败，请检查您的凭据';
    throw e;
  } finally {
    isLoading.value = false;
  }
}

// 注册函数
export async function register(username: string, email: string, password: string, invitationCode: string, phone?: string) {
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await apiRegister({ username, email, password, invitation_code: invitationCode, phone });
    
    if (response) {
      // 注册成功后，需要登录获取token
      return await login(username, password);
    } else {
      throw new Error(response || '注册失败');
    }
  } catch (e: any) {
    error.value = e.response?.data?.message || e.message || '注册失败，请稍后再试';
    throw e;
  } finally {
    isLoading.value = false;
  }
}

// 获取当前用户信息
export async function fetchCurrentUser() {
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await getCurrentUser();
    
    if (response.code === 200 && response.data) {
      currentUser.value = response.data;
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } else {
      throw new Error(response.message || '获取用户信息失败');
    }
  } catch (e: any) {
    error.value = e.response?.data?.message || e.message || '获取用户信息失败';
    logout(); // 如果获取用户信息失败，则登出
    throw e;
  } finally {
    isLoading.value = false;
  }
}

// 登出函数
export async function logout() {
  try {
    // 调用后端登出API
    await logoutApi();
  } catch (e) {
    console.error('登出API调用失败:', e);
  } finally {
    // 无论API是否成功，都清除本地存储
    clearAuthStorage();
    currentUser.value = null;
  }
}

// 检查是否已认证
export function isAuthenticated() {
  return false;
}

// 重置密码函数
export async function resetPassword(email: string, newPassword: string) {
  isLoading.value = true;
  error.value = null;
  
  try {
    await resetPasswordApi({ email, new_password: newPassword });
  } catch (e: any) {
    error.value = e.response?.data?.message || e.message || '重置密码失败，请稍后再试';
    throw e;
  } finally {
    isLoading.value = false;
  }
}

// 导出状态
export { currentUser, isLoading, error };

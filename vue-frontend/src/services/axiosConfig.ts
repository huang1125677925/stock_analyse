import axios from 'axios';
import { ElMessage } from 'element-plus';
import { API_BASE_URL } from '@/config/api';

// 创建axios实例
const instance = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true, // 允许跨域请求携带cookie，解决CSRF问题
  xsrfCookieName: 'csrftoken', // Django默认的CSRF cookie名称
  xsrfHeaderName: 'X-CSRFToken' // Django默认的CSRF header名称
});

// 请求拦截器
instance.interceptors.request.use(
  config => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    // 如果token存在，则添加到请求头
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 获取CSRF token并添加到请求头
    const csrfToken = document.cookie.match(new RegExp('(^| )csrftoken=([^;]+)'));
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken[2];
      console.log('CSRF Token added:', csrfToken[2]);
    } else {
      console.warn('CSRF Token not found in cookies');
    }
    
    return config;
  },
  error => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

const showError = (message: string) => {
  ElMessage.error({
    message,
    grouping: true,
    showClose: true,
    duration: 3000
  });
};

const normalizeResponseData = (payload: unknown) => {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(trimmed);
      } catch (error) {
        console.warn('响应数据 JSON 解析失败，保留原始字符串:', error);
      }
    }
  }
  return payload;
};

// 响应拦截器
instance.interceptors.response.use(
  response => {
    const res = normalizeResponseData(response.data);
    console.log('axios response normalized:', res);

    // 如果响应成功
    if (res?.code === 200 || res?.code === '200') {
      return res;
    }

    // 部分后端接口直接返回业务数据，不带统一 code 字段。
    // HTTP 2xx 已由 axios 确认成功，这里直接放行给具体 service 解析。
    if (res && typeof res === 'object' && !('code' in res)) {
      return res;
    }
    
    // 处理特定错误码
    if (res && typeof res === 'object' && res.code === 401) {
      // 未认证或认证失败，清除本地存储并重定向到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      showError(res.message || '认证失败，请重新登录');
      window.location.href = '/login';
      return Promise.reject(new Error(res.message || '认证失败'));
    }
    
    if (res && typeof res === 'object' && res.code === 403) {
      showError(res.message || '权限不足');
      return Promise.reject(new Error(res.message || '权限不足'));
    }
    
    // 其他错误
    const message = res && typeof res === 'object' && 'message' in res ? res.message : '请求失败';
    showError(String(message || '请求失败'));
    return Promise.reject(new Error(String(message || '请求失败')));
  },
  error => {
    console.error('响应错误:', error);
    
    // 处理网络错误或服务器错误
    if (error.response) {
      // 服务器返回了错误状态码
      const status = error.response.status;
      let message = '请求失败';
      
      if (status === 401) {
        message = '认证失败，请重新登录';
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (status === 403) {
        message = '权限不足';
      } else if (status === 404) {
        message = '请求的资源不存在';
      } else if (status === 500) {
        message = '服务器内部错误';
      }
      
      showError(message);
    } else if (error.request) {
      // 请求已发送但没有收到响应
      showError('服务器无响应，请稍后再试');
    } else {
      // 请求配置出错
      showError('请求配置错误');
    }
    return Promise.reject(error);
  }
);

export default instance;

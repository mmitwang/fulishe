import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { showToast } from 'vant'

interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

type RequestClient = Omit<AxiosInstance, 'get' | 'post' | 'put' | 'delete' | 'patch'> & {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
}

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
}) as unknown as RequestClient

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse
    if (res.code !== 200) {
      showToast({
        message: res.message || '请求失败',
        position: 'top'
      })
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res.data
  },
  (error) => {
    showToast({
      message: error.message || '网络错误',
      position: 'top'
    })
    return Promise.reject(error)
  }
)

export default request
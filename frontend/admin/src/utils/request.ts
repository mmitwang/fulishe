import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

type RequestClient = Omit<AxiosInstance, 'get' | 'post' | 'put' | 'delete' | 'patch'> & {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
}

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const request = axios.create({
  baseURL,
  timeout: 30000
}) as unknown as RequestClient

const responseMessage = (payload: any, fallback: string) => {
  if (payload && typeof payload === 'object') {
    return payload.message || payload.msg || fallback
  }
  return fallback
}

const handleUnauthorized = () => {
  const authStore = useAuthStore()
  const hadSession = Boolean(authStore.token)
  authStore.clearSession()
  if (hadSession && window.location.pathname !== '/login') {
    window.location.replace('/login')
  }
}

request.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 200) {
      const code = Number(res.code)
      const message = responseMessage(res, code === 403 ? '没有权限执行此操作' : '操作失败')
      if (code === 401) handleUnauthorized()
      ElMessage.error(message)
      return Promise.reject(res)
    }
    return res.data
  },
  (error) => {
    const status = Number(error.response?.status || 0)
    const payload = error.response?.data
    const code = Number(payload?.code || status)
    const fallback = code === 401
      ? '登录状态无效，请重新登录'
      : code === 403
        ? '没有权限执行此操作'
        : error.message || '网络异常'
    const message = responseMessage(payload, fallback)
    if (code === 401) handleUnauthorized()
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default request

/**
 * 带 TTL 缓存 + 并发去重的 GET，用于分类/品牌/供应商等低频变更的下拉选项。
 * 同一用户身份下，相同 key 的并发请求只会真正发出一次。
 */
const cacheStore = new Map<string, { expire: number; data: unknown }>()
const inflight = new Map<string, Promise<unknown>>()
let cacheGeneration = 0

export const clearRequestCache = () => {
  cacheGeneration += 1
  cacheStore.clear()
  inflight.clear()
}

const identityCacheKey = () => {
  const userInfo = useAuthStore().userInfo
  return JSON.stringify({
    userId: userInfo?.id ?? 'anonymous',
    roleCodes: [...(userInfo?.roleCodes || [])].sort(),
    merchantId: userInfo?.merchantId ?? null
  })
}

export const cachedGet = <T = any>(url: string, params?: Record<string, any>, ttl = 60000): Promise<T> => {
  const key = `${identityCacheKey()}:${url}?${JSON.stringify(params || {})}`
  const generation = cacheGeneration
  const hit = cacheStore.get(key)
  if (hit && hit.expire > Date.now()) return Promise.resolve(hit.data as T)

  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>

  const task = request
    .get(url, { params })
    .then((data: any) => {
      if (generation === cacheGeneration) {
        cacheStore.set(key, { expire: Date.now() + ttl, data })
      }
      return data
    })
    .finally(() => {
      if (generation === cacheGeneration) inflight.delete(key)
    })

  inflight.set(key, task)
  return task as Promise<T>
}

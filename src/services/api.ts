import Taro from '@tarojs/taro'
import type { ApiEnvelope } from '@/types'
import { getApiBaseUrl } from './config'

export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
  cacheTtl?: number
  auth?: boolean
}

interface CacheEntry {
  expiresAt: number
  value: unknown
}

const MAX_CACHE_ENTRIES = 200
const cache = new Map<string, CacheEntry>()
const pending = new Map<string, Promise<unknown>>()

const pruneCache = (now = Date.now()): void => {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key)
  }
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey === undefined) break
    cache.delete(oldestKey)
  }
}

const serialize = (value: Record<string, unknown> | undefined): string => {
  if (!value) return ''
  return Object.keys(value).sort().map(key => `${key}=${String(value[key])}`).join('&')
}

export const request = <T>(options: RequestOptions): Promise<T> => {
  const method = options.method || 'GET'
  const key = `${method}:${options.url}:${serialize(options.data)}`
  const now = Date.now()
  const cached = cache.get(key)
  if (method === 'GET' && cached) {
    if (cached.expiresAt > now) return Promise.resolve(cached.value as T)
    cache.delete(key)
  }
  if (pending.has(key)) return pending.get(key) as Promise<T>

  const task = new Promise<T>((resolve, reject) => {
    const token = Taro.getStorageSync('token')
    Taro.request({
      url: `${getApiBaseUrl()}${options.url}`,
      method,
      data: options.data,
      timeout: 12000,
      dataType: 'json',
      header: {
        'Content-Type': 'application/json',
        ...(options.auth !== false && token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: response => {
        const body = response.data as ApiEnvelope<T>
        if (response.statusCode >= 200 && response.statusCode < 300 && body?.code === 200) {
          if (method === 'GET' && options.cacheTtl !== 0) {
            cache.set(key, { value: body.data, expiresAt: Date.now() + (options.cacheTtl ?? 15000) })
            pruneCache()
          }
          resolve(body.data)
          return
        }
        const message = body?.msg || body?.message || `请求失败 (${response.statusCode})`
        if (response.statusCode === 401) {
          Taro.removeStorageSync('token')
          Taro.removeStorageSync('userInfo')
        }
        console.error('[API] 业务异常', options.url, response.statusCode, message)
        reject(new Error(message))
      },
      fail: error => {
        console.error('[API] 网络异常', options.url, error)
        reject(new Error('网络连接失败，请检查服务或稍后重试'))
      }
    })
  })

  pending.set(key, task)
  task.then(() => pending.delete(key)).catch(() => pending.delete(key))
  return task
}

export const requestText = (url: string, data: Record<string, unknown>): Promise<string> => {
  const token = Taro.getStorageSync('token')
  return new Promise((resolve, reject) => {
    Taro.request({
      url: `${getApiBaseUrl()}${url}`,
      method: 'POST',
      data,
      dataType: 'text',
      header: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      success: response => response.statusCode < 400 ? resolve(String(response.data)) : reject(new Error(`支付回调失败 (${response.statusCode})`)),
      fail: error => {
        console.error('[API] 文本请求失败', url, error)
        reject(error)
      }
    })
  })
}

export const clearRequestCache = (): void => cache.clear()
export const getCacheSize = (): number => {
  pruneCache()
  return cache.size
}

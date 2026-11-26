import Taro from '@tarojs/taro'

const BASE_URL = 'http://localhost:8080/api'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
}

export const request = <T>(options: RequestOptions): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    Taro.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: { 'Content-Type': 'application/json' },
      success: res => {
        const body = res.data as ApiResponse<T>
        if (body && body.code === 200) {
          resolve(body.data)
        } else {
          console.error('[API] 业务异常', options.url, body)
          Taro.showToast({ title: (body && body.message) || '请求失败', icon: 'none' })
          reject(new Error((body && body.message) || '请求失败'))
        }
      },
      fail: err => {
        console.error('[API] 网络异常', options.url, err)
        Taro.showToast({ title: '网络异常，请检查 Mock 服务', icon: 'none' })
        reject(err)
      }
    })
  })
}

export const getUserId = (): number => {
  const id = Taro.getStorageSync('userId')
  return id ? Number(id) : 2
}

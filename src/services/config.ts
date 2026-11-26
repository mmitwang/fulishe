import Taro from '@tarojs/taro'

export const getApiBaseUrl = (): string => {
  const configured = process.env.FULISHE_API_BASE || Taro.getStorageSync('apiBaseUrl')
  return (configured || 'http://localhost:8088/api').replace(/\/$/, '')
}

export const isMockMode = (): boolean => {
  const stored = Taro.getStorageSync('wechatMode')
  return (stored || process.env.FULISHE_WECHAT_MODE || 'mock') !== 'production'
}

export const setMockMode = (mock: boolean): void => {
  Taro.setStorageSync('wechatMode', mock ? 'mock' : 'production')
}

export const getChannelName = (): string => {
  if (process.env.TARO_ENV === 'weapp') return '微信小程序'
  if (process.env.TARO_ENV === 'h5') return '公众号 H5 / Web'
  return process.env.TARO_ENV || 'Web'
}

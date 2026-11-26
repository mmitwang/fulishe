import Taro from '@tarojs/taro'
import type { ChannelStatus } from '@/types'
import { getApiBaseUrl, getChannelName, isMockMode } from './config'
import { getCacheSize } from './api'

export const getChannelStatus = (): ChannelStatus => ({
  channel: getChannelName(),
  mode: isMockMode() ? 'mock' : 'production',
  appIdReady: Boolean(Taro.getStorageSync('wechatAppId')),
  apiBaseUrl: getApiBaseUrl(),
  cachedEntries: getCacheSize()
})

export const shareGift = async (): Promise<void> => {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    if (process.env.TARO_ENV === 'weapp') {
      Taro.showToast({ title: '模拟分享卡片已生成', icon: 'none' })
      return
    }
    const url = typeof window !== 'undefined' ? window.location.href : 'https://www.fulishe.cn'
    await Taro.setClipboardData({ data: url })
    return
  }
  if (process.env.TARO_ENV === 'weapp') {
    await Taro.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
    Taro.showToast({ title: '请点击右上角分享', icon: 'none' })
    return
  }
  throw new Error('公众号 JS-SDK 分享签名尚未配置')
}

export const subscribeOrderMessage = async (): Promise<string> => {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 350))
    return '模拟订阅成功：订单发货提醒'
  }
  if (process.env.TARO_ENV !== 'weapp') throw new Error('微信订阅消息仅在小程序渠道提供')
  const tmplIds = Taro.getStorageSync('subscribeTemplateIds') || []
  if (!tmplIds.length) throw new Error('请配置订阅消息模板 ID')
  const result = await Taro.requestSubscribeMessage({ tmplIds })
  return `订阅结果：${JSON.stringify(result)}`
}

export const scanTraceCode = async (): Promise<string> => {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return 'FLS-DEMO-TRACE-2026'
  }
  if (process.env.TARO_ENV !== 'weapp') throw new Error('公众号扫码需先配置 JS-SDK，请在小程序渠道联调')
  const result = await Taro.scanCode({ onlyFromCamera: false, scanType: ['qrCode', 'barCode'] })
  return result.result
}

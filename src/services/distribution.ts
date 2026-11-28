import { request } from './api'

interface AttributionResult {
  valid: boolean
  reason?: string
  shareId?: string
  spuId?: number
  expireTime?: string
}

const storageKey = (spuId: number): string => `distributionShare:${spuId}`

export const trackDistributionShare = async (shareId: string, spuId: number, userId: number): Promise<AttributionResult> => {
  const result = await request<AttributionResult>({
    url: '/distribution/attribution',
    data: { shareId, spuId, userId },
    auth: false,
    cacheTtl: 0
  })
  if (result.valid && result.shareId) {
    Taro.setStorageSync(storageKey(spuId), { shareId: result.shareId, expireTime: result.expireTime })
  } else {
    Taro.removeStorageSync(storageKey(spuId))
  }
  return result
}

export const shareIdForProduct = (spuId: number): string | undefined => {
  const key = storageKey(spuId)
  const saved = Taro.getStorageSync(key)
  if (!saved?.shareId) return undefined
  const expireAt = new Date(String(saved.expireTime || '').replace(' ', 'T')).getTime()
  if (!expireAt || expireAt < Date.now()) {
    Taro.removeStorageSync(key)
    return undefined
  }
  return String(saved.shareId)
}

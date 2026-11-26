import Taro from '@tarojs/taro'
import type { Address } from '@/types'
import { clearRequestCache, request } from './api'
import { getCurrentUser } from './auth'
import { isMockMode } from './config'

const storageKey = (userId: number) => `mockAddresses:${userId}`
const currentUserId = () => getCurrentUser()?.id || 2

const createLocalDefault = (userId: number): Address[] => {
  const user = getCurrentUser()
  return [{
    id: 1,
    userId,
    receiver: user?.realName || user?.nickname || '张三',
    mobile: user?.mobile || '13800138005',
    region: '浙江省杭州市西湖区',
    detail: '文三路 90 号 3 幢 502 室',
    tag: '家',
    isDefault: true
  }]
}

const getLocalAddresses = (userId: number): Address[] => {
  const stored = Taro.getStorageSync(storageKey(userId))
  return Array.isArray(stored) ? stored : createLocalDefault(userId)
}

const saveLocalAddresses = (userId: number, addresses: Address[]): Address[] => {
  const sorted = [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.id - a.id)
  Taro.setStorageSync(storageKey(userId), sorted)
  return sorted
}

const saveLocalAddress = (input: Address): Address => {
  const addresses = getLocalAddresses(input.userId)
  const shouldDefault = input.isDefault || addresses.length === 0
  const others = addresses.filter(item => item.id !== input.id).map(item => ({ ...item, isDefault: shouldDefault ? false : item.isDefault }))
  const address = { ...input, id: input.id || Date.now(), isDefault: shouldDefault }
  saveLocalAddresses(input.userId, [address, ...others])
  return address
}

export const formatAddress = (address: Address): string => `${address.region}${address.detail}`

export const listAddresses = async (): Promise<Address[]> => {
  const userId = currentUserId()
  if (Taro.getStorageSync('token')) {
    try {
      return await request<Address[]>({ url: '/h5/addresses', data: { userId }, cacheTtl: 0 })
    } catch (error) {
      console.error('[Address] 地址簿接口不可用，使用本地地址', error)
      if (!isMockMode()) throw error
    }
  }
  return getLocalAddresses(userId)
}

export const saveAddress = async (input: Address): Promise<Address> => {
  const address = { ...input, userId: currentUserId() }
  if (Taro.getStorageSync('token')) {
    try {
      const result = await request<Address>({
        url: address.id ? `/h5/addresses/${address.id}` : '/h5/addresses',
        method: address.id ? 'PUT' : 'POST',
        data: address as unknown as Record<string, unknown>,
        cacheTtl: 0
      })
      clearRequestCache()
      return result
    } catch (error) {
      console.error('[Address] 地址保存接口不可用', error)
      if (!isMockMode()) throw error
    }
  }
  const result = saveLocalAddress(address)
  clearRequestCache()
  return result
}

export const deleteAddress = async (id: number): Promise<void> => {
  const userId = currentUserId()
  if (Taro.getStorageSync('token')) {
    try {
      await request({ url: `/h5/addresses/${id}`, method: 'DELETE', data: { userId }, cacheTtl: 0 })
      clearRequestCache()
      return
    } catch (error) {
      console.error('[Address] 地址删除接口不可用', error)
      if (!isMockMode()) throw error
    }
  }
  const remaining = getLocalAddresses(userId).filter(item => item.id !== id)
  if (remaining.length && !remaining.some(item => item.isDefault)) remaining[0].isDefault = true
  saveLocalAddresses(userId, remaining)
  clearRequestCache()
}

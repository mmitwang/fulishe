import Taro from '@tarojs/taro'
import type { FulfillmentInfo, Store } from '@/types'
import { request } from './api'

export const fallbackStores: Store[] = [
  { id: 1, name: '西湖银泰店', city: '杭州市', district: '西湖区', address: '浙江省杭州市西湖区文三路 90 号', latitude: 30.2741, longitude: 120.1276, businessHours: '08:30-22:00', deliveryMinutes: 30 },
  { id: 2, name: '钱江新城店', city: '杭州市', district: '上城区', address: '浙江省杭州市上城区解放东路 58 号', latitude: 30.2465, longitude: 120.2106, businessHours: '09:00-21:30', deliveryMinutes: 45 },
  { id: 3, name: '滨江星光店', city: '杭州市', district: '滨江区', address: '浙江省杭州市滨江区江南大道 228 号', latitude: 30.2084, longitude: 120.2108, businessHours: '09:00-22:00', deliveryMinutes: 60 }
]

const createFulfillment = (store: Store): FulfillmentInfo => ({
  store,
  arrivalText: `最快 ${store.deliveryMinutes} 分钟送达`,
  slots: [
    { id: 'asap', label: '尽快送达', period: `预计 ${store.deliveryMinutes} 分钟`, available: true },
    { id: 'today-evening', label: '今天', period: '18:00 - 20:00', available: true },
    { id: 'tomorrow-morning', label: '明天', period: '09:00 - 12:00', available: true },
    { id: 'tomorrow-afternoon', label: '明天', period: '14:00 - 18:00', available: true }
  ]
})

export const getStores = async (): Promise<Store[]> => {
  try {
    return await request<Store[]>({ url: '/h5/stores', cacheTtl: 60000 })
  } catch (error) {
    console.error('[Fulfillment] 门店接口不可用，使用本地门店', error)
    return fallbackStores
  }
}

export const resolveSelectedStore = (stores: Store[]): Store => {
  const selectedId = Number(Taro.getStorageSync('selectedStoreId') || 1)
  return stores.find(item => item.id === selectedId) || stores[0] || fallbackStores[0]
}

export const saveSelectedStore = (store: Store): void => {
  Taro.setStorageSync('selectedStoreId', store.id)
}

export const getFulfillment = async (storeId: number): Promise<FulfillmentInfo> => {
  try {
    return await request<FulfillmentInfo>({ url: '/h5/fulfillment', data: { storeId }, cacheTtl: 20000 })
  } catch (error) {
    console.error('[Fulfillment] 配送时段接口不可用，使用本地时段', error)
    const store = fallbackStores.find(item => item.id === storeId) || fallbackStores[0]
    return createFulfillment(store)
  }
}

export const findNearestStore = (stores: Store[], latitude: number, longitude: number): Store => {
  return stores.reduce((nearest, store) => {
    const distance = Math.pow(store.latitude - latitude, 2) + Math.pow(store.longitude - longitude, 2)
    const nearestDistance = Math.pow(nearest.latitude - latitude, 2) + Math.pow(nearest.longitude - longitude, 2)
    return distance < nearestDistance ? store : nearest
  }, stores[0] || fallbackStores[0])
}

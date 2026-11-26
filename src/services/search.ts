import { fallbackProducts } from '@/data/catalog'
import { request } from './api'

const defaultHotKeywords = ['节庆礼盒', '员工福利', '月饼', '坚果', '龙井茶', '商务伴手礼']

export const getHotKeywords = async (): Promise<string[]> => {
  try {
    const result = await request<{ hotKeywords: string[] }>({ url: '/h5/search/hot', cacheTtl: 60000 })
    return result.hotKeywords
  } catch (error) {
    console.error('[Search] 热词接口不可用，使用本地热词', error)
    return defaultHotKeywords
  }
}

export const getSearchSuggestions = async (keyword: string): Promise<string[]> => {
  const value = keyword.trim()
  if (!value) return []
  try {
    return await request<string[]>({ url: '/h5/search/suggest', data: { keyword: value }, cacheTtl: 10000 })
  } catch (error) {
    console.error('[Search] 联想接口不可用，使用本地联想', error)
    return [...new Set(fallbackProducts.flatMap(item => [item.spuName, item.brandName, item.categoryName]))]
      .filter(item => item.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 8)
  }
}

import type { Category, HomeData, PageResult, Product, ProductDetail, Sku } from '@/types'
import { fallbackCategories, fallbackProducts, toFallbackDetail } from '@/data/catalog'
import { request } from './api'

interface RawProduct {
  id: number
  spuCode?: string
  spuName: string
  description?: string
  categoryId: number
  categoryName?: string
  brandName?: string
  sellPrice: number
  originalPrice?: number
  stock?: number
  sales?: number
  image?: string
  coverImage?: string
  images?: string[]
  imageList?: string[]
  tags?: string[]
  deliveryTag?: string
  serviceTags?: string[]
  specs?: { name: string; value: string }[]
  detailSections?: { title: string; content: string }[]
  reviews?: ProductDetail['reviews']
  videoUrl?: string
}

interface RawSku {
  id: number
  spuId: number
  skuName: string
  specifications?: string
  price: number
  originalPrice?: number
  stock: number
  image?: string
}

interface RawCategory {
  id: number
  categoryName: string
  image?: string
}

const normalizeProduct = (raw: RawProduct): Product => {
  const fallback = fallbackProducts[(Math.max(1, raw.id) - 1) % fallbackProducts.length]
  const cover = raw.image || raw.coverImage || fallback.image
  return {
    id: raw.id,
    spuCode: raw.spuCode,
    spuName: raw.spuName,
    description: raw.description || fallback.description,
    categoryId: raw.categoryId,
    categoryName: raw.categoryName || fallback.categoryName,
    brandName: raw.brandName || '福礼社甄选',
    sellPrice: Number(raw.sellPrice),
    originalPrice: Number(raw.originalPrice || raw.sellPrice),
    stock: raw.stock ?? 0,
    sales: raw.sales ?? 0,
    image: cover,
    images: raw.images?.length ? raw.images : raw.imageList?.length ? raw.imageList : [cover],
    tags: raw.tags?.length ? raw.tags : ['品牌直供', '企业集采'],
    deliveryTag: raw.deliveryTag || fallback.deliveryTag,
    videoUrl: raw.videoUrl || fallback.videoUrl
  }
}

const normalizeSku = (raw: RawSku, product: Product): Sku => ({
  id: raw.id,
  spuId: raw.spuId,
  skuName: raw.skuName,
  specifications: raw.specifications,
  price: Number(raw.price),
  originalPrice: Number(raw.originalPrice || product.originalPrice),
  stock: raw.stock,
  image: raw.image
})

export const getCategories = async (): Promise<Category[]> => {
  try {
    const result = await request<PageResult<RawCategory>>({ url: '/product/category/page', data: { current: 1, size: 50 }, cacheTtl: 60000 })
    return result.records.filter(item => item.id <= 8 || !item.categoryName.includes('卡'))
  } catch (error) {
    console.error('[Catalog] 分类接口不可用，使用本地兜底', error)
    return fallbackCategories
  }
}

export interface ProductQueryOptions {
  sort?: 'default' | 'sales' | 'priceAsc' | 'priceDesc' | 'newest'
  instant?: boolean
}

export const getProductPage = async (current = 1, size = 12, categoryId = 0, keyword = '', options: ProductQueryOptions = {}): Promise<PageResult<Product>> => {
  try {
    const data: Record<string, unknown> = { current, size }
    if (categoryId) data.categoryId = categoryId
    if (keyword.trim()) data.spuName = keyword.trim()
    if (options.sort && options.sort !== 'default') data.sort = options.sort
    if (options.instant) data.instant = 1
    const result = await request<PageResult<RawProduct>>({ url: '/product/spu/page', data, cacheTtl: 20000 })
    return { ...result, records: result.records.map(normalizeProduct) }
  } catch (error) {
    console.error('[Catalog] 商品接口不可用，使用本地兜底', error)
    const value = keyword.trim().toLowerCase()
    let filtered = fallbackProducts.filter(item => {
      const matchesKeyword = !value || [item.spuName, item.brandName, item.categoryName, item.description].some(text => text.toLowerCase().includes(value))
      const matchesDelivery = !options.instant || item.deliveryTag.includes('30 分钟') || item.deliveryTag.includes('即时')
      return (!categoryId || item.categoryId === categoryId) && matchesKeyword && matchesDelivery
    })
    if (options.sort === 'sales') filtered = [...filtered].sort((a, b) => b.sales - a.sales)
    if (options.sort === 'priceAsc') filtered = [...filtered].sort((a, b) => a.sellPrice - b.sellPrice)
    if (options.sort === 'priceDesc') filtered = [...filtered].sort((a, b) => b.sellPrice - a.sellPrice)
    if (options.sort === 'newest') filtered = [...filtered].sort((a, b) => b.id - a.id)
    return { records: filtered.slice((current - 1) * size, current * size), total: filtered.length, current, size }
  }
}

export const getHomeData = async (): Promise<HomeData> => {
  const [categories, products] = await Promise.all([getCategories(), getProductPage(1, 10)])
  const hotProducts = products.records
  return {
    categories,
    hotProducts,
    notices: ['企业集采支持多地址配送与统一开票', '每一笔订单均可查询支付与履约状态'],
    banners: hotProducts.slice(0, 3).map((product, index) => ({
      id: index + 1,
      productId: product.id,
      title: ['东方好礼，得体抵达', '企业福利，一站集采', '品牌直供，放心交付'][index],
      subtitle: product.spuName,
      image: product.image
    }))
  }
}

const enrichDetail = (product: Product, skus: Sku[], raw?: RawProduct): ProductDetail => ({
  ...product,
  skus,
  serviceTags: raw?.serviceTags?.length ? raw.serviceTags : ['正品保障', '开具发票', '一件代发', '企业定制'],
  specs: raw?.specs?.length ? raw.specs : [{ name: '商品编码', value: product.spuCode || `FLS${String(product.id).padStart(5, '0')}` }, { name: '品牌', value: product.brandName }, { name: '服务', value: '企业集采 / 多地址配送' }],
  detailSections: raw?.detailSections?.length ? raw.detailSections : [{ title: '礼赠有度，交付有据', content: product.description }],
  reviews: raw?.reviews || []
})

export const getProductDetail = async (id: number): Promise<ProductDetail> => {
  try {
    const [rawProduct, rawSkus] = await Promise.all([
      request<RawProduct>({ url: `/product/spu/${id}`, cacheTtl: 30000 }),
      request<RawSku[]>({ url: `/product/sku/spu/${id}`, cacheTtl: 30000 })
    ])
    const product = normalizeProduct(rawProduct)
    return enrichDetail(product, rawSkus.map(item => normalizeSku(item, product)), rawProduct)
  } catch (realError) {
    console.error('[Catalog] 真实商品详情不可用，尝试兼容详情接口', realError)
    try {
      const raw = await request<ProductDetail>({ url: `/h5/product/${id}`, cacheTtl: 30000 })
      const product = normalizeProduct(raw)
      return {
        ...raw,
        ...product,
        skus: (raw.skus || []).map(item => normalizeSku(item, product)),
        serviceTags: raw.serviceTags || ['正品保障', '开具发票'],
        specs: raw.specs || [],
        detailSections: raw.detailSections || [],
        reviews: raw.reviews || []
      }
    } catch (mockError) {
      console.error('[Catalog] 兼容详情接口不可用，使用本地兜底', mockError)
      const product = fallbackProducts.find(item => item.id === id) || fallbackProducts[0]
      return toFallbackDetail(product)
    }
  }
}

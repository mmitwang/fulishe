import request from '@/utils/request'
import type { ProductDetail, Product, PageResult } from './types'

export const getProductDetail = (id: number | string) =>
  request.get<ProductDetail>(`/h5/product/${id}`)

export interface SpuPageParams {
  current: number
  size: number
  categoryId?: number
  spuName?: string
}

export const getSpuPage = (params: SpuPageParams) =>
  request.get<PageResult<Product>>('/product/spu/page', { params })

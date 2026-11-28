import request from '@/utils/request'
import type { CartItem } from './types'

export const getCart = (userId: number) =>
  request.get<CartItem[]>('/cart', { params: { userId } })

export const addCart = (data: { userId: number; skuId: number; quantity: number }) =>
  request.post('/cart/add', data)

export const updateCart = (data: { id: number; selected?: boolean; quantity?: number }) =>
  request.put('/cart/update', data)

export const removeCart = (id: number) => request.delete(`/cart/${id}`)

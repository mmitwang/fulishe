import request from '@/utils/request'
import type { Order } from './types'

export interface CreateOrderPayload {
  userId: number
  items: { skuId: number; quantity: number; shareId?: string }[]
  receiver: string
  mobile: string
  address: string
  remark?: string
  couponId?: number
  promotionId?: number
}

export const createOrder = (data: CreateOrderPayload) =>
  request.post<{ orderNo: string; payAmount: number }>('/order/create', data)

// 订单列表返回数组（非分页）
export const getOrderList = (params: { userId: number; orderStatus?: number | string }) =>
  request.get<Order[]>('/order/list', { params })

export const getOrderDetail = (orderNo: string) =>
  request.get<Order>(`/order/detail/${orderNo}`)

export const completeOrder = (id: number) => request.put(`/order/${id}/complete`)

// 买家退款为「申请审核」流程，传 orderNo；禁止用 /pay/refund
export const applyRefund = (data: { orderNo: string; reason: string }) =>
  request.post('/refund/apply', data)

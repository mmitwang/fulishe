import request from '@/utils/request'
import type { Coupon } from './types'

export const getMyCoupons = (userId: number) =>
  request.get<Coupon[]>('/coupon/my', { params: { userId } })

export const redeemCoupon = (data: { couponCode: string; orderNo: string }) =>
  request.post('/coupon/redeem', data)

export const transferCoupon = (data: { couponCode: string; toUserId: number }) =>
  request.post('/coupon/transfer', data)

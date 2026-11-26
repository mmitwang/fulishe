import request from '@/utils/request'

export interface CreatePayDTO {
  orderNo: string
  tenantId: number
  userId: number
  payMethod: number
  payAmount: string
}

export interface PayResult {
  payNo: string
  orderNo: string
  payMethod: number
  payUrl?: string
  qrcode?: string
  qrCode?: string
  bankFormUrl?: string
  message: string
}

export interface PayStatusResult {
  payNo: string
  payStatus: number
  payStatusDesc: string
  payAmount: string
  payTime?: string
}

export const createPayment = (data: CreatePayDTO): Promise<PayResult> => {
  return request.post('/pay/create', data)
}

export const queryPayment = (payNo: string): Promise<PayStatusResult> => {
  return request.get(`/pay/query/${payNo}`)
}

export const createRefund = (payNo: string, reason: string) => {
  return request.post('/pay/refund', { payNo, reason })
}
import request from '@/utils/request'

export const createPay = (data: { orderNo: string; payMethod: number }) =>
  request.post<{ payStatus: number; payNo?: string }>('/pay/create', data)

export const queryPay = (payNo: string) => request.get(`/pay/query/${payNo}`)

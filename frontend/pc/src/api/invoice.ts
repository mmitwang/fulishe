import request from '@/utils/request'

export interface InvoicePayload {
  userId: number
  orderNo: string
  buyerName: string
  titleType: number // 1个人 2企业
  invoiceType: number // 1电子普票 2增值税专票
  taxNo?: string
  email?: string
  amount: number
}

export const applyInvoice = (data: InvoicePayload) => request.post('/invoice/apply', data)

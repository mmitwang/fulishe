// 与 Mock / H5 / 管理端保持一致的统一业务字典（唯一定义处）

export const ORDER_STATUS_TEXT: Record<number, string> = {
  0: '待支付',
  1: '已支付',
  2: '已发货',
  3: '已完成',
  4: '已取消',
  5: '售后中',
  6: '已退款'
}

export type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

export const ORDER_STATUS_TAG: Record<number, TagType> = {
  0: 'warning',
  1: 'success',
  2: 'primary',
  3: 'success',
  4: 'info',
  5: 'warning',
  6: 'info'
}

export const orderStatusText = (s: number): string => ORDER_STATUS_TEXT[s] || '未知'
export const orderStatusTag = (s: number): TagType => ORDER_STATUS_TAG[s] || 'info'

export const REFUND_STATUS_TEXT: Record<number, string> = {
  0: '审核中',
  1: '处理中',
  2: '已完成',
  3: '已驳回'
}
export const refundStatusText = (s: number | null | undefined): string => {
  if (s === null || s === undefined) return ''
  return REFUND_STATUS_TEXT[s] || '处理中'
}

// 与 Mock invoice-service 权威状态对齐：0 待开票 / 1 已开票 / 2 已红冲
export const INVOICE_STATUS_TEXT: Record<number, string> = {
  0: '待开票',
  1: '已开票',
  2: '已红冲'
}
export const invoiceStatusText = (s: number | null | undefined): string => {
  if (s === null || s === undefined) return ''
  return INVOICE_STATUS_TEXT[s] || ''
}

export const PAY_METHODS = [
  { value: 1, label: '微信支付' },
  { value: 2, label: '支付宝' },
  { value: 3, label: '余额支付' }
]

export const payMethodText = (m: number): string => PAY_METHODS.find(p => p.value === m)?.label || '未知'

// 订单列表状态页签（与 H5 对齐）
export const ORDER_TABS = [
  { key: '', label: '全部' },
  { key: '0', label: '待支付' },
  { key: '1', label: '已支付' },
  { key: '2', label: '已发货' },
  { key: '3', label: '已完成' }
]

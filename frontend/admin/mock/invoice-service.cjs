const { fmt } = require('./helpers.cjs')
const { orders, orderItems, invoices } = require('./seed-extra.cjs')
const { products, tenants } = require('./seed.cjs')

const nextId = list => list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
const round2 = value => Number(Number(value || 0).toFixed(2))
const businessError = (message, status = 400) => {
  const error = new Error(message)
  error.status = status
  return error
}

const STATUS_LABEL = { 0: '待开票', 1: '已开票', 2: '已红冲' }
const TITLE_TYPE_LABEL = { 1: '个人', 2: '企业' }
const INVOICE_TYPE_LABEL = { 1: '电子普通发票', 2: '增值税专用发票' }

const merchantOfOrder = order => {
  const item = orderItems.find(candidate => candidate.orderId === order.id || candidate.orderNo === order.orderNo)
  const product = products.find(candidate => candidate.id === Number(item && item.spuId))
  const merchantId = product ? product.merchantId : null
  const tenant = tenants.find(candidate => candidate.id === Number(merchantId)) || {}
  return { merchantId, merchantName: tenant.tenantName || '' }
}

const view = invoice => ({
  ...invoice,
  statusLabel: STATUS_LABEL[Number(invoice.status)] || '',
  titleTypeLabel: TITLE_TYPE_LABEL[Number(invoice.titleType)] || '',
  invoiceTypeLabel: INVOICE_TYPE_LABEL[Number(invoice.invoiceType)] || ''
})

const page = ({ merchantId, orderNo, status, pageNum = 1, pageSize = 10 } = {}) => {
  let list = [...invoices].sort((a, b) => Number(b.id) - Number(a.id))
  if (merchantId !== undefined && merchantId !== null && merchantId !== '') {
    list = list.filter(item => Number(item.merchantId) === Number(merchantId))
  }
  if (orderNo) list = list.filter(item => String(item.orderNo).includes(String(orderNo)))
  if (status !== undefined && status !== null && status !== '') {
    list = list.filter(item => Number(item.status) === Number(status))
  }
  const total = list.length
  const start = (Number(pageNum) - 1) * Number(pageSize)
  return {
    total,
    pageNum: Number(pageNum),
    pageSize: Number(pageSize),
    records: list.slice(start, start + Number(pageSize)).map(view)
  }
}

const summary = merchantId => {
  const list = merchantId === undefined || merchantId === null || merchantId === ''
    ? invoices
    : invoices.filter(item => Number(item.merchantId) === Number(merchantId))
  const sumBy = status => list.filter(item => Number(item.status) === status).reduce((total, item) => total + Number(item.amount || 0), 0)
  return {
    totalCount: list.length,
    pendingCount: list.filter(item => Number(item.status) === 0).length,
    issuedCount: list.filter(item => Number(item.status) === 1).length,
    redFlushedCount: list.filter(item => Number(item.status) === 2).length,
    issuedAmount: round2(sumBy(1)),
    redFlushedAmount: round2(sumBy(2)),
    totalAmount: round2(list.reduce((total, item) => total + Number(item.amount || 0), 0))
  }
}

const apply = (userId, payload = {}) => {
  const orderNo = String(payload.orderNo || '').trim()
  if (!orderNo) throw businessError('请选择要开票的订单')
  const order = orders.find(item => item.orderNo === orderNo)
  if (!order) throw businessError('订单不存在', 404)
  if (Number(order.userId) !== Number(userId)) throw businessError('无权为该订单申请开票', 403)
  if (Number(order.payStatus) !== 1 || ![1, 2, 3].includes(Number(order.orderStatus))) {
    throw businessError('仅已支付且未取消的订单可申请开票')
  }
  if (invoices.some(item => item.orderNo === orderNo && [0, 1].includes(Number(item.status)))) {
    throw businessError('该订单已有有效发票，请勿重复申请')
  }
  const invoiceType = Number(payload.invoiceType) || 1
  if (invoiceType === 2 && !String(payload.taxNo || '').trim()) {
    throw businessError('增值税专用发票需填写纳税人识别号')
  }
  if (!String(payload.buyerName || '').trim()) throw businessError('请填写发票抬头')
  const requested = payload.amount === undefined || payload.amount === null || payload.amount === ''
    ? Number(order.payAmount)
    : Number(payload.amount)
  if (!Number.isFinite(requested) || requested <= 0) throw businessError('开票金额无效')
  const amount = Math.min(Number(order.payAmount), requested)
  const { merchantId, merchantName } = merchantOfOrder(order)
  const taxRate = 0.06
  const invoice = {
    id: nextId(invoices),
    invoiceNo: '',
    orderNo,
    orderId: order.id,
    merchantId,
    merchantName,
    userId: Number(userId),
    titleType: Number(payload.titleType) === 2 ? 2 : 1,
    invoiceType: invoiceType === 2 ? 2 : 1,
    buyerName: String(payload.buyerName).trim(),
    taxNo: String(payload.taxNo || '').trim(),
    email: String(payload.email || '').trim(),
    amount: round2(amount),
    taxRate,
    taxAmount: round2(amount * taxRate / (1 + taxRate)),
    status: 0,
    applyTime: fmt(new Date()),
    issueTime: null,
    redFlushTime: null,
    redFlushReason: '',
    redFlushNo: '',
    remark: payload.remark || ''
  }
  invoices.unshift(invoice)
  return view(invoice)
}

const issue = (id, operatorName) => {
  const invoice = invoices.find(item => item.id === Number(id))
  if (!invoice) throw businessError('发票不存在', 404)
  if (Number(invoice.status) === 1) throw businessError('该发票已开具')
  if (Number(invoice.status) === 2) throw businessError('已红冲的发票不能重复开具')
  invoice.status = 1
  invoice.invoiceNo = invoice.invoiceNo || `INV${Date.now()}`
  invoice.issueTime = fmt(new Date())
  invoice.issuedBy = operatorName || ''
  return view(invoice)
}

const redFlush = (id, reason, operatorName) => {
  const invoice = invoices.find(item => item.id === Number(id))
  if (!invoice) throw businessError('发票不存在', 404)
  if (Number(invoice.status) !== 1) throw businessError('仅已开具的发票可红冲')
  invoice.status = 2
  invoice.redFlushNo = `RED${Date.now()}`
  invoice.redFlushTime = fmt(new Date())
  invoice.redFlushReason = reason || '开票有误，红冲重开'
  invoice.redFlushedBy = operatorName || ''
  return view(invoice)
}

const findById = id => invoices.find(item => item.id === Number(id)) || null

module.exports = { invoices, page, summary, apply, issue, redFlush, findById, view }

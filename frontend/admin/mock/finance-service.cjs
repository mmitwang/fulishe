const { fmt } = require('./helpers.cjs')
const { orderItems } = require('./seed-extra.cjs')
const { products, tenants } = require('./seed.cjs')
const fundService = require('./fund-service.cjs')
const distributionService = require('./distribution-service.cjs')

/**
 * 平台抽佣与分账
 * 支付成功按配置的技术服务费率计提平台收入，并生成商户应结分账记录；
 * 供应商成本取商品采购成本，分销佣金取该订单已生成的推广佣金。
 * 金额统一用元，保留两位小数。
 */
const round2 = value => Number(Number(value || 0).toFixed(2))
const nextId = list => list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1

const config = {
  enabled: true,
  rateBp: 500,
  settleDays: 7,
  updateTime: fmt(new Date())
}

const splits = []

const getConfig = () => ({
  ...config,
  ratePercent: round2(config.rateBp / 100)
})

const updateConfig = body => {
  if (body.enabled !== undefined) {
    config.enabled = body.enabled === true || body.enabled === 1 || body.enabled === '1' || body.enabled === 'true'
  }
  const rateBp = body.rateBp !== undefined ? Number(body.rateBp) : (body.ratePercent !== undefined ? Number(body.ratePercent) * 100 : null)
  if (rateBp !== null) {
    if (!Number.isFinite(rateBp) || rateBp < 0 || rateBp > 2000) {
      const error = new Error('技术服务费率需在 0% - 20% 之间')
      error.status = 400
      throw error
    }
    config.rateBp = Math.round(rateBp)
  }
  if (body.settleDays !== undefined) {
    const days = Number(body.settleDays)
    if (!Number.isFinite(days) || days < 0 || days > 90) {
      const error = new Error('结算周期需在 0 - 90 天之间')
      error.status = 400
      throw error
    }
    config.settleDays = Math.round(days)
  }
  config.updateTime = fmt(new Date())
  return getConfig()
}

const orderMerchantId = order => {
  if (order.merchantId != null) return Number(order.merchantId)
  const items = orderItems.filter(item => item.orderId === order.id || item.orderNo === order.orderNo)
  const product = items
    .map(item => products.find(candidate => candidate.id === Number(item.spuId)))
    .find(Boolean)
  return product ? Number(product.merchantId) : null
}

const supplierCostOf = order => {
  const items = orderItems.filter(item => item.orderId === order.id || item.orderNo === order.orderNo)
  return round2(items.reduce((sum, item) => {
    const product = products.find(candidate => candidate.id === Number(item.spuId))
    const cost = product && product.costPrice != null ? Number(product.costPrice) : Number(item.unitPrice || 0) * 0.6
    return sum + cost * Number(item.quantity || 0)
  }, 0))
}

const commissionOf = orderNo => round2(
  distributionService.promotionOrders
    .filter(item => item.orderNo === orderNo && item.status !== 'INVALID')
    .reduce((sum, item) => sum + Number(item.commissionAmount || 0) / 100, 0)
)

const onOrderPaid = order => {
  if (!order || !config.enabled) return null
  if (Number(order.payStatus) !== 1 || Number(order.orderStatus) === 4) return null
  const existing = splits.find(item => item.orderNo === order.orderNo)
  if (existing) return existing
  const payAmount = round2(order.payAmount)
  const platformFee = round2(payAmount * config.rateBp / 10000)
  const merchantNet = round2(payAmount - platformFee)
  const merchantId = orderMerchantId(order)
  const split = {
    id: nextId(splits),
    splitNo: `SP${Date.now()}`,
    orderNo: order.orderNo,
    orderId: order.id,
    merchantId,
    merchantName: (tenants.find(item => item.id === Number(merchantId)) || {}).tenantName || '',
    payAmount,
    platformFee,
    merchantNet,
    supplierCost: supplierCostOf(order),
    commissionAmount: commissionOf(order.orderNo),
    rateBp: config.rateBp,
    status: 1,
    createTime: fmt(new Date()),
    refundTime: null
  }
  splits.unshift(split)
  fundService.record({
    bizType: 'PLATFORM_FEE',
    amountCents: fundService.toCents(platformFee),
    orderNo: order.orderNo,
    refNo: split.splitNo,
    merchantId: split.merchantId,
    remark: `平台技术服务费 ${round2(config.rateBp / 100)}%`
  })
  fundService.record({
    bizType: 'MERCHANT_SPLIT',
    amountCents: fundService.toCents(merchantNet),
    orderNo: order.orderNo,
    refNo: split.splitNo,
    merchantId: split.merchantId,
    remark: '商户应结分账'
  })
  return split
}

const onOrderRefunded = (order, refundAmount) => {
  if (!order) return null
  const split = splits.find(item => item.orderNo === order.orderNo)
  if (!split || Number(split.status) === 2) return split || null
  split.status = 2
  split.refundTime = fmt(new Date())
  split.refundAmount = round2(refundAmount == null ? split.payAmount : refundAmount)
  fundService.record({
    bizType: 'PLATFORM_FEE_REVERSE',
    amountCents: fundService.toCents(split.platformFee),
    orderNo: order.orderNo,
    refNo: split.splitNo,
    merchantId: split.merchantId,
    remark: '退款冲正平台技术服务费'
  })
  fundService.record({
    bizType: 'MERCHANT_SPLIT_REVERSE',
    amountCents: fundService.toCents(split.merchantNet),
    orderNo: order.orderNo,
    refNo: split.splitNo,
    merchantId: split.merchantId,
    remark: '退款冲正商户应结分账'
  })
  return split
}

const page = ({ merchantId, orderNo, pageNum = 1, pageSize = 10 } = {}) => {
  let list = [...splits]
  if (merchantId !== undefined && merchantId !== null && merchantId !== '') {
    list = list.filter(item => Number(item.merchantId) === Number(merchantId))
  }
  if (orderNo) list = list.filter(item => String(item.orderNo).includes(String(orderNo)))
  const total = list.length
  const start = (Number(pageNum) - 1) * Number(pageSize)
  return {
    total,
    pageNum: Number(pageNum),
    pageSize: Number(pageSize),
    records: list.slice(start, start + Number(pageSize))
  }
}

const summary = merchantId => {
  const list = merchantId === undefined || merchantId === null || merchantId === ''
    ? splits
    : splits.filter(item => Number(item.merchantId) === Number(merchantId))
  const active = list.filter(item => Number(item.status) === 1)
  return {
    splitCount: list.length,
    refundedCount: list.filter(item => Number(item.status) === 2).length,
    payAmount: round2(active.reduce((sum, item) => sum + item.payAmount, 0)),
    platformFee: round2(active.reduce((sum, item) => sum + item.platformFee, 0)),
    merchantNet: round2(active.reduce((sum, item) => sum + item.merchantNet, 0)),
    supplierCost: round2(active.reduce((sum, item) => sum + item.supplierCost, 0)),
    commissionAmount: round2(active.reduce((sum, item) => sum + item.commissionAmount, 0))
  }
}

module.exports = { config, splits, getConfig, updateConfig, onOrderPaid, onOrderRefunded, page, summary }

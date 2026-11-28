const { fmt } = require('./helpers.cjs')
const { skus, products } = require('./seed.cjs')
const { inventory } = require('./seed-extra.cjs')

/**
 * 库存预占与库存流水
 * 下单锁定（lockedStock+），支付成功扣减（stock-，lockedStock-），
 * 取消/超时释放（lockedStock-），退款回补（stock+）。
 */
const LOCK_MINUTES = 30
const reservations = []
const stockFlows = []
let flowSeq = 0

const nextId = list => list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
const skuOf = id => skus.find(item => item.id === Number(id))
const productOf = id => products.find(item => item.id === Number(id))
const inventoryOfSpu = spuId => inventory.find(item => Number(item.spuId) === Number(spuId))
const timeOf = value => new Date(String(value || '').replace(' ', 'T')).getTime()
const now = () => fmt(new Date())
const addMinutes = minutes => fmt(new Date(Date.now() + minutes * 60 * 1000))

// 新商品（如商户刚上架）没有库存台账时自动建档，消除“商品可售但无台账”的断点
const ensureInventory = sku => {
  const product = productOf(sku.spuId)
  let record = inventoryOfSpu(sku.spuId)
  if (record) return record
  record = {
    id: nextId(inventory),
    merchantId: product ? product.merchantId : null,
    merchantName: product ? product.merchantName : '',
    spuId: sku.spuId,
    spuName: product ? product.spuName : sku.skuName,
    image: product ? product.image : '',
    skuCode: sku.skuCode,
    warehouse: '杭州中心仓',
    stock: Number(sku.stock) || 0,
    lockedStock: Number(sku.lockedStock) || 0,
    availableStock: Math.max(0, (Number(sku.stock) || 0) - (Number(sku.lockedStock) || 0)),
    warningLine: 50,
    status: 'normal',
    updateTime: now(),
    autoCreated: true
  }
  inventory.push(record)
  return record
}

const syncInventory = sku => {
  const record = ensureInventory(sku)
  record.stock = Number(sku.stock) || 0
  record.lockedStock = Number(sku.lockedStock) || 0
  record.availableStock = Math.max(0, record.stock - record.lockedStock)
  record.updateTime = now()
  record.status = record.availableStock < record.warningLine
    ? 'danger'
    : record.availableStock < record.warningLine * 2.5 ? 'warning' : 'normal'
  return record
}

const writeFlow = ({ bizType, sku, orderNo, quantity, before, after, remark }) => {
  const flow = {
    id: nextId(stockFlows),
    flowNo: `SF${Date.now()}${++flowSeq}`,
    bizType,
    orderNo: orderNo || '',
    skuId: sku.id,
    skuCode: sku.skuCode,
    spuId: sku.spuId,
    spuName: (productOf(sku.spuId) || {}).spuName || sku.skuName,
    quantity,
    stockBefore: before.stock,
    stockAfter: after.stock,
    lockedBefore: before.locked,
    lockedAfter: after.locked,
    availableAfter: Math.max(0, after.stock - after.locked),
    remark: remark || '',
    createTime: now()
  }
  stockFlows.unshift(flow)
  return flow
}

const snapshot = sku => ({ stock: Number(sku.stock) || 0, locked: Number(sku.lockedStock) || 0 })

/** 下单：预占库存，不扣减真实库存 */
const reserve = (orderNo, orderId, lines) => {
  const created = []
  lines.forEach(line => {
    const sku = line.sku
    sku.lockedStock = Number(sku.lockedStock) || 0
    const available = Number(sku.stock) - sku.lockedStock
    if (line.quantity > available) {
      const error = new Error(`库存不足：${sku.skuName}（可售 ${available}）`)
      error.status = 400
      throw error
    }
  })
  lines.forEach(line => {
    const sku = line.sku
    const before = snapshot(sku)
    sku.lockedStock = before.locked + line.quantity
    const after = snapshot(sku)
    syncInventory(sku)
    const reservation = {
      id: nextId(reservations),
      reservationNo: `RS${Date.now()}${line.sku.id}`,
      orderNo,
      orderId,
      skuId: sku.id,
      skuCode: sku.skuCode,
      spuId: sku.spuId,
      quantity: line.quantity,
      status: 'LOCKED',
      expireTime: addMinutes(LOCK_MINUTES),
      createTime: now(),
      releaseTime: null,
      remark: ''
    }
    reservations.unshift(reservation)
    created.push(reservation)
    writeFlow({ bizType: 'RESERVE', sku, orderNo, quantity: line.quantity, before, after, remark: '下单预占库存' })
  })
  return created
}

/** 支付成功：预占转扣减 */
const commit = orderNo => {
  const list = reservations.filter(item => item.orderNo === orderNo && item.status === 'LOCKED')
  list.forEach(reservation => {
    const sku = skuOf(reservation.skuId)
    if (!sku) return
    const before = snapshot(sku)
    sku.lockedStock = Math.max(0, before.locked - reservation.quantity)
    sku.stock = Math.max(0, before.stock - reservation.quantity)
    const product = productOf(sku.spuId)
    if (product) product.stock = Math.max(0, Number(product.stock) - reservation.quantity)
    const after = snapshot(sku)
    syncInventory(sku)
    reservation.status = 'COMMITTED'
    reservation.commitTime = now()
    writeFlow({ bizType: 'COMMIT', sku, orderNo, quantity: reservation.quantity, before, after, remark: '支付成功扣减库存' })
  })
  return list.length
}

/** 取消/超时：释放预占 */
const release = (orderNo, reason = '订单取消释放预占') => {
  const list = reservations.filter(item => item.orderNo === orderNo && item.status === 'LOCKED')
  list.forEach(reservation => {
    const sku = skuOf(reservation.skuId)
    if (!sku) return
    const before = snapshot(sku)
    sku.lockedStock = Math.max(0, before.locked - reservation.quantity)
    const after = snapshot(sku)
    syncInventory(sku)
    reservation.status = 'RELEASED'
    reservation.releaseTime = now()
    reservation.remark = reason
    writeFlow({ bizType: 'RELEASE', sku, orderNo, quantity: reservation.quantity, before, after, remark: reason })
  })
  return list.length
}

/** 退款成功：库存回补 */
const restock = (orderNo, items, reason = '退款回补库存') => {
  const list = []
  ;(items || []).forEach(item => {
    const sku = skuOf(item.skuId)
    if (!sku) return
    const before = snapshot(sku)
    sku.stock = before.stock + Number(item.quantity || 0)
    const product = productOf(sku.spuId)
    if (product) product.stock = Number(product.stock) + Number(item.quantity || 0)
    const after = snapshot(sku)
    syncInventory(sku)
    list.push(sku)
    writeFlow({ bizType: 'REFUND_RESTOCK', sku, orderNo, quantity: Number(item.quantity || 0), before, after, remark: reason })
  })
  return list.length
}

/** 释放超时未支付订单的预占（模拟定时任务） */
const releaseExpired = (at = Date.now()) => {
  const expired = reservations.filter(item => item.status === 'LOCKED' && timeOf(item.expireTime) <= at)
  const orderNos = [...new Set(expired.map(item => item.orderNo))]
  orderNos.forEach(orderNo => release(orderNo, '支付超时自动释放预占'))
  return { releasedOrders: orderNos.length, releasedReservations: expired.length, orderNos }
}

const reservationView = reservation => ({
  ...reservation,
  spuName: (productOf(reservation.spuId) || {}).spuName || reservation.skuCode,
  remainSeconds: reservation.status === 'LOCKED'
    ? Math.max(0, Math.round((timeOf(reservation.expireTime) - Date.now()) / 1000))
    : 0
})

const reservationPage = ({ orderNo, status, pageNum = 1, pageSize = 10 } = {}) => {
  let list = [...reservations]
  if (orderNo) list = list.filter(item => String(item.orderNo).includes(String(orderNo)))
  if (status) list = list.filter(item => item.status === status)
  const total = list.length
  const start = (Number(pageNum) - 1) * Number(pageSize)
  return {
    total,
    pageNum: Number(pageNum),
    pageSize: Number(pageSize),
    records: list.slice(start, start + Number(pageSize)).map(reservationView)
  }
}

const flowPage = ({ skuCode, bizType, orderNo, pageNum = 1, pageSize = 10 } = {}) => {
  let list = [...stockFlows]
  if (skuCode) list = list.filter(item => String(item.skuCode).includes(String(skuCode)))
  if (bizType) list = list.filter(item => item.bizType === bizType)
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

const stockSummary = () => {
  const locked = reservations.filter(item => item.status === 'LOCKED')
  return {
    lockedReservationCount: locked.length,
    lockedQuantity: locked.reduce((sum, item) => sum + item.quantity, 0),
    committedCount: reservations.filter(item => item.status === 'COMMITTED').length,
    releasedCount: reservations.filter(item => item.status === 'RELEASED').length,
    lockMinutes: LOCK_MINUTES,
    inventoryRows: inventory.length
  }
}

module.exports = {
  reservations, stockFlows, reserve, commit, release, restock, releaseExpired,
  reservationPage, flowPage, stockSummary, ensureInventory, syncInventory,
  skuOf, inventoryOfSpu, snapshot
}

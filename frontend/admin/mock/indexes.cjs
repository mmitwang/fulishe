/**
 * 热点数据索引：把常用 find/filter 从 O(n) 降为 O(1)
 * 说明：索引在进程启动时构建；数据恢复/重置后调用 rebuild() 原地刷新，
 * 保证路由模块启动时解构出来的 Map 引用始终有效。
 */
const { products, skus } = require('./seed.cjs')
const { traceRecords, coupons, couponTemplates, orders, orderItems, inventory } = require('./seed-extra.cjs')

const groupBy = (list, keyFn, valueFn = v => v) => {
  const map = new Map()
  list.forEach(item => {
    const key = keyFn(item)
    const arr = map.get(key)
    if (arr) arr.push(valueFn(item))
    else map.set(key, [valueFn(item)])
  })
  return map
}

const productsById = new Map()
const skusBySpuId = new Map()
const productsByCategory = new Map()
const tracesBySpuId = new Map()
const tracesByCode = new Map()
const couponsByCode = new Map()
const couponsByTraceCode = new Map()
const couponTemplatesById = new Map()
const ordersById = new Map()
const ordersByNo = new Map()
const orderItemsByOrderId = new Map()
const orderItemsByOrderNo = new Map()
const inventoryBySpuId = new Map()

const fill = (map, entries) => {
  map.clear()
  entries.forEach(entry => map.set(entry[0], entry[1]))
}

const fillGroups = (map, list, keyFn) => {
  map.clear()
  list.forEach(item => {
    const key = keyFn(item)
    const arr = map.get(key)
    if (arr) arr.push(item)
    else map.set(key, [item])
  })
}

const rebuild = () => {
  fill(productsById, products.map(p => [p.id, p]))
  fillGroups(skusBySpuId, skus, s => s.spuId)
  fillGroups(productsByCategory, products, p => p.categoryId)
  fill(tracesBySpuId, traceRecords.map(t => [t.spuId, t]))
  fill(tracesByCode, traceRecords.map(t => [String(t.traceCode).toUpperCase(), t]))
  fill(couponsByCode, coupons.map(c => [String(c.couponCode).toUpperCase(), c]))
  fill(couponsByTraceCode, coupons.filter(c => c.traceCode).map(c => [String(c.traceCode).toUpperCase(), c]))
  fill(couponTemplatesById, couponTemplates.map(t => [t.id, t]))
  fill(ordersById, orders.map(o => [o.id, o]))
  fill(ordersByNo, orders.map(o => [o.orderNo, o]))
  fillGroups(orderItemsByOrderId, orderItems, i => i.orderId)
  fillGroups(orderItemsByOrderNo, orderItems, i => i.orderNo)
  fill(inventoryBySpuId, inventory.map(i => [i.spuId, i]))
}

rebuild()

module.exports = {
  productsById,
  skusBySpuId,
  productsByCategory,
  tracesBySpuId,
  tracesByCode,
  couponsByCode,
  couponsByTraceCode,
  couponTemplatesById,
  ordersById,
  ordersByNo,
  orderItemsByOrderId,
  orderItemsByOrderNo,
  inventoryBySpuId,
  rebuild
}

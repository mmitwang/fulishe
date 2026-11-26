/**
 * 热点数据索引：把常用 find/filter 从 O(n) 降为 O(1)
 * 说明：索引在进程启动时构建；新增数据写回原数组后，查询处保留 find 兜底。
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

const productsById = new Map(products.map(p => [p.id, p]))
const skusBySpuId = groupBy(skus, s => s.spuId)
const productsByCategory = groupBy(products, p => p.categoryId)
const tracesBySpuId = new Map(traceRecords.map(t => [t.spuId, t]))
const tracesByCode = new Map(traceRecords.map(t => [String(t.traceCode).toUpperCase(), t]))
const couponsByCode = new Map(coupons.map(c => [String(c.couponCode).toUpperCase(), c]))
const couponsByTraceCode = new Map(coupons.filter(c => c.traceCode).map(c => [String(c.traceCode).toUpperCase(), c]))
const couponTemplatesById = new Map(couponTemplates.map(t => [t.id, t]))
const ordersById = new Map(orders.map(o => [o.id, o]))
const ordersByNo = new Map(orders.map(o => [o.orderNo, o]))
const orderItemsByOrderId = groupBy(orderItems, i => i.orderId)
const orderItemsByOrderNo = groupBy(orderItems, i => i.orderNo)
const inventoryBySpuId = new Map(inventory.map(i => [i.spuId, i]))

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
  inventoryBySpuId
}

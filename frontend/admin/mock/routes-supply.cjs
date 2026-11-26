const { ok, fail, paginate, like, numEq, fmt } = require('./helpers.cjs')
const { suppliers, purchaseOrders, inventory, shipments, settlements } = require('./seed-extra.cjs')
const { products } = require('./seed.cjs')

const nextId = arr => arr.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1

module.exports = function registerSupplyRoutes(app) {
  app.get('/api/supply/overview', (req, res) => {
    const inventoryValue = inventory.reduce((s, i) => s + i.stock * ((products.find(p => p.id === i.spuId) || {}).costPrice || 0), 0)
    const warehouseStats = ['杭州中心仓', '上海前置仓', '成都区域仓'].map(w => ({
      name: w,
      stock: inventory.filter(i => i.warehouse === w).reduce((s, i) => s + i.stock, 0),
      skuCount: inventory.filter(i => i.warehouse === w).length
    }))
    const monthTrend = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      monthTrend.push({ month: `${d.getMonth() + 1}月`, purchase: 320000 + ((d.getMonth() * 7919) % 260000), settle: 260000 + ((d.getMonth() * 6113) % 210000) })
    }
    ok(res, {
      stats: {
        supplierCount: suppliers.length,
        purchaseTotal: purchaseOrders.reduce((s, p) => s + p.totalAmount, 0),
        pendingPurchase: purchaseOrders.filter(p => p.status <= 1).length,
        inventoryValue,
        lowStock: inventory.filter(i => i.status !== 'normal').length,
        inTransit: shipments.filter(s => s.status === 1).length,
        unsettledAmount: settlements.filter(s => s.status !== 2).reduce((s, x) => s + (x.payableAmount - x.paidAmount), 0),
        monthSettled: settlements.filter(s => s.status === 2).reduce((s, x) => s + x.paidAmount, 0)
      },
      warehouseStats,
      monthTrend,
      alerts: inventory.filter(i => i.status !== 'normal').slice(0, 6),
      recentPurchase: purchaseOrders.slice(0, 5),
      recentShipments: shipments.slice(0, 5)
    })
  })

  app.get('/api/supply/supplier/page', (req, res) => {
    let list = [...suppliers]
    if (req.query.keyword) list = list.filter(s => like(s.supplierName, req.query.keyword) || like(s.supplierCode, req.query.keyword) || like(s.contactPerson, req.query.keyword))
    if (req.query.category) list = list.filter(s => s.category === req.query.category)
    if (!numEq(null, req.query.status)) list = list.filter(s => numEq(s.status, req.query.status))
    ok(res, paginate(list, req.query))
  })
  app.post('/api/supply/supplier', (req, res) => {
    suppliers.unshift({ id: nextId(suppliers), supplierCode: `SUP${String(suppliers.length + 1).padStart(3, '0')}`, status: 1, level: 'B', creditScore: 85, cooperationYears: 0, settledAmount: 0, createTime: fmt(new Date()), ...req.body })
    ok(res, null, '新增成功')
  })
  app.put('/api/supply/supplier', (req, res) => {
    const s = suppliers.find(x => x.id === Number(req.body.id))
    if (!s) return fail(res, '供应商不存在', 404)
    Object.assign(s, req.body)
    ok(res, null, '修改成功')
  })
  app.delete('/api/supply/supplier/:id', (req, res) => {
    const i = suppliers.findIndex(x => x.id === Number(req.params.id))
    if (i > -1) suppliers.splice(i, 1)
    ok(res, null, '删除成功')
  })

  app.get('/api/supply/purchase/page', (req, res) => {
    let list = [...purchaseOrders].sort((a, b) => b.createTime.localeCompare(a.createTime))
    if (req.query.purchaseNo) list = list.filter(p => like(p.purchaseNo, req.query.purchaseNo))
    if (req.query.supplierId) list = list.filter(p => numEq(p.supplierId, req.query.supplierId))
    if (!numEq(null, req.query.status)) list = list.filter(p => numEq(p.status, req.query.status))
    ok(res, paginate(list, req.query))
  })
  app.post('/api/supply/purchase', (req, res) => {
    const body = req.body
    const supplier = suppliers.find(s => s.id === Number(body.supplierId))
    const items = body.items || []
    purchaseOrders.unshift({
      id: nextId(purchaseOrders),
      purchaseNo: `PO2026${String(500000 + purchaseOrders.length)}`,
      supplierName: supplier ? supplier.supplierName : '',
      totalAmount: items.reduce((s, i) => s + i.price * i.quantity, 0),
      status: 0,
      creator: '采购部 · 张三',
      createTime: fmt(new Date()),
      expectedDate: body.expectedDate || '',
      warehouse: body.warehouse || '杭州中心仓',
      remark: body.remark || '',
      items,
      ...body
    })
    ok(res, null, '采购单已创建')
  })
  app.put('/api/supply/purchase/:id/status', (req, res) => {
    const p = purchaseOrders.find(x => x.id === Number(req.params.id))
    if (!p) return fail(res, '采购单不存在', 404)
    p.status = Number(req.body.status)
    if (p.status === 3) {
      p.items.forEach(item => {
        const inv = inventory.find(i => i.spuId === item.spuId)
        if (inv) {
          inv.stock += item.quantity
          inv.availableStock += item.quantity
        }
        const spu = products.find(x => x.id === item.spuId)
        if (spu) spu.stock += item.quantity
      })
    }
    ok(res, null, '采购单状态已更新')
  })

  app.get('/api/supply/inventory/page', (req, res) => {
    let list = [...inventory]
    if (req.query.keyword) list = list.filter(i => like(i.spuName, req.query.keyword) || like(i.skuCode, req.query.keyword))
    if (req.query.warehouse) list = list.filter(i => i.warehouse === req.query.warehouse)
    if (req.query.status) list = list.filter(i => i.status === req.query.status)
    ok(res, paginate(list, req.query))
  })
  app.put('/api/supply/inventory/:id/adjust', (req, res) => {
    const inv = inventory.find(x => x.id === Number(req.params.id))
    if (!inv) return fail(res, '库存记录不存在', 404)
    const delta = Number(req.body.delta || 0)
    inv.stock += delta
    inv.availableStock = inv.stock - inv.lockedStock
    inv.status = inv.availableStock < inv.warningLine ? 'danger' : inv.availableStock < inv.warningLine * 2.5 ? 'warning' : 'normal'
    inv.updateTime = fmt(new Date())
    const spu = products.find(p => p.id === inv.spuId)
    if (spu) spu.stock = inv.stock
    ok(res, inv, '库存已调整')
  })

  app.get('/api/supply/shipment/page', (req, res) => {
    let list = [...shipments]
    if (req.query.shipmentNo) list = list.filter(s => like(s.shipmentNo, req.query.shipmentNo) || like(s.orderNo, req.query.shipmentNo))
    if (req.query.carrier) list = list.filter(s => s.carrier === req.query.carrier)
    if (!numEq(null, req.query.status)) list = list.filter(s => numEq(s.status, req.query.status))
    ok(res, paginate(list, req.query))
  })
  app.post('/api/supply/shipment', (req, res) => {
    shipments.unshift({
      id: nextId(shipments),
      shipmentNo: `SH2026${String(600000 + shipments.length)}`,
      trackingNo: `SF${Date.now()}`,
      status: 0,
      chainTxHash: '',
      shipTime: null,
      arrivalTime: null,
      ...req.body
    })
    ok(res, null, '发货单已创建')
  })
  app.put('/api/supply/shipment/:id/status', (req, res) => {
    const s = shipments.find(x => x.id === Number(req.params.id))
    if (!s) return fail(res, '发货单不存在', 404)
    s.status = Number(req.body.status)
    if (s.status === 1) s.shipTime = fmt(new Date())
    if (s.status === 2) s.arrivalTime = fmt(new Date())
    ok(res, null, '物流状态已更新')
  })

  app.get('/api/supply/settlement/page', (req, res) => {
    let list = [...settlements]
    if (req.query.settlementNo) list = list.filter(s => like(s.settlementNo, req.query.settlementNo))
    if (req.query.supplierId) list = list.filter(s => numEq(s.supplierId, req.query.supplierId))
    if (!numEq(null, req.query.status)) list = list.filter(s => numEq(s.status, req.query.status))
    ok(res, paginate(list, req.query))
  })
  app.put('/api/supply/settlement/:id/settle', (req, res) => {
    const s = settlements.find(x => x.id === Number(req.params.id))
    if (!s) return fail(res, '结算单不存在', 404)
    s.status = 2
    s.paidAmount = s.payableAmount
    s.settleTime = fmt(new Date())
    ok(res, null, '结算已完成')
  })
}

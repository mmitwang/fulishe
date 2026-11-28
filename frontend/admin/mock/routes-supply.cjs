const { ok, fail, paginate, like, numEq, fmt } = require('./helpers.cjs')
const { suppliers, purchaseOrders, inventory, shipments, settlements } = require('./seed-extra.cjs')
const { products, tenants } = require('./seed.cjs')
const {
  createAuthz, ALL, SUPER_ADMIN, MERCHANT_ADMIN, PURCHASE, SUPPLIER_ROLE
} = require('./authz.cjs')

const nextId = arr => arr.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1
const supplierFields = ['supplierName', 'contactPerson', 'contactPhone', 'category', 'level', 'status', 'address', 'creditScore']

module.exports = function registerSupplyRoutes(app, jwt, SECRET_KEY) {
  const {
    authenticate, requirePermission, requireAnyPermission, requireAnyRole, requireSuperAdmin,
    scopeMerchant, scopeSupplier, assertMerchantAccess, assertSupplierAccess, forbidden
  } = createAuthz(jwt, SECRET_KEY)
  const merchantStaff = [SUPER_ADMIN, MERCHANT_ADMIN, PURCHASE]

  app.use('/api/supply', authenticate)

  app.get('/api/supply/overview', requireAnyPermission(
    'supply:supplier', 'supply:purchase', 'supply:inventory', 'supply:shipment', 'settlement'
  ), (req, res) => {
    const visibleSuppliers = scopeSupplier(req.auth, suppliers, item => item.id)
    const visiblePurchases = scopeSupplier(req.auth, purchaseOrders)
    const visibleInventory = scopeMerchant(req.auth, inventory)
    const visibleShipments = scopeMerchant(req.auth, shipments)
    const visibleSettlements = scopeSupplier(req.auth, settlements)
    const inventoryValue = visibleInventory.reduce((sum, item) => {
      const product = products.find(candidate => candidate.id === item.spuId)
      return sum + item.stock * ((product || {}).costPrice || 0)
    }, 0)
    const warehouseStats = ['杭州中心仓', '上海前置仓', '成都区域仓'].map(warehouse => ({
      name: warehouse,
      stock: visibleInventory.filter(item => item.warehouse === warehouse).reduce((sum, item) => sum + item.stock, 0),
      skuCount: visibleInventory.filter(item => item.warehouse === warehouse).length
    }))
    const monthTrend = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      monthTrend.push({
        month: `${date.getMonth() + 1}月`,
        purchase: visiblePurchases.filter(item => String(item.createTime).slice(0, 7) === fmt(date).slice(0, 7)).reduce((sum, item) => sum + item.totalAmount, 0),
        settle: visibleSettlements.filter(item => item.status === 2 && String(item.settleTime).slice(0, 7) === fmt(date).slice(0, 7)).reduce((sum, item) => sum + item.paidAmount, 0)
      })
    }
    ok(res, {
      stats: {
        supplierCount: visibleSuppliers.length,
        purchaseTotal: visiblePurchases.reduce((sum, item) => sum + item.totalAmount, 0),
        pendingPurchase: visiblePurchases.filter(item => item.status <= 2).length,
        inventoryValue,
        lowStock: visibleInventory.filter(item => item.status !== 'normal').length,
        inTransit: visibleShipments.filter(item => item.status === 1).length,
        unsettledAmount: visibleSettlements.filter(item => item.status !== 2).reduce((sum, item) => sum + (item.payableAmount - item.paidAmount), 0),
        monthSettled: visibleSettlements.filter(item => item.status === 2).reduce((sum, item) => sum + item.paidAmount, 0)
      },
      warehouseStats,
      monthTrend,
      alerts: visibleInventory.filter(item => item.status !== 'normal').slice(0, 6),
      recentPurchase: visiblePurchases.slice(0, 5),
      recentShipments: visibleShipments.slice(0, 5)
    })
  })

  app.get('/api/supply/supplier/page', requireAnyPermission('supply:supplier', 'supply:purchase'), (req, res) => {
    let list = scopeSupplier(req.auth, suppliers, item => item.id)
    if (req.query.keyword) list = list.filter(item => like(item.supplierName, req.query.keyword) || like(item.supplierCode, req.query.keyword) || like(item.contactPerson, req.query.keyword))
    if (req.query.category) list = list.filter(item => item.category === req.query.category)
    if (!numEq(null, req.query.status)) list = list.filter(item => numEq(item.status, req.query.status))
    ok(res, paginate(list, req.query))
  })
  app.post('/api/supply/supplier', requirePermission('supply:supplier'), requireAnyRole(...merchantStaff), (req, res) => {
    const merchantId = req.auth.dataScope === ALL ? Number(req.body.merchantId || 2) : req.auth.merchantId
    const merchant = tenants.find(item => item.id === Number(merchantId))
    if (!merchant) return fail(res, '经营商户不存在')
    const supplier = {
      id: nextId(suppliers),
      supplierCode: `SUP${String(nextId(suppliers) - 1).padStart(3, '0')}`,
      merchantId: merchant.id,
      merchantName: merchant.tenantName,
      status: 1,
      level: 'B',
      creditScore: 85,
      cooperationYears: 0,
      settledAmount: 0,
      createTime: fmt(new Date())
    }
    supplierFields.forEach(field => {
      if (req.body[field] !== undefined) supplier[field] = req.body[field]
    })
    suppliers.unshift(supplier)
    ok(res, supplier, '新增成功')
  })
  app.put('/api/supply/supplier', requirePermission('supply:supplier'), requireAnyRole(...merchantStaff), (req, res) => {
    const supplier = suppliers.find(item => item.id === Number(req.body.id))
    if (!supplier) return fail(res, '供应商不存在', 404)
    if (!assertMerchantAccess(req.auth, supplier.merchantId)) return forbidden(res, '无权修改其他商户的供应商')
    supplierFields.forEach(field => {
      if (req.body[field] !== undefined) supplier[field] = req.body[field]
    })
    ok(res, supplier, '修改成功')
  })
  app.delete('/api/supply/supplier/:id', requirePermission('supply:supplier'), requireAnyRole(...merchantStaff), (req, res) => {
    const supplier = suppliers.find(item => item.id === Number(req.params.id))
    if (!supplier) return fail(res, '供应商不存在', 404)
    if (!assertMerchantAccess(req.auth, supplier.merchantId)) return forbidden(res, '无权删除其他商户的供应商')
    if (purchaseOrders.some(item => item.supplierId === supplier.id)) return fail(res, '供应商已有采购单，不能删除')
    suppliers.splice(suppliers.indexOf(supplier), 1)
    ok(res, null, '删除成功')
  })

  app.get('/api/supply/purchase/page', requirePermission('supply:purchase'), (req, res) => {
    let list = scopeSupplier(req.auth, purchaseOrders).sort((a, b) => b.createTime.localeCompare(a.createTime))
    if (req.query.purchaseNo) list = list.filter(item => like(item.purchaseNo, req.query.purchaseNo))
    if (req.auth.dataScope !== 'SUPPLIER' && req.query.supplierId) list = list.filter(item => numEq(item.supplierId, req.query.supplierId))
    if (!numEq(null, req.query.status)) list = list.filter(item => numEq(item.status, req.query.status))
    ok(res, paginate(list, req.query))
  })
  app.post('/api/supply/purchase', requirePermission('supply:purchase'), requireAnyRole(...merchantStaff), (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : []
    if (!items.length) return fail(res, '请添加采购商品')
    const normalizedItems = items.map(item => {
      const product = products.find(candidate => candidate.id === Number(item.spuId))
      const quantity = Math.floor(Number(item.quantity))
      return product && quantity > 0 ? {
        spuId: product.id,
        spuName: product.spuName,
        merchantId: product.merchantId,
        quantity,
        price: Math.round(Number(item.price || product.costPrice))
      } : null
    })
    if (normalizedItems.some(item => !item)) return fail(res, '采购商品或数量无效')
    const merchantId = normalizedItems[0].merchantId
    if (normalizedItems.some(item => item.merchantId !== merchantId)) return fail(res, '一张采购单只能包含同一商户的商品')
    if (!assertMerchantAccess(req.auth, merchantId)) return forbidden(res, '无权为其他商户创建采购单')
    const supplier = suppliers.find(item => item.id === Number(req.body.supplierId))
    if (!supplier) return fail(res, '供应商不存在')
    if (Number(supplier.merchantId) !== Number(merchantId)) return forbidden(res, '供应商与采购商品不属于同一商户')
    const purchase = {
      id: nextId(purchaseOrders),
      purchaseNo: `PO2026${String(500000 + purchaseOrders.length)}`,
      merchantId,
      merchantName: (tenants.find(item => item.id === merchantId) || {}).tenantName || '',
      supplierId: supplier.id,
      supplierName: supplier.supplierName,
      totalAmount: normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      status: 0,
      stockedAt: null,
      creator: req.auth.user.realName || req.auth.user.username,
      createTime: fmt(new Date()),
      expectedDate: req.body.expectedDate || '',
      warehouse: req.body.warehouse || '杭州中心仓',
      remark: req.body.remark || '',
      items: normalizedItems
    }
    purchaseOrders.unshift(purchase)
    ok(res, purchase, '采购单已创建')
  })
  app.put('/api/supply/purchase/:id/status', requirePermission('supply:purchase'), (req, res) => {
    const purchase = purchaseOrders.find(item => item.id === Number(req.params.id))
    if (!purchase) return fail(res, '采购单不存在', 404)
    if (!assertSupplierAccess(req.auth, purchase)) return forbidden(res, '无权操作其他商户或供应商的采购单')
    const target = Number(req.body.status)
    if (target !== Number(purchase.status) + 1 || ![1, 2, 3].includes(target)) return fail(res, '采购单只能按待审核、待接单、待入库、已完成顺序流转')

    if (target === 1) {
      if (!req.auth.roleCodes.some(role => [SUPER_ADMIN, MERCHANT_ADMIN].includes(role))) return forbidden(res, '仅商户管理员可审核采购单')
    } else if (target === 2) {
      if (!req.auth.roleCodes.includes(SUPPLIER_ROLE) || Number(req.auth.supplierId) !== Number(purchase.supplierId)) return forbidden(res, '仅该采购单所属供应商可接单')
      purchase.acceptedBy = req.auth.user.realName || req.auth.user.username
      purchase.acceptedTime = fmt(new Date())
    } else if (target === 3) {
      if (!req.auth.roleCodes.some(role => merchantStaff.includes(role))) return forbidden(res, '供应商不能执行入库')
      if (purchase.stockedAt) return fail(res, '该采购单已入库，请勿重复操作')
      purchase.items.forEach(item => {
        let record = inventory.find(candidate => candidate.spuId === item.spuId && candidate.merchantId === purchase.merchantId)
        if (!record) {
          record = {
            id: nextId(inventory), merchantId: purchase.merchantId, merchantName: purchase.merchantName,
            spuId: item.spuId, spuName: item.spuName, image: '', skuCode: `SKU-${item.spuId}`,
            warehouse: purchase.warehouse, stock: 0, lockedStock: 0, availableStock: 0, warningLine: 100, status: 'normal'
          }
          inventory.push(record)
        }
        record.stock += item.quantity
        record.availableStock = record.stock - record.lockedStock
        record.status = record.availableStock < record.warningLine ? 'danger' : record.availableStock < record.warningLine * 2.5 ? 'warning' : 'normal'
        record.updateTime = fmt(new Date())
        const product = products.find(candidate => candidate.id === item.spuId)
        if (product) product.stock += item.quantity
      })
      purchase.stockedAt = fmt(new Date())
      purchase.stockedBy = req.auth.user.realName || req.auth.user.username
    }
    purchase.status = target
    ok(res, purchase, target === 3 ? '入库完成，库存已更新' : target === 2 ? '供应商已接单' : '采购单审核通过')
  })

  // 供应商发货（物流公司 + 单号），不改动 0→1→2→3 状态机
  app.post('/api/supply/purchase/:id/ship', requirePermission('supply:purchase'), (req, res) => {
    const purchase = purchaseOrders.find(item => item.id === Number(req.params.id))
    if (!purchase) return fail(res, '采购单不存在', 404)
    if (!assertSupplierAccess(req.auth, purchase)) return forbidden(res, '无权操作其他商户或供应商的采购单')
    if (Number(purchase.status) !== 2) return fail(res, '仅已接单的采购单可发货')
    if (purchase.receivedTime) return fail(res, '该采购单已签收，不能重复发货')
    const carrier = String(req.body.carrier || '').trim()
    const trackingNo = String(req.body.trackingNo || '').trim()
    if (!carrier || !trackingNo) return fail(res, '请填写物流公司与物流单号')
    purchase.carrier = carrier
    purchase.logisticsCompany = carrier
    purchase.trackingNo = trackingNo
    purchase.shipTime = fmt(new Date())
    purchase.shipBy = req.auth.user.realName || req.auth.user.username
    ok(res, purchase, '采购发货信息已回传')
  })

  // 商户到货签收，记录签收人；签收后仍走入库（status 3）
  app.post('/api/supply/purchase/:id/receive', requirePermission('supply:purchase'), requireAnyRole(...merchantStaff), (req, res) => {
    const purchase = purchaseOrders.find(item => item.id === Number(req.params.id))
    if (!purchase) return fail(res, '采购单不存在', 404)
    if (!assertMerchantAccess(req.auth, purchase.merchantId)) return forbidden(res, '无权操作其他商户的采购单')
    if (Number(purchase.status) !== 2) return fail(res, '仅已接单的采购单可签收')
    if (!purchase.trackingNo) return fail(res, '采购单尚未发货，不能签收')
    if (purchase.receivedTime) return fail(res, '该采购单已签收')
    purchase.receivedTime = fmt(new Date())
    purchase.receivedBy = String(req.body.receiver || '').trim() || req.auth.user.realName || req.auth.user.username
    ok(res, purchase, '采购单已签收')
  })

  app.get('/api/supply/inventory/page', requirePermission('supply:inventory'), (req, res) => {
    let list = scopeMerchant(req.auth, inventory)
    if (req.query.keyword) list = list.filter(item => like(item.spuName, req.query.keyword) || like(item.skuCode, req.query.keyword))
    if (req.query.warehouse) list = list.filter(item => item.warehouse === req.query.warehouse)
    if (req.query.status) list = list.filter(item => item.status === req.query.status)
    ok(res, paginate(list, req.query))
  })
  app.put('/api/supply/inventory/:id/adjust', requirePermission('supply:inventory'), requireAnyRole(...merchantStaff), (req, res) => {
    const record = inventory.find(item => item.id === Number(req.params.id))
    if (!record) return fail(res, '库存记录不存在', 404)
    if (!assertMerchantAccess(req.auth, record.merchantId)) return forbidden(res, '无权调整其他商户库存')
    const delta = Number(req.body.delta || 0)
    if (!Number.isInteger(delta) || delta === 0 || record.stock + delta < record.lockedStock) return fail(res, '调整数量无效或可用库存不足')
    record.stock += delta
    record.availableStock = record.stock - record.lockedStock
    record.status = record.availableStock < record.warningLine ? 'danger' : record.availableStock < record.warningLine * 2.5 ? 'warning' : 'normal'
    record.updateTime = fmt(new Date())
    const product = products.find(item => item.id === record.spuId)
    if (product) product.stock = record.stock
    ok(res, record, '库存已调整')
  })

  app.get('/api/supply/shipment/page', requirePermission('supply:shipment'), (req, res) => {
    let list = scopeMerchant(req.auth, shipments)
    if (req.query.shipmentNo) list = list.filter(item => like(item.shipmentNo, req.query.shipmentNo) || like(item.orderNo, req.query.shipmentNo))
    if (req.query.carrier) list = list.filter(item => item.carrier === req.query.carrier)
    if (!numEq(null, req.query.status)) list = list.filter(item => numEq(item.status, req.query.status))
    ok(res, paginate(list, req.query))
  })
  app.post('/api/supply/shipment', requirePermission('supply:shipment'), requireAnyRole(...merchantStaff), (req, res) => {
    const merchantId = req.auth.dataScope === ALL ? Number(req.body.merchantId || 2) : req.auth.merchantId
    const shipment = {
      id: nextId(shipments), shipmentNo: `SH2026${String(600000 + shipments.length)}`,
      merchantId, trackingNo: `SF${Date.now()}`, status: 0, chainTxHash: '', shipTime: null, arrivalTime: null,
      orderNo: req.body.orderNo || '', carrier: req.body.carrier || '顺丰速运', receiver: req.body.receiver || '',
      mobile: req.body.mobile || '', address: req.body.address || '', warehouse: req.body.warehouse || '杭州中心仓'
    }
    shipments.unshift(shipment)
    ok(res, shipment, '发货单已创建')
  })
  app.put('/api/supply/shipment/:id/status', requirePermission('supply:shipment'), requireAnyRole(...merchantStaff), (req, res) => {
    const shipment = shipments.find(item => item.id === Number(req.params.id))
    if (!shipment) return fail(res, '发货单不存在', 404)
    if (!assertMerchantAccess(req.auth, shipment.merchantId)) return forbidden(res, '无权修改其他商户物流')
    const target = Number(req.body.status)
    if (![0, 1, 2].includes(target)) return fail(res, '物流状态无效')
    shipment.status = target
    if (target === 1) shipment.shipTime = fmt(new Date())
    if (target === 2) shipment.arrivalTime = fmt(new Date())
    ok(res, shipment, '物流状态已更新')
  })

  app.get('/api/supply/settlement/page', requirePermission('settlement'), (req, res) => {
    let list = scopeSupplier(req.auth, settlements)
    if (req.query.settlementNo) list = list.filter(item => like(item.settlementNo, req.query.settlementNo))
    if (req.query.supplierId) list = list.filter(item => numEq(item.supplierId, req.query.supplierId))
    if (!numEq(null, req.query.status)) list = list.filter(item => numEq(item.status, req.query.status))
    ok(res, paginate(list, req.query))
  })
  app.put('/api/supply/settlement/:id/settle', requirePermission('settlement'), requireSuperAdmin, (req, res) => {
    const settlement = settlements.find(item => item.id === Number(req.params.id))
    if (!settlement) return fail(res, '结算单不存在', 404)
    settlement.status = 2
    settlement.paidAmount = settlement.payableAmount
    settlement.settleTime = fmt(new Date())
    ok(res, settlement, '结算已完成')
  })
}

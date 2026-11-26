const { ok, fail, paginate, like, numEq, fmt } = require('./helpers.cjs')
const { tenants, categories, brands, products, skus } = require('./seed.cjs')
const { orders, payRecords, refunds, settlements } = require('./seed-extra.cjs')
const { createAuthz, ALL } = require('./authz.cjs')

const nextId = arr => arr.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
const productFields = [
  'spuCode', 'spuName', 'categoryId', 'brandId', 'image', 'images', 'videoUrl', 'description', 'unit',
  'originalPrice', 'sellPrice', 'costPrice', 'stock', 'weight', 'status', 'traceable', 'tags',
  'serviceTags', 'specs', 'detailSections'
]

module.exports = function registerAdminRoutes(app, jwt, SECRET_KEY) {
  const {
    authenticate, requirePermission, requireSuperAdmin, scopeMerchant, assertMerchantAccess,
    getOrderItems, getOrderMerchantFields, canAccessOrder, scopeOrders, getRecordOrder, forbidden
  } = createAuthz(jwt, SECRET_KEY)

  const productView = product => ({
    ...product,
    merchantName: (tenants.find(tenant => tenant.id === Number(product.merchantId)) || {}).tenantName || product.merchantName || ''
  })

  const orderView = order => ({
    ...order,
    ...getOrderMerchantFields(order),
    items: getOrderItems(order).map(item => ({ ...item, spuImage: item.spuImage || item.image }))
  })

  const recordView = record => {
    const order = getRecordOrder(record)
    return {
      ...record,
      ...(order ? getOrderMerchantFields(order) : { merchantId: null, merchantIds: [], merchantNames: [], multiMerchant: false })
    }
  }

  const settlementView = settlement => ({
    ...settlement,
    merchantName: (tenants.find(tenant => tenant.id === Number(settlement.merchantId)) || {}).tenantName || settlement.merchantName || ''
  })

  const findAccessibleProduct = (req, res, id) => {
    const product = products.find(item => item.id === Number(id))
    if (!product) {
      fail(res, '商品不存在', 404)
      return null
    }
    if (!assertMerchantAccess(req.auth, product.merchantId)) {
      forbidden(res, '无权访问其他商户的商品')
      return null
    }
    return product
  }

  const findAccessibleOrder = (req, res, id) => {
    const order = orders.find(item => item.id === Number(id))
    if (!order) {
      fail(res, '订单不存在', 404)
      return null
    }
    if (!canAccessOrder(req.auth, order)) {
      forbidden(res, '无权访问该订单，多商户订单仅系统管理员可见')
      return null
    }
    return order
  }

  const applyProductFields = (product, body) => {
    productFields.forEach(field => {
      if (body[field] !== undefined) product[field] = body[field]
    })
    if (body.categoryId !== undefined) {
      product.categoryId = Number(body.categoryId)
      product.categoryName = (categories.find(item => item.id === product.categoryId) || {}).categoryName || ''
    }
    if (body.brandId !== undefined) {
      product.brandId = Number(body.brandId)
      product.brandName = (brands.find(item => item.id === product.brandId) || {}).brandName || ''
    }
    product.updateTime = fmt(new Date())
  }

  const scopedRecords = (auth, records) => {
    if (auth.dataScope === ALL) return [...records]
    const orderNos = new Set(scopeOrders(auth).map(order => order.orderNo))
    return records.filter(record => orderNos.has(record.orderNo))
  }

  /* ---------------- 商户工作台 / 资料 ---------------- */
  app.get('/api/admin/merchant/dashboard/overview', authenticate, requirePermission('merchant:dashboard'), (req, res) => {
    const visibleOrders = scopeOrders(req.auth)
    const visibleProducts = scopeMerchant(req.auth, products)
    const visibleRefunds = scopedRecords(req.auth, refunds)
    const visibleSettlements = scopeMerchant(req.auth, settlements)
    const paidOrders = visibleOrders.filter(order => Number(order.payStatus) === 1)
    const latestOrders = [...visibleOrders]
      .sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)))
      .slice(0, 6)
      .map(orderView)
    ok(res, {
      merchantId: req.auth.merchantId,
      merchantName: req.auth.merchantName,
      stats: {
        totalSales: paidOrders.reduce((sum, order) => sum + Number(order.payAmount || 0), 0),
        orderCount: visibleOrders.length,
        totalOrders: visibleOrders.length,
        productCount: visibleProducts.length,
        pendingShipments: visibleOrders.filter(order => Number(order.orderStatus) === 1).length,
        pendingRefunds: visibleRefunds.filter(refund => Number(refund.refundStatus) < 2).length,
        pendingSettlement: visibleSettlements.filter(item => Number(item.status) !== 2).length,
        pendingSettlementAmount: visibleSettlements
          .filter(item => Number(item.status) !== 2)
          .reduce((sum, item) => sum + Number(item.payableAmount || 0) - Number(item.paidAmount || 0), 0)
      },
      latestOrders
    })
  })

  const resolveProfileTenant = (req, res) => {
    const merchantId = req.auth.dataScope === ALL
      ? Number((req.query && req.query.merchantId) || (req.body && req.body.merchantId) || 0)
      : req.auth.merchantId
    if (!merchantId) {
      fail(res, '请指定要查看的商户')
      return null
    }
    const tenant = tenants.find(item => item.id === Number(merchantId))
    if (!tenant) {
      fail(res, '商户不存在', 404)
      return null
    }
    return tenant
  }

  app.get('/api/admin/merchant/profile', authenticate, requirePermission('merchant:profile'), (req, res) => {
    const tenant = resolveProfileTenant(req, res)
    if (tenant) ok(res, tenant)
  })

  app.put('/api/admin/merchant/profile', authenticate, requirePermission('merchant:profile'), (req, res) => {
    const tenant = resolveProfileTenant(req, res)
    if (!tenant) return
    ;['contactPerson', 'contactPhone', 'contactEmail', 'address'].forEach(field => {
      if (req.body[field] !== undefined) tenant[field] = req.body[field]
    })
    ok(res, tenant, '商户资料已保存')
  })

  /* ---------------- 商品 ---------------- */
  app.get('/api/admin/product/spu/page', authenticate, requirePermission('product:spu'), (req, res) => {
    let list = scopeMerchant(req.auth, products)
    if (req.auth.dataScope === ALL && req.query.merchantId) list = list.filter(item => numEq(item.merchantId, req.query.merchantId))
    if (req.query.spuName) list = list.filter(item => like(item.spuName, req.query.spuName))
    if (!numEq(null, req.query.categoryId)) list = list.filter(item => numEq(item.categoryId, req.query.categoryId))
    if (!numEq(null, req.query.brandId)) list = list.filter(item => numEq(item.brandId, req.query.brandId))
    if (!numEq(null, req.query.status)) list = list.filter(item => numEq(item.status, req.query.status))
    const result = paginate(list, req.query)
    result.records = result.records.map(productView)
    ok(res, result)
  })

  app.get('/api/admin/product/spu/:id', authenticate, requirePermission('product:spu'), (req, res) => {
    const product = findAccessibleProduct(req, res, req.params.id)
    if (product) ok(res, productView(product))
  })

  app.post('/api/admin/product/spu', authenticate, requirePermission('product:spu'), (req, res) => {
    if (!req.body.spuName) return fail(res, '商品名称不能为空')
    const merchantId = req.auth.dataScope === ALL ? Number(req.body.merchantId || 2) : req.auth.merchantId
    const merchant = tenants.find(item => item.id === Number(merchantId))
    if (!merchant) return fail(res, '经营商户不存在')
    const product = {
      id: nextId(products),
      merchantId: merchant.id,
      merchantName: merchant.tenantName,
      spuCode: `SPU${Date.now()}`,
      image: '',
      images: [],
      tags: [],
      sales: 0,
      stock: 0,
      status: 1,
      traceable: true,
      createTime: fmt(new Date())
    }
    applyProductFields(product, req.body)
    product.merchantId = merchant.id
    product.merchantName = merchant.tenantName
    products.unshift(product)
    const sku = {
      id: nextId(skus),
      tenantId: 1,
      merchantId: product.merchantId,
      spuId: product.id,
      skuCode: `SKU${Date.now()}`,
      skuName: `${product.spuName} 标准装`,
      specs: '标准装',
      price: Number(product.sellPrice || 0),
      originalPrice: Number(product.originalPrice || product.sellPrice || 0),
      costPrice: Number(product.costPrice || 0),
      stock: Number(product.stock || 0),
      status: 1
    }
    skus.push(sku)
    ok(res, productView(product), '新增成功')
  })

  app.put('/api/admin/product/spu', authenticate, requirePermission('product:spu'), (req, res) => {
    const product = findAccessibleProduct(req, res, req.body.id)
    if (!product) return
    applyProductFields(product, req.body)
    skus.filter(item => item.spuId === product.id).forEach(item => { item.merchantId = product.merchantId })
    ok(res, productView(product), '修改成功')
  })

  app.put('/api/admin/product/spu/:id/status', authenticate, requirePermission('product:spu'), (req, res) => {
    const product = findAccessibleProduct(req, res, req.params.id)
    if (!product) return
    product.status = Number(req.body.status) === 1 ? 1 : 0
    product.updateTime = fmt(new Date())
    ok(res, productView(product), product.status === 1 ? '商品已上架' : '商品已下架')
  })

  app.delete('/api/admin/product/spu/batch', authenticate, requirePermission('product:spu'), (req, res) => {
    const source = Array.isArray(req.body) ? req.body : req.body.ids || []
    const ids = [...new Set(source.map(Number))]
    if (!ids.length) return fail(res, '请选择要删除的商品')
    const selected = ids.map(id => products.find(item => item.id === id))
    if (selected.some(item => !item)) return fail(res, '部分商品不存在，批量操作已取消', 404)
    if (selected.some(item => !assertMerchantAccess(req.auth, item.merchantId))) return forbidden(res, '批量数据中包含其他商户商品，已整批拒绝')
    const idSet = new Set(ids)
    for (let i = products.length - 1; i >= 0; i--) if (idSet.has(products[i].id)) products.splice(i, 1)
    for (let i = skus.length - 1; i >= 0; i--) if (idSet.has(skus[i].spuId)) skus.splice(i, 1)
    ok(res, null, '批量删除成功')
  })

  app.delete('/api/admin/product/spu/:id', authenticate, requirePermission('product:spu'), (req, res) => {
    const product = findAccessibleProduct(req, res, req.params.id)
    if (!product) return
    products.splice(products.findIndex(item => item.id === product.id), 1)
    for (let i = skus.length - 1; i >= 0; i--) if (skus[i].spuId === product.id) skus.splice(i, 1)
    ok(res, null, '删除成功')
  })

  /* ---------------- 订单 ---------------- */
  app.get('/api/admin/order/info/page', authenticate, requirePermission('order:info'), (req, res) => {
    let list = [...scopeOrders(req.auth)].sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)))
    if (req.auth.dataScope === ALL && req.query.merchantId) {
      list = list.filter(order => getOrderMerchantFields(order).merchantIds.includes(Number(req.query.merchantId)))
    }
    if (req.query.orderNo) list = list.filter(order => like(order.orderNo, req.query.orderNo))
    if (req.query.userName) list = list.filter(order => like(order.userName, req.query.userName))
    if (!numEq(null, req.query.orderStatus)) list = list.filter(order => numEq(order.orderStatus, req.query.orderStatus))
    if (!numEq(null, req.query.payStatus)) list = list.filter(order => numEq(order.payStatus, req.query.payStatus))
    const result = paginate(list, req.query)
    result.records = result.records.map(orderView)
    ok(res, result)
  })

  app.get('/api/admin/order/info/:id', authenticate, requirePermission('order:info'), (req, res) => {
    const order = findAccessibleOrder(req, res, req.params.id)
    if (order) ok(res, orderView(order))
  })

  app.put('/api/admin/order/info', authenticate, requirePermission('order:info'), (req, res) => {
    const order = findAccessibleOrder(req, res, req.body.id)
    if (!order) return
    if (req.body.orderStatus !== undefined) {
      const nextStatus = Number(req.body.orderStatus)
      const currentStatus = Number(order.orderStatus)
      const canShip = nextStatus === 2 && currentStatus === 1
      const canCancel = nextStatus === 4 && [0, 1].includes(currentStatus)
      if (nextStatus !== currentStatus && !canShip && !canCancel) return fail(res, '仅支持待发货订单发货，或待支付/待发货订单取消')
      if (canShip) order.shipTime = fmt(new Date())
      order.orderStatus = nextStatus
    }
    ;['remark', 'carrier', 'trackingNo'].forEach(field => {
      if (req.body[field] !== undefined) order[field] = req.body[field]
    })
    ok(res, orderView(order), '订单已更新')
  })

  /* ---------------- 支付 / 售后 ---------------- */
  const payRecordPage = (req, res) => {
    let list = scopedRecords(req.auth, payRecords)
      .sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)))
    if (req.auth.dataScope === ALL && req.query.merchantId) {
      list = list.filter(record => {
        const order = getRecordOrder(record)
        return order && getOrderMerchantFields(order).merchantIds.includes(Number(req.query.merchantId))
      })
    }
    if (req.query.payNo) list = list.filter(record => like(record.payNo, req.query.payNo))
    if (req.query.orderNo) list = list.filter(record => like(record.orderNo, req.query.orderNo))
    if (!numEq(null, req.query.payStatus)) list = list.filter(record => numEq(record.payStatus, req.query.payStatus))
    if (!numEq(null, req.query.payMethod)) list = list.filter(record => numEq(record.payMethod, req.query.payMethod))
    const result = paginate(list, req.query)
    result.records = result.records.map(recordView)
    ok(res, result)
  }
  app.get('/api/admin/pay/record', authenticate, requirePermission('pay:record'), payRecordPage)
  app.get('/api/admin/pay/record/page', authenticate, requirePermission('pay:record'), payRecordPage)

  const refundPage = (req, res) => {
    let list = scopedRecords(req.auth, [...refunds].reverse())
    if (req.auth.dataScope === ALL && req.query.merchantId) {
      list = list.filter(record => {
        const order = getRecordOrder(record)
        return order && getOrderMerchantFields(order).merchantIds.includes(Number(req.query.merchantId))
      })
    }
    if (req.query.refundNo) list = list.filter(record => like(record.refundNo, req.query.refundNo))
    if (req.query.payNo) list = list.filter(record => like(record.payNo, req.query.payNo))
    if (req.query.orderNo) list = list.filter(record => like(record.orderNo, req.query.orderNo))
    if (!numEq(null, req.query.refundStatus)) list = list.filter(record => numEq(record.refundStatus, req.query.refundStatus))
    const result = paginate(list, req.query)
    result.records = result.records.map(recordView)
    ok(res, result)
  }
  app.get('/api/admin/pay/refund', authenticate, requirePermission('pay:refund'), refundPage)
  app.get('/api/admin/pay/refund/page', authenticate, requirePermission('pay:refund'), refundPage)

  app.put('/api/admin/pay/refund/:id/audit', authenticate, requirePermission('pay:refund'), (req, res) => {
    const refund = refunds.find(item => item.id === Number(req.params.id))
    if (!refund) return fail(res, '售后记录不存在', 404)
    const order = getRecordOrder(refund)
    if (!order || !canAccessOrder(req.auth, order)) return forbidden(res, '无权审核其他商户或多商户订单的售后')
    const result = req.body.auditResult ?? req.body.auditStatus ?? req.body.result
    if (result === undefined) return fail(res, '请填写审核结果')
    refund.auditResult = result
    refund.auditStatus = result
    refund.auditOpinion = req.body.auditOpinion ?? req.body.opinion ?? req.body.auditRemark ?? ''
    refund.auditBy = req.auth.user.realName || req.auth.user.username
    refund.auditor = refund.auditBy
    refund.auditTime = fmt(new Date())
    ok(res, recordView(refund), '售后审核已保存')
  })

  /* ---------------- 结算 ---------------- */
  const settlementPage = (req, res) => {
    let list = scopeMerchant(req.auth, settlements)
    if (req.auth.dataScope === ALL && req.query.merchantId) list = list.filter(item => numEq(item.merchantId, req.query.merchantId))
    if (req.query.settlementNo) list = list.filter(item => like(item.settlementNo, req.query.settlementNo))
    if (!numEq(null, req.query.status)) list = list.filter(item => numEq(item.status, req.query.status))
    const result = paginate(list, req.query)
    result.records = result.records.map(settlementView)
    ok(res, result)
  }
  app.get('/api/admin/settlement', authenticate, requirePermission('settlement'), settlementPage)
  app.get('/api/admin/settlement/page', authenticate, requirePermission('settlement'), settlementPage)

  app.put('/api/admin/settlement/:id/confirm', authenticate, requirePermission('settlement'), requireSuperAdmin, (req, res) => {
    const settlement = settlements.find(item => item.id === Number(req.params.id))
    if (!settlement) return fail(res, '结算单不存在', 404)
    settlement.status = 2
    settlement.paidAmount = settlement.payableAmount
    settlement.settleTime = fmt(new Date())
    settlement.confirmedBy = req.auth.user.realName || req.auth.user.username
    settlement.confirmedTime = settlement.settleTime
    ok(res, settlementView(settlement), '结算已确认')
  })
}

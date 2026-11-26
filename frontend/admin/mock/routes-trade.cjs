const { ok, fail, fmt, hash, paginate, numEq } = require('./helpers.cjs')
const { products, skus, users } = require('./seed.cjs')
const { carts, banners, quickEntries, notices, orders, orderItems, payRecords, refunds, coupons, couponTemplates, traceRecords, chainTxs, chainBlocks, chainMeta } = require('./seed-extra.cjs')
const { productsById, skusBySpuId, productsByCategory, tracesBySpuId, tracesByCode, couponsByCode, couponsByTraceCode, couponTemplatesById } = require('./indexes.cjs')
const { service: fuliCardService } = require('./fuli-card-service.cjs')

const FULL_REDUCTION_RULES = [
  { id: 1, thresholdAmount: 99, discountAmount: 10 },
  { id: 2, thresholdAmount: 199, discountAmount: 25 },
  { id: 3, thresholdAmount: 299, discountAmount: 40 }
]
const roundMoney = value => Number(Number(value).toFixed(2))
const resolveFullReduction = totalAmount => {
  const rule = [...FULL_REDUCTION_RULES]
    .sort((a, b) => a.thresholdAmount - b.thresholdAmount)
    .filter(item => totalAmount >= item.thresholdAmount)
    .pop() || null
  return rule ? {
    type: 'FULL_REDUCTION',
    ruleId: rule.id,
    name: `满 ${rule.thresholdAmount} 减 ${rule.discountAmount}`,
    thresholdAmount: rule.thresholdAmount,
    discountAmount: rule.discountAmount
  } : null
}

const nextId = arr => arr.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1
let flowSeq = 1000

const findTraceByCode = code => {
  const c = String(code || '').trim().toUpperCase()
  const trace = tracesByCode.get(c) || traceRecords.find(t => t.traceCode.toUpperCase() === c) || null
  const coupon = couponsByCode.get(c) || couponsByTraceCode.get(c) || coupons.find(x => String(x.traceCode).toUpperCase() === c) || null
  return { trace, coupon }
}

const appendChainTx = (txType, txTypeName, bizNo, extra = {}) => {
  const last = chainBlocks[chainBlocks.length - 1]
  const height = last.height + 1
  const tx = {
    id: chainTxs.length + 1,
    txHash: hash(`${bizNo}-${txType}-${Date.now()}`),
    blockHeight: height,
    txType,
    txTypeName,
    bizNo,
    couponCode: extra.couponCode || '',
    spuName: extra.spuName || '',
    from: extra.from || '福礼社商城',
    to: extra.to || '福礼社商户',
    amount: extra.amount || 0,
    status: 'success',
    timestamp: fmt(new Date())
  }
  const block = {
    height,
    blockHash: hash(`${last.blockHash}-${height}-${tx.txHash}`),
    prevHash: last.blockHash,
    txCount: 1,
    timestamp: tx.timestamp,
    proposer: `node-${(height % 4) + 1}`,
    size: '1.1KB',
    status: 'confirmed'
  }
  chainBlocks.push(block)
  chainTxs.push(tx)
  chainMeta.height = height
  chainMeta.totalBlocks = chainBlocks.length
  chainMeta.totalTx = chainTxs.length
  chainMeta.latestBlockTime = block.timestamp
  return tx
}

module.exports = function registerTradeRoutes(app, jwt, SECRET_KEY) {
  /* ---------------- 小程序 / H5 登录 ---------------- */
  app.post('/api/h5/login', (req, res) => {
    const { username, password } = req.body
    const user = users.find(u => u.username === username && u.password === password)
    if (!user) return fail(res, '用户名或密码错误')
    const token = jwt.sign({ id: user.id, tenantId: user.tenantId, username: user.username }, SECRET_KEY, { expiresIn: '24h' })
    ok(res, {
      token,
      userInfo: { id: user.id, username: user.username, nickname: user.nickname, realName: user.realName, mobile: user.mobile, avatar: '', tenantId: user.tenantId }
    })
  })

  /* ---------------- 首页 / 商品 ---------------- */
  app.get('/api/h5/home', (req, res) => {
    ok(res, {
      banners,
      quickEntries,
      notices,
      categories: [
        { id: 1, name: '礼品卡券' }, { id: 2, name: '节庆礼盒' }, { id: 3, name: '食品礼盒' }, { id: 4, name: '茶酒饮品' },
        { id: 5, name: '数码家电' }, { id: 6, name: '家居生活' }, { id: 7, name: '健康关怀' }, { id: 8, name: '办公用品' }
      ],
      hotProducts: [...products].filter(p => p.status === 1).sort((a, b) => b.sales - a.sales).slice(0, 10),
      coupons: couponTemplates.filter(t => t.status === 1).slice(0, 4),
      recommend: products.filter(p => p.status === 1).slice(4, 12)
    })
  })

  app.get('/api/h5/product/:id', (req, res) => {
    const id = Number(req.params.id)
    const p = productsById.get(id) || products.find(x => x.id === id)
    if (!p) return fail(res, '商品不存在', 404)
    const trace = tracesBySpuId.get(p.id) || traceRecords.find(t => t.spuId === p.id) || null
    const categoryProducts = productsByCategory.get(p.categoryId) || products
    ok(res, {
      ...p,
      skus: skusBySpuId.get(p.id) || skus.filter(s => s.spuId === p.id),
      trace,
      reviews: [
        { id: 1, user: '王**', content: '包装精致，企业年会礼品很合适，扫码还能看到溯源信息。', score: 5, time: '2026-10-28' },
        { id: 2, user: '李**', content: '物流很快，卡券兑换方便，员工反馈不错。', score: 5, time: '2026-10-21' },
        { id: 3, user: '张**', content: '性价比高，复购第三次了，开票也很快。', score: 4, time: '2026-10-12' }
      ],
      related: categoryProducts.filter(x => x.id !== p.id && x.status === 1).slice(0, 4)
    })
  })

  app.get('/api/h5/trace/:code', (req, res) => {
    const { trace, coupon } = findTraceByCode(req.params.code)
    if (!trace && !coupon) return fail(res, '未查询到该溯源码', 404)
    const spu = trace ? products.find(p => p.id === trace.spuId) : null
    ok(res, {
      trace,
      coupon,
      product: spu ? { id: spu.id, spuName: spu.spuName, image: spu.image, sellPrice: spu.sellPrice } : null,
      chainStatus: '已上链',
      verified: true,
      chainName: chainMeta.chainName
    })
  })

  /* ---------------- 购物车 ---------------- */
  app.get('/api/cart', (req, res) => {
    const userId = Number(req.query.userId || 2)
    ok(res, carts.filter(c => c.userId === userId))
  })
  app.post('/api/cart/add', (req, res) => {
    const { userId = 2, skuId, quantity = 1 } = req.body
    const sku = skus.find(s => s.id === Number(skuId))
    if (!sku) return fail(res, '商品规格不存在', 404)
    const spu = products.find(p => p.id === sku.spuId)
    const exist = carts.find(c => c.userId === Number(userId) && c.skuId === sku.id)
    if (exist) {
      exist.quantity += Number(quantity)
    } else {
      carts.push({
        id: nextId(carts),
        userId: Number(userId),
        skuId: sku.id,
        spuId: sku.spuId,
        spuName: spu ? spu.spuName : sku.skuName,
        image: spu ? spu.image : '',
        skuName: sku.skuName,
        price: sku.price,
        quantity: Number(quantity),
        selected: true
      })
    }
    ok(res, null, '已加入购物车')
  })
  app.put('/api/cart/update', (req, res) => {
    const item = carts.find(c => c.id === Number(req.body.id))
    if (!item) return fail(res, '购物车项不存在', 404)
    if (req.body.quantity !== undefined) item.quantity = Math.max(1, Number(req.body.quantity))
    if (req.body.selected !== undefined) item.selected = !!req.body.selected
    ok(res, item)
  })
  app.delete('/api/cart/clear', (req, res) => {
    const userId = Number(req.query.userId || 2)
    for (let i = carts.length - 1; i >= 0; i--) if (carts[i].userId === userId) carts.splice(i, 1)
    ok(res, null, '购物车已清空')
  })
  app.delete('/api/cart/:id', (req, res) => {
    const i = carts.findIndex(c => c.id === Number(req.params.id))
    if (i > -1) carts.splice(i, 1)
    ok(res, null, '已删除')
  })

  /* ---------------- 满减 / 下单 / 支付 / 退款 ---------------- */
  app.get('/api/h5/promotions/full-reduction', (req, res) => {
    ok(res, { name: '全场满减', rules: FULL_REDUCTION_RULES })
  })

  const createOrderHandler = (req, res) => {
    const { userId = 2, items = [], receiver, userName, mobile, address, remark, couponId, promotionId, addressId, storeId, storeName, deliverySlot } = req.body
    if (!items.length) return fail(res, '请选择商品')
    const user = users.find(u => u.id === Number(userId)) || users[1]
    let totalAmount = 0
    const lines = []
    for (const it of items) {
      const sku = skus.find(s => s.id === Number(it.skuId))
      if (!sku) return fail(res, '商品规格不存在')
      if (sku.stock < it.quantity) return fail(res, `库存不足：${sku.skuName}`)
      const spu = products.find(p => p.id === sku.spuId)
      totalAmount += sku.price * it.quantity
      lines.push({ sku, spu, quantity: Number(it.quantity) })
    }
    totalAmount = roundMoney(totalAmount)
    // 满减以服务端 SKU 实价为准，客户端只传预期档位用于识别规则变更。
    const promotion = resolveFullReduction(totalAmount)
    if (promotionId !== undefined && promotionId !== null && promotionId !== '' && Number(promotionId) !== Number(promotion?.ruleId || 0)) {
      return fail(res, '满减优惠已变化，请返回结算页重新确认')
    }
    let couponDiscountAmount = 0
    let coupon = null
    if (couponId) {
      coupon = coupons.find(c => c.id === Number(couponId))
      if (coupon && coupon.status === 0 && totalAmount >= coupon.minAmount) {
        couponDiscountAmount = coupon.couponType === 2 ? Math.round(totalAmount * (1 - (coupon.faceValue / 100))) : coupon.faceValue
      } else {
        coupon = null
      }
    }
    const discountAmount = roundMoney((promotion?.discountAmount || 0) + couponDiscountAmount)
    const payAmount = Math.max(1, roundMoney(totalAmount - discountAmount))
    const orderNo = `ORD${Date.now()}${flowSeq++}`
    const order = {
      id: nextId(orders),
      orderNo,
      userId: user.id,
      userName: receiver || userName || user.realName,
      mobile: mobile || user.mobile,
      address: address || '浙江省杭州市西湖区文三路 90 号',
      addressId: addressId || null,
      storeId: storeId || null,
      storeName: storeName || '',
      deliverySlot: deliverySlot || '',
      orderType: 0,
      orderStatus: 0,
      payStatus: 0,
      totalAmount,
      discountAmount,
      payAmount,
      promotion,
      payMethod: '',
      payNo: null,
      payTime: null,
      shipTime: null,
      completeTime: null,
      remark: remark || '',
      source: 'H5 商城',
      tenantId: user.tenantId,
      createTime: fmt(new Date()),
      itemCount: lines.length
    }
    orders.unshift(order)
    lines.forEach(l => {
      orderItems.push({
        id: nextId(orderItems),
        orderId: order.id,
        orderNo,
        spuId: l.spu.id,
        spuName: l.spu.spuName,
        image: l.spu.image,
        spuImage: l.spu.image,
        skuId: l.sku.id,
        skuCode: l.sku.skuCode,
        skuName: l.sku.skuName,
        quantity: l.quantity,
        unitPrice: l.sku.price,
        totalPrice: l.sku.price * l.quantity,
        tenantId: user.tenantId
      })
      l.sku.stock -= l.quantity
      l.spu.stock -= l.quantity
    })
    for (let i = carts.length - 1; i >= 0; i--) {
      if (carts[i].userId === user.id && items.some(it => Number(it.skuId) === carts[i].skuId)) carts.splice(i, 1)
    }
    if (coupon) {
      coupon.status = 1
      coupon.usedTime = fmt(new Date())
      coupon.orderNo = orderNo
      appendChainTx('COUPON_REDEEM', '卡券核销', orderNo, { couponCode: coupon.couponCode, spuName: '订单核销', from: coupon.userName, to: '福礼社商户', amount: coupon.faceValue })
    }
    ok(res, { ...order, orderId: order.id, items: orderItems.filter(item => item.orderId === order.id) }, '下单成功')
  }
  app.post('/api/order/create', createOrderHandler)
  app.post('/api/order/info/create', createOrderHandler)

  app.post('/api/pay/create', (req, res) => {
    const { orderNo } = req.body
    const methodRaw = req.body.payMethod
    const payMethod = methodRaw === 'wechat' ? 1 : methodRaw === 'alipay' ? 2 : methodRaw === 'balance' ? 3 : Number(methodRaw || 1)
    const order = orders.find(o => o.orderNo === orderNo)
    if (!order) return fail(res, '订单不存在', 404)
    if (methodRaw === 'fuli_card') {
      try {
        const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
        const auth = jwt.verify(token, SECRET_KEY)
        const result = fuliCardService.payOrder(Number(auth.id), orderNo, req.body.requestId || `ORDER_PAY:${orderNo}`)
        return ok(res, result, '福卡支付成功')
      } catch (error) {
        return fail(res, error.message || '福卡支付失败', 400)
      }
    }
    if (order.payStatus === 1) return ok(res, { payNo: order.payNo, payStatus: 2, payAmount: order.payAmount }, '订单已支付')
    const payNo = `PAY${Date.now()}`
    order.orderStatus = 1
    order.payStatus = 1
    order.payMethod = payMethod === 1 ? 'wechat' : payMethod === 2 ? 'alipay' : 'balance'
    order.payNo = payNo
    order.payTime = fmt(new Date())
    payRecords.unshift({
      id: nextId(payRecords),
      payNo,
      orderNo,
      tenantId: order.tenantId,
      userId: order.userId,
      payMethod,
      payAmount: order.payAmount,
      payStatus: 2,
      thirdPayNo: payMethod === 1 ? `wx${Date.now()}` : payMethod === 2 ? `ali${Date.now()}` : `bal${Date.now()}`,
      payTime: order.payTime,
      createTime: order.payTime,
      notifyCount: 1,
      remark: '',
      channel: payMethod === 1 ? '微信支付' : payMethod === 2 ? '支付宝' : '余额支付'
    })
    appendChainTx('ORDER_PAY', '订单支付', orderNo, { spuName: '礼品订单', from: order.userName, to: '福礼社商户', amount: order.payAmount })
    ok(res, { payNo, payStatus: 2, payAmount: order.payAmount, payTime: order.payTime }, '支付成功')
  })

  app.post('/api/pay/wechat/notify', (req, res) => {
    const { payNo, tradeState, transactionId } = req.body
    const record = payRecords.find(item => item.payNo === payNo)
    if (!record || tradeState !== 'SUCCESS') {
      res.type('application/xml').status(400).send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[支付单不存在或状态无效]]></return_msg></xml>')
      return
    }
    // 微信支付回调可能重复投递：同一交易号只计一次，避免重复通知放大
    const duplicated = record.notifyCount > 0 && record.thirdPayNo === transactionId
    if (!duplicated) {
      record.thirdPayNo = transactionId || record.thirdPayNo
      record.notifyCount = Number(record.notifyCount || 0) + 1
    }
    res.type('application/xml').send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>')
  })

  app.post('/api/pay/refund', (req, res) => {
    const { payNo, reason } = req.body
    const record = payRecords.find(p => p.payNo === payNo)
    if (!record) return fail(res, '支付单不存在', 404)
    const order = orders.find(o => o.orderNo === record.orderNo)
    if (record.payMethod === 3 && order?.payMethod === 'fuli_card') {
      try {
        const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
        const auth = jwt.verify(token, SECRET_KEY)
        const refund = fuliCardService.refundOrder(Number(auth.id), payNo, req.body.requestId || `ORDER_REFUND:${record.orderNo}`, reason)
        return ok(res, refund, '福卡退款已退回账户')
      } catch (error) {
        return fail(res, error.message || '福卡退款失败', 400)
      }
    }
    record.payStatus = 4
    if (order) {
      order.orderStatus = 4
      order.payStatus = 0
      order.remark = '用户申请退款'
    }
    const refund = {
      id: nextId(refunds),
      refundNo: `REF${Date.now()}`,
      payNo,
      orderNo: record.orderNo,
      tenantId: record.tenantId,
      refundAmount: record.payAmount,
      payAmount: record.payAmount,
      refundStatus: 2,
      refundReason: reason || '用户申请退款',
      thirdRefundNo: `rf${Date.now()}`,
      refundTime: fmt(new Date()),
      createTime: fmt(new Date())
    }
    refunds.unshift(refund)
    ok(res, refund, '退款已原路退回')
  })

  app.put('/api/order/:id/complete', (req, res) => {
    const order = orders.find(o => o.id === Number(req.params.id))
    if (!order) return fail(res, '订单不存在', 404)
    order.orderStatus = 3
    order.completeTime = fmt(new Date())
    ok(res, null, '订单已完成')
  })

  /* ---------------- 我的卡券 / 核销 / 转赠 ---------------- */
  app.get('/api/coupon/my', (req, res) => {
    const userId = Number(req.query.userId || 2)
    const list = coupons.filter(c => c.userId === userId).map(c => ({
      ...c,
      template: couponTemplatesById.get(c.templateId) || couponTemplates.find(t => t.id === c.templateId) || null
    }))
    ok(res, list)
  })

  app.post('/api/coupon/redeem', (req, res) => {
    const { couponCode, orderNo } = req.body
    const coupon = coupons.find(c => c.couponCode === couponCode)
    if (!coupon) return fail(res, '卡券不存在', 404)
    if (coupon.status === 1) return fail(res, '该卡券已核销')
    coupon.status = 1
    coupon.usedTime = fmt(new Date())
    coupon.orderNo = orderNo || null
    appendChainTx('COUPON_REDEEM', '卡券核销', orderNo || coupon.couponCode, { couponCode, spuName: '卡券核销', from: coupon.userName, to: '福礼社商户', amount: coupon.faceValue })
    ok(res, coupon, '核销成功，已上链')
  })

  app.post('/api/coupon/transfer', (req, res) => {
    const { couponCode, toUserId } = req.body
    const coupon = coupons.find(c => c.couponCode === couponCode)
    if (!coupon) return fail(res, '卡券不存在', 404)
    if (coupon.status !== 0) return fail(res, '该卡券当前不可转赠')
    const target = users.find(u => u.id === Number(toUserId)) || users.find(u => u.id !== coupon.userId)
    coupon.status = 3
    coupon.transferTo = target.realName
    appendChainTx('COUPON_TRANSFER', '卡券转赠', couponCode, { couponCode, spuName: '卡券转赠', from: coupon.userName, to: target.realName, amount: coupon.faceValue })
    ok(res, coupon, `已转赠给 ${target.realName}`)
  })

  /* ---------------- 公共溯源验真 ---------------- */
  app.get('/api/trace/:code', (req, res) => {
    const { trace, coupon } = findTraceByCode(req.params.code)
    if (!trace && !coupon) return fail(res, '未查询到该溯源码', 404)
    const spu = trace ? products.find(p => p.id === trace.spuId) : null
    ok(res, { traceCode: (trace || coupon).traceCode, trace, coupon, product: spu, chainStatus: '已上链', verified: true, chainName: chainMeta.chainName })
  })

  app.post('/api/trace/verify', (req, res) => {
    const code = req.body.code
    const { trace, coupon } = findTraceByCode(code)
    if (!trace && !coupon) return ok(res, { valid: false, code, message: '未找到链上存证记录', verifyTime: fmt(new Date()) })
    ok(res, {
      valid: true,
      code,
      message: '验证通过，数据由福礼链存证且未被篡改',
      verifyTime: fmt(new Date()),
      chainName: chainMeta.chainName,
      blockHeight: chainMeta.height,
      txHash: hash(`verify-${code}`),
      trace,
      coupon
    })
  })
}

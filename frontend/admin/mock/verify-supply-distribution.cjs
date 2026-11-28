/**
 * 独立 Mock 进程验证供应链、分销归因、佣金结算与福卡支付回归。
 * 运行：node frontend/admin/mock/verify-supply-distribution.cjs
 */
const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const path = require('path')

let failCount = 0
let totalCount = 0
let baseUrl = ''
let serverProcess = null
let serverOutput = ''
const runId = `${Date.now()}-${process.pid}`

const check = (name, pass, detail = '') => {
  totalCount++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!pass) failCount++
}

const request = async (url, { method = 'GET', token, body } = {}) => {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const text = await response.text()
  const contentType = response.headers.get('content-type') || ''
  let payload = null
  if (text && contentType.includes('json')) {
    try {
      payload = JSON.parse(text)
    } catch (error) {
      throw new Error(`${method} ${url} 返回了无效 JSON：${text.slice(0, 160)}`)
    }
  }
  return { status: response.status, body: payload, text, headers: response.headers }
}

const responseDetail = response => {
  const message = response.body && (response.body.message || response.body.msg)
  const code = response.body && response.body.code
  return `HTTP ${response.status}${code !== undefined ? ' / code ' + code : ''}${message ? ' / ' + message : ''}`
}

const expectData = async (name, url, options = {}) => {
  const response = await request(url, options)
  const pass = response.status === 200 && response.body && response.body.code === 200
  check(name, pass, responseDetail(response))
  if (!pass) throw new Error(`${name}：${responseDetail(response)}${response.text && !response.body ? ' / ' + response.text.slice(0, 160) : ''}`)
  return response.body.data
}

const expectHttp = async (name, url, options = {}, status) => {
  const response = await request(url, options)
  const pass = response.status === status && (!response.body || response.body.code === status)
  check(name, pass, responseDetail(response))
  return response
}

const expectBusinessError = async (name, url, options = {}) => {
  const response = await request(url, options)
  const pass = response.status === 200 && response.body && response.body.code === 400
  check(name, pass, responseDetail(response))
  return response
}

const fixture = (name, value, detail = '') => {
  check(name, Boolean(value), detail || (value ? '夹具存在' : '夹具不存在'))
  if (!value) throw new Error(`${name}：${detail || '夹具不存在'}`)
  return value
}

const login = async username => {
  const data = await expectData(`登录 ${username}`, '/api/user/auth/login', {
    method: 'POST',
    body: { username, password: '123456' }
  })
  return data.token
}

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.unref()
  server.on('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port
    server.close(() => resolve(port))
  })
})

const waitUntilReady = async () => {
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error(`Mock 进程提前退出：${serverOutput}`)
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) return
    } catch (error) {
      // 服务尚未监听，继续等待。
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`等待 Mock 启动超时：${serverOutput}`)
}

const stopServer = async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 2000)
    timer.unref()
    serverProcess.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
    serverProcess.kill()
  })
}

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
const pad = value => String(value).padStart(2, '0')
const formatTime = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
const orderQuery = orderNo => `orderNo=${encodeURIComponent(orderNo)}`

async function run() {
  await expectHttp('无 Token 访问供应链总览返回 401', '/api/supply/overview', {}, 401)

  const usernames = [
    'admin', 'fulishe_admin', 'xinchun_admin', 'zhangsan', 'fulishe_operator',
    'supplier_fuli', 'supplier_dxc', 'distributor_chen', 'distributor_lin', 'user1'
  ]
  const tokens = {}
  for (const username of usernames) tokens[username] = await login(username)
  const adminToken = tokens.admin
  const tokenA = tokens.fulishe_admin
  const tokenB = tokens.xinchun_admin
  const purchaseToken = tokens.zhangsan
  const operatorToken = tokens.fulishe_operator
  const supplierToken1 = tokens.supplier_fuli
  const supplierToken2 = tokens.supplier_dxc
  const distributorToken1 = tokens.distributor_chen
  const distributorToken2 = tokens.distributor_lin
  const userToken = tokens.user1

  /* ---------------- 供应链隔离与权限 ---------------- */
  const suppliersA = await expectData('商户 A 读取供应商', '/api/supply/supplier/page?size=100', { token: tokenA })
  const suppliersB = await expectData('商户 B 读取供应商', '/api/supply/supplier/page?size=100', { token: tokenB })
  check('商户 A/B 供应商按 merchantId 隔离',
    suppliersA.records.length > 0 && suppliersB.records.length > 0 &&
    suppliersA.records.every(item => item.merchantId === 2) && suppliersB.records.every(item => item.merchantId === 3))
  const purchasesA = await expectData('商户 A 读取采购单', '/api/supply/purchase/page?size=100', { token: tokenA })
  const purchasesB = await expectData('商户 B 读取采购单', '/api/supply/purchase/page?size=100', { token: tokenB })
  check('商户 A/B 采购单按 merchantId 隔离',
    purchasesA.records.length > 0 && purchasesB.records.length > 0 &&
    purchasesA.records.every(item => item.merchantId === 2) && purchasesB.records.every(item => item.merchantId === 3))

  const forgedSuppliersA = await expectData('商户 A 伪造 merchantId 查供应商', '/api/supply/supplier/page?size=100&merchantId=3', { token: tokenA })
  const forgedPurchasesB = await expectData('商户 B 伪造 merchantId 查采购单', '/api/supply/purchase/page?size=100&merchantId=2', { token: tokenB })
  check('伪造 merchantId 不扩大商户供应链范围',
    forgedSuppliersA.records.every(item => item.merchantId === 2) &&
    forgedPurchasesB.records.every(item => item.merchantId === 3))

  const supplierList1 = await expectData('供应商 1 读取供应商范围', '/api/supply/supplier/page?size=100', { token: supplierToken1 })
  const supplierList2 = await expectData('供应商 2 读取供应商范围', '/api/supply/supplier/page?size=100', { token: supplierToken2 })
  check('供应商 1/2 只能看到自己的供应商档案',
    supplierList1.records.length > 0 && supplierList2.records.length > 0 &&
    supplierList1.records.every(item => item.id === 1 && item.merchantId === 2) &&
    supplierList2.records.every(item => item.id === 2 && item.merchantId === 3))
  const supplierPurchases1 = await expectData('供应商 1 读取采购单', '/api/supply/purchase/page?size=100', { token: supplierToken1 })
  const supplierPurchases2 = await expectData('供应商 2 读取采购单', '/api/supply/purchase/page?size=100', { token: supplierToken2 })
  check('供应商 1/2 只能看到自己的采购单',
    supplierPurchases1.records.length > 0 && supplierPurchases2.records.length > 0 &&
    supplierPurchases1.records.every(item => item.supplierId === 1 && item.merchantId === 2) &&
    supplierPurchases2.records.every(item => item.supplierId === 2 && item.merchantId === 3))
  const forgedSupplier1 = await expectData('供应商 1 伪造归属查询', '/api/supply/supplier/page?size=100&supplierId=2&merchantId=3', { token: supplierToken1 })
  const forgedSupplier2 = await expectData('供应商 2 伪造归属查询', '/api/supply/purchase/page?size=100&supplierId=1&merchantId=2', { token: supplierToken2 })
  check('伪造 supplierId/merchantId 不扩大供应商范围',
    forgedSupplier1.records.length > 0 && forgedSupplier1.records.every(item => item.id === 1) &&
    forgedSupplier2.records.length > 0 && forgedSupplier2.records.every(item => item.supplierId === 2 && item.merchantId === 3))

  await expectHttp('供应商访问库存返回 403', '/api/supply/inventory/page?size=100', { token: supplierToken1 }, 403)
  await expectHttp('运营专员访问分销商管理返回 403', '/api/distribution/distributors/page', { token: operatorToken }, 403)
  await expectHttp('采购专员访问分销规则返回 403', '/api/distribution/rules/page', { token: purchaseToken }, 403)
  await expectHttp('分销商访问供应链返回 403', '/api/supply/overview', { token: distributorToken1 }, 403)

  /* ---------------- 采购单状态机与库存幂等 ---------------- */
  const productsA = await expectData('商户 A 选择本商户商品', '/api/admin/product/spu/page?size=100', { token: tokenA })
  const purchaseProduct = fixture('采购商品夹具存在', productsA.records.find(item => item.id === 1 && item.merchantId === 2))
  const purchaseSupplier = fixture('采购供应商夹具存在', suppliersA.records.find(item => item.id === 1 && item.merchantId === 2))
  const quantity = 7
  const inventoryBeforePage = await expectData('入库前读取库存', '/api/supply/inventory/page?size=100', { token: tokenA })
  const inventoryBeforeRecords = inventoryBeforePage.records.filter(item => item.spuId === purchaseProduct.id && item.merchantId === 2)
  fixture('采购商品库存夹具存在', inventoryBeforeRecords[0])
  const inventoryBefore = inventoryBeforeRecords.reduce((sum, item) => sum + item.stock, 0)

  const purchase = await expectData('商户 A 创建采购单且伪造 merchantId=3', '/api/supply/purchase', {
    method: 'POST', token: tokenA,
    body: {
      merchantId: 3,
      supplierId: purchaseSupplier.id,
      expectedDate: '2026-12-31',
      remark: '独立供应链回归',
      items: [{ spuId: purchaseProduct.id, quantity, price: purchaseProduct.costPrice }]
    }
  })
  check('采购单归属忽略伪造 merchantId', purchase.merchantId === 2 && purchase.supplierId === 1 && purchase.status === 0)
  await expectHttp('商户 B 审核商户 A 采购单返回 403', `/api/supply/purchase/${purchase.id}/status`, {
    method: 'PUT', token: tokenB, body: { status: 1 }
  }, 403)
  await expectHttp('供应商不能审核采购单', `/api/supply/purchase/${purchase.id}/status`, {
    method: 'PUT', token: supplierToken1, body: { status: 1 }
  }, 403)
  await expectHttp('采购专员不能审核采购单', `/api/supply/purchase/${purchase.id}/status`, {
    method: 'PUT', token: purchaseToken, body: { status: 1 }
  }, 403)
  const approved = await expectData('商户 A 审核采购单 0→1', `/api/supply/purchase/${purchase.id}/status`, {
    method: 'PUT', token: tokenA, body: { status: 1 }
  })
  check('采购单审核状态正确', approved.status === 1)
  await expectHttp('供应商 2 接供应商 1 采购单返回 403', `/api/supply/purchase/${purchase.id}/status`, {
    method: 'PUT', token: supplierToken2, body: { status: 2 }
  }, 403)
  const accepted = await expectData('供应商 1 接单 1→2', `/api/supply/purchase/${purchase.id}/status`, {
    method: 'PUT', token: supplierToken1, body: { status: 2 }
  })
  check('采购单接单状态正确', accepted.status === 2 && accepted.acceptedBy)
  await expectHttp('供应商执行采购入库返回 403', `/api/supply/purchase/${purchase.id}/status`, {
    method: 'PUT', token: supplierToken1, body: { status: 3 }
  }, 403)
  const stocked = await expectData('商户 A 入库 2→3', `/api/supply/purchase/${purchase.id}/status`, {
    method: 'PUT', token: tokenA, body: { status: 3 }
  })
  check('采购入库完成且记录入库时间', stocked.status === 3 && Boolean(stocked.stockedAt))
  const inventoryAfterPage = await expectData('入库后读取库存', '/api/supply/inventory/page?size=100', { token: tokenA })
  const inventoryAfter = inventoryAfterPage.records.filter(item => item.spuId === purchaseProduct.id && item.merchantId === 2).reduce((sum, item) => sum + item.stock, 0)
  check('对应 SPU 库存只增加一次', inventoryAfter === inventoryBefore + quantity, `${inventoryBefore} → ${inventoryAfter}，预期 +${quantity}`)
  await expectBusinessError('重复入库返回 HTTP 200/code 400', `/api/supply/purchase/${purchase.id}/status`, {
    method: 'PUT', token: tokenA, body: { status: 3 }
  })
  const inventoryRepeatPage = await expectData('重复入库后读取库存', '/api/supply/inventory/page?size=100', { token: tokenA })
  const inventoryRepeat = inventoryRepeatPage.records.filter(item => item.spuId === purchaseProduct.id && item.merchantId === 2).reduce((sum, item) => sum + item.stock, 0)
  check('重复入库后库存保持不变', inventoryRepeat === inventoryAfter, `库存 ${inventoryRepeat}`)

  const settlements1 = await expectData('供应商 1 读取结算单', '/api/admin/settlement/page?size=100', { token: supplierToken1 })
  const settlements2 = await expectData('供应商 2 伪造归属读取结算单', '/api/admin/settlement/page?size=100&merchantId=2&supplierId=1', { token: supplierToken2 })
  check('供应商结算单只看自己且伪造参数不扩权',
    settlements1.records.length > 0 && settlements2.records.length > 0 &&
    settlements1.records.every(item => item.supplierId === 1 && item.merchantId === 2) &&
    settlements2.records.every(item => item.supplierId === 2 && item.merchantId === 3))
  await expectHttp('供应商确认结算返回 403', `/api/admin/settlement/${settlements1.records[0].id}/confirm`, {
    method: 'PUT', token: supplierToken1
  }, 403)

  /* ---------------- 分销规则、选品、分享与归因 ---------------- */
  const rulesA = await expectData('商户 A 伪造 merchantId 查规则', '/api/distribution/rules/page?size=100&merchantId=3', { token: tokenA })
  const rulesB = await expectData('商户 B 伪造 merchantId 查规则', '/api/distribution/rules/page?size=100&merchantId=2', { token: tokenB })
  check('分销规则按商户隔离且伪造参数不扩权',
    rulesA.records.length > 0 && rulesB.records.length > 0 &&
    rulesA.records.every(item => item.merchantId === 2) && rulesB.records.every(item => item.merchantId === 3))
  const originalRuleA = fixture('商户 A 原有分销规则夹具存在', rulesA.records.find(item => item.spuId === 1))
  await expectHttp('商户 B 停用商户 A 规则返回 403', `/api/distribution/rules/${originalRuleA.id}/status`, {
    method: 'PUT', token: tokenB, body: { status: 0 }
  }, 403)
  const rule = await expectData('商户 A 创建商品 1 的 10% 规则', '/api/distribution/rules', {
    method: 'POST', token: tokenA,
    body: {
      merchantId: 3,
      spuId: 1,
      commissionRate: 10,
      validStartTime: formatTime(new Date(Date.now() - 3600000)),
      validEndTime: formatTime(new Date(Date.now() + 86400000))
    }
  })
  check('新规则归属、比例与有效期正确', rule.merchantId === 2 && rule.spuId === 1 && rule.commissionRate === 10 && rule.effective === true)
  const selection = await expectData('分销商 1 选择商品 1', '/api/distribution/selections', {
    method: 'POST', token: distributorToken1, body: { spuId: 1, distributorId: 2 }
  })
  check('选品归属忽略伪造 distributorId', selection.distributorId === 1 && selection.spuId === 1 && selection.ruleId === rule.id)
  const share = await expectData('分销商 1 创建商品分享', '/api/distribution/shares', {
    method: 'POST', token: distributorToken1, body: { spuId: 1, distributorId: 2 }
  })
  check('分享使用本分销商与 10% 规则', share.distributorId === 1 && share.spuId === 1 && share.commissionRateBp === 1000)
  await expectHttp('分销商 2 撤销分销商 1 选品返回 403', `/api/distribution/selections/${selection.id}`, {
    method: 'DELETE', token: distributorToken2
  }, 403)

  const attribution = async (name, shareId, spuId, userId) => expectData(name,
    `/api/distribution/attribution?shareId=${encodeURIComponent(shareId)}&spuId=${spuId}&userId=${userId}`)
  const validAttribution = await attribution('普通用户 4 验证分享归因', share.shareId, 1, 4)
  check('普通用户归因有效', validAttribution.valid === true && validAttribution.distributorId === 1)
  const wrongSpuAttribution = await attribution('错误 SPU 验证分享归因', share.shareId, 2, 4)
  check('错误 SPU 归因无效', wrongSpuAttribution.valid === false)
  const selfAttribution = await attribution('分销商用户 13 验证自购归因', share.shareId, 1, 13)
  check('分销商自购归因无效', selfAttribution.valid === false)

  /* ---------------- 双订单项支付、回调与佣金分摊 ---------------- */
  const productDetail = await expectData('读取商品 1 的两个 SKU', '/api/h5/product/1')
  const productSkus = (productDetail.skus || []).filter(item => item.spuId === 1 && item.stock > 0)
  fixture('商品 1 至少有两个可售 SKU 夹具', productSkus.length >= 2, `实际 ${productSkus.length} 个`)
  const sku1 = productSkus[0]
  const sku2 = productSkus[1]

  const createOrder = (name, userId, items) => expectData(name, '/api/order/create', {
    method: 'POST',
    body: { userId, receiver: '供应链分销回归', mobile: '13800138007', address: '浙江省杭州市西湖区文三路 90 号', items }
  })
  const promotionsFor = async (name, token, orderNo, extra = '') => {
    const page = await expectData(name, `/api/distribution/orders/page?size=100&${orderQuery(orderNo)}${extra}`, { token })
    return page.records.filter(item => item.orderNo === orderNo)
  }

  const mainOrder = await createOrder('用户 4 创建双 SKU 分享订单', 4, [
    { skuId: sku1.id, quantity: 1, shareId: share.shareId },
    { skuId: sku2.id, quantity: 1, shareId: share.shareId }
  ])
  check('两个订单项均保存相同有效 shareId', mainOrder.items.length === 2 && mainOrder.items.every(item => item.shareId === share.shareId && item.distributorId === 1))
  const beforePayPromotions = await promotionsFor('支付前查询推广单', distributorToken1, mainOrder.orderNo)
  check('支付前没有推广单', beforePayPromotions.length === 0)
  const mainPay = await expectData('双 SKU 订单创建微信支付', '/api/pay/create', {
    method: 'POST', body: { orderNo: mainOrder.orderNo, payMethod: 1 }
  })
  const paidPromotions = await promotionsFor('支付后查询两条推广单', distributorToken1, mainOrder.orderNo)
  check('支付后生成两条 PENDING 推广单', paidPromotions.length === 2 && paidPromotions.every(item => item.status === 'PENDING'))
  check('commissionBase 均为整数分', paidPromotions.every(item => Number.isSafeInteger(item.commissionBase) && item.commissionBase >= 0))
  check('两项 commissionBase 之和等于订单实付分', paidPromotions.reduce((sum, item) => sum + item.commissionBase, 0) === Math.round(mainOrder.payAmount * 100))
  check('佣金按 base 与 RateBp 正确取整', paidPromotions.every(item => item.commissionAmount === Math.round(item.commissionBase * item.commissionRateBp / 10000)))

  await expectData('重复支付同一订单', '/api/pay/create', {
    method: 'POST', body: { orderNo: mainOrder.orderNo, payMethod: 1 }
  })
  const transactionId = `VERIFY-${runId}`
  const notifyOnce = () => request('/api/pay/wechat/notify', {
    method: 'POST', body: { payNo: mainPay.payNo, tradeState: 'SUCCESS', transactionId }
  })
  const firstNotify = await notifyOnce()
  const secondNotify = await notifyOnce()
  check('两次相同 transactionId 回调均返回 XML SUCCESS',
    [firstNotify, secondNotify].every(response => response.status === 200 && response.text.includes('<return_code><![CDATA[SUCCESS]]>')),
    `HTTP ${firstNotify.status}/${secondNotify.status}`)
  const idempotentPromotions = await promotionsFor('重复支付与回调后查询推广单', adminToken, mainOrder.orderNo)
  check('重复支付与重复回调仍只有两条 PENDING 推广单', idempotentPromotions.length === 2 && idempotentPromotions.every(item => item.status === 'PENDING'))

  const distributor2Promotions = await promotionsFor('分销商 2 伪造 distributorId 查订单', distributorToken2, mainOrder.orderNo, '&distributorId=1')
  const merchantBPromotions = await promotionsFor('商户 B 伪造 merchantId 查订单', tokenB, mainOrder.orderNo, '&merchantId=2')
  const distributor1Promotions = await promotionsFor('分销商 1 查询自己的推广单', distributorToken1, mainOrder.orderNo, '&distributorId=2')
  const merchantAPromotions = await promotionsFor('商户 A 查询本商户推广单', tokenA, mainOrder.orderNo, '&merchantId=3')
  const adminPromotions = await promotionsFor('管理员查询推广单', adminToken, mainOrder.orderNo)
  check('推广单按分销商与商户严格隔离',
    distributor2Promotions.length === 0 && merchantBPromotions.length === 0 &&
    distributor1Promotions.length === 2 && merchantAPromotions.length === 2 && adminPromotions.length === 2)

  await expectData('完成双 SKU 订单', `/api/order/${mainOrder.id}/complete`, { method: 'PUT' })
  const completePromotions = await promotionsFor('订单完成后查询推广单', adminToken, mainOrder.orderNo)
  check('订单完成后两项佣金均 SETTLEABLE', completePromotions.length === 2 && completePromotions.every(item => item.status === 'SETTLEABLE'))
  const settleTarget = completePromotions[0]
  const otherTarget = completePromotions[1]
  const settled = await expectData('管理员结算一项推广佣金', `/api/distribution/orders/${settleTarget.id}/settle`, {
    method: 'PUT', token: adminToken
  })
  check('结算后状态变为 SETTLED', settled.id === settleTarget.id && settled.status === 'SETTLED')
  await expectBusinessError('重复结算返回 HTTP 200/code 400', `/api/distribution/orders/${settleTarget.id}/settle`, {
    method: 'PUT', token: adminToken
  })
  await expectHttp('商户结算推广佣金返回 403', `/api/distribution/orders/${otherTarget.id}/settle`, {
    method: 'PUT', token: tokenA
  }, 403)
  await expectHttp('分销商结算推广佣金返回 403', `/api/distribution/orders/${otherTarget.id}/settle`, {
    method: 'PUT', token: distributorToken1
  }, 403)
  const afterSettlePromotions = await promotionsFor('越权与重复结算后复查推广单', adminToken, mainOrder.orderNo)
  check('仅管理员结算的一项改变状态', afterSettlePromotions.some(item => item.id === settleTarget.id && item.status === 'SETTLED') && afterSettlePromotions.some(item => item.id === otherTarget.id && item.status === 'SETTLEABLE'))

  /* ---------------- 退款失效与分销商自购 ---------------- */
  const refundOrder = await createOrder('创建待退款分享订单', 4, [{ skuId: sku1.id, quantity: 1, shareId: share.shareId }])
  const refundPay = await expectData('支付待退款分享订单', '/api/pay/create', {
    method: 'POST', body: { orderNo: refundOrder.orderNo, payMethod: 1 }
  })
  const refundPromotionsBefore = await promotionsFor('退款前查询推广单', adminToken, refundOrder.orderNo)
  check('退款订单支付后有一条 PENDING 推广单', refundPromotionsBefore.length === 1 && refundPromotionsBefore[0].status === 'PENDING')
  await expectData('退款使佣金失效', '/api/pay/refund', {
    method: 'POST', body: { payNo: refundPay.payNo, reason: '独立分销回归退款' }
  })
  const refundPromotionsAfter = await promotionsFor('退款后查询推广单', adminToken, refundOrder.orderNo)
  check('退款后佣金状态为 INVALID', refundPromotionsAfter.length === 1 && refundPromotionsAfter[0].status === 'INVALID')

  const selfOrder = await createOrder('分销商用户 13 创建自购订单', 13, [{ skuId: sku1.id, quantity: 1, shareId: share.shareId }])
  check('自购订单不保存归因快照', selfOrder.items.every(item => !item.shareId && !item.distributorId))
  await expectData('支付分销商自购订单', '/api/pay/create', {
    method: 'POST', body: { orderNo: selfOrder.orderNo, payMethod: 1 }
  })
  const selfPromotions = await promotionsFor('自购支付后查询推广单', adminToken, selfOrder.orderNo)
  check('分销商自购支付后无推广单', selfPromotions.length === 0)

  /* ---------------- 福卡充值与归因订单幂等支付 ---------------- */
  const rechargeRequestId = `VERIFY-RECHARGE:${runId}`
  const recharge = await expectData('用户 1 创建足额福卡充值', '/api/fuli-card/recharge', {
    method: 'POST', token: userToken, body: { amountCents: 10000000, requestId: rechargeRequestId }
  })
  const completedRecharge = await expectData('用户 1 完成福卡充值', '/api/fuli-card/recharge/complete', {
    method: 'POST', token: userToken, body: { rechargeNo: recharge.rechargeNo, requestId: rechargeRequestId }
  })
  check('福卡充值完成', completedRecharge.status === 'SUCCESS' && completedRecharge.rechargeNo === recharge.rechargeNo)
  const rechargeFlows = await expectData('读取充值福卡流水', '/api/fuli-card/flows?size=100', { token: userToken })
  check('充值只产生一条对应收入流水', rechargeFlows.records.filter(item => item.bizType === 'RECHARGE' && item.bizNo === recharge.rechargeNo && item.requestId === rechargeRequestId).length === 1)

  const fuliOrder = await createOrder('用户 1 创建福卡归因订单', 4, [{ skuId: sku1.id, quantity: 1, shareId: share.shareId }])
  const fuliPayRequestId = `ORDER_PAY:${fuliOrder.orderNo}`
  const firstFuliPay = await expectData('福卡支付归因订单', '/api/pay/create', {
    method: 'POST', token: userToken,
    body: { orderNo: fuliOrder.orderNo, payMethod: 'fuli_card', requestId: fuliPayRequestId }
  })
  const fuliPromotionsFirst = await promotionsFor('福卡支付后查询推广单', distributorToken1, fuliOrder.orderNo)
  const fuliFlowsFirst = await expectData('福卡支付后读取流水', '/api/fuli-card/flows?size=100', { token: userToken })
  const secondFuliPay = await expectData('相同 requestId 重复福卡支付', '/api/pay/create', {
    method: 'POST', token: userToken,
    body: { orderNo: fuliOrder.orderNo, payMethod: 'fuli_card', requestId: fuliPayRequestId }
  })
  const fuliPromotionsSecond = await promotionsFor('重复福卡支付后查询推广单', distributorToken1, fuliOrder.orderNo)
  const fuliFlowsSecond = await expectData('重复福卡支付后读取流水', '/api/fuli-card/flows?size=100', { token: userToken })
  const orderPayFlows = fuliFlowsSecond.records.filter(item => item.bizType === 'ORDER_PAY' && item.bizNo === fuliOrder.orderNo && item.requestId === fuliPayRequestId)
  check('重复福卡支付返回同一支付单', secondFuliPay.payNo === firstFuliPay.payNo && secondFuliPay.orderNo === fuliOrder.orderNo)
  check('重复福卡支付仍只有一条应得推广单', fuliPromotionsFirst.length === 1 && fuliPromotionsSecond.length === 1 && fuliPromotionsSecond[0].status === 'PENDING')
  check('重复福卡支付不增加流水且消费流水唯一', orderPayFlows.length === 1 && fuliFlowsSecond.total === fuliFlowsFirst.total)

  /* ---------------- 规则到期、撤品与账号禁用 ---------------- */
  const shortRule = await expectData('创建约两秒后过期的规则', '/api/distribution/rules', {
    method: 'POST', token: tokenA,
    body: {
      spuId: 1,
      commissionRate: 10,
      validStartTime: formatTime(new Date(Date.now() - 1000)),
      validEndTime: formatTime(new Date(Date.now() + 2000))
    }
  })
  const shortSelection = await expectData('按短期规则重新选品', '/api/distribution/selections', {
    method: 'POST', token: distributorToken1, body: { spuId: 1 }
  })
  const shortShare = await expectData('创建短期规则分享', '/api/distribution/shares', {
    method: 'POST', token: distributorToken1, body: { spuId: 1 }
  })
  check('短期分享关联新规则', shortSelection.ruleId === shortRule.id && shortShare.ruleId === shortRule.id)
  const shortValid = await attribution('短期分享到期前验证', shortShare.shareId, 1, 4)
  check('短期分享到期前有效', shortValid.valid === true)
  await sleep(2600)
  const expiredAttribution = await attribution('等待约 2.5 秒后验证短期分享', shortShare.shareId, 1, 4)
  check('规则到期后归因无效', expiredAttribution.valid === false)
  await expectData('分销商撤销原选品', `/api/distribution/selections/${shortSelection.id}`, {
    method: 'DELETE', token: distributorToken1
  })
  const removedAttribution = await attribution('撤品后验证原分享', share.shareId, 1, 4)
  check('撤品后原分享归因无效', removedAttribution.valid === false)

  await expectData('管理员禁用分销商用户 13', '/api/user/user', {
    method: 'PUT', token: adminToken, body: { id: 13, status: 0 }
  })
  try {
    await expectHttp('已签发分销商 Token 在禁用后返回 403', '/api/user/auth/info', { token: distributorToken1 }, 403)
    const disabledLogin = await request('/api/user/auth/login', {
      method: 'POST', body: { username: 'distributor_chen', password: '123456' }
    })
    check('禁用分销商重新登录返回 403', disabledLogin.status === 403 && disabledLogin.body && disabledLogin.body.code === 403, responseDetail(disabledLogin))
  } finally {
    await expectData('恢复分销商用户 13 状态', '/api/user/user', {
      method: 'PUT', token: adminToken, body: { id: 13, status: 1 }
    })
  }
  await expectData('恢复后分销商可重新登录', '/api/user/auth/login', {
    method: 'POST', body: { username: 'distributor_chen', password: '123456' }
  })
}

;(async () => {
  try {
    const port = await getFreePort()
    baseUrl = `http://127.0.0.1:${port}`
    const sharedNodeModules = path.resolve(__dirname, '../../../.pai/preview-dependencies/admin-deps/node_modules')
    const nodePath = [process.env.NODE_PATH, fs.existsSync(sharedNodeModules) ? sharedNodeModules : ''].filter(Boolean).join(path.delimiter)
    serverProcess = spawn(process.execPath, [path.join(__dirname, '..', 'mock-server.cjs')], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: String(port), MOCK_CACHE_TTL: '0', NODE_PATH: nodePath },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    serverProcess.stdout.on('data', chunk => { serverOutput += chunk.toString() })
    serverProcess.stderr.on('data', chunk => { serverOutput += chunk.toString() })
    console.log(`独立 Mock 进程 PID=${serverProcess.pid}，端口=${port}`)
    await waitUntilReady()
    await run()
  } catch (error) {
    check('供应链与分销回归完整执行', false, error.stack || error.message)
  } finally {
    await stopServer()
    console.log(`\n总计 ${totalCount} 项：通过 ${totalCount - failCount}，失败 ${failCount}`)
    console.log(failCount === 0 ? '供应链、分销与福卡回归全部通过' : '供应链、分销与福卡回归存在失败')
    process.exitCode = failCount === 0 ? 0 : 1
  }
})()

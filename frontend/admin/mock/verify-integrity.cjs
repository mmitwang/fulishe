/**
 * 回归：库存预占 / 退款资金流 / 多级分销合规
 * 运行：node mock/verify-integrity.cjs（需先启动 mock-server.cjs）
 */
const http = require('http')

const BASE = 'http://localhost:8080'
let passed = 0
let failed = 0

const request = (path, { method = 'GET', body, token } = {}) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : JSON.stringify(body)
  const headers = { 'Content-Type': 'application/json' }
  if (data) headers['Content-Length'] = Buffer.byteLength(data)
  if (token) headers.Authorization = `Bearer ${token}`
  const req = http.request(`${BASE}${path}`, { method, headers }, res => {
    let raw = ''
    res.on('data', chunk => { raw += chunk })
    res.on('end', () => {
      let json = null
      try { json = JSON.parse(raw) } catch { json = { raw } }
      resolve({ status: res.statusCode, body: json })
    })
  })
  req.on('error', reject)
  if (data) req.write(data)
  req.end()
})

const login = async username => {
  const res = await request('/api/user/auth/login', { method: 'POST', body: { username, password: '123456' } })
  if (res.body.code !== 200) throw new Error(`登录失败 ${username}: ${JSON.stringify(res.body)}`)
  return res.body.data.token
}

const check = (name, condition, detail) => {
  if (condition) { passed += 1; console.log(`  ✅ ${name}`) } else { failed += 1; console.log(`  ❌ ${name}${detail ? ` → ${JSON.stringify(detail)}` : ''}`) }
}

const main = async () => {
  console.log('\n=== 库存预占 / 退款资金流 / 多级分销合规 回归 ===\n')
  const adminToken = await login('admin')
  const merchantToken = await login('fulishe_admin')
  const linToken = await login('distributor_lin')

  // ---------- 1. 多级分销：二级分销商分享 ----------
  console.log('[1] 多级分销：二级分销商（林溪）创建分享')
  await request('/api/distribution/selections', { method: 'POST', token: linToken, body: { spuId: 1 } })
  const shareRes = await request('/api/distribution/shares', { method: 'POST', token: linToken, body: { spuId: 1 } })
  const shareId = shareRes.body?.data?.shareId
  check('分享创建成功', Boolean(shareId), shareRes.body)

  const sharePage = await request('/api/distribution/shares/page?pageNum=1&pageSize=10', { token: linToken })
  const shareRow = (sharePage.body?.data?.records || []).find(item => item.shareId === shareId)
  check('分享记录携带二级上级（陈悦）', Number(shareRow?.level2DistributorId) === 1, shareRow)

  // ---------- 2. 库存预占 ----------
  console.log('\n[2] 库存预占：下单锁定、支付扣减')
  const skuRes = await request('/api/product/sku/spu/1', { token: merchantToken })
  const sku = (skuRes.body?.data || []).find(item => Number(item.stock) > 5)
  check('读取到 SKU', Boolean(sku), skuRes.body)
  const stockBefore = Number(sku.stock)
  const lockedBefore = Number(sku.lockedStock || 0)

  const createRes = await request('/api/order/create', {
    method: 'POST',
    body: {
      userId: 2,
      receiver: '预占验证用户',
      mobile: '13800138000',
      address: '浙江省杭州市西湖区文三路 90 号',
      items: [{ skuId: sku.id, quantity: 2, shareId }]
    }
  })
  const order = createRes.body?.data
  check('下单成功', Boolean(order?.orderNo), createRes.body)

  const skuAfterCreate = (await request('/api/product/sku/spu/1', { token: merchantToken })).body.data.find(item => item.id === sku.id)
  check('下单只增加锁定库存', Number(skuAfterCreate.lockedStock) - lockedBefore === 2, { lockedBefore, lockedNow: skuAfterCreate.lockedStock })
  check('下单不扣减真实库存', Number(skuAfterCreate.stock) === stockBefore, { stockBefore, stockNow: skuAfterCreate.stock })

  const reservationPage = await request('/api/admin/stock/reservation/page?pageNum=1&pageSize=10', { token: merchantToken })
  const reservation = (reservationPage.body?.data?.records || []).find(item => item.orderNo === order.orderNo)
  check('生成预占记录（LOCKED）', reservation?.status === 'LOCKED', reservation)

  const payRes = await request('/api/pay/create', { method: 'POST', body: { orderNo: order.orderNo, payMethod: 1 } })
  check('支付成功', payRes.body?.code === 200, payRes.body)

  const skuAfterPay = (await request('/api/product/sku/spu/1', { token: merchantToken })).body.data.find(item => item.id === sku.id)
  check('支付后扣减真实库存', Number(skuAfterPay.stock) === stockBefore - 2, { stockBefore, stockAfter: skuAfterPay.stock })
  check('支付后释放锁定库存', Number(skuAfterPay.lockedStock) === lockedBefore, { lockedBefore, lockedAfter: skuAfterPay.lockedStock })

  // ---------- 3. 两级佣金 ----------
  console.log('\n[3] 多级佣金：一级直推 + 二级团队')
  const promotionPage = await request(`/api/distribution/orders/page?pageNum=1&pageSize=20&orderNo=${order.orderNo}`, { token: adminToken })
  const promotions = promotionPage.body?.data?.records || []
  const level1 = promotions.find(item => Number(item.level) === 1)
  const level2 = promotions.find(item => Number(item.level) === 2)
  check('生成一级佣金（林溪）', Number(level1?.distributorId) === 2, level1)
  check('生成二级佣金（陈悦）', Number(level2?.distributorId) === 1, level2)
  check('一级佣金 = 基数 × 10%', Number(level1?.commissionAmount) === Math.round(Number(order.payAmount) * 100 * 0.1), { payAmount: order.payAmount, amount: level1?.commissionAmount })
  check('二级佣金 = 基数 × 3%', Number(level2?.commissionAmount) === Math.round(Number(order.payAmount) * 100 * 0.03), { payAmount: order.payAmount, amount: level2?.commissionAmount })

  // ---------- 4. 退款资金流 ----------
  console.log('\n[4] 退款资金流：申请 → 审核 → 出账/冲正/回补')
  const applyRes = await request('/api/refund/apply', { method: 'POST', body: { orderNo: order.orderNo, reason: '回归测试退款' } })
  const refund = applyRes.body?.data
  check('退款申请进入待审核', Number(refund?.refundStatus) === 0, refund)
  const orderAfterApply = await request(`/api/order/detail/${order.orderNo}`)
  check('订单转为售后中（5）', Number(orderAfterApply.body?.data?.orderStatus) === 5, orderAfterApply.body?.data?.orderStatus)

  const stockAfterApply = (await request('/api/product/sku/spu/1', { token: merchantToken })).body.data.find(item => item.id === sku.id)
  check('待审核不产生资金/库存变动', Number(stockAfterApply.stock) === stockBefore - 2, stockAfterApply.stock)

  const auditRes = await request(`/api/admin/pay/refund/${refund.id}/audit`, {
    method: 'PUT', token: merchantToken, body: { auditResult: 1, auditOpinion: '回归审核通过' }
  })
  check('审核通过并执行退款', Number(auditRes.body?.data?.refundStatus) === 2, auditRes.body)

  const stockAfterRefund = (await request('/api/product/sku/spu/1', { token: merchantToken })).body.data.find(item => item.id === sku.id)
  check('退款回补库存', Number(stockAfterRefund.stock) === stockBefore, { stockBefore, stockAfter: stockAfterRefund.stock })

  const promotionAfterRefund = await request(`/api/distribution/orders/page?pageNum=1&pageSize=20&orderNo=${order.orderNo}`, { token: adminToken })
  const invalidAll = (promotionAfterRefund.body?.data?.records || []).every(item => item.status === 'INVALID')
  check('退款后佣金全部失效（含二级）', invalidAll, promotionAfterRefund.body?.data?.records)

  const fundSummary = await request('/api/admin/fund/flow/summary', { token: adminToken })
  const summary = fundSummary.body?.data || {}
  check('资金流水记录支付入账', summary.incomeCents >= Math.round(Number(order.payAmount) * 100), summary)
  check('资金流水记录退款出账', summary.refundCents >= Math.round(Number(order.payAmount) * 100), summary)
  check('资金流水记录佣金冲正', summary.commissionReverseCents >= Number(level1?.commissionAmount || 0) + Number(level2?.commissionAmount || 0), summary)

  const fundPage = await request('/api/admin/fund/flow/page?pageNum=1&pageSize=50', { token: adminToken })
  const types = new Set((fundPage.body?.data?.records || []).map(item => item.bizType))
  check('资金流水包含五种业务类型', ['PAY_IN', 'COMMISSION_ACCRUAL', 'REFUND_OUT', 'COMMISSION_REVERSE'].every(type => types.has(type)), [...types])

  // ---------- 5. 分销合规 ----------
  console.log('\n[5] 多级分销合规校验')
  const selfBind = await request('/api/distribution/distributors/2/parent', { method: 'PUT', token: adminToken, body: { parentDistributorId: 2 } })
  check('禁止绑定自身为上级', selfBind.body?.code !== 200, selfBind.body)

  const cycleBind = await request('/api/distribution/distributors/1/parent', { method: 'PUT', token: adminToken, body: { parentDistributorId: 2 } })
  check('禁止形成上下级循环', cycleBind.body?.code !== 200, cycleBind.body)

  const thirdLevel = await request('/api/distribution/distributors/1/parent', { method: 'PUT', token: adminToken, body: { parentDistributorId: 2 } })
  check('禁止三级分销', thirdLevel.body?.code !== 200, thirdLevel.body)

  const overRate = await request('/api/distribution/rules', {
    method: 'POST', token: merchantToken, body: { spuId: 1, commissionRate: 40, level2CommissionRate: 20, validStartTime: '2026-01-01 00:00:00', validEndTime: '2027-12-31 23:59:59' }
  })
  check('禁止一二级佣金合计超过 50%', overRate.body?.code !== 200, overRate.body)

  const distributors = await request('/api/distribution/distributors/page?pageNum=1&pageSize=10', { token: adminToken })
  const rows = distributors.body?.data?.records || []
  const lin = rows.find(item => item.id === 2)
  const chen = rows.find(item => item.id === 1)
  check('分销商列表返回层级与上级', Number(lin?.level) === 2 && Number(lin?.parentId) === 1, lin)
  check('一级分销商展示团队人数', Number(chen?.downlineCount) >= 1, chen)

  // ---------- 6. 满减促销配置 ----------
  console.log('\n[6] 满减促销配置：后台维护 → H5 复用 → 下单计价')
  const promoPage = await request('/api/admin/promotion/full-reduction/page?pageNum=1&pageSize=50', { token: adminToken })
  check('满减规则分页可读取', (promoPage.body?.data?.records || []).length >= 3, promoPage.body)

  const promoCreate = await request('/api/admin/promotion/full-reduction', {
    method: 'POST', token: adminToken,
    body: { name: '回归满减 1000-100', thresholdAmount: 1000, discountAmount: 100, validStartTime: '2026-01-01 00:00:00', validEndTime: '2027-12-31 23:59:59', status: 1 }
  })
  const promoRule = promoCreate.body?.data
  check('新增满减规则成功', Boolean(promoRule?.id), promoCreate.body)

  const publicPromo = await request('/api/h5/promotions/full-reduction')
  check('H5 满减档位实时复用后台配置',
    (publicPromo.body?.data?.rules || []).some(item => Number(item.id) === Number(promoRule?.id)), publicPromo.body)

  const promoSkus = (await request('/api/product/sku/spu/1', { token: merchantToken })).body?.data || []
  const pricedSku = [...promoSkus].sort((a, b) => Number(b.stock) - Number(a.stock))[0]
  const promoQty = Math.max(1, Math.ceil(1000 / Number(pricedSku?.price || 1)))
  const promoOrderRes = await request('/api/order/create', {
    method: 'POST',
    body: {
      userId: 2,
      receiver: '满减验证',
      mobile: '13800138000',
      address: '浙江省杭州市西湖区文三路 90 号',
      items: [{ skuId: pricedSku.id, quantity: promoQty }]
    }
  })
  const promoOrder = promoOrderRes.body?.data
  check('满减订单创建成功', Boolean(promoOrder?.orderNo), promoOrderRes.body)
  check('下单命中最高档位满减',
    Number(promoOrder?.promotion?.ruleId) === Number(promoRule?.id) && Number(promoOrder?.discountAmount) === 100, promoOrder)

  await request(`/api/admin/promotion/full-reduction/${promoRule?.id}/status`, {
    method: 'PUT', token: adminToken, body: { status: 0 }
  })
  const promoOrder2Res = await request('/api/order/create', {
    method: 'POST',
    body: {
      userId: 2,
      receiver: '满减验证二',
      mobile: '13800138000',
      address: '浙江省杭州市西湖区文三路 90 号',
      items: [{ skuId: pricedSku.id, quantity: promoQty }]
    }
  })
  const promoOrder2 = promoOrder2Res.body?.data
  check('停用后不再命中该档位', Number(promoOrder2?.promotion?.ruleId) !== Number(promoRule?.id) && Number(promoOrder2?.discountAmount) < 100, promoOrder2)

  // ---------- 7. 佣金 T+N 结算 ----------
  console.log('\n[7] 佣金 T+N 结算周期')
  const tnRuleRes = await request('/api/distribution/rules', {
    method: 'POST', token: merchantToken,
    body: { spuId: 1, commissionRate: 10, level2CommissionRate: 3, settleDays: 2, validStartTime: '2026-01-01 00:00:00', validEndTime: '2027-12-31 23:59:59' }
  })
  const tnRule = tnRuleRes.body?.data
  check('佣金规则支持 T+N 配置', Number(tnRule?.settleDays) === 2, tnRule)

  await request('/api/distribution/selections', { method: 'POST', token: linToken, body: { spuId: 1 } })
  const tnShareRes = await request('/api/distribution/shares', { method: 'POST', token: linToken, body: { spuId: 1 } })
  const tnShareId = tnShareRes.body?.data?.shareId
  const tnOrderRes = await request('/api/order/create', {
    method: 'POST',
    body: {
      userId: 2,
      receiver: 'T+N验证',
      mobile: '13800138000',
      address: '浙江省杭州市西湖区文三路 90 号',
      items: [{ skuId: sku.id, quantity: 1, shareId: tnShareId }]
    }
  })
  const tnOrder = tnOrderRes.body?.data
  await request('/api/pay/create', { method: 'POST', body: { orderNo: tnOrder?.orderNo, payMethod: 1 } })
  await request(`/api/order/${tnOrder?.id}/complete`, { method: 'PUT' })
  const tnPromos = (await request(`/api/distribution/orders/page?pageNum=1&pageSize=20&orderNo=${tnOrder?.orderNo}`, { token: adminToken })).body?.data?.records || []
  const tnRecord = tnPromos.find(item => Number(item.level) === 1)
  check('完成后佣金进入 T+N 待结算', tnRecord?.status === 'PENDING' && Number(tnRecord?.settleDays) === 2, tnRecord)
  check('返回可结算时间', Boolean(tnRecord?.settleableTime), tnRecord)
  const tnSettle = await request(`/api/distribution/orders/${tnRecord?.id}/settle`, { method: 'PUT', token: adminToken })
  check('T+N 未到期禁止结算', tnSettle.body?.code !== 200 && /T\+2/.test(tnSettle.body?.message || ''), tnSettle.body)

  // ---------- 8. H5 首页新品曝光 ----------
  console.log('\n[8] H5 首页：新上架商品进入新品与推荐')
  const newProductRes = await request('/api/admin/product/spu', {
    method: 'POST', token: merchantToken,
    body: { spuName: `回归新品${Date.now()}`, categoryId: 1, sellPrice: 88, originalPrice: 108, costPrice: 40, stock: 20, status: 1 }
  })
  const newProduct = newProductRes.body?.data
  check('商户新建并上架商品', Boolean(newProduct?.id), newProductRes.body)
  const homeRes = await request('/api/h5/home')
  const home = homeRes.body?.data || {}
  check('首页新品列表包含新上架商品', (home.newProducts || []).some(item => Number(item.id) === Number(newProduct?.id)), (home.newProducts || []).map(item => item.id))
  check('首页推荐位包含新上架商品', (home.recommend || []).some(item => Number(item.id) === Number(newProduct?.id)), (home.recommend || []).map(item => item.id))

  // ---------- 9. 发票申请 / 开具 / 红冲 ----------
  console.log('\n[9] 发票：申请 → 开具 → 红冲，与订单金额勾稽')
  const invoiceApply = await request('/api/invoice/apply', {
    method: 'POST',
    body: { userId: 2, orderNo: tnOrder.orderNo, titleType: 2, invoiceType: 1, buyerName: '福礼社回归测试企业', email: 'test@fulishe.cn' }
  })
  const invoice = invoiceApply.body?.data
  check('发票申请进入待开票', Number(invoice?.status) === 0 && Number(invoice?.amount) === Number(tnOrder.payAmount), invoice)
  const invoiceDuplicate = await request('/api/invoice/apply', {
    method: 'POST',
    body: { userId: 2, orderNo: tnOrder.orderNo, titleType: 1, invoiceType: 1, buyerName: '重复申请' }
  })
  check('同一订单重复有效申请被拒绝', invoiceDuplicate.body?.code !== 200, invoiceDuplicate.body)
  const invoiceIssue = await request(`/api/admin/invoice/${invoice?.id}/issue`, { method: 'PUT', token: adminToken })
  check('管理端开具发票并生成发票号', Number(invoiceIssue.body?.data?.status) === 1 && Boolean(invoiceIssue.body?.data?.invoiceNo), invoiceIssue.body)
  const invoiceRed = await request(`/api/admin/invoice/${invoice?.id}/red-flush`, {
    method: 'PUT', token: adminToken, body: { reason: '回归红冲' }
  })
  check('管理端红冲发票并生成红冲单号', Number(invoiceRed.body?.data?.status) === 2 && Boolean(invoiceRed.body?.data?.redFlushNo), invoiceRed.body)
  const invoiceSummary = await request('/api/admin/invoice/summary', { token: adminToken })
  check('发票汇总可读取', Number(invoiceSummary.body?.data?.totalCount) >= 1, invoiceSummary.body)

  // ---------- 10. 平台抽佣与分账 ----------
  console.log('\n[10] 平台抽佣：支付成功生成分账与两类资金流水')
  const financeConfig = await request('/api/admin/finance/config', { token: adminToken })
  check('平台技术服务费率默认 5%', Number(financeConfig.body?.data?.ratePercent) === 5, financeConfig.body)
  const splitPage = await request(`/api/admin/finance/split/page?pageNum=1&pageSize=50&orderNo=${tnOrder.orderNo}`, { token: adminToken })
  const split = (splitPage.body?.data?.records || [])[0]
  check('生成订单分账记录', Boolean(split), splitPage.body)
  check('平台服务费 + 商户应结 = 实付金额',
    Math.abs(Number(split?.platformFee) + Number(split?.merchantNet) - Number(split?.payAmount)) < 0.01, split)
  check('平台服务费按费率计提',
    Math.abs(Number(split?.platformFee) - Number(split?.payAmount) * 5 / 100) < 0.01, split)
  const splitSummary = await request('/api/admin/finance/split/summary', { token: adminToken })
  check('分账汇总平台服务费大于 0', Number(splitSummary.body?.data?.platformFee) > 0, splitSummary.body)
  const fundTypes = new Set(((await request('/api/admin/fund/flow/page?pageNum=1&pageSize=100', { token: adminToken })).body?.data?.records || []).map(item => item.bizType))
  check('资金流水包含平台服务费与商户分账', fundTypes.has('PLATFORM_FEE') && fundTypes.has('MERCHANT_SPLIT'), [...fundTypes])

  // ---------- 11. 采购发货 / 签收 ----------
  console.log('\n[11] 采购单：接单 → 发货 → 签收 → 入库')
  const supplierToken = await login('supplier_fuli')
  const purchaseRes = await request('/api/supply/purchase', {
    method: 'POST', token: merchantToken,
    body: { supplierId: 1, warehouse: '杭州中心仓', items: [{ spuId: 1, quantity: 3, price: 40 }] }
  })
  const purchase = purchaseRes.body?.data
  check('创建采购单', Boolean(purchase?.id), purchaseRes.body)
  await request(`/api/supply/purchase/${purchase.id}/status`, { method: 'PUT', token: merchantToken, body: { status: 1 } })
  await request(`/api/supply/purchase/${purchase.id}/status`, { method: 'PUT', token: supplierToken, body: { status: 2 } })
  const shipRes = await request(`/api/supply/purchase/${purchase.id}/ship`, {
    method: 'POST', token: supplierToken, body: { carrier: '顺丰速运', trackingNo: `SFREG${Date.now()}` }
  })
  check('供应商回传物流单号', Boolean(shipRes.body?.data?.trackingNo), shipRes.body)
  const receiveRes = await request(`/api/supply/purchase/${purchase.id}/receive`, {
    method: 'POST', token: merchantToken, body: { receiver: '回归仓管' }
  })
  check('商户签收且状态仍为待入库', Boolean(receiveRes.body?.data?.receivedTime) && Number(receiveRes.body?.data?.status) === 2, receiveRes.body)
  const stockRes = await request(`/api/supply/purchase/${purchase.id}/status`, { method: 'PUT', token: merchantToken, body: { status: 3 } })
  check('签收后正常入库（状态 3）', Number(stockRes.body?.data?.status) === 3, stockRes.body)

  console.log(`\n结果：${passed} 通过 / ${failed} 失败\n`)
  if (failed > 0) process.exit(1)
}

main().catch(error => { console.error(error); process.exit(1) })

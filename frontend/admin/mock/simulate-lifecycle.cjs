/**
 * 「新系统初始化 → 各角色协作 → 全链路运行」模拟脚本
 *
 * 独立启动一个 Mock 服务（不影响演示环境 8080），按真实角色权限依次驱动：
 * 平台初始化 → 商户建档与商品图文 → 运营配置营销/分销 → 采购协同入库
 * → 分销选品分享 → 用户下单支付 → 商户发货/用户收货 → 开票 → 分账/佣金/结算
 * → 售后退款 → 备份与恢复校验。
 *
 * 运行：node mock/simulate-lifecycle.cjs
 */
const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const os = require('os')
const path = require('path')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const stamp = new Date().toISOString().replace(/[:.]/g, '-')

let baseUrl = ''
let child = null
let passCount = 0
let failCount = 0

const check = (name, ok, detail = '') => {
  if (ok) passCount += 1
  else failCount += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  —  ' + detail : ''}`)
}

const section = title => console.log(`\n===== ${title} =====`)

const request = async (url, { method = 'GET', token, body } = {}) => {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  let payload = null
  try {
    payload = await response.json()
  } catch (error) {
    payload = { code: response.status, message: '响应不是 JSON' }
  }
  return { status: response.status, body: payload }
}

const api = async (name, url, options = {}) => {
  const result = await request(url, options)
  const ok = result.status === 200 && result.body && result.body.code === 200
  check(name, ok, ok ? (result.body.message || 'success') : `${result.status} / ${result.body && result.body.message}`)
  return ok ? result.body.data : null
}

const login = async username => {
  const result = await request('/api/user/auth/login', {
    method: 'POST', body: { username, password: '123456' }
  })
  check(
    `登录 ${username}`,
    result.status === 200 && result.body.code === 200 && Boolean(result.body.data && result.body.data.token)
  )
  return result.body && result.body.data ? result.body.data.token : ''
}

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.unref()
  server.on('error', reject)
  server.listen(0, () => {
    const { port } = server.address()
    server.close(() => resolve(port))
  })
})

const startServer = async () => {
  const port = await getFreePort()
  baseUrl = `http://127.0.0.1:${port}`
  const backupDir = path.join(os.tmpdir(), `fulishe-lifecycle-backups-${stamp}`)
  child = spawn(process.execPath, ['mock-server.cjs'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), FULISHE_BACKUP_DIR: backupDir },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let stderr = ''
  child.stderr.on('data', chunk => { stderr += String(chunk) })
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) return
    } catch (error) {
      // 等待端口就绪
    }
    await sleep(200)
  }
  throw new Error(`Mock 服务启动失败\n${stderr}`)
}

const stopServer = () => {
  if (child && !child.killed) child.kill()
}

const main = async () => {
  await startServer()
  const tokens = {}

  /* ---------- 0. 平台初始化 ---------- */
  section('0. 平台初始化（超级管理员 admin）')
  tokens.admin = await login('admin')
  const initStatus = await api('读取备份状态', '/api/admin/backup/status', { token: tokens.admin })
  check('启动时已生成基线快照', Boolean(initStatus && initStatus.autoCount >= 1), initStatus && `auto=${initStatus.autoCount}`)
  const initConfig = await api('启用实时备份策略', '/api/admin/backup/config', {
    method: 'PUT', token: tokens.admin, body: { enabled: true, intervalMinutes: 5, maxAuto: 40, maxManual: 100 }
  })
  check('备份策略已生效', Boolean(initConfig && initConfig.enabled === true))
  const baseline = await api('创建初始化基线备份', '/api/admin/backup/create', {
    method: 'POST', token: tokens.admin, body: { label: '系统初始化基线' }
  })
  check('基线备份文件已落盘', Boolean(baseline && baseline.file), baseline && baseline.file)

  const demoTenant = await api('校验租户初始化数据', '/api/user/tenant/page?current=1&size=5', { token: tokens.admin })
  check('租户数据可读', Boolean(demoTenant && demoTenant.total >= 5), demoTenant && `total=${demoTenant.total}`)
  const demoMenu = await api('校验菜单初始化数据', '/api/user/menu/list', { token: tokens.admin })
  check('菜单含数据备份入口', Array.isArray(demoMenu) && demoMenu.some(item => item.path === '/system/backup'))

  /* ---------- 1. 商户管理员：商品图文建档 ---------- */
  section('1. 商户管理员（fulishe_admin）：商品图文建档与上架')
  tokens.merchant = await login('fulishe_admin')
  const profile = await api('查看商户资料', '/api/admin/merchant/profile', { token: tokens.merchant })
  check('商户资料可读', Boolean(profile && profile.tenantName), profile && profile.tenantName)

  const imagePrompt = 'premium Chinese new year nut gift box, red and gold, studio product photo'
  const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(imagePrompt)}&image_size=square`
  const product = await api('新增商品（含主图/图集/详情图文）', '/api/admin/product/spu', {
    method: 'POST',
    token: tokens.merchant,
    body: {
      spuName: '福礼社·新春坚果礼盒（模拟新品）',
      categoryId: 3,
      brandId: 2,
      unit: '盒',
      sellPrice: 299,
      originalPrice: 399,
      costPrice: 150,
      stock: 120,
      status: 1,
      description: '精选六种坚果与果干，红金礼盒包装，适合企业年节福利。',
      image: imageUrl,
      images: [imageUrl, imageUrl.replace('studio product photo', 'gift box detail close-up'), imageUrl.replace('studio product photo', 'gift box lifestyle scene')],
      tags: ['企业福利', '年货礼盒', '坚果'],
      serviceTags: ['包邮', '7 天无理由', '可开票'],
      specs: ['标准装'],
      detailSections: [
        { title: '礼盒内容', content: '夏威夷果、巴旦木、腰果、核桃、蔓越莓干、蓝莓干' },
        { title: '交付说明', content: '下单后 48 小时内发货，企业批量可联系客户经理' }
      ]
    }
  })
  const spuId = product && product.id
  check('商品建档成功', Boolean(spuId), spuId && `spuId=${spuId}`)
  check('商品图文完整', Boolean(product && product.image && Array.isArray(product.images) && product.images.length >= 3))

  const skuPage = await api('读取新商品 SKU', `/api/product/sku?spuId=${spuId}&current=1&size=10`)
  const sku = skuPage && skuPage.records && skuPage.records[0]
  check('SKU 已同步生成', Boolean(sku && sku.id), sku && `skuId=${sku.id} price=${sku.price}`)

  /* ---------- 2. 运营专员：营销与分销规则 ---------- */
  section('2. 运营专员（fulishe_operator）与平台管理员：营销/分销规则')
  tokens.operator = await login('fulishe_operator')
  const operatorProducts = await api('运营查看商品列表', '/api/admin/product/spu/page?current=1&size=5', { token: tokens.operator })
  check('运营可查看在售商品', Boolean(operatorProducts && operatorProducts.total > 0), operatorProducts && `total=${operatorProducts.total}`)
  const operatorOrders = await api('运营查看订单列表', '/api/admin/order/info/page?current=1&size=5', { token: tokens.operator })
  check('运营可查看订单列表', Boolean(operatorOrders && operatorOrders.total > 0), operatorOrders && `total=${operatorOrders.total}`)
  // 当前权限模型下满减规则由平台超管发布，运营负责商品与推广运营
  const promo = await api('平台发布满减促销', '/api/admin/promotion/full-reduction', {
    method: 'POST',
    token: tokens.admin,
    body: {
      name: '新品满 259 减 20', thresholdAmount: 259, discountAmount: 20, status: 1,
      validStartTime: '2026-01-01 00:00:00', validEndTime: '2027-12-31 23:59:59'
    }
  })
  check('满减规则已创建', Boolean(promo && promo.id), promo && `ruleId=${promo.id}`)

  const distRule = await api('配置分销佣金规则（T+0）', '/api/distribution/rules', {
    method: 'POST',
    token: tokens.operator,
    body: {
      spuId, commissionRate: 10, level2CommissionRate: 3, settleDays: 0,
      validStartTime: '2026-01-01 00:00:00', validEndTime: '2027-12-31 23:59:59'
    }
  })
  check('分销规则已创建', Boolean(distRule && distRule.id), distRule && `ruleId=${distRule.id}`)

  /* ---------- 3. 采购协同：供应商 → 采购单 → 发货 → 签收 → 入库 ---------- */
  section('3. 采购专员 / 供应商 / 商户：采购协同入库')
  tokens.purchase = await login('zhangsan')
  const supplier = await api('采购专员新增供应商', '/api/supply/supplier', {
    method: 'POST',
    token: tokens.purchase,
    body: {
      supplierName: '福礼社坚果加工厂（模拟）', contactPerson: '林海', contactPhone: '13900010001',
      category: '食品礼盒', level: 'A', address: '浙江省杭州市余杭区食品产业园 8 号', creditScore: 96
    }
  })
  const supplierId = supplier && supplier.id
  check('供应商建档成功', Boolean(supplierId), supplierId && `supplierId=${supplierId}`)

  // 采购单选择已绑定供应商账号（supplier_fuli → supplierId=1）的供应商，保证接单权限可闭环
  const purchase = await api('创建采购单', '/api/supply/purchase', {
    method: 'POST',
    token: tokens.purchase,
    body: {
      supplierId: 1, warehouse: '杭州中心仓', expectedDate: '2026-12-05',
      items: [{ spuId, quantity: 50, price: 150 }], remark: '新品首批备货'
    }
  })
  const purchaseId = purchase && purchase.id
  check('采购单已创建（待审核）', Boolean(purchaseId && purchase.status === 0), purchaseId && `purchaseId=${purchaseId}`)

  const approved = await api('商户管理员审核采购单 0→1', `/api/supply/purchase/${purchaseId}/status`, {
    method: 'PUT', token: tokens.merchant, body: { status: 1 }
  })
  check('采购单进入待接单', Boolean(approved && approved.status === 1))

  tokens.supplier = await login('supplier_fuli')
  const accepted = await api('供应商接单 1→2', `/api/supply/purchase/${purchaseId}/status`, {
    method: 'PUT', token: tokens.supplier, body: { status: 2 }
  })
  check('供应商已接单', Boolean(accepted && accepted.status === 2 && accepted.acceptedBy))

  const shippedPurchase = await api('供应商回传物流', `/api/supply/purchase/${purchaseId}/ship`, {
    method: 'POST', token: tokens.supplier, body: { carrier: '顺丰速运', trackingNo: `SF${Date.now()}` }
  })
  check('采购物流已回传', Boolean(shippedPurchase && shippedPurchase.trackingNo))

  const received = await api('商户签收采购单', `/api/supply/purchase/${purchaseId}/receive`, {
    method: 'POST', token: tokens.purchase, body: { receiver: '张三' }
  })
  check('采购单已签收', Boolean(received && received.receivedTime))

  const stockIn = await api('商户入库 2→3（库存增加）', `/api/supply/purchase/${purchaseId}/status`, {
    method: 'PUT', token: tokens.purchase, body: { status: 3 }
  })
  check('采购单完成入库', Boolean(stockIn && stockIn.status === 3 && stockIn.stockedAt))

  const inventory = await api('校验库存台账', `/api/supply/inventory/page?keyword=${encodeURIComponent('新春坚果')}&current=1&size=10`, { token: tokens.purchase })
  const stockRow = inventory && inventory.records && inventory.records.find(item => Number(item.spuId) === Number(spuId))
  check('新品库存已入账', Boolean(stockRow && stockRow.stock >= 50), stockRow && `stock=${stockRow.stock}`)

  /* ---------- 4. 分销商：选品与分享 ---------- */
  section('4. 分销商（distributor_chen）：选品与生成分享链接')
  tokens.distributor = await login('distributor_chen')
  const selection = await api('加入选品中心', '/api/distribution/selections', {
    method: 'POST', token: tokens.distributor, body: { spuId }
  })
  check('选品成功', Boolean(selection), selection && `selectionId=${selection.id}`)
  const share = await api('生成分享链接', '/api/distribution/shares', {
    method: 'POST', token: tokens.distributor, body: { spuId }
  })
  const shareId = share && share.shareId
  check('分享链接已生成', Boolean(shareId), shareId ? `shareId=${shareId.slice(0, 12)}…` : '')

  /* ---------- 5. 普通用户：下单 → 支付 ---------- */
  section('5. 普通用户（user1）：浏览下单与支付')
  tokens.user = await login('user1')
  await api('加入购物车', '/api/cart/add', {
    method: 'POST', token: tokens.user, body: { userId: 4, skuId: sku && sku.id, quantity: 2 }
  })
  const cart = await api('读取购物车', '/api/cart?userId=4', { token: tokens.user })
  check('购物车已同步', Array.isArray(cart) && cart.some(item => Number(item.skuId) === Number(sku.id)))

  const order = await api('创建订单（带分销归因）', '/api/order/create', {
    method: 'POST',
    token: tokens.user,
    body: {
      userId: 4,
      items: [{ skuId: sku && sku.id, quantity: 2, shareId }],
      receiver: '李静', mobile: '13800138007',
      address: '浙江省杭州市西湖区文三路 90 号东部软件园 3 号楼'
    }
  })
  const orderId = order && order.id
  const orderNo = order && order.orderNo
  check('订单创建成功', Boolean(orderId), orderNo && `orderNo=${orderNo}`)
  check('订单适用满减', Boolean(order && Number(order.discountAmount) >= 20), order && `discount=${order.discountAmount}`)

  const pay = await api('发起支付并扣减库存', '/api/pay/create', {
    method: 'POST', token: tokens.user, body: { orderNo, payMethod: 'wechat' }
  })
  check('支付成功', Boolean(pay && pay.payStatus === 2), pay && `payNo=${pay.payNo}`)

  /* ---------- 6. 商户发货 → 用户收货 ---------- */
  section('6. 商户发货与用户确认收货')
  const shipped = await api('商户发货', '/api/admin/order/info', {
    method: 'PUT', token: tokens.merchant,
    body: { id: orderId, orderStatus: 2, carrier: '顺丰速运', trackingNo: `SF${Date.now()}` }
  })
  check('订单进入已发货', Boolean(shipped && shipped.orderStatus === 2))

  const completed = await api('用户确认收货', `/api/order/${orderId}/complete`, {
    method: 'PUT', token: tokens.user
  })
  const orderDetail = await api('校验订单状态', `/api/admin/order/info/${orderId}`, { token: tokens.merchant })
  check('订单状态=已完成', Boolean(orderDetail && orderDetail.orderStatus === 3))

  /* ---------- 7. 开票 ---------- */
  section('7. 用户申请发票 → 商户开票')
  const invoice = await api('用户申请开票', '/api/invoice/apply', {
    method: 'POST',
    token: tokens.user,
    body: {
      userId: 4, orderNo, titleType: 1, invoiceType: 1,
      buyerName: '李静', email: 'lijing@fulishe.cn', remark: '电子发票'
    }
  })
  const invoiceId = invoice && invoice.id
  check('发票申请已受理', Boolean(invoiceId), invoiceId && `invoiceId=${invoiceId}`)
  const issued = await api('商户开具发票', `/api/admin/invoice/${invoiceId}/issue`, {
    method: 'PUT', token: tokens.merchant
  })
  check('发票已开具', Boolean(issued && issued.status === 1), issued && issued.invoiceNo)

  /* ---------- 8. 分账 / 佣金 / 结算 ---------- */
  section('8. 平台：资金分账、佣金结算与供应商结算')
  const splitPage = await api('查看商户分账', `/api/admin/finance/split/page?orderNo=${orderNo}&current=1&size=10`, { token: tokens.admin })
  const split = splitPage && splitPage.records && splitPage.records[0]
  check('分账记录已生成', Boolean(split), split && `平台服务费=${split.platformFee} 商户应结=${split.merchantNet}`)
  check('分账勾稽：服务费+应结=实付', Boolean(split && Math.abs(Number(split.platformFee) + Number(split.merchantNet) - Number(split.payAmount)) < 0.01))

  const fundPage = await api('查看资金流水', `/api/admin/fund/flow/page?orderNo=${orderNo}&current=1&size=20`, { token: tokens.merchant })
  check('支付入账流水已记录', Boolean(fundPage && fundPage.records.some(item => item.bizType === 'PAY_IN')))

  const promotionPage = await api('平台查看推广订单', `/api/distribution/orders/page?current=1&size=20`, { token: tokens.admin })
  const promotion = promotionPage && promotionPage.records && promotionPage.records.find(item => item.orderNo === orderNo)
  check('分销佣金已计提', Boolean(promotion && Number(promotion.commissionAmount) > 0), promotion && `状态=${promotion.status}`)
  if (promotion) {
    const settled = await api('平台确认佣金结算', `/api/distribution/orders/${promotion.id}/settle`, {
      method: 'PUT', token: tokens.admin
    })
    check('佣金已结算', Boolean(settled && settled.status === 'SETTLED'))
  }

  const settlementPage = await api('查询供应商结算单', '/api/supply/settlement/page?current=1&size=20', { token: tokens.admin })
  const settlement = settlementPage && settlementPage.records && settlementPage.records.find(item => Number(item.status) !== 2)
  if (settlement) {
    const settledSupply = await api('平台完成供应商结算', `/api/supply/settlement/${settlement.id}/settle`, {
      method: 'PUT', token: tokens.admin
    })
    check('供应商结算完成', Boolean(settledSupply && settledSupply.status === 2))
  } else {
    check('存在待结算单', false, '未找到待结算记录')
  }

  /* ---------- 9. 售后退款 ---------- */
  section('9. 普通用户申请退款 → 商户审核')
  const order2 = await api('创建售后退款订单', '/api/order/create', {
    method: 'POST', token: tokens.user,
    body: {
      userId: 4, items: [{ skuId: sku && sku.id, quantity: 1 }],
      receiver: '李静', mobile: '13800138007', address: '浙江省杭州市西湖区文三路 90 号'
    }
  })
  const order2Id = order2 && order2.id
  const order2No = order2 && order2.orderNo
  await api('支付退款订单', '/api/pay/create', { method: 'POST', token: tokens.user, body: { orderNo: order2No, payMethod: 'alipay' } })
  const refundApply = await api('提交退款申请', '/api/refund/apply', {
    method: 'POST', token: tokens.user, body: { orderNo: order2No, reason: '活动取消，申请退款' }
  })
  check('退款申请待审核', Boolean(refundApply && refundApply.refundStatus === 0))
  const refundAudit = await api('商户审核通过退款', `/api/admin/pay/refund/${refundApply && refundApply.id}/audit`, {
    method: 'PUT', token: tokens.merchant, body: { auditResult: 1, auditOpinion: '同意退款' }
  })
  check('退款已原路退回', Boolean(refundAudit && refundAudit.refundStatus === 2))
  const refundedOrder = await api('校验退款订单状态', `/api/admin/order/info/${order2Id}`, { token: tokens.merchant })
  check('订单状态=已退款', Boolean(refundedOrder && refundedOrder.orderStatus === 6 && refundedOrder.payStatus === 4))

  /* ---------- 10. 备份与恢复校验 ---------- */
  section('10. 实时备份与灾难恢复校验')
  const beforeBackup = await api('读取商品总数', '/api/admin/product/spu/page?current=1&size=1', { token: tokens.admin })
  const totalBefore = beforeBackup && beforeBackup.total
  const lifecycleBackup = await api('创建全链路完成备份', '/api/admin/backup/create', {
    method: 'POST', token: tokens.admin, body: { label: '全链路运行完成' }
  })
  check('全链路备份已创建', Boolean(lifecycleBackup && lifecycleBackup.file), lifecycleBackup && lifecycleBackup.file)

  await api('模拟误操作新增商品', '/api/admin/product/spu', {
    method: 'POST', token: tokens.merchant,
    body: { spuName: '误操作测试商品', categoryId: 3, brandId: 2, sellPrice: 1, stock: 1, status: 1 }
  })
  const afterAdd = await api('误操作后商品总数', '/api/admin/product/spu/page?current=1&size=1', { token: tokens.admin })
  check('误操作已生效', Boolean(afterAdd && afterAdd.total === totalBefore + 1), afterAdd && `${totalBefore} → ${afterAdd.total}`)

  const restored = await api('从备份恢复数据', '/api/admin/backup/restore', {
    method: 'POST', token: tokens.admin, body: { file: lifecycleBackup.file }
  })
  const afterRestore = await api('恢复后商品总数', '/api/admin/product/spu/page?current=1&size=1', { token: tokens.admin })
  check('恢复后数据回滚', Boolean(afterRestore && afterRestore.total === totalBefore), afterRestore && `${afterAdd && afterAdd.total} → ${afterRestore.total}`)
  check('恢复覆盖全部集合', Boolean(restored && restored.collections >= 40), restored && `collections=${restored.collections}`)

  const backupList = await api('读取备份列表', '/api/admin/backup/list', { token: tokens.admin })
  check('自动+手动备份均可追溯', Array.isArray(backupList) && backupList.some(item => item.kind === 'manual') && backupList.some(item => item.kind === 'auto'))

  section('模拟结果')
  console.log(`通过 ${passCount} 项，失败 ${failCount} 项`)
  if (failCount > 0) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('\n模拟执行异常:', error && error.message ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await sleep(300)
    stopServer()
    await sleep(200)
  })

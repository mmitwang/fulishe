/**
 * 独立启动 Mock 进程验证 RBAC、商户数据隔离与管理端写操作。
 * 运行：node frontend/admin/mock/verify-authz.cjs
 */
const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const path = require('path')

let failCount = 0
let baseUrl = ''
let serverProcess = null
let serverOutput = ''

const check = (name, pass, detail = '') => {
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
  const payload = await response.json()
  return { status: response.status, body: payload, headers: response.headers }
}

const expectStatus = async (name, url, options, status = 200) => {
  const response = await request(url, options)
  const message = response.body && (response.body.message || response.body.msg)
  check(name, response.status === status, `HTTP ${response.status}${message ? ' / ' + message : ''}`)
  if (response.status !== status) throw new Error(`${name}: 期望 HTTP ${status}，实际 ${response.status}`)
  return response.body.data
}

const login = async username => {
  const data = await expectStatus(`登录 ${username}`, '/api/user/auth/login', {
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

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

async function run() {
  const noTokenAdmin = await request('/api/admin/product/spu/page')
  check('无 Token 访问管理 API 返回 401', noTokenAdmin.status === 401, `HTTP ${noTokenAdmin.status}`)
  const noTokenInfo = await request('/api/user/auth/info')
  check('无 Token 获取身份返回 401', noTokenInfo.status === 401, `HTTP ${noTokenInfo.status}`)
  await expectStatus('演示账号接口保持公开', '/api/auth/demo-users')
  await expectStatus('验证码接口保持公开', '/api/user/auth/captcha')
  await expectStatus('消费端共享商品接口语义不变', '/api/product/spu/page?size=1')

  const adminToken = await login('admin')
  const tokenA = await login('fulishe_admin')
  const tokenB = await login('xinchun_admin')
  const adminInfo = await expectStatus('管理员身份包含真实角色和权限', '/api/user/auth/info', { token: adminToken })
  const infoA = await expectStatus('商户 A 身份包含商户归属', '/api/user/auth/info', { token: tokenA })
  const infoB = await expectStatus('商户 B 身份包含商户归属', '/api/user/auth/info', { token: tokenB })
  check('super_admin=ALL 且拥有通配权限', adminInfo.roleCodes.includes('super_admin') && adminInfo.dataScope === 'ALL' && adminInfo.permissions.includes('*:*:*'))
  check('merchant_admin=MERCHANT 且商户分别为 2/3', infoA.roleCodes.includes('merchant_admin') && infoB.roleCodes.includes('merchant_admin') && infoA.dataScope === 'MERCHANT' && infoA.merchantId === 2 && infoB.merchantId === 3)

  const refreshedA = await expectStatus('刷新 Token 保持原用户', '/api/user/auth/refresh', { method: 'POST', body: { refreshToken: tokenA } })
  const refreshedInfo = await expectStatus('刷新后身份未变成管理员', '/api/user/auth/info', { token: refreshedA.token })
  check('刷新前后用户与商户一致', refreshedInfo.username === 'fulishe_admin' && refreshedInfo.merchantId === 2)

  await expectStatus('商户访问系统用户接口返回 403', '/api/user/user/page', { token: tokenA }, 403)
  await expectStatus('商户访问系统租户接口返回 403', '/api/user/tenant/page', { token: tokenA }, 403)
  await expectStatus('管理员可访问系统租户接口', '/api/user/tenant/page?size=100', { token: adminToken })
  const menuTree = await expectStatus('管理员读取菜单树', '/api/user/menu/tree', { token: adminToken })
  const productRoot = menuTree.find(menu => menu.id === 2)
  check('菜单 tree 返回真实父子树', !!productRoot && Array.isArray(productRoot.children) && productRoot.children.some(menu => menu.id === 3))

  const productsA = await expectStatus('商户 A 商品分页', '/api/admin/product/spu/page?size=100', { token: tokenA })
  const productsB = await expectStatus('商户 B 商品分页（同 URL 不串缓存）', '/api/admin/product/spu/page?size=100', { token: tokenB })
  check('商户 A/B 商品列表均隔离且有数据', productsA.records.length > 0 && productsB.records.length > 0 && productsA.records.every(item => item.merchantId === 2) && productsB.records.every(item => item.merchantId === 3))
  const forgedProducts = await expectStatus('商户 A 伪造 merchantId 查询', '/api/admin/product/spu/page?size=100&merchantId=3', { token: tokenA })
  check('伪造 merchantId 不改变商品数据范围', forgedProducts.records.every(item => item.merchantId === 2))
  const productA = productsA.records[0]
  const productB = productsB.records[0]
  const productBBefore = await expectStatus('管理员读取商户 B 商品快照', `/api/admin/product/spu/${productB.id}`, { token: adminToken })
  await expectStatus('商户 A 读取商户 B 商品详情返回 403', `/api/admin/product/spu/${productB.id}`, { token: tokenA }, 403)
  await expectStatus('商户 A 修改商户 B 商品返回 403', '/api/admin/product/spu', {
    method: 'PUT', token: tokenA, body: { id: productB.id, spuName: '越权修改', merchantId: 2 }
  }, 403)
  const productBAfter = await expectStatus('越权修改后管理员复查商品', `/api/admin/product/spu/${productB.id}`, { token: adminToken })
  check('越权商品修改未落数据', productBAfter.spuName === productBBefore.spuName && productBAfter.merchantId === 3)

  const created = await expectStatus('商户 A 新增商品时伪造 merchantId=3', '/api/admin/product/spu', {
    method: 'POST', token: tokenA,
    body: { spuName: '权限回归商品', merchantId: 3, categoryId: 1, brandId: 1, sellPrice: 100, originalPrice: 120, stock: 10 }
  })
  check('新增商品归属被服务端强制为商户 A', created.merchantId === 2)
  const updatedCreated = await expectStatus('商户 A 编辑商品时伪造 merchantId=3', '/api/admin/product/spu', {
    method: 'PUT', token: tokenA, body: { id: created.id, spuName: '权限回归商品已编辑', merchantId: 3, status: 0 }
  })
  check('编辑不能改变商品商户归属', updatedCreated.merchantId === 2 && updatedCreated.spuName === '权限回归商品已编辑')
  await expectStatus('商户 A 删除包含商户 B 商品的批次返回 403', '/api/admin/product/spu/batch', {
    method: 'DELETE', token: tokenA, body: [productA.id, productB.id]
  }, 403)
  await expectStatus('批量拒绝后本商户商品仍存在', `/api/admin/product/spu/${productA.id}`, { token: adminToken })
  await expectStatus('批量拒绝后其他商户商品仍存在', `/api/admin/product/spu/${productB.id}`, { token: adminToken })

  const ordersAdmin = await expectStatus('管理员订单分页', '/api/admin/order/info/page?size=200', { token: adminToken })
  const ordersA = await expectStatus('商户 A 订单分页', '/api/admin/order/info/page?size=100', { token: tokenA })
  const ordersB = await expectStatus('商户 B 订单分页', '/api/admin/order/info/page?size=100', { token: tokenB })
  check('商户 A/B 订单只含各自单商户订单', ordersA.records.length > 0 && ordersB.records.length > 0 && ordersA.records.every(item => item.merchantId === 2 && !item.multiMerchant) && ordersB.records.every(item => item.merchantId === 3 && !item.multiMerchant))
  const multiOrder = ordersAdmin.records.find(item => item.multiMerchant)
  check('多商户订单仅管理员可见', !!multiOrder && !ordersA.records.some(item => item.id === multiOrder.id) && !ordersB.records.some(item => item.id === multiOrder.id))
  const orderA = ordersA.records[0]
  const orderB = ordersB.records[0]
  await expectStatus('商户 A 读取商户 B 订单详情返回 403', `/api/admin/order/info/${orderB.id}`, { token: tokenA }, 403)
  await expectStatus('商户 A 修改商户 B 订单返回 403', '/api/admin/order/info', {
    method: 'PUT', token: tokenA, body: { id: orderB.id, orderStatus: 2, remark: '越权订单修改' }
  }, 403)
  const orderBAfter = await expectStatus('越权订单修改后管理员复查', `/api/admin/order/info/${orderB.id}`, { token: adminToken })
  check('越权订单修改未落数据', orderBAfter.orderStatus === orderB.orderStatus && orderBAfter.remark === orderB.remark)
  const pendingA = ordersA.records.find(item => Number(item.orderStatus) === 1)
  check('商户 A 有待发货订单夹具', !!pendingA)
  if (pendingA) {
    const shipped = await expectStatus('商户可发货本商户订单', '/api/admin/order/info', {
      method: 'PUT', token: tokenA, body: { id: pendingA.id, orderStatus: 2, payStatus: 0, trackingNo: 'AUTHZ-TEST' }
    })
    check('订单更新只接收白名单字段', shipped.orderStatus === 2 && shipped.payStatus === pendingA.payStatus && shipped.trackingNo === 'AUTHZ-TEST')
  }
  const pendingAdmin = ordersAdmin.records.find(item => Number(item.orderStatus) === 1 && (!pendingA || item.id !== pendingA.id))
  if (pendingAdmin) {
    const shipped = await expectStatus('管理员可发货平台可见订单', '/api/admin/order/info', {
      method: 'PUT', token: adminToken, body: { id: pendingAdmin.id, orderStatus: 2 }
    })
    check('管理员订单操作生效', shipped.orderStatus === 2)
  } else {
    check('管理员有待发货订单夹具', false)
  }

  const payA = await expectStatus('商户 A 支付记录分页', '/api/admin/pay/record?size=100', { token: tokenA })
  const payB = await expectStatus('商户 B 支付记录分页', '/api/admin/pay/record?size=100', { token: tokenB })
  check('支付记录通过订单继承商户隔离', payA.records.length > 0 && payB.records.length > 0 && payA.records.every(item => item.merchantId === 2) && payB.records.every(item => item.merchantId === 3))
  const refundsA = await expectStatus('商户 A 售后分页', '/api/admin/pay/refund?size=100', { token: tokenA })
  const refundsB = await expectStatus('商户 B 售后分页', '/api/admin/pay/refund?size=100', { token: tokenB })
  check('商户 A/B 售后列表均隔离且有数据', refundsA.records.length > 0 && refundsB.records.length > 0 && refundsA.records.every(item => item.merchantId === 2) && refundsB.records.every(item => item.merchantId === 3))
  const refundB = refundsB.records[0]
  await expectStatus('商户 A 审核商户 B 售后返回 403', `/api/admin/pay/refund/${refundB.id}/audit`, {
    method: 'PUT', token: tokenA, body: { result: 1, opinion: '越权审核' }
  }, 403)

  const refundA = refundsA.records[0]
  const refundOrder = ordersAdmin.records.find(order => order.orderNo === refundA.orderNo)
  check('售后夹具可关联订单', !!refundOrder)
  const orderBeforeAudit = await expectStatus('审核前读取订单状态', `/api/admin/order/info/${refundOrder.id}`, { token: adminToken })
  const payBeforePage = await expectStatus('审核前读取支付状态', `/api/admin/pay/record?size=100&orderNo=${encodeURIComponent(refundA.orderNo)}`, { token: adminToken })
  const payBefore = payBeforePage.records.find(record => record.orderNo === refundA.orderNo)
  const demoUsers = await expectStatus('读取售后付款用户夹具', '/api/auth/demo-users')
  const payer = demoUsers.find(user => user.id === refundOrder.userId)
  check('售后付款用户夹具存在', !!payer)
  const payerToken = await login(payer.username)
  const fuliAccountBefore = await expectStatus('审核前福卡账户快照', '/api/fuli-card/account', { token: payerToken })
  const fuliFlowsBefore = await expectStatus('审核前福卡流水快照', '/api/fuli-card/flows?size=100', { token: payerToken })
  const audited = await expectStatus('商户保存本商户售后审核', `/api/admin/pay/refund/${refundA.id}/audit`, {
    method: 'PUT', token: tokenA, body: { result: 1, opinion: '仅保存审核结果，不执行退款' }
  })
  check('审核人、意见、结果和时间均保存', audited.auditResult === 1 && audited.auditOpinion === '仅保存审核结果，不执行退款' && audited.auditBy === infoA.realName && !!audited.auditTime)
  const refundsAAfter = await expectStatus('审核后重新查询售后', `/api/admin/pay/refund?size=100&refundNo=${encodeURIComponent(refundA.refundNo)}`, { token: tokenA })
  const persistedAudit = refundsAAfter.records.find(item => item.id === refundA.id)
  check('售后审核可持久查看且不改退款状态', !!persistedAudit && persistedAudit.auditOpinion === '仅保存审核结果，不执行退款' && persistedAudit.refundStatus === refundA.refundStatus)
  const orderAfterAudit = await expectStatus('审核后复查订单状态', `/api/admin/order/info/${refundOrder.id}`, { token: adminToken })
  check('售后审核不改变订单/支付状态', orderAfterAudit.orderStatus === orderBeforeAudit.orderStatus && orderAfterAudit.payStatus === orderBeforeAudit.payStatus)
  const payAfterPage = await expectStatus('审核后复查支付流水', `/api/admin/pay/record?size=100&orderNo=${encodeURIComponent(refundA.orderNo)}`, { token: adminToken })
  const payAfter = payAfterPage.records.find(record => record.orderNo === refundA.orderNo)
  check('售后审核不改变支付记录', same(payAfter, payBefore))
  const fuliAccountAfter = await expectStatus('审核后福卡账户复查', '/api/fuli-card/account', { token: payerToken })
  const fuliFlowsAfter = await expectStatus('审核后福卡流水复查', '/api/fuli-card/flows?size=100', { token: payerToken })
  check('售后审核不动福卡账户和账本', same(fuliAccountAfter, fuliAccountBefore) && same(fuliFlowsAfter, fuliFlowsBefore))

  const settlementsA = await expectStatus('商户 A 结算分页', '/api/admin/settlement/page?size=100', { token: tokenA })
  const settlementsB = await expectStatus('商户 B 结算分页', '/api/admin/settlement/page?size=100', { token: tokenB })
  check('商户 A/B 结算均隔离且有数据', settlementsA.records.length > 0 && settlementsB.records.length > 0 && settlementsA.records.every(item => item.merchantId === 2) && settlementsB.records.every(item => item.merchantId === 3))
  const settlementA = settlementsA.records.find(item => Number(item.status) !== 2) || settlementsA.records[0]
  await expectStatus('商户确认结算返回 403', `/api/admin/settlement/${settlementA.id}/confirm`, { method: 'PUT', token: tokenA }, 403)
  const confirmed = await expectStatus('系统管理员确认结算', `/api/admin/settlement/${settlementA.id}/confirm`, { method: 'PUT', token: adminToken })
  check('管理员结算确认生效', confirmed.status === 2 && confirmed.paidAmount === confirmed.payableAmount && !!confirmed.confirmedBy)

  const profileA = await expectStatus('商户资料查询忽略伪造 merchantId', '/api/admin/merchant/profile?merchantId=3', { token: tokenA })
  check('商户资料范围固定为当前商户', profileA.id === 2)
  const profileUpdated = await expectStatus('商户资料仅保存白名单字段', '/api/admin/merchant/profile', {
    method: 'PUT', token: tokenA, body: { merchantId: 3, contactEmail: 'authz@fulishe.cn', auditStatus: 2 }
  })
  check('商户不能伪造归属或审核状态', profileUpdated.id === 2 && profileUpdated.contactEmail === 'authz@fulishe.cn' && profileUpdated.auditStatus === 1)
  const overviewA = await expectStatus('商户 A 工作台统计', '/api/admin/merchant/dashboard/overview', { token: tokenA })
  check('工作台最新订单使用同一商户范围', overviewA.merchantId === 2 && overviewA.latestOrders.every(order => order.merchantId === 2 && !order.multiMerchant))

  const originalRoleMenus = await expectStatus('读取商户角色菜单', '/api/user/role/2/menus', { token: adminToken })
  await expectStatus('内置 super_admin 角色不可删除', '/api/user/role/1', { method: 'DELETE', token: adminToken }, 403)
  await expectStatus('内置 super_admin 菜单不可撤销', '/api/user/role/1/menus', { method: 'PUT', token: adminToken, body: { menuIds: [] } }, 403)
  await expectStatus('撤销商户角色商品菜单', '/api/user/role/2/menus', {
    method: 'PUT', token: adminToken, body: { menuIds: originalRoleMenus.filter(id => Number(id) !== 3) }
  })
  const savedRoleMenus = await expectStatus('角色菜单保存结果可读取', '/api/user/role/2/menus', { token: adminToken })
  check('角色菜单关系真实持久化', !savedRoleMenus.includes(3))
  const infoAfterRevoke = await expectStatus('撤销后重新获取商户身份', '/api/user/auth/info', { token: tokenA })
  check('权限集合随角色菜单撤销更新', !infoAfterRevoke.permissions.includes('product:spu') && infoAfterRevoke.permissions.includes('order:info'))
  await expectStatus('撤销菜单后商品 API 返回 403', '/api/admin/product/spu/page', { token: tokenA }, 403)
  await expectStatus('撤销商品菜单不影响其他已授权 API', '/api/admin/order/info/page?size=1', { token: tokenA })
  await expectStatus('内置管理员不受其他角色撤权影响', '/api/admin/product/spu/page?size=1', { token: adminToken })
  await expectStatus('恢复商户角色菜单', '/api/user/role/2/menus', { method: 'PUT', token: adminToken, body: { menuIds: originalRoleMenus } })
  await expectStatus('恢复后商户商品 API 可用', '/api/admin/product/spu/page?size=1', { token: tokenA })

  await expectStatus('商户调用租户审核返回 403', '/api/user/tenant/3/audit', {
    method: 'PUT', token: tokenA, body: { auditStatus: 1 }
  }, 403)
  await expectStatus('管理员驳回商户审核', '/api/user/tenant/3/audit', {
    method: 'PUT', token: adminToken, body: { auditStatus: 2, auditRemark: '权限回归审核驳回' }
  })
  const rejectedLogin = await request('/api/user/auth/login', { method: 'POST', body: { username: 'xinchun_admin', password: '123456' } })
  check('审核未通过商户登录返回明确 403', rejectedLogin.status === 403 && String(rejectedLogin.body.message || '').includes('审核未通过'), `HTTP ${rejectedLogin.status}`)
  await expectStatus('已签发商户 Token 也受审核状态限制', '/api/user/auth/info', { token: tokenB }, 403)
  await expectStatus('恢复商户审核通过', '/api/user/tenant/3/audit', {
    method: 'PUT', token: adminToken, body: { auditStatus: 1, auditRemark: '审核通过' }
  })
  await login('xinchun_admin')
}

;(async () => {
  try {
    const port = await getFreePort()
    baseUrl = `http://127.0.0.1:${port}`
    const sharedNodeModules = path.resolve(__dirname, '../../../.pai/preview-dependencies/admin-deps/node_modules')
    const nodePath = [
      process.env.NODE_PATH,
      fs.existsSync(sharedNodeModules) ? sharedNodeModules : ''
    ].filter(Boolean).join(path.delimiter)
    serverProcess = spawn(process.execPath, [path.join(__dirname, '..', 'mock-server.cjs')], {
      env: { ...process.env, PORT: String(port), MOCK_CACHE_TTL: '1500', NODE_PATH: nodePath },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    serverProcess.stdout.on('data', chunk => { serverOutput += chunk.toString() })
    serverProcess.stderr.on('data', chunk => { serverOutput += chunk.toString() })
    console.log(`独立 Mock 进程 PID=${serverProcess.pid}，端口=${port}`)
    await waitUntilReady()
    await run()
  } catch (error) {
    check('权限回归完整执行', false, error.stack || error.message)
  } finally {
    await stopServer()
    console.log(failCount === 0 ? '\n权限与商户隔离回归全部通过 ✓' : `\n${failCount} 项权限回归失败 ✗`)
    process.exitCode = failCount === 0 ? 0 : 1
  }
})()

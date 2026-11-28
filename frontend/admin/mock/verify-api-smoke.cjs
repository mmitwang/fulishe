/**
 * 全量接口冒烟与契约测试：独立启动 Mock，逐模块校验鉴权、分页契约、响应结构与响应时延。
 * 运行：node frontend/admin/mock/verify-api-smoke.cjs
 */
const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const path = require('path')

let failCount = 0
let baseUrl = ''
let serverProcess = null
let serverOutput = ''
const durations = []

const check = (name, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!pass) failCount++
}

const request = async (url, { method = 'GET', token, body } = {}) => {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const startedAt = Date.now()
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const payload = await response.json()
  durations.push(Date.now() - startedAt)
  return { status: response.status, body: payload }
}

const login = async username => {
  const response = await request('/api/user/auth/login', {
    method: 'POST', body: { username, password: '123456' }
  })
  check(`登录 ${username}`, response.status === 200 && Boolean(response.body.data && response.body.data.token))
  return response.body.data.token
}

const expectHealth = async (name, url) => {
  const response = await request(url)
  check(name, response.status === 200 && response.body.status === 'UP', `HTTP ${response.status}`)
}

const expectOk = async (name, url, options = {}) => {
  const response = await request(url, options)
  const ok = response.status === 200 && response.body.code === 200
  check(name, ok, ok ? `HTTP 200 / ${response.body.message || 'success'}` : `HTTP ${response.status} / ${response.body.message || response.body.code}`)
  if (!ok) return null
  return response.body.data
}

const expectPage = async (name, url, options = {}) => {
  const data = await expectOk(name, url, options)
  if (!data) return null
  const hasRecords = Array.isArray(data.records)
  const hasTotal = typeof data.total === 'number'
  const hasCursor = data.current !== undefined || data.pageNum !== undefined
  check(`${name} · 分页契约`, hasRecords && hasTotal && hasCursor, `records=${hasRecords} total=${hasTotal} cursor=${hasCursor}`)
  return data
}

const expectUnauthorized = async (name, url) => {
  const response = await request(url)
  check(name, response.status === 401, `HTTP ${response.status}`)
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
      // 继续等待
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
    serverProcess.once('exit', () => { clearTimeout(timer); resolve() })
    serverProcess.kill()
  })
}

async function run() {
  // 1. 公开接口
  console.log('\n[1] 公开 / 消费端接口')
  await expectHealth('健康检查', '/api/health')
  await expectOk('演示账号列表', '/api/auth/demo-users')
  await expectOk('图形验证码', '/api/user/auth/captcha')
  await expectOk('H5 首页', '/api/h5/home')
  await expectOk('H5 商品详情', '/api/h5/product/1')
  await expectOk('H5 满减档位', '/api/h5/promotions/full-reduction')
  await expectOk('H5 门店', '/api/h5/stores')
  await expectOk('H5 履约方式', '/api/h5/fulfillment')
  await expectOk('H5 热搜词', '/api/h5/search/hot')
  await expectOk('H5 搜索建议', '/api/h5/search/suggest?keyword=礼盒')
  await expectOk('H5 收货地址', '/api/h5/addresses')
  await expectPage('前台商品分页', '/api/product/spu/page?size=2')
  await expectPage('前台分类分页', '/api/product/category/page?size=10')
  await expectOk('前台品牌列表', '/api/product/brand/list')
  await expectOk('前台订单列表', '/api/order/list?size=2&current=1')
  await expectOk('购物车', '/api/cart')
  await expectOk('我的优惠券', '/api/coupon/my?userId=2')
  await expectOk('支付配置', '/api/pay/config')
  await expectPage('前台支付记录', '/api/pay/record?size=2')
  await expectPage('前台退款记录', '/api/pay/refund?size=2')
  await expectOk('运营看板', '/api/ops/dashboard')
  await expectOk('数据总览', '/api/dashboard/overview')
  await expectOk('统计数据', '/api/statistics')
  await expectPage('区块链区块', '/api/chain/block/page?size=2')
  await expectPage('区块链交易', '/api/chain/tx/page?size=2')
  await expectPage('区块链溯源', '/api/chain/trace/page?size=2')
  await expectOk('微信配置', '/api/wechat/config')

  // 2. 鉴权
  console.log('\n[2] 鉴权契约')
  await expectUnauthorized('无 Token 商品管理 401', '/api/admin/product/spu/page')
  await expectUnauthorized('无 Token 订单管理 401', '/api/admin/order/info/page')
  await expectUnauthorized('无 Token 发票管理 401', '/api/admin/invoice/page')
  await expectUnauthorized('无 Token 平台抽佣 401', '/api/admin/finance/config')
  await expectUnauthorized('无 Token 采购管理 401', '/api/supply/purchase/page')
  await expectUnauthorized('无 Token 分销规则 401', '/api/distribution/rules/page')

  // 3. 管理端接口
  console.log('\n[3] 管理端接口（admin）')
  const adminToken = await login('admin')
  const admin = { token: adminToken }
  await expectOk('商户工作台', '/api/admin/merchant/dashboard/overview', admin)
  await expectOk('商户资料', '/api/admin/merchant/profile?merchantId=2', admin)
  await expectPage('商品管理', '/api/admin/product/spu/page?size=2', admin)
  await expectPage('订单管理', '/api/admin/order/info/page?size=2', admin)
  await expectPage('支付记录', '/api/admin/pay/record?size=2', admin)
  await expectPage('售后记录', '/api/admin/pay/refund?size=2', admin)
  await expectPage('资金流水', '/api/admin/fund/flow/page?size=2', admin)
  await expectOk('资金汇总', '/api/admin/fund/flow/summary', admin)
  await expectPage('库存预占', '/api/admin/stock/reservation/page?size=2', admin)
  await expectOk('预占汇总', '/api/admin/stock/reservation/summary', admin)
  await expectPage('库存流水', '/api/admin/stock/flow/page?size=2', admin)
  await expectPage('结算单', '/api/admin/settlement/page?size=2', admin)
  await expectPage('发票管理', '/api/admin/invoice/page?size=2', admin)
  await expectOk('发票汇总', '/api/admin/invoice/summary', admin)
  await expectOk('抽佣配置', '/api/admin/finance/config', admin)
  await expectPage('分账明细', '/api/admin/finance/split/page?size=2', admin)
  await expectOk('分账汇总', '/api/admin/finance/split/summary', admin)
  await expectPage('满减配置', '/api/admin/promotion/full-reduction/page?size=2', admin)
  await expectPage('分销规则', '/api/distribution/rules/page?size=2', admin)
  await expectPage('分销商管理', '/api/distribution/distributors/page?size=2', admin)
  await expectPage('推广订单', '/api/distribution/orders/page?size=2', admin)
  await expectOk('供应链总览', '/api/supply/overview', admin)
  await expectPage('供应商', '/api/supply/supplier/page?size=2', admin)
  await expectPage('采购单', '/api/supply/purchase/page?size=2', admin)
  await expectPage('库存台账', '/api/supply/inventory/page?size=2', admin)
  await expectPage('物流发货', '/api/supply/shipment/page?size=2', admin)
  await expectPage('供应商结算', '/api/supply/settlement/page?size=2', admin)
  await expectPage('系统用户', '/api/user/user/page?size=2', admin)
  await expectPage('租户', '/api/user/tenant/page?size=2', admin)
  await expectPage('角色', '/api/user/role/page?size=2', admin)
  await expectOk('部门树', '/api/user/dept/tree', admin)
  await expectOk('菜单树', '/api/user/menu/tree', admin)

  // 4. 角色接口
  console.log('\n[4] 角色接口')
  const distributorToken = await login('distributor_chen')
  const distributor = { token: distributorToken }
  await expectPage('分销商选品', '/api/distribution/selections/page?size=2', distributor)
  await expectPage('分销商分享', '/api/distribution/shares/page?size=2', distributor)
  await expectOk('分销商汇总', '/api/distribution/summary', distributor)
  await expectPage('分销商推广订单', '/api/distribution/orders/page?size=2', distributor)
  const supplierToken = await login('supplier_fuli')
  const supplier = { token: supplierToken }
  await expectPage('供应商采购单', '/api/supply/purchase/page?size=2', supplier)
  await expectPage('供应商结算单', '/api/supply/settlement/page?size=2', supplier)
  const merchantToken = await login('fulishe_admin')
  const merchant = { token: merchantToken }
  await expectPage('商户商品', '/api/admin/product/spu/page?size=2', merchant)
  await expectPage('商户订单', '/api/admin/order/info/page?size=2', merchant)
  await expectPage('商户发票', '/api/admin/invoice/page?size=2', merchant)
  const merchantCommission = await request('/api/admin/finance/split/page?size=2', merchant)
  check('商户无平台抽佣权限返回 403', merchantCommission.status === 403, `HTTP ${merchantCommission.status}`)

  // 5. 性能
  console.log('\n[5] 响应时延')
  const sorted = [...durations].sort((a, b) => a - b)
  const avg = Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
  const max = sorted[sorted.length - 1]
  check('平均响应 < 300ms', avg < 300, `${avg}ms`)
  check('P95 响应 < 800ms', p95 < 800, `${p95}ms`)
  check('最大响应 < 1500ms', max < 1500, `${max}ms`)
  console.log(`请求数=${durations.length} 平均=${avg}ms P95=${p95}ms 最大=${max}ms`)
}

;(async () => {
  try {
    const port = await getFreePort()
    baseUrl = `http://127.0.0.1:${port}`
    const sharedNodeModules = path.join(__dirname, '..', '..', '..', '.pai', 'preview-dependencies', 'admin-deps', 'node_modules')
    const nodePath = [process.env.NODE_PATH, fs.existsSync(sharedNodeModules) ? sharedNodeModules : ''].filter(Boolean).join(path.delimiter)
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
    check('接口冒烟完整执行', false, error.stack || error.message)
  } finally {
    await stopServer()
    console.log(failCount === 0 ? '\n接口冒烟与契约测试全部通过 ✓' : `\n${failCount} 项失败 ✗`)
    process.exitCode = failCount === 0 ? 0 : 1
  }
})()

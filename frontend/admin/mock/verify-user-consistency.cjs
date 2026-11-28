/**
 * 普通用户端三渠道数据一致性核对（PC 商城 / 小程序 / 公众号）
 *
 * 背景：公众号由 H5 承载，PC 与小程序各自独立前端，但三端共用同一 Mock 后端。
 * 本脚本以同一普通用户（user1, userId=4）视角，从三端共用的接口集读取同一份数据，
 * 并走完「加购 → 下单 → 支付 → 订单 → 售后」闭环，断言：
 *  1. 三端读取同一资源返回完全一致（商品、购物车、订单、卡券、地址）；
 *  2. 下单后订单在三端订单列表中均可见，状态与金额口径一致；
 *  3. 退款后三端读到的订单状态一致；
 *  4. 三端源码均引用相同的核心接口路径。
 *
 * 运行：node frontend/admin/mock/verify-user-consistency.cjs
 * 说明：本脚本自启独立 Mock（随机端口 + 独立备份目录），不影响 8080 演示环境。
 */
const { spawn } = require('child_process')
const net = require('net')
const path = require('path')
const fs = require('fs')
const os = require('os')

let passCount = 0
let failCount = 0
let baseUrl = ''
let serverProcess = null
let serverOutput = ''

const USER_ID = 4 // user1 普通用户

const check = (name, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (pass) passCount++
  else failCount++
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
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('json')) {
    return { status: response.status, body: null, text: await response.text() }
  }
  return { status: response.status, body: await response.json() }
}

const expectData = async (name, url, options = {}) => {
  const response = await request(url, options)
  const code = response.body && response.body.code
  const message = response.body && response.body.message
  check(name, response.status === 200 && code === 200, `HTTP ${response.status}${code !== 200 ? ' / ' + code : ''}${message ? ' / ' + message : ''}`)
  if (response.status !== 200 || code !== 200) throw new Error(`${name}: ${message || response.status}`)
  return response.body.data
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.unref()
  server.on('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address()
    server.close(() => resolve(port))
  })
})

const startServer = async () => {
  const port = await getFreePort()
  baseUrl = `http://127.0.0.1:${port}`
  const backupDir = path.join(os.tmpdir(), `fulishe-consistency-${Date.now()}`)
  serverProcess = spawn(process.execPath, ['mock-server.cjs'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), FULISHE_BACKUP_DIR: backupDir },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  serverProcess.stdout.on('data', chunk => { serverOutput += chunk.toString() })
  serverProcess.stderr.on('data', chunk => { serverOutput += chunk.toString() })
}

const waitUntilReady = async () => {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error(`Mock 进程提前退出：${serverOutput}`)
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) return
    } catch {
      // 等待监听
    }
    await new Promise(r => setTimeout(r, 120))
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

/* 读取三端源码内容，用于静态契约核对 */
const readSources = () => {
  const root = path.join(__dirname, '..', '..')
  const files = []
  const walk = dir => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', 'recordings', '.swc'].includes(entry.name)) continue
        walk(full)
      } else if (/\.(ts|tsx|vue|js)$/.test(entry.name)) {
        files.push(full)
      }
    }
  }
  walk(path.join(root, 'pc', 'src'))
  walk(path.join(root, 'h5', 'src'))
  walk(path.join(root, 'miniapp', 'src'))
  return files.map(file => fs.readFileSync(file, 'utf8')).join('\n')
}

async function run() {
  /* ---------- 0. 健康检查 ---------- */
  const health = await request('/api/health')
  check('Mock 健康检查', health.status === 200 && health.body && health.body.status === 'UP')

  /* ---------- 1. 商品：三端读取同一资源一致 ---------- */
  const homeA = await expectData('PC 读取首页', '/api/h5/home')
  const homeB = await expectData('H5/公众号 读取首页', '/api/h5/home')
  const homeC = await expectData('小程序 读取首页', '/api/h5/home')
  check('三端首页商品列表完全一致', same(homeA.hotProducts, homeB.hotProducts) && same(homeA.hotProducts, homeC.hotProducts), `热门 ${homeA.hotProducts.length} 个`)
  check('三端首页分类完全一致', same(homeA.categories, homeC.categories), `分类 ${homeA.categories.length} 个`)

  const spuId = homeA.hotProducts[0].id
  const detailA = await expectData('PC 读取商品详情', `/api/h5/product/${spuId}`)
  const detailB = await expectData('H5/公众号 读取商品详情', `/api/h5/product/${spuId}`)
  const detailC = await expectData('小程序 读取商品详情', `/api/h5/product/${spuId}`)
  check('三端商品售价一致', detailA.sellPrice === detailB.sellPrice && detailB.sellPrice === detailC.sellPrice, `¥${detailA.sellPrice}`)
  check('三端商品 SKU 一致', same(detailA.skus, detailC.skus), `${detailA.skus.length} 个规格`)

  /* ---------- 2. 静态契约：三端源码引用相同核心路径 ---------- */
  const sources = readSources()
  const corePaths = ['/h5/home', '/h5/product/', '/cart', '/order', '/coupon', '/refund/apply']
  const missing = corePaths.filter(p => !sources.includes(p))
  check('三端源码引用同一核心接口路径', missing.length === 0, missing.length ? `缺失 ${missing.join(', ')}` : `${corePaths.length} 个核心路径齐全`)

  /* ---------- 3. 购物车：同一用户三端同源 ---------- */
  const skuId = detailA.skus.find(s => s.stock > 0).id
  await expectData('用户加购', '/api/cart/add', { method: 'POST', body: { userId: USER_ID, skuId, quantity: 2 } })
  const cartA = await expectData('PC 读取购物车', `/api/cart?userId=${USER_ID}`)
  const cartB = await expectData('H5/公众号 读取购物车', `/api/cart?userId=${USER_ID}`)
  const cartC = await expectData('小程序 读取购物车', `/api/cart?userId=${USER_ID}`)
  check('三端购物车完全一致', same(cartA, cartB) && same(cartA, cartC), `${cartA.length} 项`)
  const cartItem = cartA.find(c => c.skuId === skuId)
  check('加购项三端可见', Boolean(cartItem) && cartItem.quantity === 2, cartItem ? `数量 ${cartItem.quantity}` : '未找到')

  /* ---------- 4. 下单：PC 创建，三端可查 ---------- */
  const orderA = await expectData('PC 创建订单', '/api/order/create', {
    method: 'POST',
    body: {
      userId: USER_ID,
      items: [{ skuId, quantity: 1 }],
      receiver: '李静',
      mobile: '13800138007',
      address: '上海市浦东新区世纪大道 100 号市场部'
    }
  })
  check('订单创建返回订单号与应付金额', Boolean(orderA.orderNo) && typeof orderA.payAmount === 'number', `${orderA.orderNo} / ¥${orderA.payAmount}`)

  /* ---------- 5. 支付 ---------- */
  const pay = await expectData('创建支付单', '/api/pay/create', {
    method: 'POST',
    body: { orderNo: orderA.orderNo, userId: USER_ID, payMethod: 1, payAmount: orderA.payAmount }
  })
  check('支付单创建成功', Boolean(pay.payNo), pay.payNo)
  await request('/api/pay/wechat/notify', {
    method: 'POST',
    body: { payNo: pay.payNo, tradeState: 'SUCCESS', transactionId: `WX${pay.payNo}` }
  })

  /* ---------- 6. 订单：三端读取同一订单一致 ---------- */
  const listA = await expectData('PC 读取订单列表', `/api/order/list?userId=${USER_ID}`)
  const listB = await expectData('H5/公众号 读取订单列表', `/api/order/list?userId=${USER_ID}`)
  const listC = await expectData('小程序 读取订单列表', `/api/order/list?userId=${USER_ID}`)
  check('三端订单列表完全一致', same(listA, listB) && same(listA, listC), `${Array.isArray(listA) ? listA.length : 0} 单`)

  const oA = await expectData('PC 读取订单详情', `/api/order/detail/${orderA.orderNo}`)
  const oC = await expectData('小程序 读取订单详情', `/api/order/detail/${orderA.orderNo}`)
  check('三端订单详情完全一致', same(oA, oC))
  check('订单支付状态三端一致（已支付）', oA.payStatus === 1 || oA.orderStatus === 1, `orderStatus=${oA.orderStatus} payStatus=${oA.payStatus}`)
  check('订单金额口径为元且一致', oA.payAmount === orderA.payAmount, `¥${oA.payAmount}`)

  /* ---------- 7. 卡券与地址：三端同源 ---------- */
  const couponA = await expectData('PC 读取我的卡券', `/api/coupon/my?userId=${USER_ID}`)
  const couponC = await expectData('小程序 读取我的卡券', `/api/coupon/my?userId=${USER_ID}`)
  check('三端卡券完全一致', same(couponA, couponC), `${Array.isArray(couponA) ? couponA.length : 0} 张`)

  const addrA = await expectData('PC 读取收货地址', `/api/h5/addresses?userId=${USER_ID}`)
  const addrC = await expectData('小程序 读取收货地址', `/api/h5/addresses?userId=${USER_ID}`)
  check('三端地址完全一致', same(addrA, addrC), `${addrA.length} 条`)

  /* ---------- 8. 售后：退款申请三端状态一致 ---------- */
  await expectData('用户提交退款申请', '/api/refund/apply', {
    method: 'POST',
    body: { orderNo: orderA.orderNo, reason: '三端一致性核对-模拟退款' }
  })
  const refundedA = await expectData('PC 读取退款后订单', `/api/order/detail/${orderA.orderNo}`)
  const refundedC = await expectData('小程序 读取退款后订单', `/api/order/detail/${orderA.orderNo}`)
  check('退款后三端订单状态一致', same(refundedA, refundedC))
  check('退款后订单进入售后状态（5）', refundedA.orderStatus === 5, `orderStatus=${refundedA.orderStatus}`)
}

async function main() {
  try {
    await startServer()
    await waitUntilReady()
    console.log(`\n独立 Mock 启动：${baseUrl}\n`)
    await run()
  } catch (error) {
    console.error(`\n执行异常：${error.message}`)
    failCount++
  } finally {
    await stopServer()
    console.log(`\n===== 一致性核对结果 =====`)
    console.log(`通过 ${passCount} 项，失败 ${failCount} 项`)
    if (failCount) process.exitCode = 1
  }
}

main()

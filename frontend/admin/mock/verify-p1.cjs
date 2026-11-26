/**
 * 消费端 P1：全场满减、服务端计价与订单优惠明细回归。
 * 运行：node mock/verify-p1.cjs（需先配置共享 NODE_PATH）。
 */
const { spawn } = require('child_process')
const net = require('net')
const path = require('path')
const { skus } = require('./seed.cjs')

let failCount = 0
let baseUrl = ''
let serverProcess = null
let serverOutput = ''

const check = (name, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!pass) failCount++
}

const request = async (url, { method = 'GET', body } = {}) => {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  return { status: response.status, body: await response.json() }
}

const expectData = async (name, url, options = {}) => {
  const response = await request(url, options)
  const code = response.body && response.body.code
  const message = response.body && (response.body.message || response.body.msg)
  check(name, response.status === 200 && code === 200, `HTTP ${response.status} / code ${code}${message ? ' / ' + message : ''}`)
  if (response.status !== 200 || code !== 200) throw new Error(`${name}: ${message || response.status}`)
  return response.body.data
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

const skuAt = price => {
  const sku = skus.find(item => item.price === price && item.stock > 20 && skus.filter(candidate => candidate.id === item.id).length === 1)
  if (!sku) throw new Error(`缺少 ${price} 元且 ID 唯一的测试 SKU`)
  return sku
}

const orderBody = (items, promotionId) => ({
  userId: 2,
  receiver: '满减测试',
  mobile: '13800138005',
  address: '浙江省杭州市西湖区文三路 90 号',
  storeId: 1,
  storeName: '西湖银泰店',
  deliverySlot: '尽快送达 预计 30 分钟',
  promotionId,
  items: items.map(item => ({ skuId: item.sku.id, quantity: item.quantity || 1, unitPrice: 0.01 }))
})

async function run() {
  const promotion = await expectData('满减规则接口', '/api/h5/promotions/full-reduction')
  check('三档满减规则完整', promotion.name === '全场满减' && promotion.rules.length === 3 && promotion.rules.every((rule, index, list) => index === 0 || list[index - 1].thresholdAmount < rule.thresholdAmount))

  const below = await expectData('未达门槛下单', '/api/order/info/create', {
    method: 'POST',
    body: orderBody([{ sku: skuAt(88) }])
  })
  check('88 元不享满减', below.totalAmount === 88 && below.discountAmount === 0 && below.payAmount === 88 && below.promotion === null)

  const exact = await expectData('刚好达到首档下单', '/api/order/info/create', {
    method: 'POST',
    body: orderBody([{ sku: skuAt(99) }], 1)
  })
  check('99 元减 10 元', exact.totalAmount === 99 && exact.discountAmount === 10 && exact.payAmount === 89 && exact.promotion?.ruleId === 1)

  const middle = await expectData('多商品跨第二档下单', '/api/order/info/create', {
    method: 'POST',
    body: orderBody([{ sku: skuAt(99) }, { sku: skuAt(138) }], 2)
  })
  check('237 元自动匹配 199 减 25', middle.totalAmount === 237 && middle.discountAmount === 25 && middle.payAmount === 212 && middle.promotion?.ruleId === 2)

  const highest = await expectData('最高档下单并尝试篡改金额', '/api/order/info/create', {
    method: 'POST',
    body: { ...orderBody([{ sku: skuAt(299) }], 3), totalAmount: 1, discountAmount: 9999, payAmount: 0.01 }
  })
  check('299 元减 40 元且客户端金额无效', highest.totalAmount === 299 && highest.discountAmount === 40 && highest.payAmount === 259 && highest.promotion?.ruleId === 3)

  const stale = await request('/api/order/info/create', {
    method: 'POST',
    body: orderBody([{ sku: skuAt(99) }], 3)
  })
  check('客户端预期档位过期时拦截下单', stale.body.code !== 200 && String(stale.body.message || stale.body.msg).includes('满减优惠已变化'))

  const detail = await expectData('订单详情读取满减快照', `/api/order/detail/${highest.orderNo}`)
  check('订单保存档位与抵扣明细', detail.promotion?.name === '满 299 减 40' && detail.promotion?.thresholdAmount === 299 && detail.promotion?.discountAmount === 40)
  const page = await expectData('订单列表读取满减快照', '/api/order/info/page?userId=2&current=1&size=50')
  const listed = page.records.find(item => item.orderNo === highest.orderNo)
  check('订单列表保留同一优惠明细', listed?.discountAmount === 40 && listed?.payAmount === 259 && listed?.promotion?.ruleId === 3)

  const pay = await expectData('满减订单创建支付单', '/api/pay/create', {
    method: 'POST',
    body: { orderNo: highest.orderNo, tenantId: 1, userId: 2, payMethod: 1, payAmount: 0.01 }
  })
  check('支付只采用订单优惠后应付额', pay.payAmount === 259)

  const recommendations = await expectData('凑单候选复用价格升序商品分页', '/api/product/spu/page?sort=priceAsc&size=6')
  check('凑单候选可售且价格升序', recommendations.records.length === 6 && recommendations.records.every((item, index, list) => item.stock > 0 && (index === 0 || list[index - 1].sellPrice <= item.sellPrice)))
}

;(async () => {
  try {
    const port = await getFreePort()
    baseUrl = `http://127.0.0.1:${port}`
    serverProcess = spawn(process.execPath, [path.join(__dirname, '..', 'mock-server.cjs')], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    serverProcess.stdout.on('data', chunk => { serverOutput += chunk.toString() })
    serverProcess.stderr.on('data', chunk => { serverOutput += chunk.toString() })
    await waitUntilReady()
    console.log(`独立 Mock 进程 PID=${serverProcess.pid}，端口=${port}\n`)
    await run()
  } catch (error) {
    console.error('\nP1 回归执行失败：', error.message)
    failCount++
  } finally {
    await stopServer()
    console.log(`\nP1 回归结束：${failCount === 0 ? '全部通过' : `${failCount} 项失败`}`)
    process.exitCode = failCount === 0 ? 0 : 1
  }
})()

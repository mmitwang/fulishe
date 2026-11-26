/**
 * Web / 小程序 / 公众号 三渠道模拟联调回归。
 * 运行：node frontend/admin/mock/verify-channel.cjs
 *
 * 说明：本脚本验证 Mock 协议层与订单/支付一致性，不触达真实微信平台；
 * 小程序与公众号的真实运行仍需微信开发者工具与正式凭证。
 */
const { spawn } = require('child_process')
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
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual'
  })
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('json')) {
    const text = await response.text()
    return { status: response.status, body: null, text, headers: response.headers }
  }
  return { status: response.status, body: await response.json(), headers: response.headers }
}

const expectData = async (name, url, options = {}) => {
  const response = await request(url, options)
  const code = response.body && response.body.code
  const message = response.body && (response.body.message || response.body.msg)
  check(name, response.status === 200 && code === 200, `HTTP ${response.status}${code !== 200 ? ' / code ' + code : ''}${message ? ' / ' + message : ''}`)
  if (response.status !== 200 || code !== 200) throw new Error(`${name}: ${message || response.status}`)
  return response.body.data
}

const expectRejected = async (name, url, options) => {
  const response = await request(url, options)
  const code = response.body && response.body.code
  check(name, code !== 200, `code ${code}${response.body && response.body.message ? ' / ' + response.body.message : ''}`)
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

const notify = async payNo => {
  const response = await request('/api/pay/wechat/notify', {
    method: 'POST',
    body: { payNo, tradeState: 'SUCCESS', transactionId: `WX${payNo}` }
  })
  return response.text || ''
}

const payAndNotify = async orderNo => {
  const pay = await expectData(`创建支付单 ${orderNo}`, '/api/pay/create', {
    method: 'POST',
    body: { orderNo, tenantId: 1, userId: 2, payMethod: 1, payAmount: 1 }
  })
  const first = await notify(pay.payNo)
  const second = await notify(pay.payNo)
  return { pay, first, second }
}

async function run() {
  const health = await request('/api/health')
  check('Mock 健康检查', health.status === 200 && health.body && health.body.status === 'UP')
  const config = await expectData('读取渠道模拟配置', '/api/wechat/config')
  check('渠道配置声明为模拟模式', config.mode === 'simulation' && config.secretConfigured === false)
  check('三渠道入口齐备', ['weapp', 'mp', 'web'].every(channel => config.channels.includes(channel)))

  /* ---------------- Web 渠道 ---------------- */
  const webLogin = await expectData('Web 账号登录', '/api/h5/login', { method: 'POST', body: { username: 'zhangsan', password: '123456' } })
  const webToken = webLogin.token
  const webUserId = webLogin.userInfo.id
  check('Web 登录返回用户与令牌', Boolean(webToken) && webUserId === 2)

  const fuliBefore = await expectData('福卡账户基线读取', '/api/fuli-card/account', { token: webToken })
  check('福卡账户余额字段可用', typeof fuliBefore.balanceCents === 'number')

  const home = await expectData('Web 首页商品', '/api/h5/home')
  check('首页存在在售商品', Array.isArray(home.hotProducts) && home.hotProducts.length > 0)

  const detail = await expectData('Web 商品详情', `/api/h5/product/${home.hotProducts[0].id}`)
  check('商品详情含可售规格', Array.isArray(detail.skus) && detail.skus.length > 0)

  const sku = detail.skus[0]
  await expectData('Web 加入购物车', '/api/cart/add', { method: 'POST', body: { userId: webUserId, skuId: sku.id, quantity: 1 } })
  const cart = await expectData('Web 购物车读取', `/api/cart?userId=${webUserId}`)
  check('购物车写入生效', cart.some(item => item.skuId === sku.id))

  const webOrder = await expectData('Web 提交订单', '/api/order/info/create', {
    method: 'POST',
    body: {
      userId: webUserId,
      receiver: '张三',
      mobile: '13800138005',
      address: '浙江省杭州市西湖区文三路 90 号',
      items: [{ skuId: sku.id, quantity: 1 }]
    }
  })
  check('Web 订单号已生成', /^ORD/.test(webOrder.orderNo))

  const webPay = await payAndNotify(webOrder.orderNo)
  check('Web 支付回调确认', webPay.first.includes('SUCCESS'))
  check('重复回调保持成功语义', webPay.second.includes('SUCCESS'))

  const traceCode = detail.trace && detail.trace.traceCode
  if (traceCode) {
    const trace = await expectData('Web 扫码溯源', `/api/h5/trace/${traceCode}`)
    check('溯源结果已上链', trace.verified === true && trace.chainStatus === '已上链')
  } else {
    check('Web 扫码溯源', false, '当前商品缺少溯源夹具')
  }

  /* ---------------- 小程序渠道 ---------------- */
  const miniSession = await expectData('小程序 code2session', '/api/wechat/miniapp/code2session', { method: 'POST', body: { code: 'mock-mini-2' } })
  check('小程序返回 openid/unionid', Boolean(miniSession.openid) && Boolean(miniSession.unionid))
  check('小程序不下发 AppSecret', !('appSecret' in miniSession) && !('secret' in miniSession))

  const miniLogin = await expectData('小程序微信登录', '/api/user/auth/wechat', {
    method: 'POST',
    body: { code: 'mock-mini-2', channel: 'weapp' }
  })
  check('小程序登录落到同一用户', miniLogin.userInfo.id === webUserId)
  const miniInfo = await expectData('小程序令牌可换取身份', '/api/user/auth/info', { token: miniLogin.token })
  check('小程序身份与登录一致', miniInfo.id === webUserId && miniInfo.username === 'zhangsan')

  const miniOrder = await expectData('小程序提交订单', '/api/order/info/create', {
    method: 'POST',
    body: {
      userId: miniLogin.userInfo.id,
      receiver: '张三',
      mobile: '13800138005',
      address: '上海市浦东新区世纪大道 100 号',
      items: [{ skuId: sku.id, quantity: 1 }]
    }
  })
  const miniPay = await payAndNotify(miniOrder.orderNo)
  check('小程序支付回调确认', miniPay.first.includes('SUCCESS'))

  const prepay = await expectData('小程序 JSAPI 预支付', '/api/wechat/pay/prepay', {
    method: 'POST',
    body: { payNo: miniPay.pay.payNo, openid: miniSession.openid, orderNo: miniOrder.orderNo }
  })
  check('预支付返回可直接调起的参数', String(prepay.package || '').includes('prepay_id=') && Boolean(prepay.paySign))

  const miniMsg = await expectData('小程序订阅发货提醒', '/api/wechat/subscribe/send', {
    method: 'POST',
    body: { openid: miniSession.openid, templateId: 'TM_SHIP_2026', page: 'pages/order/index', data: { orderNo: miniOrder.orderNo } }
  })
  check('订阅消息已受理', miniMsg.status === 'accepted' && miniMsg.simulated === true)
  const miniInbox = await expectData('小程序消息可查询', `/api/wechat/messages?openid=${miniSession.openid}`)
  check('消息收件箱存在该条记录', miniInbox.some(item => item.msgId === miniMsg.msgId))

  /* ---------------- 公众号渠道 ---------------- */
  const authorize = await request('/api/wechat/mp/authorize?redirect_uri=https%3A%2F%2Fh5.fulishe.cn%2Fauth&state=2')
  const location = authorize.headers.get('location') || ''
  check('公众号网页授权返回 302', authorize.status === 302, `HTTP ${authorize.status}`)
  const authCode = (location.match(/code=([^&]+)/) || [])[1]
  check('授权跳转携带 code', Boolean(authCode))
  if (!authCode) throw new Error('公众号授权码缺失')

  const oauth = await expectData('公众号换取 openid', '/api/wechat/mp/oauth', { method: 'POST', body: { code: authCode } })
  check('公众号与小程序的 unionid 一致', oauth.unionid === miniSession.unionid)
  check('不同应用 openid 相互隔离', oauth.openid !== miniSession.openid)

  const authorizeAgain = await request('/api/wechat/mp/authorize?redirect_uri=https%3A%2F%2Fh5.fulishe.cn%2Fauth&state=2')
  const mpCode = ((authorizeAgain.headers.get('location') || '').match(/code=([^&]+)/) || [])[1]
  const mpLogin = await expectData('公众号微信登录', '/api/user/auth/wechat', { method: 'POST', body: { code: mpCode, channel: 'mp' } })
  check('公众号登录落到同一用户', mpLogin.userInfo.id === webUserId && mpLogin.userInfo.channel === 'mp')

  await expectRejected('已使用的授权码不可重复消费', '/api/user/auth/wechat', { method: 'POST', body: { code: mpCode, channel: 'mp' } })

  const signature = await expectData('公众号 JS-SDK 签名', '/api/wechat/jsapi/signature', {
    method: 'POST',
    body: { url: 'https://h5.fulishe.cn/pages/home/index' }
  })
  check('签名结构完整', Boolean(signature.appId) && Boolean(signature.timestamp) && Boolean(signature.nonceStr) && /^[0-9a-f]{40}$/.test(signature.signature))
  check('签名接口不泄露密钥', !('appSecret' in signature) && !('secret' in signature) && !('jsapiTicket' in signature))
  check('签名覆盖分享与扫码能力', Array.isArray(signature.jsApiList) && signature.jsApiList.includes('scanQRCode'))

  const mpOrder = await expectData('公众号提交订单', '/api/order/info/create', {
    method: 'POST',
    body: {
      userId: mpLogin.userInfo.id,
      receiver: '张三',
      mobile: '13800138005',
      address: '北京市朝阳区建国路 88 号',
      items: [{ skuId: sku.id, quantity: 1 }]
    }
  })
  const mpPay = await payAndNotify(mpOrder.orderNo)
  check('公众号支付回调确认', mpPay.first.includes('SUCCESS'))

  await expectData('公众号订阅发货提醒', '/api/wechat/subscribe/send', {
    method: 'POST',
    body: { openid: oauth.openid, templateId: 'TM_GIFT_2026', page: 'pages/card/index', data: { orderNo: mpOrder.orderNo } }
  })

  /* ---------------- 跨渠道一致性 ---------------- */
  const adminLogin = await expectData('管理员登录', '/api/user/auth/login', { method: 'POST', body: { username: 'admin', password: '123456' } })
  const adminToken = adminLogin.token

  const payRecords = await expectData('管理员读取支付流水', '/api/admin/pay/record?size=200', { token: adminToken })
  const record = payRecords.records.find(item => item.payNo === webPay.pay.payNo)
  check('支付流水通知次数保持幂等', Boolean(record) && record.notifyCount === 2, record ? `notifyCount=${record.notifyCount}` : '未找到流水')

  const adminOrders = await expectData('管理员读取订单', '/api/admin/order/info/page?size=200', { token: adminToken })
  const channelOrderNos = [webOrder.orderNo, miniOrder.orderNo, mpOrder.orderNo]
  const found = channelOrderNos.filter(no => adminOrders.records.some(order => order.orderNo === no))
  check('三渠道订单均可在后台查询', found.length === 3, found.join(', '))
  check('三渠道订单号互不相同', new Set(channelOrderNos).size === 3)

  const fuliAfter = await expectData('福卡账户读取', '/api/fuli-card/account', { token: webToken })
  check('微信渠道支付未触碰福卡余额', fuliAfter.balanceCents === fuliBefore.balanceCents, `${fuliBefore.balanceCents} → ${fuliAfter.balanceCents}`)

  await expectRejected('非法 redirect_uri 被拒绝', '/api/wechat/mp/authorize?redirect_uri=javascript%3Aalert(1)')
  await expectRejected('签名接口校验 URL', '/api/wechat/jsapi/signature', { method: 'POST', body: { url: '' } })
  await expectRejected('未知授权码登录失败', '/api/user/auth/wechat', { method: 'POST', body: { code: 'unknown-code', channel: 'mp' } })

  console.log(failCount === 0 ? '\n三渠道模拟联调全部通过 ✓' : `\n存在 ${failCount} 项未通过 ✗`)
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
    console.error('\n联调执行失败：', error.message)
    failCount++
  } finally {
    await stopServer()
    process.exitCode = failCount === 0 ? 0 : 1
  }
})()

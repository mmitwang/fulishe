/**
 * 微信开放能力模拟（Web / 小程序 / 公众号三渠道模拟联调）。
 * 只模拟协议与返回结构，不持有 AppSecret、商户密钥或证书。
 */
const crypto = require('crypto')
const { ok, fail, fmt } = require('./helpers.cjs')
const { users } = require('./seed.cjs')

const APP_ID = { mini: 'wxmock_mini_2026', mp: 'wxmock_mp_2026', web: 'wxmock_web_2026' }
const CODE_TTL = 5 * 60 * 1000
const codes = new Map()
const messages = []
let messageSeq = 2000

const channelApp = channel => (channel === 'weapp' || channel === 'mini' ? 'mini' : channel === 'web' ? 'web' : 'mp')

const normalizeChannel = channel => {
  const value = String(channel || '').toLowerCase()
  if (value === 'weapp' || value === 'mini' || value === 'miniprogram') return 'weapp'
  if (value === 'web' || value === 'browser') return 'web'
  return 'mp'
}

/** 联调码形如 mock-mini-2 / mock-mp-2，末尾数字代表用户 ID */
const identityFromCode = (code, channel) => {
  const raw = String(code || '').trim()
  if (!/^mock-/.test(raw)) return null
  const match = raw.match(/(\d+)$/)
  const userId = match ? Number(match[1]) : 2
  const user = users.find(u => u.id === userId)
  if (!user) return null
  const app = channelApp(channel)
  return {
    userId: user.id,
    username: user.username,
    channel,
    appId: APP_ID[app],
    openid: `mock_openid_${app}_${user.id}`,
    unionid: `mock_unionid_${user.id}`
  }
}

const issueCode = identity => {
  const code = `mock-code-${crypto.randomBytes(8).toString('hex')}`
  codes.set(code, { ...identity, expiresAt: Date.now() + CODE_TTL })
  return code
}

const consumeCode = (code, channel) => {
  const key = String(code || '').trim()
  if (!key) return null
  const cached = codes.get(key)
  if (cached) {
    codes.delete(key)
    if (cached.expiresAt <= Date.now()) return null
    return cached
  }
  return identityFromCode(key, channel)
}

module.exports = function registerWechatRoutes(app, jwt, SECRET_KEY) {
  const signToken = user => jwt.sign(
    { id: user.id, tenantId: user.tenantId, username: user.username, userType: user.userType },
    SECRET_KEY,
    { expiresIn: '24h' }
  )

  const buildUserInfo = (user, identity) => ({
    id: user.id,
    tenantId: user.tenantId,
    username: user.username,
    nickname: user.nickname,
    realName: user.realName,
    mobile: user.mobile,
    avatar: '',
    userType: user.userType,
    openid: identity.openid,
    unionid: identity.unionid,
    channel: identity.channel
  })

  /* ---------------- 渠道配置（不含任何密钥） ---------------- */
  app.get('/api/wechat/config', (req, res) => {
    ok(res, {
      mode: 'simulation',
      appIds: APP_ID,
      channels: ['weapp', 'mp', 'web'],
      jsapiDomains: ['h5.fulishe.cn', 'localhost'],
      subscribeTemplates: [
        { templateId: 'TM_SHIP_2026', name: '订单发货提醒' },
        { templateId: 'TM_GIFT_2026', name: '福卡收礼提醒' }
      ],
      secretConfigured: false,
      note: '模拟模式仅回放协议结构，真实凭证需在服务端配置'
    })
  })

  /* ---------------- 小程序 code2session ---------------- */
  app.post('/api/wechat/miniapp/code2session', (req, res) => {
    const identity = identityFromCode(req.body.code || 'mock-mini-2', 'weapp')
    if (!identity) return fail(res, '无效的小程序登录码')
    ok(res, {
      openid: identity.openid,
      unionid: identity.unionid,
      sessionKey: `mock_session_${crypto.randomBytes(6).toString('hex')}`,
      simulated: true
    })
  })

  /* ---------------- 公众号网页授权 ---------------- */
  app.get('/api/wechat/mp/authorize', (req, res) => {
    const channel = 'mp'
    const identity = identityFromCode(`mock-mp-${req.query.state || 2}`, channel)
    if (!identity) return fail(res, '授权用户不存在')
    const code = issueCode(identity)
    const redirectUri = String(req.query.redirect_uri || '')
    if (!redirectUri) return ok(res, { code, state: req.query.state || '', simulated: true })
    if (!/^https?:\/\//.test(redirectUri)) return fail(res, 'redirect_uri 必须为 http(s) 地址')
    const joiner = redirectUri.includes('?') ? '&' : '?'
    res.redirect(302, `${redirectUri}${joiner}code=${encodeURIComponent(code)}&state=${encodeURIComponent(String(req.query.state || ''))}`)
  })

  app.post('/api/wechat/mp/oauth', (req, res) => {
    const identity = consumeCode(req.body.code, 'mp')
    if (!identity) return fail(res, '授权码无效或已过期')
    ok(res, { openid: identity.openid, unionid: identity.unionid, channel: identity.channel, simulated: true })
  })

  /* ---------------- 统一微信登录（小程序 / 公众号 / Web） ---------------- */
  app.post('/api/user/auth/wechat', (req, res) => {
    const channel = normalizeChannel(req.body.channel)
    const identity = consumeCode(req.body.code, channel)
    if (!identity) return fail(res, channel === 'weapp' ? '小程序登录凭证无效' : '网页授权码无效或已过期')
    const user = users.find(u => u.id === identity.userId)
    if (!user) return fail(res, '微信账号未绑定福礼社用户')
    const token = signToken(user)
    ok(res, {
      token,
      refreshToken: token,
      userInfo: buildUserInfo(user, { ...identity, channel })
    }, '微信登录成功')
  })

  /* ---------------- JS-SDK 签名（公众号 H5 分享 / 扫码） ---------------- */
  app.post('/api/wechat/jsapi/signature', (req, res) => {
    const url = String(req.body.url || '')
    if (!/^https?:\/\//.test(url)) return fail(res, '签名 URL 必须为 http(s) 地址')
    const ticket = `mock_jsapi_ticket_${APP_ID.mp}`
    const nonceStr = crypto.randomBytes(8).toString('hex')
    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = crypto
      .createHash('sha1')
      .update(`jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`)
      .digest('hex')
    ok(res, {
      appId: APP_ID.mp,
      timestamp,
      nonceStr,
      signature,
      jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData', 'scanQRCode'],
      simulated: true
    })
  })

  /* ---------------- 订阅消息模拟下发 ---------------- */
  app.post('/api/wechat/subscribe/send', (req, res) => {
    const { openid, templateId, page, data } = req.body
    if (!openid) return fail(res, '缺少接收人 openid')
    if (!templateId) return fail(res, '缺少订阅消息模板 ID')
    const message = {
      msgId: `MSG${++messageSeq}`,
      openid,
      templateId,
      page: page || '',
      data: data || {},
      status: 'accepted',
      sendTime: fmt(new Date()),
      simulated: true
    }
    messages.unshift(message)
    if (messages.length > 200) messages.length = 200
    ok(res, message, '订阅消息已受理（模拟）')
  })

  app.get('/api/wechat/messages', (req, res) => {
    const openid = String(req.query.openid || '')
    const list = openid ? messages.filter(item => item.openid === openid) : messages
    ok(res, list)
  })

  /* ---------------- 微信 JSAPI 预支付参数（模拟） ---------------- */
  app.post('/api/wechat/pay/prepay', (req, res) => {
    const { payNo, openid, orderNo } = req.body
    if (!payNo) return fail(res, '缺少支付单号')
    if (!openid) return fail(res, '缺少付款人 openid')
    ok(res, {
      orderNo: orderNo || '',
      payNo,
      appId: APP_ID.mp,
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: crypto.randomBytes(8).toString('hex'),
      package: `prepay_id=mock_${payNo}`,
      signType: 'RSA',
      paySign: `mock_sign_${crypto.createHash('md5').update(String(payNo)).digest('hex')}`,
      simulated: true
    })
  })
}

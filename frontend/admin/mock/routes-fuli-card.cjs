const { ok, fail } = require('./helpers.cjs')
const { service } = require('./fuli-card-service.cjs')

module.exports = function registerFuliCardRoutes(app, jwt, SECRET_KEY) {
  const withUser = handler => (req, res) => {
    let auth
    try {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
      auth = jwt.verify(token, SECRET_KEY)
    } catch (error) {
      return fail(res, '请先登录后使用福卡', 401)
    }
    try {
      return handler(req, res, Number(auth.id))
    } catch (error) {
      console.error('[FuliCard] 操作失败', error.code || 'ERROR', error.message)
      return fail(res, error.message || '福卡操作失败', 400)
    }
  }

  app.get('/api/fuli-card/account', withUser((req, res, userId) => ok(res, service.getAccount(userId))))
  app.get('/api/fuli-card/flows', withUser((req, res, userId) => ok(res, service.listFlows(userId, req.query))))
  app.get('/api/fuli-card/operations/:requestId', withUser((req, res, userId) => ok(res, service.getOperation(userId, req.params.requestId))))

  app.post('/api/fuli-card/recharge', withUser((req, res, userId) => {
    ok(res, service.createRecharge(userId, req.body), '充值单已创建，等待模拟支付确认')
  }))
  app.post('/api/fuli-card/recharge/complete', withUser((req, res, userId) => {
    ok(res, service.completeRecharge(userId, req.body), '模拟充值成功')
  }))
  app.post('/api/fuli-card/transfer', withUser((req, res, userId) => {
    ok(res, service.transfer(userId, req.body), '福卡转赠成功')
  }))
}

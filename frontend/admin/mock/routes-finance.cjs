const { ok, fail } = require('./helpers.cjs')
const { createAuthz, ALL } = require('./authz.cjs')
const service = require('./finance-service.cjs')

module.exports = function registerFinanceRoutes(app, jwt, SECRET_KEY) {
  const { authenticate, requirePermission, requireSuperAdmin } = createAuthz(jwt, SECRET_KEY)

  app.use('/api/admin/finance', authenticate, requirePermission('pay:commission'))

  app.get('/api/admin/finance/config', (req, res) => ok(res, service.getConfig()))

  app.put('/api/admin/finance/config', requireSuperAdmin, (req, res) => {
    try {
      ok(res, service.updateConfig(req.body), '分账配置已保存')
    } catch (error) {
      fail(res, error.message || '分账配置保存失败', Number(error.status) || 400)
    }
  })

  app.get('/api/admin/finance/split/page', (req, res) => {
    const merchantId = req.auth.dataScope === ALL ? req.query.merchantId : req.auth.merchantId
    const result = service.page({
      merchantId,
      orderNo: req.query.orderNo,
      pageNum: req.query.pageNum || req.query.current,
      pageSize: req.query.pageSize || req.query.size
    })
    result.current = result.pageNum
    result.size = result.pageSize
    ok(res, result)
  })

  app.get('/api/admin/finance/split/summary', (req, res) => {
    ok(res, service.summary(req.auth.dataScope === ALL ? req.query.merchantId : req.auth.merchantId))
  })
}

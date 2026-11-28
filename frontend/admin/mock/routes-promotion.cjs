const { ok, fail, paginate, like, numEq } = require('./helpers.cjs')
const { createAuthz } = require('./authz.cjs')
const service = require('./promotion-service.cjs')

module.exports = function registerPromotionRoutes(app, jwt, SECRET_KEY) {
  const { authenticate, requirePermission, requireSuperAdmin } = createAuthz(jwt, SECRET_KEY)
  const permission = requirePermission('promotion:fullreduction')
  const handle = handler => (req, res) => {
    try {
      ok(res, handler(req, res))
    } catch (error) {
      fail(res, error.message || '满减配置操作失败')
    }
  }

  app.get('/api/admin/promotion/full-reduction/page', authenticate, permission, (req, res) => {
    let list = [...service.fullReductionRules]
    if (req.query.name) list = list.filter(item => like(item.name, req.query.name))
    if (!numEq(null, req.query.status)) list = list.filter(item => numEq(item.status, req.query.status))
    list.sort((a, b) => Number(a.thresholdAmount) - Number(b.thresholdAmount) || Number(a.id) - Number(b.id))
    const result = paginate(list, req.query)
    result.records = result.records.map(service.view)
    ok(res, result)
  })

  app.post('/api/admin/promotion/full-reduction', authenticate, permission, requireSuperAdmin, handle(req =>
    service.createRule(req.body)
  ))

  app.put('/api/admin/promotion/full-reduction/:id', authenticate, permission, requireSuperAdmin, handle(req =>
    service.updateRule(req.params.id, req.body)
  ))

  app.put('/api/admin/promotion/full-reduction/:id/status', authenticate, permission, requireSuperAdmin, handle(req =>
    service.toggleStatus(req.params.id, req.body.status)
  ))

  app.delete('/api/admin/promotion/full-reduction/:id', authenticate, permission, requireSuperAdmin, handle(req => {
    service.removeRule(req.params.id)
    return null
  }))
}

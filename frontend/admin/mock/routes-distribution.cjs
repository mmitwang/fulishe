const { ok, fail, paginate, like } = require('./helpers.cjs')
const { createAuthz, ALL, SUPER_ADMIN, MERCHANT_ADMIN, OPERATOR, DISTRIBUTOR_ROLE } = require('./authz.cjs')
const service = require('./distribution-service.cjs')

module.exports = function registerDistributionRoutes(app, jwt, SECRET_KEY) {
  const {
    authenticate, requirePermission, requireAnyPermission, requireAnyRole, requireSuperAdmin,
    scopeMerchant, scopeDistributor, forbidden
  } = createAuthz(jwt, SECRET_KEY)
  const distributorOnly = requireAnyRole(DISTRIBUTOR_ROLE)
  const ruleEditors = [SUPER_ADMIN, MERCHANT_ADMIN, OPERATOR]
  const handle = handler => (req, res) => {
    try {
      const result = handler(req, res)
      if (result !== undefined) ok(res, result)
    } catch (error) {
      if (Number(error.status) === 403) return forbidden(res, error.message)
      fail(res, error.message || '分销操作失败')
    }
  }

  // 消费端打开分享时校验商品、有效期、撤品和自购，不暴露其他分销商数据。
  app.get('/api/distribution/attribution', (req, res) => {
    ok(res, service.validateShare(req.query.shareId, req.query.spuId, req.query.userId))
  })

  app.get('/api/distribution/rules/page', authenticate, requirePermission('distribution:rule'), (req, res) => {
    let list = scopeMerchant(req.auth, service.distributionRules)
    if (req.query.spuName) list = list.filter(item => like(service.ruleView(item).spuName, req.query.spuName))
    if (req.query.status !== undefined && req.query.status !== '') list = list.filter(item => item.status === Number(req.query.status))
    const result = paginate(list, req.query)
    result.records = result.records.map(service.ruleView)
    ok(res, result)
  })
  app.post('/api/distribution/rules', authenticate, requirePermission('distribution:rule'), requireAnyRole(...ruleEditors), handle(req => service.createRule(req.auth, req.body)))
  app.put('/api/distribution/rules/:id/status', authenticate, requirePermission('distribution:rule'), requireAnyRole(...ruleEditors), handle((req, res) => {
    const rule = service.distributionRules.find(item => item.id === Number(req.params.id))
    if (!rule) throw new Error('佣金规则不存在')
    if (req.auth.dataScope !== ALL && Number(rule.merchantId) !== Number(req.auth.merchantId)) {
      forbidden(res, '无权修改其他商户佣金规则')
      return
    }
    rule.status = Number(req.body.status) === 1 ? 1 : 0
    rule.updateTime = new Date().toISOString()
    return service.ruleView(rule)
  }))

  app.get('/api/distribution/distributors/page', authenticate, requirePermission('distribution:distributor'), requireSuperAdmin, (req, res) => {
    let list = [...service.distributors]
    if (req.query.keyword) list = list.filter(item => like(item.name, req.query.keyword) || like(item.distributorCode, req.query.keyword))
    const result = paginate(list, req.query)
    result.records = result.records.map(service.distributorView)
    ok(res, result)
  })
  app.put('/api/distribution/distributors/:id/status', authenticate, requirePermission('distribution:distributor'), requireSuperAdmin, handle(req => {
    const distributor = service.distributors.find(item => item.id === Number(req.params.id))
    if (!distributor) throw new Error('分销商不存在')
    distributor.status = Number(req.body.status) === 1 ? 1 : 0
    return service.distributorView(distributor)
  }))
  // 绑定/解绑上级分销商：平台仅允许二级分销，禁止自绑、成环、三级
  app.put('/api/distribution/distributors/:id/parent', authenticate, requirePermission('distribution:distributor'), requireSuperAdmin, handle(req =>
    service.bindParent(Number(req.params.id), req.body.parentDistributorId)
  ))

  const scopePromotionOrders = auth => {
    if (auth.dataScope === ALL) return [...service.promotionOrders]
    const merchantData = auth.dataScopes.includes('MERCHANT') && auth.merchantId != null
    const distributorData = auth.roleCodes.includes(DISTRIBUTOR_ROLE) && auth.distributorId != null
    return service.promotionOrders.filter(item =>
      (merchantData && Number(item.merchantId) === Number(auth.merchantId)) ||
      (distributorData && Number(item.distributorId) === Number(auth.distributorId))
    )
  }
  const promotionPage = (req, res) => {
    service.refreshSettleable()
    let list = scopePromotionOrders(req.auth)
    if (req.query.orderNo) list = list.filter(item => like(item.orderNo, req.query.orderNo))
    if (req.query.status) list = list.filter(item => item.status === req.query.status)
    const result = paginate(list, req.query)
    result.records = result.records.map(service.promotionView)
    ok(res, result)
  }
  app.get('/api/distribution/orders/page', authenticate, requireAnyPermission('distribution:order', 'distributor:order'), promotionPage)
  app.put('/api/distribution/orders/:id/settle', authenticate, requirePermission('distribution:order'), requireSuperAdmin, handle(req =>
    service.promotionView(service.settlePromotion(req.params.id, req.auth.user.realName || req.auth.user.username))
  ))

  app.get('/api/distribution/selections/page', authenticate, requirePermission('distributor:selection'), distributorOnly, (req, res) => {
    const list = service.selectionsFor(req.auth.distributorId)
    ok(res, paginate(list, req.query))
  })
  app.post('/api/distribution/selections', authenticate, requirePermission('distributor:selection'), distributorOnly, handle(req =>
    service.selectProduct(req.auth.distributorId, req.body.spuId)
  ))
  app.delete('/api/distribution/selections/:id', authenticate, requirePermission('distributor:selection'), distributorOnly, handle(req =>
    service.removeSelection(req.auth.distributorId, req.params.id)
  ))

  app.get('/api/distribution/shares/page', authenticate, requirePermission('distributor:share'), distributorOnly, (req, res) => {
    const result = paginate(scopeDistributor(req.auth, service.distributionShares), req.query)
    result.records = result.records.map(service.shareView)
    ok(res, result)
  })
  app.post('/api/distribution/shares', authenticate, requirePermission('distributor:share'), distributorOnly, handle(req =>
    service.createShare(req.auth.distributorId, req.body.spuId)
  ))
  app.get('/api/distribution/summary', authenticate, requireAnyPermission('distributor:selection', 'distributor:order'), distributorOnly, (req, res) => {
    ok(res, service.summaryFor(req.auth.distributorId))
  })
}

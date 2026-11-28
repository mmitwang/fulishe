const { ok, fail } = require('./helpers.cjs')
const { createAuthz, ALL } = require('./authz.cjs')
const service = require('./invoice-service.cjs')

module.exports = function registerInvoiceRoutes(app, jwt, SECRET_KEY) {
  const { authenticate, requirePermission, assertMerchantAccess, forbidden } = createAuthz(jwt, SECRET_KEY)

  const handle = handler => (req, res) => {
    try {
      ok(res, handler(req, res))
    } catch (error) {
      fail(res, error.message || '发票操作失败', Number(error.status) || 400)
    }
  }

  /* ---------------- H5 消费者 ---------------- */
  app.post('/api/invoice/apply', handle(req => service.apply(Number(req.body.userId || 2), req.body)))
  app.get('/api/invoice/my', (req, res) => {
    const userId = Number(req.query.userId || 2)
    const list = service.invoices
      .filter(item => Number(item.userId) === userId)
      .sort((a, b) => Number(b.id) - Number(a.id))
      .map(service.view)
    ok(res, list)
  })

  /* ---------------- 管理端 ---------------- */
  app.use('/api/admin/invoice', authenticate)

  app.get('/api/admin/invoice/page', requirePermission('pay:invoice'), (req, res) => {
    const result = service.page({
      merchantId: req.auth.dataScope === ALL ? req.query.merchantId : req.auth.merchantId,
      orderNo: req.query.orderNo,
      status: req.query.status === undefined ? '' : req.query.status,
      pageNum: req.query.pageNum || req.query.current,
      pageSize: req.query.pageSize || req.query.size
    })
    result.current = result.pageNum
    result.size = result.pageSize
    ok(res, result)
  })

  app.get('/api/admin/invoice/summary', requirePermission('pay:invoice'), (req, res) => {
    ok(res, service.summary(req.auth.dataScope === ALL ? req.query.merchantId : req.auth.merchantId))
  })

  const findAccessible = (req, res) => {
    const invoice = service.findById(req.params.id)
    if (!invoice) {
      fail(res, '发票不存在', 404)
      return null
    }
    if (!assertMerchantAccess(req.auth, invoice.merchantId)) {
      forbidden(res, '无权操作其他商户的发票')
      return null
    }
    return invoice
  }

  app.put('/api/admin/invoice/:id/issue', requirePermission('pay:invoice'), (req, res) => {
    if (!findAccessible(req, res)) return
    const operator = req.auth.user.realName || req.auth.user.username
    ok(res, service.issue(req.params.id, operator), '发票已开具')
  })

  app.put('/api/admin/invoice/:id/red-flush', requirePermission('pay:invoice'), (req, res) => {
    if (!findAccessible(req, res)) return
    const operator = req.auth.user.realName || req.auth.user.username
    ok(res, service.redFlush(req.params.id, req.body.reason, operator), '发票已红冲')
  })
}

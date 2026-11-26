/**
 * 运营驾驶舱 Mock 端点：服务端聚合经营指标 + 虚拟并发压测。
 */
const { ok } = require('./helpers.cjs')
const { orders } = require('./seed-extra.cjs')

module.exports = function registerOpsRoutes(app) {
  app.get('/api/ops/dashboard', (req, res) => {
    const paid = orders.filter(o => o.payStatus === 1)
    const gmv = paid.reduce((sum, o) => sum + Number(o.payAmount || 0), 0)
    ok(res, {
      gmv: Number(gmv.toFixed(2)),
      orderCount: orders.length,
      paidCount: paid.length,
      payRate: orders.length ? Number(((paid.length / orders.length) * 100).toFixed(1)) : 0,
      pendingShip: orders.filter(o => o.orderStatus === 1).length,
      funnel: [
        { key: 'created', label: '下单', count: orders.length },
        { key: 'paid', label: '支付', count: paid.length },
        { key: 'shipped', label: '发货', count: orders.filter(o => o.orderStatus === 2 || o.orderStatus >= 3).length },
        { key: 'done', label: '完成', count: orders.filter(o => o.orderStatus >= 3).length }
      ],
      recent: orders.slice(0, 8).map(o => ({ orderNo: o.orderNo, payAmount: o.payAmount, orderStatus: o.orderStatus, payStatus: o.payStatus, userName: o.userName, createTime: o.createTime }))
    })
  })

  app.post('/api/ops/stress', async (req, res) => {
    const count = Math.min(Math.max(Number((req.body || {}).count) || 20, 1), 200)
    const started = Date.now()
    for (let i = 0; i < count; i++) await new Promise(r => setTimeout(r, 2))
    const elapsed = Date.now() - started
    ok(res, {
      count,
      steps: count * 4,
      elapsedMs: elapsed,
      tps: Number(((count / Math.max(elapsed, 1)) * 1000).toFixed(1)),
      note: '虚拟交易全链路：创建→支付→发货→完成（内存模拟，不落库）'
    })
  })
}

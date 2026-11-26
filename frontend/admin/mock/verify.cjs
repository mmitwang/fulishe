/**
 * Mock 数据一致性验证：SKU→SPU、订单状态机、支付幂等、退款引用、视频字段。
 * 运行：node frontend/admin/mock/verify.cjs
 */
const { products, skus, categories, users } = require('./seed.cjs')
const { orders, orderItems, payRecords, refunds } = require('./seed-extra.cjs')
const { createFuliCardService, FuliCardError } = require('./fuli-card-service.cjs')

let failCount = 0
const check = (name, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!pass) failCount++
}

const productIds = new Set(products.map(p => p.id))
check('SKU→SPU 引用完整', skus.every(s => productIds.has(s.spuId)), `${skus.length} SKU / ${products.length} SPU`)
check('商品→分类 引用完整', products.every(p => categories.some(c => c.id === p.categoryId)), `${categories.length} 分类`)

const orderIds = new Set(orders.map(o => o.id))
check('订单项→订单 引用完整', orderItems.every(i => orderIds.has(i.orderId)), `${orderItems.length} 项 / ${orders.length} 单`)

const illegal = orders.filter(o => (o.payStatus === 1 && o.orderStatus < 1) || (o.payStatus === 3 && o.orderStatus !== 4))
check('订单状态机合法', illegal.length === 0, illegal.length ? JSON.stringify(illegal.slice(0, 3).map(o => ({ orderNo: o.orderNo, payStatus: o.payStatus, orderStatus: o.orderStatus }))) : '')

const payNos = payRecords.map(p => p.orderNo)
check('支付流水幂等（orderNo 唯一）', new Set(payNos).size === payNos.length, `${payNos.length} 条流水`)

const refundsWithOrder = refunds.filter(r => r.orderId != null)
check('退款→订单 引用完整', refundsWithOrder.every(r => orderIds.has(r.orderId)), `${refundsWithOrder.length} 条含 orderId`)

const videoCount = products.filter(p => p.videoUrl).length
check('视频字段就位', videoCount >= 3, `${videoCount} 个商品含 videoUrl`)

/* 福卡使用独立账本夹具，避免验证过程修改页面演示种子。 */
const createFuliFixture = () => ({
  fuliAccounts: [], fuliFlows: [], fuliRecharges: [], fuliTransfers: [], fuliOperations: [],
  orders: [
    { id: 1001, orderNo: 'ORD-FULI-A', userId: 2, tenantId: 1, orderStatus: 0, payStatus: 0, payAmount: 30, payMethod: '', payNo: null, payTime: null },
    { id: 1002, orderNo: 'ORD-FULI-B', userId: 2, tenantId: 1, orderStatus: 0, payStatus: 0, payAmount: 200, payMethod: '', payNo: null, payTime: null },
    { id: 1003, orderNo: 'ORD-FULI-C', userId: 2, tenantId: 1, orderStatus: 0, payStatus: 0, payAmount: 100, payMethod: '', payNo: null, payTime: null },
    { id: 1004, orderNo: 'ORD-FULI-D', userId: 2, tenantId: 1, orderStatus: 0, payStatus: 0, payAmount: 100, payMethod: '', payNo: null, payTime: null }
  ],
  payRecords: [], refunds: []
})
const fuliState = createFuliFixture()
const fuli = createFuliCardService(fuliState, users)
const expectFuliReject = (name, action, code) => {
  let actualCode = ''
  try { action() } catch (error) { actualCode = error.code || error.message }
  check(name, actualCode === code, `期望 ${code}，实际 ${actualCode || '未拒绝'}`)
}

const rechargeInput = { requestId: 'R-1', amountCents: 20000 }
const rechargeCreated = fuli.createRecharge(2, rechargeInput)
const rechargeDuplicate = fuli.createRecharge(2, rechargeInput)
check('福卡充值创建幂等', rechargeCreated.rechargeNo === rechargeDuplicate.rechargeNo && fuliState.fuliRecharges.length === 1)
check('充值确认前不入账', fuli.getAccount(2).balanceCents === 0)
fuli.completeRecharge(2, { requestId: 'R-1', rechargeNo: rechargeCreated.rechargeNo })
fuli.completeRecharge(2, { requestId: 'R-1', rechargeNo: rechargeCreated.rechargeNo })
check('充值确认及重复通知只入账一次', fuli.getAccount(2).balanceCents === 20000 && fuliState.fuliFlows.filter(f => f.bizType === 'RECHARGE').length === 1)
expectFuliReject('同请求号不同金额被拒绝', () => fuli.createRecharge(2, { requestId: 'R-1', amountCents: 30000 }), 'IDEMPOTENCY_CONFLICT')

const giftInput = { requestId: 'T-1', toUsername: 'user1', amountCents: 2000, remark: '节日快乐' }
const gift = fuli.transfer(2, giftInput)
fuli.transfer(2, giftInput)
check('福卡转赠双边入账且重复安全', fuli.getAccount(2).balanceCents === 18000 && fuli.getAccount(4).balanceCents === 2000 && fuliState.fuliFlows.filter(f => f.bizNo === gift.transferNo).length === 2)
expectFuliReject('福卡禁止自转', () => fuli.transfer(2, { requestId: 'T-2', toUsername: 'zhangsan', amountCents: 100 }), 'SELF_TRANSFER_NOT_ALLOWED')
expectFuliReject('福卡收款人必须存在', () => fuli.transfer(2, { requestId: 'T-3', toUsername: 'not_exists', amountCents: 100 }), 'RECIPIENT_NOT_FOUND')
expectFuliReject('福卡转赠不能透支', () => fuli.transfer(2, { requestId: 'T-4', toUsername: 'user1', amountCents: 99999 }), 'INSUFFICIENT_BALANCE')

const paidA = fuli.payOrder(2, 'ORD-FULI-A', 'ORDER_PAY:A')
fuli.payOrder(2, 'ORD-FULI-A', 'ORDER_PAY:A')
const paidARetry = fuli.payOrder(2, 'ORD-FULI-A', 'ORDER_PAY:A:retry')
check('福卡订单重复支付只扣一次', paidA.payNo === paidARetry.payNo && fuli.getAccount(2).balanceCents === 15000 && fuliState.fuliFlows.filter(f => f.bizType === 'ORDER_PAY' && f.bizNo === 'ORD-FULI-A').length === 1)
expectFuliReject('余额不足订单保持待支付', () => fuli.payOrder(2, 'ORD-FULI-B', 'ORDER_PAY:B'), 'INSUFFICIENT_BALANCE')
check('余额不足未产生订单资金副作用', fuliState.orders.find(o => o.orderNo === 'ORD-FULI-B').payStatus === 0 && !fuliState.fuliFlows.some(f => f.bizNo === 'ORD-FULI-B'))
fuli.payOrder(2, 'ORD-FULI-C', 'ORDER_PAY:C')
expectFuliReject('竞争同一余额时第二笔被拒绝', () => fuli.payOrder(2, 'ORD-FULI-D', 'ORDER_PAY:D'), 'INSUFFICIENT_BALANCE')
check('竞争扣款后余额不为负', fuli.getAccount(2).balanceCents === 5000)

fuli.refundOrder(2, paidA.payNo, 'ORDER_REFUND:A', '测试退款')
fuli.refundOrder(2, paidA.payNo, 'ORDER_REFUND:A', '测试退款')
fuli.refundOrder(2, paidA.payNo, 'ORDER_REFUND:A:retry', '测试退款')
check('福卡退款幂等且余额恢复', fuli.getAccount(2).balanceCents === 8000 && fuliState.refunds.filter(r => r.payNo === paidA.payNo && r.refundStatus === 2).length === 1)
check('福卡订单支付退款流水可追踪', fuliState.orders.find(o => o.orderNo === 'ORD-FULI-A').payStatus === 3 && fuliState.fuliFlows.filter(f => f.bizNo === 'ORD-FULI-A').length === 2)
check('福卡操作结果可按原请求号恢复', fuli.getOperation(2, 'T-1').data.transferNo === gift.transferNo)
check('福卡核心账本不变量', fuli.assertInvariants())

const simulationState = createFuliFixture()
const simulation = createFuliCardService(simulationState, users)
const simulationSeed = 20261126
let randomState = simulationSeed
let simulationError = ''
const trace = []
const random = () => {
  randomState = (randomState * 1664525 + 1013904223) >>> 0
  return randomState / 0x100000000
}
try {
  for (let i = 0; i < 240; i++) {
    const kind = Math.floor(random() * 4)
    const requestId = `SIM:${kind}:${Math.floor(random() * 12)}`
    const orderNo = `ORD-FULI-${['A', 'B', 'C', 'D'][Math.floor(random() * 4)]}`
    const step = { i, kind, requestId, orderNo }
    trace.push(step)
    if (trace.length > 20) trace.shift()
    try {
      if (kind === 0) {
        const created = simulation.createRecharge(2, { requestId, amountCents: 1000 + Math.floor(random() * 5) * 1000 })
        if (random() > 0.2) simulation.completeRecharge(2, { requestId, rechargeNo: created.rechargeNo })
      } else if (kind === 1) {
        simulation.transfer(2, { requestId, toUsername: ['user1', 'zhangsan', 'not_exists'][Math.floor(random() * 3)], amountCents: 100 + Math.floor(random() * 20) * 100 })
      } else if (kind === 2) {
        simulation.payOrder(2, orderNo, requestId)
      } else {
        const paid = simulationState.payRecords.find(record => record.payMethod === 3 && record.payStatus === 2)
        if (paid) simulation.refundOrder(2, paid.payNo, requestId, '固定种子退款')
      }
    } catch (error) {
      if (!(error instanceof FuliCardError)) throw error
    }
    simulation.assertInvariants()
  }
} catch (error) {
  simulationError = `${error.message}; seed=${simulationSeed}; trace=${JSON.stringify(trace)}`
}
check('固定种子乱序/重复操作不变量', !simulationError, simulationError || `seed ${simulationSeed} / 240 步`)

console.log(failCount === 0 ? '\n全部通过 ✓' : `\n${failCount} 项失败 ✗`)
process.exit(failCount === 0 ? 0 : 1)

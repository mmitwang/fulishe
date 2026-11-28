const { fmt } = require('./helpers.cjs')

/**
 * 资金流水台账
 * 覆盖：支付入账、退款出账、佣金计提、佣金冲正、佣金结算。
 * 金额统一使用“分”，避免浮点误差；对外仍提供元。
 */
const flows = []
let seq = 0

const nextId = list => list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1

const BIZ_LABEL = {
  PAY_IN: '支付入账',
  REFUND_OUT: '退款出账',
  COMMISSION_ACCRUAL: '佣金计提',
  COMMISSION_REVERSE: '佣金冲正',
  COMMISSION_SETTLE: '佣金结算',
  PLATFORM_FEE: '平台技术服务费',
  PLATFORM_FEE_REVERSE: '平台服务费冲正',
  MERCHANT_SPLIT: '商户应结分账',
  MERCHANT_SPLIT_REVERSE: '商户分账冲正'
}

const DIRECTION = {
  PAY_IN: 'IN',
  PLATFORM_FEE: 'IN',
  MERCHANT_SPLIT_REVERSE: 'IN'
}

const toCents = value => Math.round(Number(value || 0) * 100)

const record = ({ bizType, amountCents, orderNo, refNo, merchantId, remark }) => {
  if (!BIZ_LABEL[bizType]) throw new Error('未知资金流水类型')
  const flow = {
    id: nextId(flows),
    flowNo: `FF${Date.now()}${++seq}`,
    bizType,
    bizTypeLabel: BIZ_LABEL[bizType],
    direction: DIRECTION[bizType] || 'OUT',
    amountCents: Math.abs(Math.round(Number(amountCents) || 0)),
    amount: Math.round(Math.abs(Number(amountCents) || 0)) / 100,
    orderNo: orderNo || '',
    refNo: refNo || '',
    merchantId: merchantId == null ? null : Number(merchantId),
    remark: remark || '',
    createTime: fmt(new Date())
  }
  flows.unshift(flow)
  return flow
}

const page = ({ bizType, orderNo, merchantId, pageNum = 1, pageSize = 10 } = {}) => {
  let list = [...flows]
  if (bizType) list = list.filter(item => item.bizType === bizType)
  if (orderNo) list = list.filter(item => String(item.orderNo).includes(String(orderNo)))
  if (merchantId !== undefined && merchantId !== null && merchantId !== '') {
    list = list.filter(item => Number(item.merchantId) === Number(merchantId))
  }
  const total = list.length
  const start = (Number(pageNum) - 1) * Number(pageSize)
  return {
    total,
    pageNum: Number(pageNum),
    pageSize: Number(pageSize),
    records: list.slice(start, start + Number(pageSize))
  }
}

const summary = (merchantId) => {
  const list = merchantId === undefined || merchantId === null || merchantId === ''
    ? flows
    : flows.filter(item => Number(item.merchantId) === Number(merchantId))
  const sum = bizType => list.filter(item => item.bizType === bizType).reduce((total, item) => total + item.amountCents, 0)
  const incomeCents = sum('PAY_IN')
  const refundCents = sum('REFUND_OUT')
  const accrualCents = sum('COMMISSION_ACCRUAL')
  const reverseCents = sum('COMMISSION_REVERSE')
  const settleCents = sum('COMMISSION_SETTLE')
  const platformFeeCents = sum('PLATFORM_FEE') - sum('PLATFORM_FEE_REVERSE')
  const merchantSplitCents = sum('MERCHANT_SPLIT') - sum('MERCHANT_SPLIT_REVERSE')
  return {
    flowCount: list.length,
    incomeCents,
    income: incomeCents / 100,
    refundCents,
    refund: refundCents / 100,
    commissionAccrualCents: accrualCents,
    commissionAccrual: accrualCents / 100,
    commissionReverseCents: reverseCents,
    commissionReverse: reverseCents / 100,
    commissionSettleCents: settleCents,
    commissionSettle: settleCents / 100,
    platformFeeCents,
    platformFee: platformFeeCents / 100,
    merchantSplitCents,
    merchantSplit: merchantSplitCents / 100,
    netCents: incomeCents - refundCents,
    net: (incomeCents - refundCents) / 100,
    commissionNetCents: accrualCents - reverseCents - settleCents,
    commissionNet: (accrualCents - reverseCents - settleCents) / 100
  }
}

module.exports = { flows, record, page, summary, toCents, BIZ_LABEL }

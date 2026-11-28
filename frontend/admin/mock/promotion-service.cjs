const { fmt } = require('./helpers.cjs')

// 全场满减配置：由平台运营在后台维护，H5 与下单计价实时读取同一份数据
const fullReductionRules = [
  { id: 1, name: '满 99 减 10', thresholdAmount: 99, discountAmount: 10, status: 1, sort: 1, validStartTime: '2026-01-01 00:00:00', validEndTime: '2027-12-31 23:59:59', createTime: '2026-11-01 10:00:00' },
  { id: 2, name: '满 199 减 25', thresholdAmount: 199, discountAmount: 25, status: 1, sort: 2, validStartTime: '2026-01-01 00:00:00', validEndTime: '2027-12-31 23:59:59', createTime: '2026-11-01 10:00:00' },
  { id: 3, name: '满 299 减 40', thresholdAmount: 299, discountAmount: 40, status: 1, sort: 3, validStartTime: '2026-01-01 00:00:00', validEndTime: '2027-12-31 23:59:59', createTime: '2026-11-01 10:00:00' },
  { id: 4, name: '满 599 减 100（待启用）', thresholdAmount: 599, discountAmount: 100, status: 0, sort: 4, validStartTime: '2026-01-01 00:00:00', validEndTime: '2027-12-31 23:59:59', createTime: '2026-11-01 10:00:00' }
]

const DAY_MS = 86400000
const nextId = list => list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
const timeOf = value => new Date(String(value || '').replace(' ', 'T')).getTime()
const round2 = value => Math.round(Number(value || 0) * 100) / 100

const isEffective = (rule, at = Date.now()) => Boolean(rule) && Number(rule.status) === 1 &&
  (!rule.validStartTime || timeOf(rule.validStartTime) <= at) &&
  (!rule.validEndTime || timeOf(rule.validEndTime) >= at)

const activeRules = (at = Date.now()) => fullReductionRules
  .filter(rule => isEffective(rule, at))
  .sort((a, b) => Number(a.thresholdAmount) - Number(b.thresholdAmount) || Number(a.sort || 0) - Number(b.sort || 0))

// 取满足门槛的最高档位；返回快照写入订单，避免后续配置变更影响历史订单
const resolveFullReduction = (totalAmount, at = Date.now()) => {
  const amount = Number(totalAmount) || 0
  const rule = activeRules(at).filter(item => amount >= Number(item.thresholdAmount)).pop() || null
  if (!rule) return null
  return {
    type: 'FULL_REDUCTION',
    id: rule.id,
    ruleId: rule.id,
    name: rule.name || `满 ${rule.thresholdAmount} 减 ${rule.discountAmount}`,
    thresholdAmount: Number(rule.thresholdAmount),
    discountAmount: Number(rule.discountAmount)
  }
}

// H5 结算页只拿到启用中、在有效期内的档位
const publicPromotion = () => ({
  name: '全场满减',
  rules: activeRules().map(rule => ({
    id: rule.id,
    name: rule.name,
    thresholdAmount: Number(rule.thresholdAmount),
    discountAmount: Number(rule.discountAmount),
    sort: Number(rule.sort || 0)
  }))
})

const view = rule => ({ ...rule, effective: isEffective(rule) })

const normalize = (body, currentId = null) => {
  const thresholdAmount = round2(body.thresholdAmount)
  const discountAmount = round2(body.discountAmount)
  if (!Number.isFinite(thresholdAmount) || thresholdAmount <= 0) throw new Error('请填写大于 0 的满减门槛')
  if (!Number.isFinite(discountAmount) || discountAmount <= 0) throw new Error('请填写大于 0 的优惠金额')
  if (discountAmount >= thresholdAmount) throw new Error('优惠金额需小于满减门槛')
  if (discountAmount > 100000) throw new Error('单笔优惠金额过大，请重新填写')
  const duplicated = fullReductionRules.some(item =>
    Number(item.id) !== Number(currentId) && Number(item.thresholdAmount) === thresholdAmount
  )
  if (duplicated) throw new Error('该满减门槛已存在，请勿重复配置')
  const name = String(body.name || '').trim() || `满 ${thresholdAmount} 减 ${discountAmount}`
  const validStartTime = body.validStartTime || fmt(new Date())
  const validEndTime = body.validEndTime || fmt(new Date(Date.now() + 365 * DAY_MS))
  if (!timeOf(validStartTime) || !timeOf(validEndTime) || timeOf(validEndTime) <= timeOf(validStartTime)) {
    throw new Error('请设置有效的活动起止时间')
  }
  return {
    name,
    thresholdAmount,
    discountAmount,
    validStartTime,
    validEndTime,
    status: Number(body.status) === 0 ? 0 : 1
  }
}

const createRule = body => {
  const data = normalize(body)
  const id = nextId(fullReductionRules)
  const rule = { id, ...data, sort: id, createTime: fmt(new Date()) }
  fullReductionRules.unshift(rule)
  return view(rule)
}

const updateRule = (id, body) => {
  const rule = fullReductionRules.find(item => item.id === Number(id))
  if (!rule) throw new Error('满减规则不存在')
  Object.assign(rule, normalize({ ...rule, ...body }, rule.id), { updateTime: fmt(new Date()) })
  return view(rule)
}

const toggleStatus = (id, status) => {
  const rule = fullReductionRules.find(item => item.id === Number(id))
  if (!rule) throw new Error('满减规则不存在')
  rule.status = Number(status) === 0 ? 0 : 1
  rule.updateTime = fmt(new Date())
  return view(rule)
}

const removeRule = id => {
  const index = fullReductionRules.findIndex(item => item.id === Number(id))
  if (index < 0) throw new Error('满减规则不存在')
  fullReductionRules.splice(index, 1)
}

module.exports = {
  fullReductionRules,
  isEffective,
  activeRules,
  resolveFullReduction,
  publicPromotion,
  view,
  createRule,
  updateRule,
  toggleStatus,
  removeRule
}

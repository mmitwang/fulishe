const crypto = require('crypto')
const { fmt } = require('./helpers.cjs')
const { products, users, tenants } = require('./seed.cjs')
const { orderItems } = require('./seed-extra.cjs')
const fundService = require('./fund-service.cjs')

// 分销层级：平台只允许二级分销（直推 1 级 + 团队 2 级），parentId 为上级分销商
const distributors = [
  { id: 1, userId: 13, distributorCode: 'DIS001', name: '陈悦', mobile: '13800138021', parentId: null, status: 1, createTime: fmt(new Date()) },
  { id: 2, userId: 14, distributorCode: 'DIS002', name: '林溪', mobile: '13800138022', parentId: 1, status: 1, createTime: fmt(new Date()) }
]
const MAX_LEVEL = 2
const MAX_TOTAL_RATE = 50
const distributionRules = [
  { id: 1, ruleNo: 'DR2026001', merchantId: 2, spuId: 1, commissionRate: 10, level2CommissionRate: 3, settleDays: 7, validStartTime: '2026-01-01 00:00:00', validEndTime: '2027-12-31 23:59:59', status: 1, createTime: '2026-11-01 10:00:00' },
  { id: 2, ruleNo: 'DR2026002', merchantId: 3, spuId: 2, commissionRate: 12, level2CommissionRate: 3, settleDays: 7, validStartTime: '2026-01-01 00:00:00', validEndTime: '2027-12-31 23:59:59', status: 1, createTime: '2026-11-01 10:00:00' }
]
const distributionSelections = [
  { id: 1, distributorId: 1, merchantId: 2, spuId: 1, ruleId: 1, status: 1, createTime: '2026-11-10 10:00:00' },
  { id: 2, distributorId: 2, merchantId: 3, spuId: 2, ruleId: 2, status: 1, createTime: '2026-11-10 10:00:00' }
]
const distributionShares = []
const promotionOrders = []

const nextId = list => list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
const timeOf = value => new Date(String(value || '').replace(' ', 'T')).getTime()
const moneyCents = value => Math.round(Number(value || 0) * 100)
const productOf = spuId => products.find(item => item.id === Number(spuId))
const distributorOf = id => distributors.find(item => item.id === Number(id))
const ruleOf = id => distributionRules.find(item => item.id === Number(id))
const merchantNameOf = id => (tenants.find(item => item.id === Number(id)) || {}).tenantName || ''

// 层级由上级链推导，避免冗余字段漂移；最多向上追溯 10 层防止脏数据成环
const levelOf = distributor => {
  if (!distributor) return 0
  let level = 1
  let cursor = distributor
  let guard = 0
  while (cursor.parentId && guard++ < 10) {
    const parent = distributorOf(cursor.parentId)
    if (!parent) break
    level += 1
    cursor = parent
  }
  return level
}

// 校验上下级关系：不允许自绑、成环、超过二级、或给已有团队的分销商再挂上级（会形成三级）
const assertBindable = (distributor, parent) => {
  if (!distributor) throw new Error('分销商不存在')
  if (!parent) throw new Error('上级分销商不存在')
  if (distributor.id === parent.id) throw new Error('不能将自身设为上级分销商')
  if (Number(parent.status) !== 1) throw new Error('上级分销商已停用')
  if (levelOf(parent) >= MAX_LEVEL) throw new Error('平台仅支持二级分销，不能绑定三级及以上')
  if (distributors.some(item => Number(item.parentId) === distributor.id)) throw new Error('该分销商已有下级团队，不能再绑定上级')
  let cursor = parent
  const seen = new Set([distributor.id])
  let guard = 0
  while (cursor && guard++ < 10) {
    if (seen.has(cursor.id)) throw new Error('上下级关系存在循环')
    seen.add(cursor.id)
    cursor = cursor.parentId ? distributorOf(cursor.parentId) : null
  }
}

const isRuleEffective = (rule, at = Date.now()) => Boolean(rule && rule.status === 1 &&
  timeOf(rule.validStartTime) <= at && timeOf(rule.validEndTime) >= at)

const ruleView = rule => {
  const product = productOf(rule.spuId)
  return {
    ...rule,
    level2CommissionRate: Number(rule.level2CommissionRate || 0),
    settleDays: Number(rule.settleDays || 0),
    totalCommissionRate: Number(rule.commissionRate || 0) + Number(rule.level2CommissionRate || 0),
    merchantName: merchantNameOf(rule.merchantId),
    spuName: product ? product.spuName : `商品 ${rule.spuId}`,
    spuImage: product ? product.image : '',
    sellPrice: product ? product.sellPrice : 0,
    effective: isRuleEffective(rule)
  }
}

const distributorView = distributor => {
  const records = promotionOrders.filter(item => item.distributorId === distributor.id)
  const valid = records.filter(item => item.status !== 'INVALID')
  const user = users.find(item => item.id === distributor.userId)
  const parent = distributor.parentId ? distributorOf(distributor.parentId) : null
  const downline = distributors.filter(item => Number(item.parentId) === distributor.id)
  return {
    ...distributor,
    level: levelOf(distributor),
    levelLabel: levelOf(distributor) === 1 ? '一级分销商' : '二级分销商',
    parentName: parent ? parent.name : '',
    downlineCount: downline.length,
    username: user ? user.username : '',
    orderCount: records.length,
    totalCommissionCents: valid.reduce((sum, item) => sum + item.commissionAmount, 0),
    settledCommissionCents: valid.filter(item => item.status === 'SETTLED').reduce((sum, item) => sum + item.commissionAmount, 0),
    teamCommissionCents: valid.filter(item => item.level === 2).reduce((sum, item) => sum + item.commissionAmount, 0),
    directCommissionCents: valid.filter(item => item.level !== 2).reduce((sum, item) => sum + item.commissionAmount, 0)
  }
}

const promotionView = record => {
  const product = productOf(record.spuId)
  const distributor = distributorOf(record.distributorId)
  return {
    ...record,
    settleDays: Number(record.settleDays || 0),
    level: Number(record.level || 1),
    levelLabel: Number(record.level || 1) === 2 ? '二级(团队)' : '一级(直推)',
    distributorName: distributor ? distributor.name : `分销商 ${record.distributorId}`,
    merchantName: merchantNameOf(record.merchantId),
    spuName: product ? product.spuName : `商品 ${record.spuId}`,
    spuImage: product ? product.image : ''
  }
}

const createRule = (auth, body) => {
  const product = productOf(body.spuId)
  if (!product) throw new Error('商品不存在')
  const merchantId = auth.dataScope === 'ALL' ? Number(product.merchantId) : Number(auth.merchantId)
  if (Number(product.merchantId) !== merchantId) throw new Error('不能为其他商户商品配置佣金')
  const commissionRate = Number(body.commissionRate)
  if (!Number.isFinite(commissionRate) || commissionRate <= 0 || commissionRate > 100) throw new Error('佣金率需大于 0 且不超过 100%')
  const level2CommissionRate = Number(body.level2CommissionRate || 0)
  if (!Number.isFinite(level2CommissionRate) || level2CommissionRate < 0) throw new Error('二级佣金率不能为负数')
  if (level2CommissionRate > commissionRate) throw new Error('二级佣金率不能高于一级佣金率')
  if (commissionRate + level2CommissionRate > MAX_TOTAL_RATE) throw new Error(`一二级佣金率合计不能超过 ${MAX_TOTAL_RATE}%（合规上限）`)
  const settleDays = body.settleDays === undefined || body.settleDays === '' ? 0 : Number(body.settleDays)
  if (!Number.isInteger(settleDays) || settleDays < 0 || settleDays > 365) throw new Error('结算周期需为 0-365 的整数天（T+N）')
  const validStartTime = body.validStartTime || fmt(new Date())
  const validEndTime = body.validEndTime || ''
  if (!timeOf(validStartTime) || !timeOf(validEndTime) || timeOf(validEndTime) <= timeOf(validStartTime)) throw new Error('请设置有效的规则起止时间')
  const rule = {
    id: nextId(distributionRules), ruleNo: `DR${Date.now()}`, merchantId, spuId: product.id,
    commissionRate: Math.round(commissionRate * 100) / 100,
    level2CommissionRate: Math.round(level2CommissionRate * 100) / 100,
    settleDays,
    validStartTime, validEndTime, status: 1,
    createdBy: auth.user.realName || auth.user.username, createTime: fmt(new Date())
  }
  distributionRules.unshift(rule)
  return ruleView(rule)
}

const selectionView = (selection, distributorId) => {
  const rule = ruleOf(selection.ruleId)
  const product = productOf(selection.spuId)
  return {
    ...selection,
    selected: selection.status === 1,
    selectable: isRuleEffective(rule),
    commissionRate: rule ? rule.commissionRate : 0,
    validEndTime: rule ? rule.validEndTime : '',
    merchantName: merchantNameOf(selection.merchantId),
    spuName: product ? product.spuName : '',
    spuImage: product ? product.image : '',
    sellPrice: product ? product.sellPrice : 0,
    stock: product ? product.stock : 0,
    currentDistributorId: distributorId
  }
}

const selectionsFor = distributorId => {
  const selectedBySpu = new Map(distributionSelections.filter(item => item.distributorId === Number(distributorId)).map(item => [item.spuId, item]))
  const effectiveBySpu = new Map()
  ;[...distributionRules].sort((a, b) => b.id - a.id).forEach(rule => {
    if (isRuleEffective(rule) && !effectiveBySpu.has(rule.spuId)) effectiveBySpu.set(rule.spuId, rule)
  })
  const available = [...effectiveBySpu.values()].map(rule => {
    const existing = selectedBySpu.get(rule.spuId)
    return selectionView(existing || {
      id: null, distributorId: Number(distributorId), merchantId: rule.merchantId,
      spuId: rule.spuId, ruleId: rule.id, status: 0, createTime: null
    }, distributorId)
  })
  selectedBySpu.forEach(selection => {
    if (!available.some(item => item.spuId === selection.spuId)) available.push(selectionView(selection, distributorId))
  })
  return available.sort((a, b) => Number(b.selected) - Number(a.selected) || a.spuId - b.spuId)
}

const selectProduct = (distributorId, spuId) => {
  const distributor = distributorOf(distributorId)
  if (!distributor || distributor.status !== 1) throw new Error('分销商账号不可用')
  const rule = distributionRules.filter(item => item.spuId === Number(spuId) && isRuleEffective(item)).sort((a, b) => b.id - a.id)[0]
  if (!rule) throw new Error('该商品暂无有效佣金规则')
  let selection = distributionSelections.find(item => item.distributorId === Number(distributorId) && item.spuId === Number(spuId))
  if (selection) {
    selection.status = 1
    selection.ruleId = rule.id
    selection.updateTime = fmt(new Date())
  } else {
    selection = {
      id: nextId(distributionSelections), distributorId: Number(distributorId), merchantId: rule.merchantId,
      spuId: rule.spuId, ruleId: rule.id, status: 1, createTime: fmt(new Date())
    }
    distributionSelections.push(selection)
  }
  return selectionView(selection, distributorId)
}

const removeSelection = (distributorId, id) => {
  const selection = distributionSelections.find(item => item.id === Number(id))
  if (!selection) throw new Error('选品记录不存在')
  if (selection.distributorId !== Number(distributorId)) {
    const error = new Error('无权撤销其他分销商的选品')
    error.status = 403
    throw error
  }
  selection.status = 0
  selection.updateTime = fmt(new Date())
  return selection
}

const shareView = share => {
  const product = productOf(share.spuId)
  return {
    ...share,
    spuName: product ? product.spuName : '',
    spuImage: product ? product.image : '',
    merchantName: merchantNameOf(share.merchantId),
    h5Path: `/product/${share.spuId}?shareId=${share.shareId}`,
    h5Url: `/product/${share.spuId}?shareId=${share.shareId}`,
    taroPath: `/pages/product/index?id=${share.spuId}&shareId=${share.shareId}`
  }
}

const createShare = (distributorId, spuId) => {
  const distributor = distributorOf(distributorId)
  if (!distributor || distributor.status !== 1) throw new Error('分销商账号不可用')
  const selection = distributionSelections.find(item => item.distributorId === Number(distributorId) && item.spuId === Number(spuId) && item.status === 1)
  if (!selection) throw new Error('请先将商品加入选品')
  const rule = ruleOf(selection.ruleId)
  if (!isRuleEffective(rule)) throw new Error('商品佣金规则已失效，请重新选品')
  const upline = distributor.parentId ? distributorOf(distributor.parentId) : null
  const validUpline = upline && upline.status === 1 && levelOf(upline) === 1 ? upline : null
  const share = {
    id: nextId(distributionShares), shareId: crypto.randomBytes(18).toString('hex'),
    distributorId: distributor.id, merchantId: rule.merchantId, spuId: rule.spuId,
    ruleId: rule.id, commissionRateBp: Math.round(Number(rule.commissionRate) * 100),
    level2DistributorId: validUpline ? validUpline.id : null,
    level2RateBp: validUpline ? Math.round(Number(rule.level2CommissionRate || 0) * 100) : 0,
    distributorLevel: levelOf(distributor),
    status: 1, createTime: fmt(new Date()), expireTime: rule.validEndTime
  }
  distributionShares.unshift(share)
  return shareView(share)
}

const validateShare = (shareId, spuId, userId) => {
  const share = distributionShares.find(item => item.shareId === String(shareId || ''))
  if (!share) return { valid: false, reason: '分享链接不存在' }
  if (share.spuId !== Number(spuId)) return { valid: false, reason: '分享商品与当前商品不匹配' }
  if (share.status !== 1 || timeOf(share.expireTime) < Date.now()) return { valid: false, reason: '分享链接已失效' }
  const distributor = distributorOf(share.distributorId)
  const selection = distributionSelections.find(item => item.distributorId === share.distributorId && item.spuId === share.spuId && item.status === 1)
  const rule = ruleOf(share.ruleId)
  if (!distributor || distributor.status !== 1 || !selection || !isRuleEffective(rule)) return { valid: false, reason: '商品已撤品或推广规则已停用' }
  if (Number(distributor.userId) === Number(userId)) return { valid: false, reason: '分销商自购不参与佣金' }
  // 二级（团队）佣金：买受人若为上级本人，则不计团队佣金，避免变相自购返佣
  const upline = share.level2DistributorId ? distributorOf(share.level2DistributorId) : null
  const level2Active = upline && upline.status === 1 && Number(upline.userId) !== Number(userId)
  return {
    valid: true,
    shareId: share.shareId,
    spuId: share.spuId,
    distributorId: share.distributorId,
    distributorName: distributor.name,
    distributorLevel: levelOf(distributor),
    commissionRateBp: share.commissionRateBp,
    level2DistributorId: level2Active ? upline.id : null,
    level2DistributorName: level2Active ? upline.name : '',
    level2RateBp: level2Active ? Number(share.level2RateBp || 0) : 0,
    expireTime: share.expireTime
  }
}

// 下单仅保存归因快照，不产生佣金；支付成功后才读取这些快照。
const captureOrderAttribution = (order, createdItems, inputItems) => {
  createdItems.forEach(item => {
    const source = inputItems.find(candidate => Number(candidate.skuId) === Number(item.skuId))
    if (!source || !source.shareId) return
    const result = validateShare(source.shareId, item.spuId, order.userId)
    if (!result.valid) return
    Object.assign(item, {
      shareId: result.shareId,
      distributorId: result.distributorId,
      distributionRuleId: distributionShares.find(share => share.shareId === result.shareId).ruleId,
      commissionRateBp: result.commissionRateBp,
      level2DistributorId: result.level2DistributorId || null,
      level2RateBp: result.level2RateBp || 0,
      attributionTime: fmt(new Date())
    })
  })
}

// 使用最大余数法分摊订单实付，确保各订单项之和严格等于订单实付整数分。
const allocatePaidCents = (order, items) => {
  const totalCents = items.reduce((sum, item) => sum + moneyCents(item.totalPrice), 0)
  const payCents = moneyCents(order.payAmount)
  if (!items.length || totalCents <= 0) return new Map()
  const allocations = items.map(item => {
    const numerator = moneyCents(item.totalPrice) * payCents
    return { item, value: Math.floor(numerator / totalCents), remainder: numerator % totalCents }
  })
  let remaining = payCents - allocations.reduce((sum, item) => sum + item.value, 0)
  allocations.sort((a, b) => b.remainder - a.remainder || a.item.id - b.item.id)
  for (let index = 0; index < allocations.length && remaining > 0; index++, remaining--) allocations[index].value += 1
  return new Map(allocations.map(entry => [entry.item.id, entry.value]))
}

const onOrderPaid = order => {
  if (!order || Number(order.payStatus) !== 1 || Number(order.orderStatus) === 4) return []
  const items = orderItems.filter(item => item.orderId === order.id || item.orderNo === order.orderNo)
  const allocations = allocatePaidCents(order, items)
  const created = []
  const createRecord = (item, commissionBase, distributorId, rateBp, level) => {
    if (!distributorId || !Number(rateBp)) return null
    const existing = promotionOrders.find(record => record.orderItemId === item.id && record.distributorId === distributorId)
    if (existing) return null
    const record = {
      id: nextId(promotionOrders), promotionNo: `PM${Date.now()}${item.id}${level}`,
      orderId: order.id, orderNo: order.orderNo, orderItemId: item.id,
      merchantId: productOf(item.spuId).merchantId, distributorId, spuId: item.spuId,
      shareId: item.shareId, ruleId: item.distributionRuleId, commissionBase,
      commissionRateBp: Number(rateBp),
      commissionAmount: Math.round(commissionBase * Number(rateBp) / 10000),
      level, commissionType: level === 2 ? 'TEAM' : 'DIRECT',
      status: 'PENDING', paidTime: order.payTime || fmt(new Date()),
      settleDays: Number(ruleOf(item.distributionRuleId)?.settleDays || 0),
      settleableTime: null, settledTime: null, invalidTime: null, createTime: fmt(new Date())
    }
    promotionOrders.unshift(record)
    created.push(record)
    fundService.record({
      bizType: 'COMMISSION_ACCRUAL', amountCents: record.commissionAmount, orderNo: order.orderNo,
      refNo: record.promotionNo, merchantId: record.merchantId,
      remark: `${level === 2 ? '二级(团队)' : '一级(直推)'}佣金计提 · ${distributorOf(distributorId)?.name || distributorId}`
    })
    return record
  }
  items.filter(item => item.shareId && item.distributorId).forEach(item => {
    const commissionBase = allocations.get(item.id) || 0
    createRecord(item, commissionBase, item.distributorId, item.commissionRateBp, 1)
    createRecord(item, commissionBase, item.level2DistributorId, item.level2RateBp, 2)
  })
  return created
}

const DAY_MS = 86400000
// T+N：以订单完成时间为基准，N 天后才允许结算
const settleTimeAfter = (baseTime, days) => fmt(new Date((timeOf(baseTime) || Date.now()) + Number(days || 0) * DAY_MS))

const onOrderCompleted = order => {
  if (!order) return
  promotionOrders.filter(item => item.orderId === order.id && item.status === 'PENDING').forEach(item => {
    const completeTime = order.completeTime || fmt(new Date())
    const settleableTime = settleTimeAfter(completeTime, item.settleDays || 0)
    item.settleableTime = settleableTime
    item.status = timeOf(settleableTime) <= Date.now() ? 'SETTLEABLE' : 'PENDING'
  })
}

// Mock 无定时任务：查询/结算时惰性把已到期的 PENDING 佣金转为可结算
const refreshSettleable = (at = Date.now()) => {
  promotionOrders.forEach(item => {
    if (item.status !== 'PENDING' || !item.settleableTime) return
    if (timeOf(item.settleableTime) <= at) item.status = 'SETTLEABLE'
  })
}

const onOrderRefunded = (order, reason = '订单退款') => {
  if (!order) return []
  const reversed = []
  promotionOrders.filter(item => item.orderId === order.id && item.status !== 'INVALID').forEach(item => {
    const wasSettled = item.status === 'SETTLED'
    item.status = 'INVALID'
    item.invalidTime = fmt(new Date())
    item.invalidReason = reason
    fundService.record({
      bizType: 'COMMISSION_REVERSE', amountCents: item.commissionAmount, orderNo: order.orderNo,
      refNo: item.promotionNo, merchantId: item.merchantId,
      remark: `退款冲正${wasSettled ? '（已结算，需追回）' : ''} · ${reason}`
    })
    reversed.push(item)
  })
  return reversed
}

const settlePromotion = (id, operatorName) => {
  refreshSettleable()
  const record = promotionOrders.find(item => item.id === Number(id))
  if (!record) throw new Error('推广订单不存在')
  if (record.status !== 'SETTLEABLE') {
    if (record.status === 'PENDING' && record.settleableTime && timeOf(record.settleableTime) > Date.now()) {
      throw new Error(`T+${record.settleDays} 结算周期未到期，${record.settleableTime} 后可结算`)
    }
    throw new Error('仅已完成订单的可结算佣金可确认')
  }
  record.status = 'SETTLED'
  record.settledTime = fmt(new Date())
  record.settledBy = operatorName
  fundService.record({
    bizType: 'COMMISSION_SETTLE', amountCents: record.commissionAmount, orderNo: record.orderNo,
    refNo: record.promotionNo, merchantId: record.merchantId,
    remark: `佣金结算出账 · ${record.settledBy}`
  })
  return record
}

// 绑定上级分销商（合规：最多二级、禁止自绑/成环/三级）
const bindParent = (distributorId, parentId) => {
  const distributor = distributorOf(distributorId)
  if (!distributor) throw new Error('分销商不存在')
  if (parentId === null || parentId === undefined || parentId === '' || Number(parentId) === 0) {
    distributor.parentId = null
    return distributorView(distributor)
  }
  const parent = distributorOf(parentId)
  assertBindable(distributor, parent)
  distributor.parentId = parent.id
  distributor.updateTime = fmt(new Date())
  return distributorView(distributor)
}

const summaryFor = distributorId => {
  refreshSettleable()
  const records = promotionOrders.filter(item => item.distributorId === Number(distributorId))
  const valid = records.filter(item => item.status !== 'INVALID')
  const sum = list => list.reduce((total, item) => total + item.commissionAmount, 0)
  return {
    selectionCount: distributionSelections.filter(item => item.distributorId === Number(distributorId) && item.status === 1).length,
    shareCount: distributionShares.filter(item => item.distributorId === Number(distributorId)).length,
    orderCount: valid.length,
    pendingCommissionCents: sum(valid.filter(item => item.status === 'PENDING')),
    settleableCommissionCents: sum(valid.filter(item => item.status === 'SETTLEABLE')),
    settledCommissionCents: sum(valid.filter(item => item.status === 'SETTLED')),
    totalCommissionCents: sum(valid),
    teamCommissionCents: sum(valid.filter(item => item.level === 2)),
    directCommissionCents: sum(valid.filter(item => item.level !== 2)),
    downlineCount: distributors.filter(item => Number(item.parentId) === Number(distributorId)).length,
    level: levelOf(distributorOf(distributorId)),
    maxLevel: MAX_LEVEL
  }
}

module.exports = {
  distributors, distributionRules, distributionSelections, distributionShares, promotionOrders,
  MAX_LEVEL, MAX_TOTAL_RATE,
  ruleView, distributorView, promotionView, isRuleEffective, levelOf,
  createRule, selectionsFor, selectProduct, removeSelection, createShare, shareView, validateShare,
  captureOrderAttribution, allocatePaidCents, onOrderPaid, onOrderCompleted, onOrderRefunded,
  refreshSettleable, settlePromotion, bindParent, summaryFor
}

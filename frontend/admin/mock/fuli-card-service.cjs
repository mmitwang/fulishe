const { fmt, paginate } = require('./helpers.cjs')
const { users: defaultUsers } = require('./seed.cjs')
const defaultState = require('./seed-extra.cjs')

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const nextId = list => list.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1

class FuliCardError extends Error {
  constructor(message, code = 'FULI_CARD_ERROR') {
    super(message)
    this.code = code
  }
}

const amountOf = value => {
  const amount = Number(value)
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10000000) {
    throw new FuliCardError('金额必须为 0.01–100000 元之间的整数分', 'INVALID_AMOUNT')
  }
  return amount
}

const requestIdOf = value => {
  const requestId = String(value || '').trim()
  if (!requestId || requestId.length > 100) throw new FuliCardError('请求号不能为空且不能超过 100 个字符', 'INVALID_REQUEST_ID')
  return requestId
}

const createFuliCardService = (state = defaultState, userList = defaultUsers) => {
  const accounts = state.fuliAccounts
  const flows = state.fuliFlows
  const recharges = state.fuliRecharges
  const transfers = state.fuliTransfers
  const operations = state.fuliOperations
  const orders = state.orders
  const payRecords = state.payRecords
  const refunds = state.refunds
  let sequence = 1

  const now = () => fmt(new Date())
  const businessNo = prefix => `${prefix}${Date.now()}${String(sequence++).padStart(4, '0')}`
  const userOf = userId => userList.find(user => user.id === Number(userId))
  const accountOf = userId => {
    const user = userOf(userId)
    if (!user) throw new FuliCardError('用户不存在', 'USER_NOT_FOUND')
    let account = accounts.find(item => item.userId === user.id)
    if (!account) {
      account = {
        id: nextId(accounts), accountId: nextId(accounts), tenantId: user.tenantId, userId: user.id,
        balanceCents: 0, totalIncomeCents: 0, totalExpenseCents: 0,
        status: 1, version: 0, createTime: now(), updateTime: now()
      }
      accounts.push(account)
    }
    return account
  }

  const applyFlow = (account, input) => {
    if (account.status !== 1) throw new FuliCardError('福卡账户不可用', 'ACCOUNT_DISABLED')
    const before = account.balanceCents
    const after = input.direction === 'IN' ? before + input.amountCents : before - input.amountCents
    if (!Number.isSafeInteger(after) || after < 0) {
      const shortfall = Math.max(0, input.amountCents - before)
      throw new FuliCardError(`福卡余额不足，还差 ¥${(shortfall / 100).toFixed(2)}`, 'INSUFFICIENT_BALANCE')
    }
    account.balanceCents = after
    account.totalIncomeCents += input.direction === 'IN' ? input.amountCents : 0
    account.totalExpenseCents += input.direction === 'OUT' ? input.amountCents : 0
    account.version += 1
    account.updateTime = now()
    const flow = {
      id: nextId(flows), flowNo: businessNo('FF'), requestId: input.requestId,
      accountId: account.accountId, userId: account.userId, tenantId: account.tenantId,
      bizType: input.bizType, bizNo: input.bizNo, direction: input.direction,
      amountCents: input.amountCents, balanceBeforeCents: before, balanceAfterCents: after,
      payNo: input.payNo || '', counterpartName: input.counterpartName || '',
      remark: input.remark || '', createTime: now()
    }
    flows.unshift(flow)
    return flow
  }

  const operationOf = (userId, requestId) => operations.find(item => item.userId === userId && item.requestId === requestId)
  const checkOperation = (userId, requestId, type, payload) => {
    const fingerprint = JSON.stringify(payload)
    const operation = operationOf(userId, requestId)
    if (operation && (operation.type !== type || operation.fingerprint !== fingerprint)) {
      throw new FuliCardError('同一请求号不能用于不同操作或参数', 'IDEMPOTENCY_CONFLICT')
    }
    return { operation, fingerprint }
  }
  const finishOperation = (userId, requestId, type, fingerprint, data) => {
    let operation = operationOf(userId, requestId)
    if (!operation) {
      operation = { userId, requestId, type, fingerprint }
      operations.push(operation)
    }
    Object.assign(operation, { status: 'SUCCESS', data: clone(data), message: '' })
  }

  const assertInvariants = () => {
    const flowNos = new Set()
    for (const flow of flows) {
      if (flowNos.has(flow.flowNo)) throw new Error(`福卡流水号重复: ${flow.flowNo}`)
      flowNos.add(flow.flowNo)
      const account = accounts.find(item => item.accountId === flow.accountId)
      if (!account || account.userId !== flow.userId) throw new Error(`福卡流水账户引用错误: ${flow.flowNo}`)
      const expected = flow.direction === 'IN'
        ? flow.balanceBeforeCents + flow.amountCents
        : flow.balanceBeforeCents - flow.amountCents
      if (flow.amountCents <= 0 || expected !== flow.balanceAfterCents) throw new Error(`福卡流水金额不连续: ${flow.flowNo}`)
    }
    for (const account of accounts) {
      if (!Number.isSafeInteger(account.balanceCents) || account.balanceCents < 0) throw new Error(`福卡余额非法: ${account.userId}`)
      if (account.balanceCents !== account.totalIncomeCents - account.totalExpenseCents) throw new Error(`福卡累计收支不平: ${account.userId}`)
      const history = flows.filter(flow => flow.accountId === account.accountId).sort((a, b) => a.id - b.id)
      let balance = 0
      for (const flow of history) {
        if (flow.balanceBeforeCents !== balance) throw new Error(`福卡流水断链: ${flow.flowNo}`)
        balance = flow.balanceAfterCents
      }
      if (balance !== account.balanceCents) throw new Error(`福卡流水汇总不平: ${account.userId}`)
    }
    for (const recharge of recharges.filter(item => item.status === 'SUCCESS')) {
      if (flows.filter(flow => flow.bizType === 'RECHARGE' && flow.bizNo === recharge.rechargeNo).length !== 1) {
        throw new Error(`充值收入流水不唯一: ${recharge.rechargeNo}`)
      }
    }
    for (const transfer of transfers) {
      const pair = flows.filter(flow => flow.bizType === 'TRANSFER' && flow.bizNo === transfer.transferNo)
      if (pair.length !== 2 || !pair.some(flow => flow.direction === 'IN') || !pair.some(flow => flow.direction === 'OUT')) {
        throw new Error(`转赠双边流水不完整: ${transfer.transferNo}`)
      }
    }
    for (const order of orders.filter(item => item.payMethod === 'fuli_card')) {
      if (flows.filter(flow => flow.bizType === 'ORDER_PAY' && flow.bizNo === order.orderNo).length !== 1) {
        throw new Error(`福卡订单消费流水不唯一: ${order.orderNo}`)
      }
      if (order.payStatus === 3 && flows.filter(flow => flow.bizType === 'ORDER_REFUND' && flow.bizNo === order.orderNo).length !== 1) {
        throw new Error(`福卡退款流水不唯一: ${order.orderNo}`)
      }
    }
    return true
  }

  const transact = callback => {
    const collections = [accounts, flows, recharges, transfers, operations, orders, payRecords, refunds]
    const snapshots = collections.map(collection => clone(collection))
    try {
      const result = callback()
      assertInvariants()
      return clone(result)
    } catch (error) {
      collections.forEach((collection, index) => collection.splice(0, collection.length, ...clone(snapshots[index])))
      throw error
    }
  }

  const rechargeResult = recharge => ({
    requestId: recharge.requestId, rechargeNo: recharge.rechargeNo, payNo: recharge.payNo,
    amountCents: recharge.amountCents, status: recharge.status
  })

  const createRecharge = (userId, input) => {
    const requestId = requestIdOf(input.requestId)
    const amountCents = amountOf(input.amountCents)
    const { operation, fingerprint } = checkOperation(userId, requestId, 'RECHARGE', { amountCents })
    if (operation) return clone(operation.data)
    return transact(() => {
      const account = accountOf(userId)
      const rechargeNo = businessNo('RC')
      const payNo = businessNo('PAYR')
      const recharge = {
        id: nextId(recharges), requestId, rechargeNo, payNo, userId, amountCents,
        status: 'PENDING', createTime: now(), completeTime: null
      }
      recharges.unshift(recharge)
      payRecords.unshift({
        id: nextId(payRecords), payNo, orderNo: rechargeNo, tenantId: account.tenantId, userId,
        payMethod: 1, payAmount: amountCents / 100, payStatus: 1, thirdPayNo: '',
        payTime: null, createTime: now(), notifyCount: 0, remark: '福卡充值模拟支付', channel: '微信支付（模拟）'
      })
      const result = rechargeResult(recharge)
      operations.push({ userId, requestId, type: 'RECHARGE', fingerprint, status: 'PENDING', data: clone(result), message: '' })
      return result
    })
  }

  const completeRecharge = (userId, input) => {
    const requestId = requestIdOf(input.requestId)
    const recharge = recharges.find(item => item.rechargeNo === input.rechargeNo && item.userId === userId)
    if (!recharge || recharge.requestId !== requestId) throw new FuliCardError('充值单不存在', 'RECHARGE_NOT_FOUND')
    if (recharge.status === 'SUCCESS') return rechargeResult(recharge)
    const { fingerprint } = checkOperation(userId, requestId, 'RECHARGE', { amountCents: recharge.amountCents })
    return transact(() => {
      const account = accountOf(userId)
      applyFlow(account, {
        requestId, bizType: 'RECHARGE', bizNo: recharge.rechargeNo, direction: 'IN',
        amountCents: recharge.amountCents, payNo: recharge.payNo, remark: '福卡模拟充值'
      })
      recharge.status = 'SUCCESS'
      recharge.completeTime = now()
      const record = payRecords.find(item => item.payNo === recharge.payNo)
      if (record) {
        record.payStatus = 2
        record.payTime = recharge.completeTime
        record.thirdPayNo = businessNo('MOCKWX')
        record.notifyCount = 1
      }
      const result = rechargeResult(recharge)
      finishOperation(userId, requestId, 'RECHARGE', fingerprint, result)
      return result
    })
  }

  const transfer = (userId, input) => {
    const requestId = requestIdOf(input.requestId)
    const amountCents = amountOf(input.amountCents)
    const toUsername = String(input.toUsername || '').trim()
    const remark = String(input.remark || '').trim().slice(0, 60)
    const payload = { toUsername, amountCents, remark }
    const { operation, fingerprint } = checkOperation(userId, requestId, 'TRANSFER', payload)
    if (operation && operation.status === 'SUCCESS') return clone(operation.data)
    return transact(() => {
      const sender = userOf(userId)
      const recipient = userList.find(user => user.username === toUsername)
      if (!recipient) throw new FuliCardError('收款账号不存在，请核对演示账号', 'RECIPIENT_NOT_FOUND')
      if (recipient.id === Number(userId)) throw new FuliCardError('不能转赠给当前账号', 'SELF_TRANSFER_NOT_ALLOWED')
      const fromAccount = accountOf(userId)
      if (fromAccount.balanceCents < amountCents) {
        throw new FuliCardError(`福卡余额不足，还差 ¥${((amountCents - fromAccount.balanceCents) / 100).toFixed(2)}`, 'INSUFFICIENT_BALANCE')
      }
      const toAccount = accountOf(recipient.id)
      const transferNo = businessNo('TR')
      applyFlow(fromAccount, {
        requestId, bizType: 'TRANSFER', bizNo: transferNo, direction: 'OUT', amountCents,
        counterpartName: recipient.realName, remark: remark || `转赠给 ${recipient.realName}`
      })
      applyFlow(toAccount, {
        requestId, bizType: 'TRANSFER', bizNo: transferNo, direction: 'IN', amountCents,
        counterpartName: sender.realName, remark: remark || `来自 ${sender.realName} 的福卡`
      })
      const result = {
        requestId, transferNo, amountCents, fromUserId: Number(userId), toUserId: recipient.id,
        toUsername: recipient.username, toUserName: recipient.realName, status: 'SUCCESS', createTime: now()
      }
      transfers.unshift({ id: nextId(transfers), ...result, remark })
      finishOperation(userId, requestId, 'TRANSFER', fingerprint, result)
      return result
    })
  }

  const payResult = (order, requestId) => ({
    requestId, orderNo: order.orderNo, payNo: order.payNo, payMethod: 3,
    payAmount: order.payAmount, payStatus: 2, payTime: order.payTime
  })

  const payOrder = (userId, orderNo, rawRequestId) => {
    const requestId = requestIdOf(rawRequestId)
    const order = orders.find(item => item.orderNo === orderNo)
    if (!order) throw new FuliCardError('订单不存在', 'ORDER_NOT_FOUND')
    if (order.userId !== Number(userId)) throw new FuliCardError('无权支付其他用户订单', 'ORDER_FORBIDDEN')
    const payload = { orderNo, amountCents: amountOf(Math.round(Number(order.payAmount) * 100)) }
    const { operation, fingerprint } = checkOperation(userId, requestId, 'ORDER_PAY', payload)
    if (operation && operation.status === 'SUCCESS') return clone(operation.data)
    const previousFlow = flows.find(flow => flow.bizType === 'ORDER_PAY' && flow.bizNo === orderNo && flow.userId === Number(userId))
    if (order.payStatus === 1 && order.payMethod === 'fuli_card' && previousFlow) {
      const result = payResult(order, requestId)
      finishOperation(userId, requestId, 'ORDER_PAY', fingerprint, result)
      return clone(result)
    }
    if (order.payStatus === 1) throw new FuliCardError('订单已支付', 'ORDER_ALREADY_PAID')
    if (order.orderStatus !== 0 || order.payStatus !== 0) throw new FuliCardError('当前订单状态不可支付', 'ORDER_NOT_PAYABLE')
    return transact(() => {
      const account = accountOf(userId)
      const payNo = businessNo('PAYF')
      const flow = applyFlow(account, {
        requestId, bizType: 'ORDER_PAY', bizNo: order.orderNo, direction: 'OUT', amountCents: payload.amountCents,
        payNo, counterpartName: '福礼社商城', remark: '福卡订单消费'
      })
      order.orderStatus = 1
      order.payStatus = 1
      order.payMethod = 'fuli_card'
      order.payNo = payNo
      order.payTime = now()
      payRecords.unshift({
        id: nextId(payRecords), payNo, orderNo: order.orderNo, tenantId: order.tenantId, userId: order.userId,
        payMethod: 3, payAmount: order.payAmount, payStatus: 2, thirdPayNo: flow.flowNo,
        payTime: order.payTime, createTime: order.payTime, notifyCount: 0, remark: '福卡全额支付', channel: '福礼社卡'
      })
      const result = payResult(order, requestId)
      finishOperation(userId, requestId, 'ORDER_PAY', fingerprint, result)
      return result
    })
  }

  const refundOrder = (userId, payNo, rawRequestId, reason) => {
    const requestId = requestIdOf(rawRequestId)
    const record = payRecords.find(item => item.payNo === payNo)
    if (!record) throw new FuliCardError('支付单不存在', 'PAYMENT_NOT_FOUND')
    if (record.userId !== Number(userId)) throw new FuliCardError('无权退款其他用户订单', 'ORDER_FORBIDDEN')
    if (record.payMethod !== 3) throw new FuliCardError('该支付单不是福卡支付', 'NOT_FULI_CARD_PAYMENT')
    const order = orders.find(item => item.orderNo === record.orderNo)
    if (!order) throw new FuliCardError('关联订单不存在', 'ORDER_NOT_FOUND')
    const { operation, fingerprint } = checkOperation(userId, requestId, 'ORDER_REFUND', { payNo })
    if (operation && operation.status === 'SUCCESS') return clone(operation.data)
    const previous = refunds.find(item => item.payNo === payNo && item.refundStatus === 2)
    if (previous) {
      finishOperation(userId, requestId, 'ORDER_REFUND', fingerprint, previous)
      return clone(previous)
    }
    if (order.payStatus !== 1) throw new FuliCardError('当前订单状态不可退款', 'ORDER_NOT_REFUNDABLE')
    return transact(() => {
      const refundNo = businessNo('REFF')
      const refund = {
        id: nextId(refunds), refundNo, payNo, orderNo: order.orderNo, tenantId: order.tenantId,
        refundAmount: record.payAmount, payAmount: record.payAmount, refundStatus: 2,
        refundReason: String(reason || '用户申请退款').slice(0, 120), thirdRefundNo: businessNo('RF'),
        refundTime: now(), createTime: now()
      }
      applyFlow(accountOf(userId), {
        requestId, bizType: 'ORDER_REFUND', bizNo: order.orderNo, direction: 'IN',
        amountCents: amountOf(Math.round(Number(record.payAmount) * 100)), payNo,
        counterpartName: '福礼社商城', remark: '福卡订单原路退款'
      })
      record.payStatus = 4
      record.remark = '福卡已原路退款'
      order.orderStatus = 4
      order.payStatus = 3
      order.refundAmount = record.payAmount
      order.remark = refund.refundReason
      refunds.unshift(refund)
      finishOperation(userId, requestId, 'ORDER_REFUND', fingerprint, refund)
      return refund
    })
  }

  return {
    getAccount: userId => clone(accountOf(userId)),
    listFlows: (userId, query) => paginate(flows.filter(flow => flow.userId === Number(userId)), query),
    getOperation: (userId, requestId) => {
      const operation = operationOf(Number(userId), requestId)
      if (!operation) throw new FuliCardError('操作不存在或尚未受理', 'OPERATION_NOT_FOUND')
      const { type, status, data, message } = operation
      return clone({ requestId, type, status, data, message })
    },
    createRecharge,
    completeRecharge,
    transfer,
    payOrder,
    refundOrder,
    assertInvariants
  }
}

const service = createFuliCardService()

module.exports = { createFuliCardService, FuliCardError, service }

import Taro from '@tarojs/taro'
import type { CheckoutDraft, Order, PageResult, PaymentResult } from '@/types'
import { clearRequestCache, request, requestText } from './api'
import { ensureSession } from './auth'
import { isMockMode } from './config'
import { isFuliCardUnknownOutcome, resolveFuliCardOperation } from './fuli-card'

const localOrderKey = 'localMockOrders'

const getLocalOrders = (): Order[] => {
  try {
    return Taro.getStorageSync(localOrderKey) || []
  } catch (error) {
    console.error('[Trade] 本地订单读取失败', error)
    return []
  }
}

const saveLocalOrder = (order: Order): void => {
  const orders = getLocalOrders().filter(item => item.orderNo !== order.orderNo)
  orders.unshift(order)
  Taro.setStorageSync(localOrderKey, orders.slice(0, 50))
}

const createLocalOrder = (draft: CheckoutDraft, userId: number): Order => ({
  id: Date.now(),
  orderNo: `MOCK${Date.now()}`,
  userId,
  userName: draft.receiver,
  mobile: draft.mobile,
  address: draft.address,
  addressId: draft.addressId,
  storeId: draft.storeId,
  storeName: draft.storeName,
  deliverySlot: draft.deliverySlot,
  orderStatus: 0,
  payStatus: 0,
  totalAmount: Number(draft.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)),
  discountAmount: 0,
  payAmount: Number(draft.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)),
  createTime: new Date().toISOString(),
  localMock: true,
  items: draft.items.map(item => ({
    spuId: item.spuId,
    spuName: item.spuName,
    spuImage: item.image,
    skuId: item.skuId,
    skuName: item.skuName,
    quantity: item.quantity,
    unitPrice: item.price,
    totalPrice: item.price * item.quantity
  }))
})

const pushLogistics = (order: Order, steps: { name: string; desc: string }[]): Order => ({
  ...order,
  logistics: [...(order.logistics || []), ...steps.map(step => ({ ...step, time: new Date().toISOString().replace('T', ' ').slice(0, 19) }))]
})

export const advanceOrder = async (order: Order): Promise<string> => {
  await ensureSession()
  if (!order.localMock && !isMockMode()) throw new Error('真实订单需由商家后台发货，模拟操作仅限演示订单')
  if (order.orderStatus === 1) {
    saveLocalOrder(pushLogistics({ ...order, orderStatus: 2 }, [
      { name: '仓库拣货完成', desc: '福礼社华东仓 · 出库扫描' },
      { name: '运输中', desc: '顺丰速运 · 离开杭州转运中心' },
      { name: '派送中', desc: '快递员派送中，请保持电话畅通' }
    ]))
    clearRequestCache()
    return '已模拟发货'
  }
  if (order.orderStatus === 2) {
    saveLocalOrder(pushLogistics({ ...order, orderStatus: 3 }, [
      { name: '已签收', desc: '包裹已签收，感谢您在福礼社购物' }
    ]))
    clearRequestCache()
    return '已确认收货'
  }
  throw new Error('当前状态不支持推进')
}

export const refundOrder = async (order: Order): Promise<void> => {
  await ensureSession()
  if (order.payMethod === 'fuli_card' && !order.localMock && Taro.getStorageSync('token')) {
    if (!order.payNo) throw new Error('福卡支付单号缺失，请刷新订单后重试')
    const requestId = `ORDER_REFUND:${order.orderNo}`
    try {
      await request({
        url: '/pay/refund',
        method: 'POST',
        cacheTtl: 0,
        data: { payNo: order.payNo, reason: '用户申请退款', requestId }
      })
    } catch (error) {
      if (!isFuliCardUnknownOutcome(error)) throw error
      await resolveFuliCardOperation(requestId)
    }
    clearRequestCache()
    return
  }
  if (!order.localMock && !isMockMode()) throw new Error('真实退款需走售后工单，模拟退款仅限演示订单')
  saveLocalOrder(pushLogistics({ ...order, orderStatus: 4, payStatus: 3, refundAmount: order.payAmount }, [
    { name: '退款完成', desc: '款项已原路退回（虚拟）' }
  ]))
  clearRequestCache()
}

export const createOrder = async (draft: CheckoutDraft): Promise<Order> => {
  const user = await ensureSession()
  const token = Taro.getStorageSync('token')
  if (!token) {
    const order = createLocalOrder(draft, user.id)
    saveLocalOrder(order)
    console.log('[Trade] 本地模拟订单创建成功', order.orderNo)
    return order
  }
  try {
    const order = await request<Order>({
      url: '/order/info/create',
      method: 'POST',
      cacheTtl: 0,
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        userName: draft.receiver,
        mobile: draft.mobile,
        address: draft.address,
        addressId: draft.addressId,
        storeId: draft.storeId,
        storeName: draft.storeName,
        deliverySlot: draft.deliverySlot,
        items: draft.items.map(item => ({ skuId: item.skuId, quantity: item.quantity, unitPrice: item.price }))
      }
    })
    clearRequestCache()
    console.log('[Trade] 真实订单创建成功', order.orderNo)
    return order
  } catch (error) {
    console.error('[Trade] 真实订单创建失败', error)
    if (!isMockMode()) throw error
    const order = createLocalOrder(draft, user.id)
    saveLocalOrder(order)
    console.log('[Trade] 已回退本地模拟订单', order.orderNo)
    return order
  }
}

export const listOrders = async (status = -1): Promise<Order[]> => {
  const user = await ensureSession()
  const localOrders = getLocalOrders().filter(order => status < 0 || order.orderStatus === status)
  if (!Taro.getStorageSync('token')) return localOrders
  const data: Record<string, unknown> = { current: 1, size: 30, userId: user.id }
  if (status >= 0) data.orderStatus = status
  try {
    const result = await request<PageResult<Order>>({ url: '/order/info/page', data, cacheTtl: 0 })
    const realOrders = result.records.map(order => ({ ...order, items: order.items || [] }))
    return isMockMode() ? [...localOrders, ...realOrders] : realOrders
  } catch (error) {
    console.error('[Trade] 真实订单列表不可用', error)
    if (!isMockMode()) throw error
    return localOrders
  }
}

export const payOrder = async (order: Order, method: 'wechat' | 'fuli_card' = 'wechat'): Promise<void> => {
  await ensureSession()
  if (method === 'wechat' && !isMockMode() && process.env.TARO_ENV !== 'weapp' && !order.localMock) {
    throw new Error('公众号 JSAPI 支付尚未配置，请完成网页授权与支付签名接入')
  }
  if (method === 'fuli_card' && (order.localMock || !Taro.getStorageSync('token'))) {
    throw new Error('福卡支付需要登录并连接 Mock 账户服务，本地订单请使用模拟微信支付')
  }
  if (order.localMock || !Taro.getStorageSync('token')) {
    saveLocalOrder({ ...order, orderStatus: 1, payStatus: 1, payNo: `MOCKPAY${Date.now()}` })
    await new Promise(resolve => setTimeout(resolve, 600))
    return
  }

  if (method === 'fuli_card') {
    const requestId = `ORDER_PAY:${order.orderNo}`
    try {
      await request<PaymentResult>({
        url: '/pay/create',
        method: 'POST',
        cacheTtl: 0,
        data: {
          orderNo: order.orderNo,
          tenantId: 1,
          userId: order.userId,
          payMethod: 'fuli_card',
          payAmount: order.payAmount,
          requestId
        }
      })
    } catch (error) {
      if (!isFuliCardUnknownOutcome(error)) throw error
      await resolveFuliCardOperation<PaymentResult>(requestId)
    }
    clearRequestCache()
    return
  }

  const payment = await request<PaymentResult>({
    url: '/pay/create',
    method: 'POST',
    cacheTtl: 0,
    data: { orderNo: order.orderNo, tenantId: 1, userId: order.userId, payMethod: 1, payAmount: order.payAmount }
  })

  if (isMockMode()) {
    const response = await requestText('/pay/wechat/notify', {
      payNo: payment.payNo,
      tradeState: 'SUCCESS',
      transactionId: `MOCKTRANSACTION${Date.now()}`
    })
    if (!response.includes('SUCCESS')) throw new Error('支付回调未确认')
    clearRequestCache()
    console.log('[Trade] 模拟支付回调完成', order.orderNo)
    return
  }

  if (!payment.paySign || !payment.package || !payment.timeStamp || !payment.nonceStr) {
    throw new Error('微信支付商户参数尚未配置，请切换模拟模式验收')
  }
  await Taro.requestPayment({
    timeStamp: payment.timeStamp,
    nonceStr: payment.nonceStr,
    package: payment.package,
    signType: (payment.signType || 'RSA') as 'RSA',
    paySign: payment.paySign
  })
  clearRequestCache()
}

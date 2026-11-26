import React, { useCallback, useEffect, useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh, useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import { advanceOrder, listOrders, payOrder, refundOrder } from '@/services/trade'
import type { Order } from '@/types'
import styles from './index.module.scss'

const tabs = [
  { label: '全部', status: -1 },
  { label: '待付款', status: 0 },
  { label: '已支付', status: 1 },
  { label: '已发货', status: 2 },
  { label: '已完成', status: 3 }
]

const statusText = (order: Order): string => {
  if (order.payStatus === 3) return '已退款'
  if (order.payStatus === 2) return '支付失败'
  if (order.orderStatus === 0) return '待付款'
  if (order.orderStatus === 1) return '已支付 · 待发货'
  if (order.orderStatus === 2) return '已发货'
  if (order.orderStatus >= 3) return '已完成'
  return '已关闭'
}

const OrderPage: React.FC = () => {
  const router = useRouter()
  const highlightedOrderNo = router.params.orderNo || ''
  const [status, setStatus] = useState(() => Number(router.params.status ?? -1))
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [payingOrderNo, setPayingOrderNo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setOrders(await listOrders(status))
    } catch (error) {
      console.error('[Order] 订单加载失败', status, error)
      Taro.showToast({ title: error instanceof Error ? error.message : '订单加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { void load() }, [load])
  useDidShow(() => { void load() })
  usePullDownRefresh(async () => {
    await load()
    Taro.stopPullDownRefresh()
  })

  const advance = async (order: Order) => {
    try {
      const msg = await advanceOrder(order)
      Taro.showToast({ title: msg, icon: 'success' })
      await load()
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' })
    }
  }

  const refund = async (order: Order) => {
    const confirm = await Taro.showModal({
      title: '申请退款',
      content: order.payMethod === 'fuli_card' ? '款项将退回福卡余额，仅产生模拟资金变动。' : '模拟模式下款项将原路退回，不产生真实资金变动。'
    })
    if (!confirm.confirm) return
    try {
      await refundOrder(order)
      Taro.showToast({ title: '退款完成', icon: 'success' })
      await load()
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '退款失败', icon: 'none' })
    }
  }

  const pay = async (order: Order) => {
    if (payingOrderNo) return
    let method: 'wechat' | 'fuli_card' = 'wechat'
    if (!order.localMock && Taro.getStorageSync('token')) {
      try {
        const action = await Taro.showActionSheet({ itemList: ['微信支付', '福礼社卡'] })
        method = action.tapIndex === 1 ? 'fuli_card' : 'wechat'
      } catch (error) {
        return
      }
    }
    setPayingOrderNo(order.orderNo)
    try {
      await payOrder(order, method)
      Taro.showToast({ title: '支付完成', icon: 'success' })
      await load()
    } catch (error) {
      console.error('[Order] 支付失败', order.orderNo, error)
      Taro.showModal({ title: '支付未完成', content: error instanceof Error ? error.message : '请稍后重试', showCancel: false })
    } finally {
      setPayingOrderNo('')
    }
  }

  return (
    <View className={styles.page}>
      <ScrollView className={styles.tabs} scrollX>
        {tabs.map(tab => (
          <View key={tab.status} className={classnames(styles.tab, status === tab.status && styles.tabActive)} onClick={() => setStatus(tab.status)} role="tab" aria-selected={status === tab.status}>
            {tab.label}
          </View>
        ))}
      </ScrollView>

      {loading ? <View className={styles.loading}>正在核对订单状态…</View> : orders.length === 0 ? (
        <View className={styles.empty}>
          <Text className={styles.emptyMark}>单</Text>
          <Text className={styles.emptyText}>当前状态下还没有订单</Text>
          <View className={styles.shopButton} onClick={() => Taro.switchTab({ url: '/pages/category/index' })}>去选好礼</View>
        </View>
      ) : orders.map(order => (
        <View key={order.orderNo} className={classnames(styles.orderCard, highlightedOrderNo === order.orderNo && styles.highlighted)}>
          <View className={styles.orderHeader}>
            <View className={styles.orderNoWrap}>
              <Text className={styles.orderNo}>订单号 {order.orderNo}</Text>
              <Text className={styles.createTime}>{order.createTime?.replace('T', ' ').slice(0, 19)}</Text>
            </View>
            <Text className={styles.status}>{statusText(order)}</Text>
          </View>

          {order.items.length ? order.items.map(item => (
            <View className={styles.productItem} key={`${order.orderNo}-${item.skuId}`}>
              {item.spuImage ? (
                <Image className={styles.cover} src={item.spuImage} mode="aspectFill" lazyLoad onError={event => console.error('[Order] 商品图加载失败', item.spuId, event)} />
              ) : (
                <View className={styles.cover} />
              )}
              <View className={styles.productInfo}>
                <Text className={styles.productName}>{item.spuName || `商品 SPU ${item.spuId}`}</Text>
                <Text className={styles.skuName}>{item.skuName || `SKU ${item.skuId}`} · ×{item.quantity}</Text>
              </View>
              <Text className={styles.productPrice}>¥{Number(item.unitPrice).toFixed(2)}</Text>
            </View>
          )) : <Text className={styles.noItems}>订单商品明细待同步</Text>}

          <Text className={styles.receiver}>{order.userName} · {order.mobile}</Text>
          <Text className={styles.address}>{order.address}</Text>
          {order.localMock && <Text className={styles.mockBadge}>本地模拟订单 · 不发生真实交易</Text>}
          {order.payMethod === 'fuli_card' && <Text className={styles.mockBadge}>福礼社卡支付{order.payNo ? ` · ${order.payNo}` : ''}</Text>}

          {!!order.logistics?.length && (
            <View className={styles.logistics}>
              {order.logistics.slice(-2).reverse().map((step, index) => (
                <View key={`${order.orderNo}-${index}`} className={styles.logisticsRow}>
                  <Text className={styles.logisticsDot} />
                  <Text className={styles.logisticsName}>{step.name}</Text>
                  <Text className={styles.logisticsDesc}>{step.desc} · {step.time.slice(11)}</Text>
                </View>
              ))}
            </View>
          )}

          <View className={styles.orderFooter}>
            <View>
              <Text className={styles.amountLabel}>实付金额 </Text>
              <Text className={styles.amount}>¥{Number(order.payAmount).toFixed(2)}</Text>
            </View>
            <View className={styles.actions}>
              <View className={styles.actionButton} onClick={() => void Taro.setClipboardData({ data: order.orderNo })}>复制单号</View>
              {order.orderStatus === 0 && order.payStatus !== 1 && (
                <View className={classnames(styles.actionButton, styles.payButton)} onClick={() => void pay(order)}>
                  {payingOrderNo === order.orderNo ? '支付中…' : '继续支付'}
                </View>
              )}
              {order.orderStatus === 1 && (
                <View className={styles.actionButton} onClick={() => void advance(order)}>模拟发货</View>
              )}
              {order.orderStatus === 2 && (
                <View className={classnames(styles.actionButton, styles.payButton)} onClick={() => void advance(order)}>确认收货</View>
              )}
              {order.orderStatus >= 1 && order.orderStatus <= 2 && order.payStatus === 1 && (
                <View className={styles.actionButton} onClick={() => void refund(order)}>申请退款</View>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

export default OrderPage

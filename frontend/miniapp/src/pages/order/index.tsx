import React, { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { request, getUserId } from '@/services/api'
import type { Order } from '@/types'

const statusTextMap: Record<number, string> = {
  0: '待支付',
  1: '已支付',
  2: '已发货',
  3: '已完成',
  4: '已取消',
  5: '售后中',
  6: '已退款'
}

const statusText = (s: number) => statusTextMap[s] || '未知'

const tabs = [
  { label: '全部', value: -1 },
  { label: '待支付', value: 0 },
  { label: '已支付', value: 1 },
  { label: '已完成', value: 3 }
]

const OrderPage: React.FC = () => {
  const [active, setActive] = useState(-1)
  const [orders, setOrders] = useState<Order[]>([])

  const fetchData = async (status: number) => {
    try {
      const data: Record<string, unknown> = { userId: getUserId() }
      if (status >= 0) data.orderStatus = status
      const res = await request<Order[]>({ url: '/order/list', data })
      setOrders(res)
    } catch (err) {
      console.error('[Order] 订单加载失败', err)
    }
  }

  useDidShow(() => {
    fetchData(active)
  })

  useEffect(() => {
    fetchData(active)
  }, [active])

  const payOrder = async (order: Order) => {
    await request({ url: '/pay/create', method: 'POST', data: { orderNo: order.orderNo, payMethod: 1 } })
    Taro.showToast({ title: '支付成功，已上链', icon: 'success' })
    fetchData(active)
  }

  const refundOrder = async (order: Order) => {
    const res = await Taro.showModal({ title: '申请退款', content: `确认对订单 ${order.orderNo} 申请退款吗？提交后需商户审核，审核通过后原路退回。` })
    if (!res.confirm) return
    await request({ url: '/refund/apply', method: 'POST', data: { orderNo: order.orderNo, reason: '用户申请退款' } })
    Taro.showToast({ title: '退款申请已提交，等待审核', icon: 'success' })
    fetchData(active)
  }

  return (
    <View className={styles.page}>
      <View className={styles.tabs}>
        {tabs.map(tab => (
          <View
            key={tab.value}
            className={classnames(styles.tab, active === tab.value && styles.active)}
            onClick={() => setActive(tab.value)}
          >
            <Text>{tab.label}</Text>
          </View>
        ))}
      </View>

      {orders.map(order => (
        <View key={order.id} className={styles.card}>
          <View className={styles.head}>
            <Text className={styles.orderNo}>{order.orderNo}</Text>
            <Text className={styles.status}>{statusText(order.orderStatus)}</Text>
          </View>
          {order.items.map(item => (
            <View key={item.id} className={styles.item}>
              <Image className={styles.cover} src={item.image} mode="aspectFill" onClick={() => Taro.navigateTo({ url: `/pages/product/index?id=${item.spuId}` })} />
              <View className={styles.info}>
                <Text className={styles.name}>{item.spuName}</Text>
                <Text className={styles.sku}>{item.skuName} × {item.quantity}</Text>
                <Text className={styles.price}>¥{item.unitPrice}</Text>
              </View>
            </View>
          ))}
          <View className={styles.foot}>
            <Text className={styles.meta}>{order.source} · {order.createTime}</Text>
            <Text className={styles.amount}>实付 <Text className={styles.amountValue}>¥{order.payAmount}</Text></Text>
          </View>
          <View className={styles.actions}>
            {order.orderStatus === 0 && (
              <View className={classnames(styles.actionBtn, styles.actionPrimary)} onClick={() => payOrder(order)}>
                <Text>去支付</Text>
              </View>
            )}
            {order.payStatus === 1 && (order.refundStatus === null || order.refundStatus === undefined || order.refundStatus === 3) && (
              <View className={styles.actionBtn} onClick={() => refundOrder(order)}>
                <Text>申请退款</Text>
              </View>
            )}
            <View className={styles.actionBtn} onClick={() => Taro.navigateTo({ url: `/pages/trace/index` })}>
              <Text>溯源查询</Text>
            </View>
          </View>
        </View>
      ))}

      {orders.length === 0 && <View className={styles.empty}>暂无订单</View>}
    </View>
  )
}

export default OrderPage

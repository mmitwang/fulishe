import React, { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { request, getUserId } from '@/services/api'
import type { CartItem } from '@/types'

const CartPage: React.FC = () => {
  const [items, setItems] = useState<CartItem[]>([])

  const fetchData = async () => {
    try {
      const res = await request<CartItem[]>({ url: '/cart', data: { userId: getUserId() } })
      setItems(res)
    } catch (err) {
      console.error('[Cart] 购物车加载失败', err)
    }
  }

  useDidShow(() => {
    fetchData()
  })

  useEffect(() => {
    fetchData()
  }, [])

  const toggle = async (item: CartItem) => {
    await request({ url: '/cart/update', method: 'PUT', data: { id: item.id, selected: !item.selected } })
    setItems(items.map(i => (i.id === item.id ? { ...i, selected: !i.selected } : i)))
  }

  const changeQty = async (item: CartItem, delta: number) => {
    const quantity = Math.max(1, item.quantity + delta)
    await request({ url: '/cart/update', method: 'PUT', data: { id: item.id, quantity } })
    setItems(items.map(i => (i.id === item.id ? { ...i, quantity } : i)))
  }

  const remove = async (item: CartItem) => {
    await request({ url: `/cart/${item.id}`, method: 'DELETE' })
    Taro.showToast({ title: '已删除', icon: 'none' })
    fetchData()
  }

  const selected = items.filter(i => i.selected)
  const total = selected.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const checkout = async () => {
    if (!selected.length) {
      Taro.showToast({ title: '请选择商品', icon: 'none' })
      return
    }
    try {
      const order = await request<{ orderNo: string; payAmount: number }>({
        url: '/order/create',
        method: 'POST',
        data: {
          userId: getUserId(),
          items: selected.map(i => ({ skuId: i.skuId, quantity: i.quantity })),
          receiver: '张三',
          mobile: '13800138005',
          address: '浙江省杭州市西湖区文三路 90 号东部软件园 3 号楼'
        }
      })
      await request({ url: '/pay/create', method: 'POST', data: { orderNo: order.orderNo, payMethod: 1 } })
      Taro.showToast({ title: '支付成功，已上链', icon: 'success' })
      await fetchData()
      setTimeout(() => {
        Taro.navigateTo({ url: '/pages/order/index' })
      }, 800)
    } catch (err) {
      console.error('[Cart] 结算失败', err)
    }
  }

  if (!items.length) {
    return (
      <View className={styles.page}>
        <View className={styles.empty}>
          <Text>购物车还是空的</Text>
          <View className={styles.emptyBtn} onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
            <Text>去逛逛</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className={styles.page}>
      <View className={styles.tip}>共 {items.length} 类商品，已选 {selected.length} 件</View>
      {items.map(item => (
        <View key={item.id} className={styles.item}>
          <View className={classnames(styles.check, item.selected && styles.checked)} onClick={() => toggle(item)}>
            {item.selected && <Text className={styles.checkMark}>✓</Text>}
          </View>
          <Image className={styles.cover} src={item.image} mode="aspectFill" onClick={() => Taro.navigateTo({ url: `/pages/product/index?id=${item.spuId}` })} />
          <View className={styles.info}>
            <Text className={styles.name}>{item.spuName}</Text>
            <Text className={styles.sku}>{item.skuName}</Text>
            <View className={styles.row}>
              <Text className={styles.price}>¥{item.price}</Text>
              <View className={styles.stepper}>
                <View className={styles.stepBtn} onClick={() => changeQty(item, -1)}>
                  <Text>-</Text>
                </View>
                <Text className={styles.stepValue}>{item.quantity}</Text>
                <View className={styles.stepBtn} onClick={() => changeQty(item, 1)}>
                  <Text>+</Text>
                </View>
              </View>
            </View>
            <Text className={styles.remove} onClick={() => remove(item)}>删除</Text>
          </View>
        </View>
      ))}

      <View className={styles.footer}>
        <View className={styles.total}>
          合计 <Text className={styles.amount}>¥{total}</Text>
        </View>
        <View className={classnames(styles.payBtn, !selected.length && styles.disabled)} onClick={checkout}>
          <Text>去结算</Text>
        </View>
      </View>
    </View>
  )
}

export default CartPage

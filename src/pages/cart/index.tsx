import React from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { cartAmount, selectedCartItems, useCartStore } from '@/store/cart'
import styles from './index.module.scss'

const CartPage: React.FC = () => {
  const { items, remove, setQuantity, toggle, toggleAll } = useCartStore()
  const selected = selectedCartItems(items)
  const allSelected = items.length > 0 && selected.length === items.length
  const total = cartAmount(selected)

  const checkout = () => {
    if (!selected.length) {
      Taro.showToast({ title: '请先选择商品', icon: 'none' })
      return
    }
    Taro.setStorageSync('checkoutItems', selected)
    Taro.navigateTo({ url: '/pages/checkout/index' })
  }

  if (!items.length) {
    return (
      <View className={styles.empty}>
        <Text className={styles.emptyMark}>礼</Text>
        <Text className={styles.emptyText}>购物车还是空的，去挑一份好礼吧</Text>
        <View className={styles.emptyButton} onClick={() => Taro.switchTab({ url: '/pages/category/index' })}>去逛精选</View>
      </View>
    )
  }

  return (
    <View className={styles.page}>
      <View className={styles.summary}>
        <Text>共 {items.length} 类商品，已选 {selected.length} 类</Text>
        <Text className={styles.selectAll} onClick={() => toggleAll(!allSelected)}>{allSelected ? '取消全选' : '全选'}</Text>
      </View>

      {items.map(item => (
        <View key={item.skuId} className={styles.item}>
          <View className={classnames(styles.checkbox, item.selected && styles.checked)} onClick={() => toggle(item.skuId)}>
            {item.selected && <Text>✓</Text>}
          </View>
          <Image className={styles.cover} src={item.image} mode="aspectFill" lazyLoad onClick={() => Taro.navigateTo({ url: `/pages/product/index?id=${item.spuId}` })} />
          <View className={styles.info}>
            <Text className={styles.name}>{item.spuName}</Text>
            <Text className={styles.sku}>{item.skuName} · 库存 {item.stock}</Text>
            <View className={styles.bottom}>
              <Text className={styles.price}>¥{item.price}</Text>
              <View className={styles.stepper}>
                <View className={styles.stepButton} onClick={() => setQuantity(item.skuId, item.quantity - 1)}>−</View>
                <Text className={styles.quantity}>{item.quantity}</Text>
                <View className={styles.stepButton} onClick={() => setQuantity(item.skuId, item.quantity + 1)}>＋</View>
              </View>
            </View>
            <Text className={styles.remove} onClick={() => remove(item.skuId)}>移除</Text>
          </View>
        </View>
      ))}

      <View className={styles.footer}>
        <View className={styles.footerInner}>
          <View>
            <Text className={styles.totalLabel}>合计（不含运费）</Text>
            <Text className={styles.totalPrice}>¥{total.toFixed(2)}</Text>
          </View>
          <View className={classnames(styles.checkoutButton, !selected.length && styles.disabled)} onClick={checkout} role="button" aria-label={`结算 ${selected.length} 类商品`}>
            结算 {selected.length ? `(${selected.length})` : ''}
          </View>
        </View>
      </View>
    </View>
  )
}

export default CartPage

import React, { useEffect, useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { getProductDetail, getProductPage } from '@/services/catalog'
import { calculateFullReduction, FALLBACK_FULL_REDUCTION_RULES, getFullReductionRules } from '@/services/promotion'
import { cartAmount, selectedCartItems, useCartStore } from '@/store/cart'
import type { FullReductionRule, Product } from '@/types'
import styles from './index.module.scss'

const CartPage: React.FC = () => {
  const { items, add: addToCart, remove, setQuantity, toggle, toggleAll } = useCartStore()
  const [rules, setRules] = useState<FullReductionRule[]>(FALLBACK_FULL_REDUCTION_RULES)
  const [addOnProducts, setAddOnProducts] = useState<Product[]>([])
  const [addingSpuId, setAddingSpuId] = useState(0)
  const selected = selectedCartItems(items)
  const allSelected = items.length > 0 && selected.length === items.length
  const total = cartAmount(selected)
  const quote = calculateFullReduction(total, rules)
  const recommendations = addOnProducts.filter(product => product.stock > 0 && !items.some(item => item.spuId === product.id)).slice(0, 6)

  useEffect(() => {
    let active = true
    void getFullReductionRules().then(result => { if (active) setRules(result) })
    void getProductPage(1, 40, 0, '', { sort: 'priceAsc' }).then(result => { if (active) setAddOnProducts(result.records) })
    return () => { active = false }
  }, [])

  const addRecommendation = async (product: Product) => {
    if (addingSpuId) return
    setAddingSpuId(product.id)
    try {
      const detail = await getProductDetail(product.id)
      const sku = detail.skus.filter(item => item.stock > 0).sort((a, b) => a.price - b.price)[0]
      if (!sku) throw new Error('该商品暂时无可售规格')
      addToCart(detail, sku)
      const nextQuote = calculateFullReduction(total + sku.price, rules)
      Taro.showToast({
        title: nextQuote.discountAmount > quote.discountAmount ? `满减已增至 ¥${nextQuote.discountAmount}` : '已加入购物车',
        icon: 'none'
      })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '加购失败，请稍后重试', icon: 'none' })
    } finally {
      setAddingSpuId(0)
    }
  }

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

      <View className={styles.promotionCard}>
        <View className={styles.promotionHeader}>
          <Text className={styles.promotionTitle}>全场满减</Text>
          <Text className={styles.promotionRules}>{rules.map(rule => `满${rule.thresholdAmount}减${rule.discountAmount}`).join(' / ')}</Text>
        </View>
        <Text className={styles.promotionMessage}>
          {!selected.length
            ? '勾选商品后自动计算满减'
            : quote.nextRule
              ? `${quote.appliedRule ? `已减 ¥${quote.discountAmount.toFixed(2)}，` : ''}再凑 ¥${quote.shortfallAmount.toFixed(2)} 可减 ¥${quote.nextRule.discountAmount.toFixed(2)}`
              : `已享最高档满减，共减 ¥${quote.discountAmount.toFixed(2)}`}
        </Text>
        <View className={styles.progressTrack}><View className={styles.progressValue} style={{ width: `${quote.progress}%` }} /></View>

        {!!selected.length && quote.nextRule && !!recommendations.length && (
          <View className={styles.addOnSection}>
            <Text className={styles.addOnTitle}>凑单推荐 · 一键加购</Text>
            <ScrollView className={styles.addOnScroll} scrollX>
              {recommendations.map(product => (
                <View className={styles.addOnItem} key={product.id}>
                  <Image className={styles.addOnImage} src={product.image} mode="aspectFill" lazyLoad onClick={() => Taro.navigateTo({ url: `/pages/product/index?id=${product.id}` })} />
                  <Text className={styles.addOnName}>{product.spuName}</Text>
                  <View className={styles.addOnBottom}>
                    <Text className={styles.addOnPrice}>¥{product.sellPrice.toFixed(2)}</Text>
                    <View
                      className={classnames(styles.addOnButton, addingSpuId > 0 && styles.disabled)}
                      onClick={() => void addRecommendation(product)}
                      role="button"
                      aria-label={`加购 ${product.spuName}`}
                    >
                      {addingSpuId === product.id ? '…' : '+'}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
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
            <Text className={styles.totalLabel}>{quote.discountAmount ? `已减 ¥${quote.discountAmount.toFixed(2)} · 预估应付` : '合计（不含运费）'}</Text>
            <Text className={styles.totalPrice}>¥{quote.payAmount.toFixed(2)}</Text>
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

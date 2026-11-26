import React, { useMemo, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import classnames from 'classnames'
import { formatAddress, listAddresses } from '@/services/address'
import { getFuliCardAccount } from '@/services/fuli-card'
import { getFulfillment, getStores, resolveSelectedStore } from '@/services/fulfillment'
import { isMockMode } from '@/services/config'
import { createOrder, payOrder } from '@/services/trade'
import { useCartStore } from '@/store/cart'
import type { Address, CartItem, DeliverySlot, FuliCardAccount, Order } from '@/types'
import styles from './index.module.scss'

const CheckoutPage: React.FC = () => {
  const removeFromCart = useCartStore(state => state.remove)
  const [items, setItems] = useState<CartItem[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [storeId, setStoreId] = useState(1)
  const [storeName, setStoreName] = useState('')
  const [arrivalText, setArrivalText] = useState('')
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [deliverySlot, setDeliverySlot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'fuli_card'>('wechat')
  const [cardAccount, setCardAccount] = useState<FuliCardAccount | null>(null)

  const loadCardAccount = async () => {
    if (!Taro.getStorageSync('token')) {
      setCardAccount(null)
      return
    }
    try {
      setCardAccount(await getFuliCardAccount())
    } catch (error) {
      console.error('[Checkout] 福卡余额读取失败', error)
      setCardAccount(null)
    }
  }

  const loadCheckout = async () => {
    setItems(Taro.getStorageSync('checkoutItems') || [])
    const picked = Taro.getStorageSync('checkoutAddress') as Address | ''
    if (picked) Taro.removeStorageSync('checkoutAddress')
    try {
      const addresses = await listAddresses()
      const selected = picked || addresses.find(item => item.isDefault) || addresses[0] || null
      setSelectedAddress(selected)
    } catch (error) {
      console.error('[Checkout] 地址簿读取失败', error)
      if (picked) setSelectedAddress(picked)
    }

    const stores = await getStores()
    const store = resolveSelectedStore(stores)
    const fulfillment = await getFulfillment(store.id)
    setStoreId(store.id)
    setStoreName(store.name)
    setArrivalText(fulfillment.arrivalText)
    setSlots(fulfillment.slots)
    setDeliverySlot(current => fulfillment.slots.some(item => item.id === current && item.available) ? current : fulfillment.slots.find(item => item.available)?.id || '')
  }

  useDidShow(() => {
    void loadCheckout()
    void loadCardAccount()
  })

  const total = useMemo(() => Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)), [items])
  const quantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const selectedSlot = slots.find(item => item.id === deliverySlot)

  const validate = (): boolean => {
    if (!selectedAddress) {
      Taro.showToast({ title: '请先选择收货地址', icon: 'none' })
      return false
    }
    if (!selectedSlot) {
      Taro.showToast({ title: '请选择配送时段', icon: 'none' })
      return false
    }
    return true
  }

  const goOrders = (orderNo?: string) => {
    Taro.removeStorageSync('checkoutItems')
    Taro.redirectTo({ url: `/pages/order/index?status=-1${orderNo ? `&orderNo=${orderNo}` : ''}` })
  }

  const submit = async () => {
    if (submitting || !items.length || !validate() || !selectedAddress || !selectedSlot) return
    setSubmitting(true)
    let createdOrder: Order | null = null
    try {
      if (paymentMethod === 'fuli_card') {
        if (!Taro.getStorageSync('token')) throw new Error('请先通过账号登录并使用 Mock 账户服务')
        const latestAccount = await getFuliCardAccount()
        setCardAccount(latestAccount)
        const requiredCents = Math.round(total * 100)
        if (latestAccount.balanceCents < requiredCents) {
          throw new Error(`福卡余额不足，还差 ¥${((requiredCents - latestAccount.balanceCents) / 100).toFixed(2)}，请先充值`)
        }
      }
      createdOrder = await createOrder({
        items,
        receiver: selectedAddress.receiver,
        mobile: selectedAddress.mobile,
        address: formatAddress(selectedAddress),
        addressId: selectedAddress.id,
        storeId,
        storeName,
        deliverySlot: `${selectedSlot.label} ${selectedSlot.period}`
      })
      items.forEach(item => removeFromCart(item.skuId))
      await payOrder(createdOrder, paymentMethod)
      Taro.showToast({ title: '支付完成', icon: 'success' })
      goOrders(createdOrder.orderNo)
    } catch (error) {
      console.error('[Checkout] 下单或支付失败', createdOrder?.orderNo, error)
      if (createdOrder) {
        await Taro.showModal({
          title: '订单已创建',
          content: '支付尚未完成，可在待付款订单中继续处理。',
          showCancel: false
        })
        goOrders(createdOrder.orderNo)
      } else {
        Taro.showToast({ title: error instanceof Error ? error.message : '订单提交失败', icon: 'none', duration: 2500 })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!items.length) {
    return (
      <View className={styles.empty}>
        <Text className={styles.emptyTitle}>暂无待结算商品</Text>
        <Text className={styles.emptyText}>结算快照可能已完成或已失效</Text>
        <View className={styles.backButton} onClick={() => Taro.switchTab({ url: '/pages/cart/index' })}>返回购物车</View>
      </View>
    )
  }

  return (
    <View className={styles.page}>
      <View className={`${styles.card} ${styles.addressCard}`} onClick={() => Taro.navigateTo({ url: '/pages/address/index?select=1' })} role="button" aria-label="选择收货地址">
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>收货地址</Text>
          <Text className={styles.sectionAction}>更换 ›</Text>
        </View>
        {selectedAddress ? (
          <View>
            <View className={styles.addressMeta}>
              <Text className={styles.receiver}>{selectedAddress.receiver}</Text>
              <Text>{selectedAddress.mobile}</Text>
              {selectedAddress.isDefault && <Text className={styles.defaultBadge}>默认</Text>}
            </View>
            <Text className={styles.addressText}>{formatAddress(selectedAddress)}</Text>
          </View>
        ) : (
          <Text className={styles.addressEmpty}>请选择或新增收货地址</Text>
        )}
      </View>

      <View className={styles.card}>
        <Text className={styles.sectionTitle}>配送时段</Text>
        <View className={styles.storeLine}>
          <Text className={styles.storeName}>{storeName || '附近门店'}</Text>
          <Text className={styles.arrivalText}>{arrivalText}</Text>
        </View>
        <View className={styles.slotList}>
          {slots.map(slot => (
            <View
              className={classnames(styles.slotOption, deliverySlot === slot.id && styles.slotActive, !slot.available && styles.slotDisabled)}
              key={slot.id}
              onClick={() => slot.available && setDeliverySlot(slot.id)}
              role="radio"
              aria-checked={deliverySlot === slot.id}
            >
              <Text className={styles.slotLabel}>{slot.label}</Text>
              <Text className={styles.slotPeriod}>{slot.period}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.card}>
        <Text className={styles.sectionTitle}>商品清单 · {quantity} 件</Text>
        {items.map(item => (
          <View className={styles.productItem} key={item.skuId}>
            <Image className={styles.cover} src={item.image} mode="aspectFill" lazyLoad onError={event => console.error('[Checkout] 商品图加载失败', item.spuId, event)} />
            <View className={styles.productInfo}>
              <Text className={styles.productName}>{item.spuName}</Text>
              <Text className={styles.skuName}>{item.skuName}</Text>
              <Text className={styles.productPrice}>¥{item.price.toFixed(2)}</Text>
            </View>
            <Text className={styles.quantity}>× {item.quantity}</Text>
          </View>
        ))}
      </View>

      <View className={styles.card}>
        <Text className={styles.sectionTitle}>支付方式</Text>
        <View className={classnames(styles.paymentOption, paymentMethod === 'wechat' && styles.paymentOptionActive)} onClick={() => setPaymentMethod('wechat')} role="radio" aria-checked={paymentMethod === 'wechat'}>
          <View className={styles.paymentRow}>
            <View className={styles.paymentName}><Text className={styles.paymentIcon}>付</Text><Text>微信支付</Text></View>
            <Text className={styles.paymentMode}>{paymentMethod === 'wechat' ? '已选择' : isMockMode() ? '模拟支付' : '生产支付'}</Text>
          </View>
        </View>
        <View
          className={classnames(styles.paymentOption, paymentMethod === 'fuli_card' && styles.paymentOptionActive)}
          onClick={() => { setPaymentMethod('fuli_card'); void loadCardAccount() }}
          role="radio"
          aria-checked={paymentMethod === 'fuli_card'}
        >
          <View className={styles.paymentRow}>
            <View className={styles.paymentName}><Text className={styles.paymentIcon}>福</Text><Text>福礼社卡</Text></View>
            <Text className={styles.paymentMode}>
              {paymentMethod === 'fuli_card' ? '已选择' : cardAccount ? `余额 ¥${(cardAccount.balanceCents / 100).toFixed(2)}` : '登录后可用'}
            </Text>
          </View>
        </View>
        <Text className={styles.paymentNote}>
          {paymentMethod === 'wechat'
            ? isMockMode() ? '仅模拟微信回调并更新订单状态，不打开真实收银台，不产生实际扣款。' : '将请求后端返回的微信支付签名参数；商户参数未配置时会明确提示。'
            : cardAccount
              ? `福卡余额 ¥${(cardAccount.balanceCents / 100).toFixed(2)}，本单需 ¥${total.toFixed(2)}。仅支持福卡全额支付，不与微信混合扣款。`
              : '福卡需登录并连接 Mock 账户服务；余额暂不可用时会阻止提交，不会创建本地余额。'}
        </Text>
      </View>

      <View className={styles.card}>
        <View className={styles.amountRow}><Text className={styles.amountLabel}>商品金额</Text><Text className={styles.amountValue}>¥{total.toFixed(2)}</Text></View>
        <View className={styles.amountRow}><Text className={styles.amountLabel}>运费</Text><Text className={styles.amountValue}>¥0.00</Text></View>
        <View className={styles.amountRow}><Text className={styles.amountLabel}>优惠</Text><Text className={styles.amountValue}>−¥0.00</Text></View>
        <View className={`${styles.amountRow} ${styles.totalRow}`}><Text className={styles.amountLabel}>应付合计</Text><Text className={styles.totalValue}>¥{total.toFixed(2)}</Text></View>
      </View>

      <View className={styles.actionBar}>
        <View className={styles.actionBarInner}>
          <View className={styles.actionAmount}>
            <Text className={styles.actionHint}>共 {quantity} 件，应付</Text>
            <Text className={styles.actionPrice}>¥{total.toFixed(2)}</Text>
          </View>
          <View className={classnames(styles.submitButton, submitting && styles.disabled)} onClick={() => void submit()} role="button" aria-label="提交订单并支付">
            {submitting ? '正在提交…' : '提交并支付'}
          </View>
        </View>
      </View>
    </View>
  )
}

export default CheckoutPage

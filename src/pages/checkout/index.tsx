import React, { useEffect, useMemo, useState } from 'react'
import { Image, Input, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { getCurrentUser } from '@/services/auth'
import { isMockMode } from '@/services/config'
import { getFuliCardAccount } from '@/services/fuli-card'
import { createOrder, payOrder } from '@/services/trade'
import { useCartStore } from '@/store/cart'
import type { CartItem, FuliCardAccount, Order } from '@/types'
import styles from './index.module.scss'

const CheckoutPage: React.FC = () => {
  const removeFromCart = useCartStore(state => state.remove)
  const [items, setItems] = useState<CartItem[]>([])
  const [receiver, setReceiver] = useState('')
  const [mobile, setMobile] = useState('')
  const [address, setAddress] = useState('')
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

  useEffect(() => {
    const checkoutItems = Taro.getStorageSync('checkoutItems') || []
    const user = getCurrentUser()
    setItems(checkoutItems)
    setReceiver(user?.realName || user?.nickname || '')
    setMobile(user?.mobile || '')
    void loadCardAccount()
  }, [])

  const total = useMemo(() => Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)), [items])
  const quantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])

  const validate = (): boolean => {
    if (receiver.trim().length < 2) {
      Taro.showToast({ title: '请填写收货人姓名', icon: 'none' })
      return false
    }
    if (!/^1\d{10}$/.test(mobile.trim())) {
      Taro.showToast({ title: '请填写 11 位手机号码', icon: 'none' })
      return false
    }
    if (address.trim().length < 6) {
      Taro.showToast({ title: '请填写完整收货地址', icon: 'none' })
      return false
    }
    return true
  }

  const goOrders = (orderNo?: string) => {
    Taro.removeStorageSync('checkoutItems')
    Taro.redirectTo({ url: `/pages/order/index?status=-1${orderNo ? `&orderNo=${orderNo}` : ''}` })
  }

  const submit = async () => {
    if (submitting || !items.length || !validate()) return
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
      createdOrder = await createOrder({ items, receiver: receiver.trim(), mobile: mobile.trim(), address: address.trim() })
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
      <View className={styles.card}>
        <Text className={styles.sectionTitle}>收货信息</Text>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>收货人</Text>
          <Input className={styles.input} value={receiver} maxlength={20} placeholder="请输入收货人姓名" onInput={event => setReceiver(event.detail.value)} />
        </View>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>手机号码</Text>
          <Input className={styles.input} value={mobile} type="number" maxlength={11} placeholder="用于配送与订单通知" onInput={event => setMobile(event.detail.value)} />
        </View>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>收货地址</Text>
          <Textarea className={`${styles.input} ${styles.textarea}`} value={address} maxlength={120} placeholder="省市区、街道及详细门牌号" onInput={event => setAddress(event.detail.value)} />
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

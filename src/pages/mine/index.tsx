import React, { useCallback, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getCurrentUser, loginByWechat, logout } from '@/services/auth'
import { isOperator } from '@/services/roles'
import { getFuliCardAccount } from '@/services/fuli-card'
import { listOrders } from '@/services/trade'
import { getChannelStatus } from '@/services/wechat'
import type { ChannelStatus, FuliCardAccount, Order, User } from '@/types'
import styles from './index.module.scss'

const MinePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [cardAccount, setCardAccount] = useState<FuliCardAccount | null>(null)
  const [cardError, setCardError] = useState(false)
  const [channel, setChannel] = useState<ChannelStatus>(() => getChannelStatus())
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    const current = getCurrentUser()
    setUser(current)
    setChannel(getChannelStatus())
    if (!current) {
      setOrders([])
      setCardAccount(null)
      setCardError(false)
      return
    }
    try {
      setOrders(await listOrders())
    } catch (error) {
      console.error('[MinePage] 订单摘要加载失败', error)
      setOrders([])
    }
    setCardError(false)
    if (!Taro.getStorageSync('token')) {
      setCardAccount(null)
      return
    }
    try {
      setCardAccount(await getFuliCardAccount())
    } catch (error) {
      console.error('[MinePage] 福卡余额加载失败', error)
      setCardAccount(null)
      setCardError(true)
    }
  }, [])

  useDidShow(() => {
    void refresh()
  })

  const authorize = async () => {
    if (loading) return
    setLoading(true)
    try {
      await loginByWechat()
      await refresh()
      Taro.showToast({ title: '授权登录成功', icon: 'success' })
    } catch (error) {
      console.error('[MinePage] 微信授权失败', error)
      Taro.showToast({ title: error instanceof Error ? error.message : '授权失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const signOut = () => {
    logout()
    setUser(null)
    setOrders([])
    setCardAccount(null)
    setCardError(false)
    Taro.showToast({ title: '已退出登录', icon: 'none' })
  }

  const openOrders = (status = -1) => {
    Taro.navigateTo({ url: `/pages/order/index?status=${status}` })
  }

  const paidCount = orders.filter(order => order.payStatus === 1).length
  const pendingCount = orders.filter(order => order.orderStatus === 0).length
  const completedCount = orders.filter(order => order.orderStatus >= 3).length
  const cardBalance = cardAccount
    ? `¥${(cardAccount.balanceCents / 100).toFixed(2)}`
    : cardError
      ? '暂不可用'
      : user && Taro.getStorageSync('token') ? '读取中…' : '登录后查看'

  return (
    <View className={styles.page}>
      <View className={styles.profile}>
        {user?.avatar ? (
          <Image className={styles.avatar} src={user.avatar} mode="aspectFill" onError={error => console.error('[MinePage] 头像加载失败', error)} />
        ) : (
          <View className={styles.avatar}>{user?.nickname?.slice(0, 1) || '礼'}</View>
        )}
        <View className={styles.profileInfo}>
          <Text className={styles.nickname}>{user?.nickname || '尚未登录'}</Text>
          <Text className={styles.profileMeta}>{user ? `${user.username} · ${user.roleName || '福礼社会员'}` : '登录后同步订单与礼赠服务'}</Text>
        </View>
        <View className={styles.profileAction} onClick={user ? signOut : () => Taro.navigateTo({ url: '/pages/login/index' })}>
          {user ? '退出' : '登录'}
        </View>
      </View>

      <View className={styles.modeStrip} onClick={() => Taro.navigateTo({ url: '/pages/channel/index' })}>
        <Text className={styles.modeText}>{channel.channel} · {channel.apiBaseUrl}</Text>
        <Text className={styles.modeBadge}>{channel.mode === 'mock' ? '模拟联调' : '生产配置'}</Text>
      </View>

      <View className={styles.fuliCard} onClick={() => Taro.navigateTo({ url: '/pages/card/index' })}>
        <View className={styles.fuliCardHeader}>
          <Text className={styles.fuliCardTitle}>福礼社卡</Text>
          <Text className={styles.fuliCardBadge}>充值 · 消费 · 送礼</Text>
        </View>
        <View className={styles.fuliCardBody}>
          <View>
            <Text className={styles.fuliCardLabel}>可用余额 · 模拟资金</Text>
            <Text className={styles.fuliCardBalance}>{cardBalance}</Text>
          </View>
          <Text className={styles.fuliCardAction}>进入福卡 ›</Text>
        </View>
      </View>

      <View className={styles.orderCard}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>我的订单</Text>
          <Text className={styles.sectionMore} onClick={() => openOrders()}>全部订单 ›</Text>
        </View>
        <View className={styles.orderGrid}>
          <View className={styles.orderItem} onClick={() => openOrders()}>
            <Text className={styles.orderCount}>{orders.length}</Text>
            <Text className={styles.orderLabel}>全部</Text>
          </View>
          <View className={styles.orderItem} onClick={() => openOrders(0)}>
            <Text className={styles.orderCount}>{pendingCount}</Text>
            <Text className={styles.orderLabel}>待付款</Text>
          </View>
          <View className={styles.orderItem} onClick={() => openOrders(1)}>
            <Text className={styles.orderCount}>{paidCount}</Text>
            <Text className={styles.orderLabel}>已支付</Text>
          </View>
          <View className={styles.orderItem} onClick={() => openOrders(3)}>
            <Text className={styles.orderCount}>{completedCount}</Text>
            <Text className={styles.orderLabel}>已完成</Text>
          </View>
        </View>
      </View>

      <View className={styles.menuCard}>
        {isOperator(user) && (
          <View className={styles.menuRow} onClick={() => Taro.navigateTo({ url: '/pages/ops/index' })}>
            <Text className={styles.menuIcon}>营</Text>
            <View className={styles.menuBody}>
              <Text className={styles.menuTitle}>运营驾驶舱</Text>
              <Text className={styles.menuDescription}>经营指标、订单漏斗与虚拟压测</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        )}
        <View className={styles.menuRow} onClick={() => Taro.navigateTo({ url: '/pages/trace/index' })}>
          <Text className={styles.menuIcon}>溯</Text>
          <View className={styles.menuBody}>
            <Text className={styles.menuTitle}>好礼溯源</Text>
            <Text className={styles.menuDescription}>查询批次、质检与履约节点</Text>
          </View>
          <Text className={styles.menuArrow}>›</Text>
        </View>
        <View className={styles.menuRow} onClick={() => Taro.navigateTo({ url: '/pages/channel/index' })}>
          <Text className={styles.menuIcon}>联</Text>
          <View className={styles.menuBody}>
            <Text className={styles.menuTitle}>渠道能力中心</Text>
            <Text className={styles.menuDescription}>授权、分享、订阅、扫码与上线配置</Text>
          </View>
          <Text className={styles.menuArrow}>›</Text>
        </View>
        <View className={styles.menuRow} onClick={() => Taro.switchTab({ url: '/pages/category/index' })}>
          <Text className={styles.menuIcon}>选</Text>
          <View className={styles.menuBody}>
            <Text className={styles.menuTitle}>企业集采选品</Text>
            <Text className={styles.menuDescription}>按分类与预算挑选福利好礼</Text>
          </View>
          <Text className={styles.menuArrow}>›</Text>
        </View>
      </View>

      <View className={styles.authCard}>
        <Text className={styles.authTitle}>微信快捷授权</Text>
        <Text className={styles.authDescription}>
          {channel.mode === 'mock'
            ? '当前为模拟模式，不获取真实微信资料，不触发扣款；业务流程仍可联调。'
            : '生产模式将请求真实微信授权，需先配置平台凭证与服务端接口。'}
        </Text>
        <View className={styles.authButton} onClick={authorize}>{loading ? '授权处理中…' : '模拟微信授权'}</View>
        {user && <View className={`${styles.authButton} ${styles.secondaryButton}`} onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}>切换演示账号</View>}
      </View>

      <View className={styles.footnote}>福礼社 · 让每一份福利都有出处{'\n'}真实上线仍需 AppID、业务域名、商户参数与平台审核</View>
    </View>
  )
}

export default MinePage

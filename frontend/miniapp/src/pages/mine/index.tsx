import React, { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import styles from './index.module.scss'
import { request, getUserId } from '@/services/api'
import type { Order } from '@/types'

interface CouponItem {
  id: number
  status: number
}

const MinePage: React.FC = () => {
  const [stats, setStats] = useState({ orders: 0, coupons: 0, traces: 16 })
  const [user, setUser] = useState({ nickname: '张三', mobile: '13800138005' })

  const loadStats = async () => {
    try {
      const [orders, coupons] = await Promise.all([
        request<Order[]>({ url: '/order/list', data: { userId: getUserId() } }),
        request<CouponItem[]>({ url: '/coupon/my', data: { userId: getUserId() } })
      ])
      setStats({
        orders: orders.length,
        coupons: coupons.filter(c => c.status === 0).length,
        traces: 16
      })
      const cached = Taro.getStorageSync('userInfo')
      if (cached) {
        setUser({ nickname: cached.nickname || cached.realName || '张三', mobile: cached.mobile || '13800138005' })
      }
    } catch (err) {
      console.error('[Mine] 用户数据加载失败', err)
    }
  }

  useDidShow(() => {
    loadStats()
  })

  const goOrder = () => Taro.navigateTo({ url: '/pages/order/index' })
  const goTrace = () => Taro.navigateTo({ url: '/pages/trace/index' })
  const goCategory = () => Taro.switchTab({ url: '/pages/category/index' })

  const showTip = () => {
    Taro.showToast({ title: '功能正在开发中', icon: 'none' })
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.avatar}>
          <Text>{user.nickname.slice(0, 1)}</Text>
        </View>
        <View className={styles.userInfo}>
          <Text className={styles.userName}>{user.nickname}</Text>
          <Text className={styles.userMobile}>{user.mobile}</Text>
        </View>
        <Text className={styles.member}>企业会员</Text>
      </View>

      <View className={styles.stats}>
        <View className={styles.stat} onClick={goOrder}>
          <Text className={styles.statValue}>{stats.orders}</Text>
          <Text className={styles.statLabel}>全部订单</Text>
        </View>
        <View className={styles.stat} onClick={showTip}>
          <Text className={styles.statValue}>{stats.coupons}</Text>
          <Text className={styles.statLabel}>可用卡券</Text>
        </View>
        <View className={styles.stat} onClick={goTrace}>
          <Text className={styles.statValue}>{stats.traces}</Text>
          <Text className={styles.statLabel}>溯源存证</Text>
        </View>
      </View>

      <View className={styles.group}>
        <View className={styles.cell} onClick={goOrder}>
          <View className={styles.cellIcon}><Text>单</Text></View>
          <Text className={styles.cellTitle}>我的订单</Text>
          <Text className={styles.cellValue}>全部订单</Text>
          <Text className={styles.cellArrow}>›</Text>
        </View>
        <View className={styles.cell} onClick={showTip}>
          <View className={styles.cellIcon}><Text>券</Text></View>
          <Text className={styles.cellTitle}>我的卡券</Text>
          <Text className={styles.cellArrow}>›</Text>
        </View>
        <View className={styles.cell} onClick={goTrace}>
          <View className={styles.cellIcon}><Text>链</Text></View>
          <Text className={styles.cellTitle}>区块链验真</Text>
          <Text className={styles.cellArrow}>›</Text>
        </View>
        <View className={styles.cell} onClick={goCategory}>
          <View className={styles.cellIcon}><Text>礼</Text></View>
          <Text className={styles.cellTitle}>企业集采</Text>
          <Text className={styles.cellArrow}>›</Text>
        </View>
      </View>

      <View className={styles.group}>
        <View className={styles.cell} onClick={showTip}>
          <View className={styles.cellIcon}><Text>址</Text></View>
          <Text className={styles.cellTitle}>收货地址</Text>
          <Text className={styles.cellArrow}>›</Text>
        </View>
        <View className={styles.cell} onClick={showTip}>
          <View className={styles.cellIcon}><Text>票</Text></View>
          <Text className={styles.cellTitle}>企业发票</Text>
          <Text className={styles.cellArrow}>›</Text>
        </View>
        <View className={styles.cell} onClick={showTip}>
          <View className={styles.cellIcon}><Text>客</Text></View>
          <Text className={styles.cellTitle}>联系客服</Text>
          <Text className={styles.cellValue}>400-888-6688</Text>
          <Text className={styles.cellArrow}>›</Text>
        </View>
      </View>

      <View className={styles.logout} onClick={showTip}>
        <Text>切换演示账号</Text>
      </View>
      <Text className={styles.version}>福礼社小程序 v2.0.0 · Mock 数据版</Text>
    </View>
  )
}

export default MinePage

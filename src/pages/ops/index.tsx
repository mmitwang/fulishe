import React, { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { request } from '@/services/api'
import { listOrders } from '@/services/trade'
import type { Order } from '@/types'
import styles from './index.module.scss'

interface OpsDashboard {
  gmv: number
  orderCount: number
  paidCount: number
  payRate: number
  pendingShip: number
  funnel: { key: string; label: string; count: number }[]
  recent: { orderNo: string; payAmount: number; orderStatus: number; payStatus: number; userName: string; createTime: string }[]
}

interface StressResult {
  count: number
  steps: number
  elapsedMs: number
  tps: number
  note: string
}

const localDashboard = async (): Promise<OpsDashboard> => {
  const orders: Order[] = await listOrders()
  const paid = orders.filter(o => o.payStatus === 1)
  return {
    gmv: Number(paid.reduce((sum, o) => sum + Number(o.payAmount || 0), 0).toFixed(2)),
    orderCount: orders.length,
    paidCount: paid.length,
    payRate: orders.length ? Number(((paid.length / orders.length) * 100).toFixed(1)) : 0,
    pendingShip: orders.filter(o => o.orderStatus === 1).length,
    funnel: [
      { key: 'created', label: '下单', count: orders.length },
      { key: 'paid', label: '支付', count: paid.length },
      { key: 'shipped', label: '发货', count: orders.filter(o => o.orderStatus === 2 || o.orderStatus >= 3).length },
      { key: 'done', label: '完成', count: orders.filter(o => o.orderStatus >= 3).length }
    ],
    recent: orders.slice(0, 8).map(o => ({ orderNo: o.orderNo, payAmount: o.payAmount, orderStatus: o.orderStatus, payStatus: o.payStatus, userName: o.userName, createTime: o.createTime }))
  }
}

const statusLabel = (order: { orderStatus: number; payStatus: number }): string => {
  if (order.payStatus === 3) return '已退款'
  if (order.orderStatus === 0) return '待付款'
  if (order.orderStatus === 1) return '待发货'
  if (order.orderStatus === 2) return '已发货'
  if (order.orderStatus >= 3) return '已完成'
  return '已关闭'
}

const OpsPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<OpsDashboard | null>(null)
  const [source, setSource] = useState('加载中')
  const [stress, setStress] = useState<StressResult | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setDashboard(await request<OpsDashboard>({ url: '/ops/dashboard', cacheTtl: 0 }))
      setSource('Mock 服务端聚合')
    } catch {
      try {
        setDashboard(await localDashboard())
        setSource('本地订单聚合（服务不可达）')
      } catch (error) {
        console.error('[Ops] 运营数据加载失败', error)
        Taro.showToast({ title: '运营数据加载失败', icon: 'none' })
      }
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const runStress = async (count: number) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await request<StressResult>({ url: '/ops/stress', method: 'POST', cacheTtl: 0, data: { count } })
      setStress(res)
      Taro.showToast({ title: `压测完成 · ${res.tps} TPS`, icon: 'none' })
    } catch {
      Taro.showToast({ title: 'Mock 服务不可达，无法压测', icon: 'none' })
    } finally {
      setBusy(false)
    }
  }

  const maxFunnel = dashboard ? Math.max(...dashboard.funnel.map(f => f.count), 1) : 1

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>运营驾驶舱</Text>
        <Text className={styles.subtitle}>数据源：{source}</Text>
      </View>

      {dashboard ? (
        <>
          <View className={styles.kpiGrid}>
            <View className={styles.kpiCard}>
              <Text className={styles.kpiValue}>¥{dashboard.gmv.toFixed(2)}</Text>
              <Text className={styles.kpiLabel}>累计 GMV</Text>
            </View>
            <View className={styles.kpiCard}>
              <Text className={styles.kpiValue}>{dashboard.orderCount}</Text>
              <Text className={styles.kpiLabel}>订单总数</Text>
            </View>
            <View className={styles.kpiCard}>
              <Text className={styles.kpiValue}>{dashboard.payRate}%</Text>
              <Text className={styles.kpiLabel}>支付成功率</Text>
            </View>
            <View className={styles.kpiCard}>
              <Text className={styles.kpiValue}>{dashboard.pendingShip}</Text>
              <Text className={styles.kpiLabel}>待发货</Text>
            </View>
          </View>

          <View className={styles.card}>
            <Text className={styles.cardTitle}>订单漏斗</Text>
            {dashboard.funnel.map(stage => (
              <View key={stage.key} className={styles.funnelRow}>
                <Text className={styles.funnelLabel}>{stage.label}</Text>
                <View className={styles.funnelTrack}>
                  <View className={styles.funnelBar} style={{ width: `${Math.max((stage.count / maxFunnel) * 100, 4)}%` }} />
                </View>
                <Text className={styles.funnelCount}>{stage.count}</Text>
              </View>
            ))}
          </View>

          <View className={styles.card}>
            <Text className={styles.cardTitle}>虚拟并发压测（创建→支付→发货→完成）</Text>
            <View className={styles.stressRow}>
              {[10, 50, 100].map(count => (
                <View key={count} className={classnames(styles.stressBtn, busy && styles.disabled)} onClick={() => void runStress(count)}>
                  {busy ? '压测中…' : `${count} 笔`}
                </View>
              ))}
            </View>
            {stress && (
              <View className={styles.stressResult}>
                <Text>{stress.count} 笔虚拟交易 · {stress.steps} 步状态推进 · 耗时 {stress.elapsedMs}ms · {stress.tps} TPS</Text>
                <Text>{stress.note}</Text>
              </View>
            )}
          </View>

          <View className={styles.card}>
            <Text className={styles.cardTitle}>最近交易流水</Text>
            {dashboard.recent.length ? dashboard.recent.map(order => (
              <View key={order.orderNo} className={styles.recentRow}>
                <View className={styles.recentInfo}>
                  <Text className={styles.recentNo}>{order.orderNo}</Text>
                  <Text className={styles.recentMeta}>{order.userName} · {order.createTime?.replace('T', ' ').slice(5, 16)}</Text>
                </View>
                <View className={styles.recentRight}>
                  <Text className={styles.recentAmount}>¥{Number(order.payAmount).toFixed(2)}</Text>
                  <Text className={styles.recentStatus}>{statusLabel(order)}</Text>
                </View>
              </View>
            )) : <Text className={styles.emptyText}>暂无交易数据，先去下几笔模拟订单</Text>}
          </View>
        </>
      ) : (
        <View className={styles.loading}>正在汇总经营数据…</View>
      )}
    </View>
  )
}

export default OpsPage

import React, { useCallback, useState } from 'react'
import { Input, Text, Textarea, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import classnames from 'classnames'
import { ensureSession } from '@/services/auth'
import { getFuliCardAccount, listFuliCardFlows, rechargeFuliCard, transferFuliCard } from '@/services/fuli-card'
import type { FuliCardAccount, FuliCardFlow } from '@/types'
import styles from './index.module.scss'

const presets = [10000, 20000, 50000]

const toCents = (value: string): number => {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return 0
  return Math.round(Number(value) * 100)
}

const money = (cents: number): string => (cents / 100).toFixed(2)

const flowTitle = (flow: FuliCardFlow): string => {
  if (flow.bizType === 'RECHARGE') return '福卡充值'
  if (flow.bizType === 'ORDER_PAY') return '商城消费'
  if (flow.bizType === 'ORDER_REFUND') return '订单退款'
  return flow.direction === 'IN' ? '收到福卡' : '福卡送礼'
}

const FuliCardPage: React.FC = () => {
  const [account, setAccount] = useState<FuliCardAccount | null>(null)
  const [flows, setFlows] = useState<FuliCardFlow[]>([])
  const [panel, setPanel] = useState<'recharge' | 'gift'>('recharge')
  const [rechargeAmount, setRechargeAmount] = useState('200')
  const [giftTo, setGiftTo] = useState('')
  const [giftAmount, setGiftAmount] = useState('')
  const [giftRemark, setGiftRemark] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await ensureSession()
      const [nextAccount, flowPage] = await Promise.all([getFuliCardAccount(), listFuliCardFlows()])
      setAccount(nextAccount)
      setFlows(flowPage.records)
    } catch (loadError) {
      console.error('[FuliCard] 账户加载失败', loadError)
      setAccount(null)
      setFlows([])
      setError(loadError instanceof Error ? loadError.message : '福卡服务暂不可用')
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => { void load() })

  const recharge = async () => {
    const amountCents = toCents(rechargeAmount)
    if (busy || !amountCents) {
      if (!amountCents) Taro.showToast({ title: '请输入正确的充值金额', icon: 'none' })
      return
    }
    setBusy('recharge')
    try {
      const result = await rechargeFuliCard(amountCents)
      Taro.showToast({ title: `已模拟充值 ¥${money(result.amountCents)}`, icon: 'none' })
      await load()
    } catch (rechargeError) {
      Taro.showModal({ title: '充值未完成', content: rechargeError instanceof Error ? rechargeError.message : '请稍后重试', showCancel: false })
    } finally {
      setBusy('')
    }
  }

  const transfer = async () => {
    const amountCents = toCents(giftAmount)
    if (busy) return
    if (!giftTo.trim()) {
      Taro.showToast({ title: '请输入收礼人的演示账号', icon: 'none' })
      return
    }
    if (!amountCents) {
      Taro.showToast({ title: '请输入正确的送礼金额', icon: 'none' })
      return
    }
    setBusy('transfer')
    try {
      const result = await transferFuliCard({ toUsername: giftTo.trim(), amountCents, remark: giftRemark.trim() })
      Taro.showModal({ title: '福卡已送达', content: `已向 ${result.toUserName} 转赠 ¥${money(result.amountCents)}（模拟）`, showCancel: false })
      setGiftAmount('')
      setGiftRemark('')
      await load()
    } catch (transferError) {
      Taro.showModal({ title: '送礼未完成', content: transferError instanceof Error ? transferError.message : '请稍后重试', showCancel: false })
    } finally {
      setBusy('')
    }
  }

  return (
    <View className={styles.page}>
      <View className={styles.balanceCard}>
        <View className={styles.brandRow}>
          <Text className={styles.brand}>福礼社卡</Text>
          <Text className={styles.mockBadge}>模拟资金</Text>
        </View>
        <Text className={styles.english}>FULI CARD · 让心意自由抵达</Text>
        <Text className={styles.balanceLabel}>可用余额（元）</Text>
        <Text className={styles.balance}>{account ? money(account.balanceCents) : loading ? '读取中…' : '--'}</Text>
        <View className={styles.accountStats}>
          <Text>累计充值与收款 ¥{account ? money(account.totalIncomeCents) : '--'}</Text>
          <Text>累计消费与送礼 ¥{account ? money(account.totalExpenseCents) : '--'}</Text>
        </View>
      </View>

      {!!error && (
        <View className={styles.errorCard}>
          <Text>{error}</Text>
          <Text className={styles.retry} onClick={() => void load()}>重新加载</Text>
        </View>
      )}

      <View className={styles.operationCard}>
        <View className={styles.panelTabs}>
          <View className={classnames(styles.panelTab, panel === 'recharge' && styles.panelTabActive)} onClick={() => setPanel('recharge')} role="tab" aria-selected={panel === 'recharge'}>充值</View>
          <View className={classnames(styles.panelTab, panel === 'gift' && styles.panelTabActive)} onClick={() => setPanel('gift')} role="tab" aria-selected={panel === 'gift'}>送礼</View>
        </View>

        {panel === 'recharge' ? (
          <View>
            <Text className={styles.sectionTitle}>选择充值金额</Text>
            <View className={styles.presetGrid}>
              {presets.map(amount => (
                <View key={amount} className={classnames(styles.preset, toCents(rechargeAmount) === amount && styles.presetActive)} onClick={() => setRechargeAmount(String(amount / 100))}>
                  ¥{amount / 100}
                </View>
              ))}
            </View>
            <Text className={styles.fieldLabel}>自定义金额（元）</Text>
            <Input className={styles.input} type="digit" value={rechargeAmount} placeholder="0.01 – 100000" onInput={event => setRechargeAmount(event.detail.value)} />
            <Text className={styles.formNote}>点击后将创建充值单并模拟支付确认；未确认前不会入账，不产生真实扣款。</Text>
            <View className={classnames(styles.primaryButton, busy && styles.disabled)} onClick={() => void recharge()}>
              {busy === 'recharge' ? '正在确认充值结果…' : '模拟充值'}
            </View>
          </View>
        ) : (
          <View>
            <Text className={styles.sectionTitle}>把福卡心意送给好友</Text>
            <Text className={styles.fieldLabel}>收礼人演示账号</Text>
            <Input className={styles.input} value={giftTo} placeholder="例如 user1" onInput={event => setGiftTo(event.detail.value)} />
            <Text className={styles.fieldLabel}>送礼金额（元）</Text>
            <Input className={styles.input} type="digit" value={giftAmount} placeholder="请输入金额" onInput={event => setGiftAmount(event.detail.value)} />
            <Text className={styles.fieldLabel}>祝福语（选填）</Text>
            <Textarea className={`${styles.input} ${styles.textarea}`} maxlength={60} value={giftRemark} placeholder="愿每一份心意，都体面抵达" onInput={event => setGiftRemark(event.detail.value)} />
            <Text className={styles.formNote}>首版支持已注册演示账号即时转赠。可使用 user1、zhangsan 等账号联调，暂不支持微信分享领取。</Text>
            <View className={classnames(styles.primaryButton, busy && styles.disabled)} onClick={() => void transfer()}>
              {busy === 'transfer' ? '正在确认转赠结果…' : '确认送礼'}
            </View>
          </View>
        )}
      </View>

      <View className={styles.flowCard}>
        <View className={styles.flowHeader}>
          <Text className={styles.sectionTitle}>收支明细</Text>
          <Text className={styles.flowCount}>{flows.length} 条</Text>
        </View>
        {!flows.length && <Text className={styles.empty}>暂无福卡流水，先充值体验吧</Text>}
        {flows.map(flow => (
          <View className={styles.flowItem} key={flow.flowNo}>
            <View className={styles.flowMain}>
              <Text className={styles.flowTitle}>{flowTitle(flow)}</Text>
              <Text className={styles.flowMeta}>{flow.counterpartName || flow.bizNo} · {flow.createTime}</Text>
              <Text className={styles.flowNo}>{flow.bizNo}</Text>
            </View>
            <View className={styles.flowAmountWrap}>
              <Text className={classnames(styles.flowAmount, flow.direction === 'IN' ? styles.income : styles.expense)}>
                {flow.direction === 'IN' ? '+' : '-'}¥{money(flow.amountCents)}
              </Text>
              <Text className={styles.balanceAfter}>余额 ¥{money(flow.balanceAfterCents)}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text className={styles.footnote}>福卡余额、充值、消费与送礼均为 Mock 演示数据；真实上线需接入支付回调、数据库事务与资金对账。</Text>
    </View>
  )
}

export default FuliCardPage

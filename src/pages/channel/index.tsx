import React, { useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { clearRequestCache } from '@/services/api'
import { loginByWechat } from '@/services/auth'
import { getApiBaseUrl, isMockMode, setMockMode } from '@/services/config'
import { listOrders, payOrder } from '@/services/trade'
import { getChannelStatus, scanTraceCode, shareGift, subscribeOrderMessage } from '@/services/wechat'
import type { ChannelStatus } from '@/types'
import styles from './index.module.scss'

type CapabilityAction = 'auth' | 'share' | 'subscribe' | 'scan' | 'pay'

interface OperationResult {
  success: boolean
  content: string
  time: string
}

const capabilities: { action: CapabilityAction; icon: string; name: string; description: string }[] = [
  { action: 'auth', icon: '权', name: '微信授权', description: '模拟身份授权与会话建立' },
  { action: 'pay', icon: '付', name: '支付联调', description: '处理首笔待付款订单' },
  { action: 'share', icon: '享', name: '好礼分享', description: '生成分享卡片或复制链接' },
  { action: 'subscribe', icon: '订', name: '订阅消息', description: '模拟订单发货提醒授权' },
  { action: 'scan', icon: '扫', name: '扫码溯源', description: '返回演示溯源编码' }
]

const ChannelPage: React.FC = () => {
  const [status, setStatus] = useState<ChannelStatus>(() => getChannelStatus())
  const [appId, setAppId] = useState(() => Taro.getStorageSync('wechatAppId') || '')
  const [apiBaseUrl, setApiBaseUrl] = useState(() => getApiBaseUrl())
  const [templateIds, setTemplateIds] = useState(() => (Taro.getStorageSync('subscribeTemplateIds') || []).join(','))
  const [busy, setBusy] = useState<CapabilityAction | ''>('')
  const [result, setResult] = useState<OperationResult | null>(null)

  const report = (success: boolean, content: string) => {
    setResult({ success, content, time: new Date().toLocaleString() })
    setStatus(getChannelStatus())
  }

  const saveConfig = () => {
    const normalizedApi = apiBaseUrl.trim().replace(/\/$/, '')
    if (!/^https?:\/\//.test(normalizedApi)) {
      Taro.showToast({ title: 'API 地址需以 http(s):// 开头', icon: 'none' })
      return
    }
    Taro.setStorageSync('wechatAppId', appId.trim())
    Taro.setStorageSync('apiBaseUrl', normalizedApi)
    Taro.setStorageSync('subscribeTemplateIds', templateIds.split(',').map(item => item.trim()).filter(Boolean))
    clearRequestCache()
    setApiBaseUrl(normalizedApi)
    setStatus(getChannelStatus())
    report(true, '联调配置已保存到当前设备，请求缓存已清理')
    Taro.showToast({ title: '配置已保存', icon: 'success' })
  }

  const changeMode = (mock: boolean) => {
    if (!mock && !appId.trim()) {
      Taro.showToast({ title: '请先填写并保存 AppID', icon: 'none' })
      return
    }
    setMockMode(mock)
    clearRequestCache()
    setStatus(getChannelStatus())
    report(true, mock ? '已切换模拟模式，微信能力不会触达真实平台' : '已切换生产联调，缺失的真实平台参数会明确报错')
  }

  const run = async (action: CapabilityAction) => {
    if (busy) return
    setBusy(action)
    try {
      if (action === 'auth') {
        const user = await loginByWechat()
        report(true, `授权流程完成：${user.nickname}（用户 ID ${user.id}）`)
      } else if (action === 'share') {
        await shareGift()
        report(true, isMockMode() ? '模拟分享完成；Web 渠道已复制当前页面链接' : '小程序分享菜单已打开')
      } else if (action === 'subscribe') {
        report(true, await subscribeOrderMessage())
      } else if (action === 'scan') {
        report(true, `扫码返回：${await scanTraceCode()}`)
      } else {
        const pendingOrders = await listOrders(0)
        const order = pendingOrders[0]
        if (!order) {
          report(false, '暂无待付款订单，请先选品并提交一笔订单')
          return
        }
        await payOrder(order)
        report(true, `支付流程完成：${order.orderNo}${order.localMock ? '（本地模拟订单）' : ''}`)
      }
    } catch (error) {
      console.error('[Channel] 渠道能力执行失败', action, error)
      report(false, error instanceof Error ? error.message : '操作未完成，请检查配置')
    } finally {
      setBusy('')
    }
  }

  return (
    <View className={styles.page}>
      <View className={styles.hero}>
        <Text className={styles.eyebrow}>ONE CODEBASE · THREE CHANNELS</Text>
        <Text className={styles.title}>渠道能力中心</Text>
        <Text className={styles.subtitle}>网站 / 微信小程序 / 公众号 H5{'\n'}先模拟全流程，再逐项替换真实平台参数。</Text>
        <View className={styles.modeSwitch}>
          <View className={classnames(styles.modeOption, status.mode === 'mock' && styles.modeActive)} onClick={() => changeMode(true)}>模拟模式</View>
          <View className={classnames(styles.modeOption, status.mode === 'production' && styles.modeActive)} onClick={() => changeMode(false)}>生产联调</View>
        </View>
      </View>

      <View className={styles.statusCard}>
        <Text className={styles.sectionTitle}>当前状态</Text>
        <View className={styles.statusRow}><Text className={styles.statusLabel}>运行渠道</Text><Text className={styles.statusValue}>{status.channel}</Text></View>
        <View className={styles.statusRow}><Text className={styles.statusLabel}>微信模式</Text><Text className={styles.statusValue}>{status.mode === 'mock' ? 'Mock 模拟' : 'Production 联调'}</Text></View>
        <View className={styles.statusRow}><Text className={styles.statusLabel}>AppID</Text><Text className={styles.statusValue}>{status.appIdReady ? '已填写（不代表审核通过）' : '未配置 / 游客模式'}</Text></View>
        <View className={styles.statusRow}><Text className={styles.statusLabel}>业务 API</Text><Text className={styles.statusValue}>{status.apiBaseUrl}</Text></View>
        <View className={styles.statusRow}><Text className={styles.statusLabel}>短时缓存</Text><Text className={styles.statusValue}>{status.cachedEntries} 条</Text></View>
      </View>

      <View className={styles.configCard}>
        <Text className={styles.sectionTitle}>联调配置</Text>
        <View className={styles.formItem}>
          <Text className={styles.formLabel}>微信 AppID（仅保存非敏感标识）</Text>
          <Input className={styles.input} value={appId} placeholder="注册后填写，当前可为空" onInput={event => setAppId(event.detail.value)} />
        </View>
        <View className={styles.formItem}>
          <Text className={styles.formLabel}>业务 API 地址</Text>
          <Input className={styles.input} value={apiBaseUrl} placeholder="https://api.example.com/api" onInput={event => setApiBaseUrl(event.detail.value)} />
        </View>
        <View className={styles.formItem}>
          <Text className={styles.formLabel}>订阅消息模板 ID（英文逗号分隔）</Text>
          <Input className={styles.input} value={templateIds} placeholder="生产小程序按需填写" onInput={event => setTemplateIds(event.detail.value)} />
        </View>
        <View className={styles.saveButton} onClick={saveConfig}>保存联调配置</View>
        <Text className={styles.configNote}>不要在页面填写 AppSecret、商户密钥或证书。AppID 保存不会自动替换项目发布配置，也不会绕过域名备案与平台审核。</Text>
      </View>

      <View className={styles.capabilityCard}>
        <Text className={styles.sectionTitle}>模拟操作</Text>
        <View className={styles.capabilityList}>
          {capabilities.map(capability => (
            <View key={capability.action} className={styles.capability} onClick={() => void run(capability.action)}>
              <Text className={styles.capabilityIcon}>{capability.icon}</Text>
              <Text className={styles.capabilityName}>{busy === capability.action ? '处理中…' : capability.name}</Text>
              <Text className={styles.capabilityDescription}>{capability.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {result && (
        <View className={classnames(styles.resultCard, !result.success && styles.resultError)}>
          <Text className={styles.resultTitle}>{result.success ? '最近一次操作完成' : '最近一次操作未完成'}</Text>
          <Text className={styles.resultContent}>{result.content}</Text>
          <Text className={styles.resultTime}>{result.time}</Text>
        </View>
      )}

      <View className={styles.checklistCard}>
        <Text className={styles.sectionTitle}>正式切换清单</Text>
        <View className={styles.checkRow}><Text className={styles.checkMark}>01</Text><View className={styles.checkBody}><Text className={styles.checkName}>网站 / H5</Text><Text className={styles.checkDescription}>部署 HTTPS 站点，将 API 替换为同域或已配置 CORS 的生产网关。</Text></View></View>
        <View className={styles.checkRow}><Text className={styles.checkMark}>02</Text><View className={styles.checkBody}><Text className={styles.checkName}>微信小程序</Text><Text className={styles.checkDescription}>替换正式 AppID，配置服务器域名、订阅模板、商户支付参数并提交平台审核。</Text></View></View>
        <View className={styles.checkRow}><Text className={styles.checkMark}>03</Text><View className={styles.checkBody}><Text className={styles.checkName}>微信公众号</Text><Text className={styles.checkDescription}>配置网页授权域名、JS 安全域名、OAuth 与服务端 JS-SDK 签名；支付另需 JSAPI 商户能力。</Text></View></View>
      </View>

      <View className={styles.footerNote}>当前交付提供完整模拟链路与生产接入边界。获得注册号并不等于自动满足上线条件，仍需真实凭证、域名、商户配置及审核。</View>
    </View>
  )
}

export default ChannelPage

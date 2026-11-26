import React, { useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { loginByAccount, loginByWechat } from '@/services/auth'
import { ROLE_ACCOUNTS } from '@/services/roles'
import { isMockMode } from '@/services/config'
import styles from './index.module.scss'

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('zhangsan')
  const [password, setPassword] = useState('123456')
  const [agreed, setAgreed] = useState(true)
  const [loading, setLoading] = useState(false)

  const finishLogin = () => {
    Taro.showToast({ title: '登录成功', icon: 'success' })
    Taro.switchTab({ url: '/pages/mine/index' })
  }

  const ensureAgreement = (): boolean => {
    if (agreed) return true
    Taro.showToast({ title: '请先阅读并同意服务说明', icon: 'none' })
    return false
  }

  const accountLogin = async () => {
    if (loading || !ensureAgreement()) return
    if (!username.trim() || !password) {
      Taro.showToast({ title: '请输入账号和密码', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await loginByAccount(username.trim(), password)
      finishLogin()
    } catch (error) {
      console.error('[Login] 账号登录失败', error)
      Taro.showToast({ title: error instanceof Error ? error.message : '登录失败', icon: 'none', duration: 2500 })
    } finally {
      setLoading(false)
    }
  }

  const wechatLogin = async () => {
    if (loading || !ensureAgreement()) return
    setLoading(true)
    try {
      await loginByWechat()
      finishLogin()
    } catch (error) {
      console.error('[Login] 微信登录失败', error)
      Taro.showModal({ title: '微信授权未完成', content: error instanceof Error ? error.message : '请检查渠道配置', showCancel: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className={styles.page}>
      <View className={styles.brand}>
        <Text className={styles.brandIndex}>FULISHE MEMBER · 2026</Text>
        <Text className={styles.brandTitle}>以礼相逢</Text>
        <Text className={styles.brandSubtitle}>一个账号，贯通网站、公众号与小程序{'\n'}管理采购、订单及每一份心意。</Text>
      </View>

      <View className={styles.loginCard}>
        <Text className={styles.cardTitle}>账号登录</Text>
        <Text className={styles.cardDescription}>选择身份快速体验不同权限，或直接使用预填账号登录。</Text>
        <View className={styles.roleGrid}>
          {ROLE_ACCOUNTS.map(role => (
            <View
              key={role.key}
              className={classnames(styles.roleCard, username === role.username && styles.roleCardActive)}
              onClick={() => {
                setUsername(role.username)
                setPassword(role.password)
                Taro.setStorageSync('demoRoleUsername', role.username)
              }}
            >
              <Text className={styles.roleTitle}>{role.title}</Text>
              <Text className={styles.roleSubtitle}>{role.subtitle}</Text>
              <Text className={styles.rolePerms}>{role.permissions.join(' · ')}</Text>
            </View>
          ))}
        </View>
        <View className={styles.formItem}>
          <Text className={styles.label}>账号</Text>
          <Input className={styles.input} value={username} maxlength={32} placeholder="请输入账号" onInput={event => setUsername(event.detail.value)} />
        </View>
        <View className={styles.formItem}>
          <Text className={styles.label}>密码</Text>
          <Input className={styles.input} value={password} password maxlength={64} placeholder="请输入密码" onInput={event => setPassword(event.detail.value)} />
        </View>
        <View className={classnames(styles.primaryButton, loading && styles.disabled)} onClick={() => void accountLogin()}>
          {loading ? '正在登录…' : '登录'}
        </View>

        <View className={styles.divider}>或使用微信身份</View>
        <View className={styles.wechatButton} onClick={() => void wechatLogin()}>
          {isMockMode() ? '模拟微信授权登录' : '微信授权登录'}
        </View>

        <View className={styles.agreement} onClick={() => setAgreed(current => !current)}>
          <View className={classnames(styles.checkbox, agreed && styles.checked)}>{agreed && <Text>✓</Text>}</View>
          <Text>我已阅读并同意平台服务说明。模拟模式不会获取真实微信资料，也不会产生实际扣款。</Text>
        </View>
      </View>

      <View className={styles.channelLink} onClick={() => Taro.navigateTo({ url: '/pages/channel/index' })}>
        查看当前渠道与上线配置 ›
      </View>
      <View className={styles.demoNote}>演示账号密码统一为 123456；模拟微信授权将按所选身份生成对应角色。真实微信登录仍需 AppID、服务端 code 换 session 能力及对应平台配置。</View>
    </View>
  )
}

export default LoginPage

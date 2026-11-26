import Taro from '@tarojs/taro'
import type { LoginResult, User } from '@/types'
import { request } from './api'
import { isMockMode } from './config'
import { getPresetByUsername } from './roles'

const demoUser: User = {
  id: 2,
  tenantId: 1,
  username: 'zhangsan',
  nickname: '张三',
  realName: '张三',
  mobile: '13800138005',
  userType: 2,
  roleName: '采购专员'
}

const saveSession = (result: LoginResult): User => {
  Taro.setStorageSync('token', result.token)
  if (result.refreshToken) Taro.setStorageSync('refreshToken', result.refreshToken)
  Taro.setStorageSync('userInfo', result.userInfo)
  return result.userInfo
}

export const getCurrentUser = (): User | null => {
  try {
    return Taro.getStorageSync('userInfo') || null
  } catch (error) {
    console.error('[Auth] 会话读取失败', error)
    return null
  }
}

export const loginByAccount = async (username: string, password: string): Promise<User> => {
  const result = await request<LoginResult>({
    url: '/user/auth/login',
    method: 'POST',
    data: { username, password, tenantCode: 'NANYUEXING' },
    auth: false,
    cacheTtl: 0
  })
  console.log('[Auth] 账号登录成功', result.userInfo.username)
  return saveSession(result)
}

export const loginByWechat = async (): Promise<User> => {
  if (!isMockMode()) {
    if (process.env.TARO_ENV !== 'weapp') {
      throw new Error('公众号网页授权尚未配置，请完成 OAuth 与 JS-SDK 服务端接入')
    }
    const login = await Taro.login()
    if (!login.code) throw new Error('微信未返回登录凭证')
    const result = await request<LoginResult>({
      url: '/user/auth/wechat',
      method: 'POST',
      data: { code: login.code },
      auth: false,
      cacheTtl: 0
    })
    return saveSession(result)
  }
  await new Promise(resolve => setTimeout(resolve, 450))
  const preset = getPresetByUsername(Taro.getStorageSync('demoRoleUsername'))
  const mockUser: User = preset
    ? { ...demoUser, username: preset.username, nickname: preset.title, roleName: preset.title, userType: preset.key === 'operator' ? 1 : demoUser.userType }
    : { ...demoUser, roleName: '普通用户' }
  Taro.setStorageSync('userInfo', mockUser)
  console.log('[Auth] 微信模拟授权完成', mockUser.username)
  return mockUser
}

export const ensureSession = async (): Promise<User> => {
  const current = getCurrentUser()
  if (current && (Taro.getStorageSync('token') || isMockMode())) return current
  if (isMockMode()) {
    try {
      return await loginByAccount('zhangsan', '123456')
    } catch (error) {
      console.error('[Auth] 真实演示会话不可用，切换本地模拟', error)
      return loginByWechat()
    }
  }
  Taro.navigateTo({ url: '/pages/login/index' })
  throw new Error('请先登录')
}

export const logout = (): void => {
  Taro.removeStorageSync('token')
  Taro.removeStorageSync('refreshToken')
  Taro.removeStorageSync('userInfo')
}

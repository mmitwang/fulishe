import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import request, { clearRequestCache } from '@/utils/request'

export interface AuthUserInfo {
  id: number
  tenantId: number
  tenantName: string
  username: string
  nickname: string
  realName: string
  avatar: string
  mobile: string
  email: string
  userType: number
  deptName: string
  roleIds: number[]
  roleName: string
  roleNames: string[]
  roleCodes: string[]
  permissions: string[]
  dataScope: 'ALL' | 'MERCHANT' | 'SUPPLIER' | 'DISTRIBUTOR' | 'SELF'
  dataScopes: Array<'ALL' | 'MERCHANT' | 'SUPPLIER' | 'DISTRIBUTOR' | 'SELF'>
  merchantId: number | null
  supplierId: number | null
  distributorId: number | null
  merchantName: string
}

interface AuthResponse {
  token: string
  refreshToken: string
  userInfo: AuthUserInfo
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref('')
  const refreshToken = ref('')
  const userInfo = ref<AuthUserInfo | null>(null)
  const ready = ref(false)
  let readyPromise: Promise<AuthUserInfo> | null = null

  const hasPermission = (permission?: string) => {
    if (!permission) return true
    const roles = userInfo.value?.roleCodes || []
    if (permission.startsWith('distributor:') && !roles.includes('distributor')) return false
    if (permission === 'merchant:profile' && !roles.includes('merchant_admin')) return false
    const permissions = userInfo.value?.permissions || []
    return permissions.includes('*:*:*') || permissions.includes(permission)
  }

  const isPlatformAdmin = computed(() =>
    Boolean(userInfo.value?.roleCodes?.includes('super_admin'))
  )

  const homePath = computed(() => {
    const roles = userInfo.value?.roleCodes || []
    if (roles.includes('super_admin')) return '/dashboard'
    if (roles.includes('distributor')) return '/distributor/selection'
    if (roles.includes('supplier') || roles.includes('purchase')) return '/supply/purchase'
    if (roles.includes('operator')) return '/product/spu'
    return '/merchant/dashboard'
  })

  const applyAuthResponse = (data: AuthResponse) => {
    token.value = data.token
    refreshToken.value = data.refreshToken
    userInfo.value = data.userInfo
    ready.value = true
  }

  const login = async (username: string, password: string, captcha?: string) => {
    const data: AuthResponse = await request.post('/user/auth/login', { username, password, captcha })
    clearRequestCache()
    readyPromise = null
    applyAuthResponse(data)
    return data
  }

  const getUserInfo = async (): Promise<AuthUserInfo> => {
    const requestedToken = token.value
    const data: AuthUserInfo = await request.get('/user/auth/info')
    if (requestedToken && token.value === requestedToken) {
      userInfo.value = data
      ready.value = true
    }
    return data
  }

  const ensureReady = (): Promise<AuthUserInfo | null> => {
    if (!token.value) return Promise.resolve(null)
    if (ready.value && userInfo.value) return Promise.resolve(userInfo.value)
    if (readyPromise) return readyPromise

    const requestedToken = token.value
    const pending = getUserInfo().catch(error => {
      if (token.value === requestedToken) ready.value = false
      throw error
    })
    const tracked: Promise<AuthUserInfo> = pending.finally(() => {
      if (readyPromise === tracked) readyPromise = null
    })
    readyPromise = tracked
    return tracked
  }

  const clearSession = () => {
    token.value = ''
    refreshToken.value = ''
    userInfo.value = null
    ready.value = false
    readyPromise = null
    clearRequestCache()
  }

  const logout = () => {
    clearSession()
  }

  const refreshTokenFn = async () => {
    const data: AuthResponse = await request.post('/user/auth/refresh', refreshToken.value)
    readyPromise = null
    applyAuthResponse(data)
    return data
  }

  return {
    token,
    refreshToken,
    userInfo,
    ready,
    hasPermission,
    isPlatformAdmin,
    homePath,
    login,
    getUserInfo,
    ensureReady,
    clearSession,
    logout,
    refreshTokenFn
  }
}, {
  persist: {
    key: 'fulishe-auth',
    paths: ['token', 'refreshToken', 'userInfo']
  }
})

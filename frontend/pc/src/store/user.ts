import { defineStore } from 'pinia'

interface UserInfo {
  id: number
  username: string
  nickname: string
  realName: string
  mobile: string
  avatar: string
  tenantId: number
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: null as UserInfo | null,
    userId: 0
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
    // 未登录沿用 Mock 默认演示用户 2，与买家接口公开契约一致
    effectiveUserId: (s): number => Number(s.userId || s.userInfo?.id || 2)
  },
  actions: {
    setSession(payload: { token: string; userInfo: UserInfo }) {
      this.token = payload.token
      this.userInfo = payload.userInfo
      this.userId = payload.userInfo?.id || 0
    },
    logout() {
      this.token = ''
      this.userInfo = null
      this.userId = 0
    }
  },
  persist: {
    key: 'pc-user',
    storage: localStorage
  }
})

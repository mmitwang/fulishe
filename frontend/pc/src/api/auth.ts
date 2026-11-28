import request from '@/utils/request'

export interface LoginResult {
  token: string
  userInfo: {
    id: number
    username: string
    nickname: string
    realName: string
    mobile: string
    avatar: string
    tenantId: number
  }
}

export const login = (data: { username: string; password: string }) =>
  request.post<LoginResult>('/h5/login', data)

export const getDemoUsers = () => request.get<any[]>('/auth/demo-users')

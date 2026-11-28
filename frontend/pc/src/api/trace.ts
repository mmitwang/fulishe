import request from '@/utils/request'

export const verifyTrace = (code: string) => request.post<any>('/trace/verify', { code })

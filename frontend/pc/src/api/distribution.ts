import request from '@/utils/request'

export interface AttributionResult {
  valid: boolean
  shareId?: string
  expireTime?: string
  reason?: string
}

export const getAttribution = (params: { shareId: string; spuId: number; userId: number }) =>
  request.get<AttributionResult>('/distribution/attribution', { params })

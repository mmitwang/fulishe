import Taro from '@tarojs/taro'
import type {
  FuliCardAccount,
  FuliCardFlow,
  FuliCardOperation,
  FuliCardRechargeResult,
  FuliCardTransferResult,
  PageResult
} from '@/types'
import { clearRequestCache, request } from './api'
import { ensureSession, getCurrentUser } from './auth'

type RequestAction = 'recharge' | 'transfer'

const requestStorageKey = (action: RequestAction): string => `fuliCardRequest:${getCurrentUser()?.id || 'anonymous'}:${action}`

const getRequestId = (action: RequestAction): string => {
  const key = requestStorageKey(action)
  const existing = Taro.getStorageSync(key)
  if (existing) return String(existing)
  const requestId = `${action.toUpperCase()}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
  Taro.setStorageSync(key, requestId)
  return requestId
}

const clearRequestId = (action: RequestAction): void => Taro.removeStorageSync(requestStorageKey(action))

export const isFuliCardUnknownOutcome = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)
  return /网络连接失败|网络异常|timeout|超时/i.test(message)
}

export const getFuliCardAccount = (): Promise<FuliCardAccount> => request<FuliCardAccount>({ url: '/fuli-card/account', cacheTtl: 0 })

export const listFuliCardFlows = (current = 1, size = 30): Promise<PageResult<FuliCardFlow>> =>
  request<PageResult<FuliCardFlow>>({ url: '/fuli-card/flows', data: { current, size }, cacheTtl: 0 })

export const getFuliCardOperation = <T>(requestId: string): Promise<FuliCardOperation<T>> =>
  request<FuliCardOperation<T>>({ url: `/fuli-card/operations/${encodeURIComponent(requestId)}`, cacheTtl: 0 })

export const resolveFuliCardOperation = async <T>(requestId: string): Promise<T> => {
  const operation = await getFuliCardOperation<T>(requestId)
  if (operation.status === 'SUCCESS' && operation.data !== undefined) return operation.data
  if (operation.status === 'FAILED') throw new Error(operation.message || '福卡操作未完成')
  throw new Error('操作已受理，结果确认中，请稍后刷新')
}

const recoverWrite = async <T>(action: RequestAction, requestId: string, error: unknown): Promise<T> => {
  if (!isFuliCardUnknownOutcome(error)) {
    clearRequestId(action)
    throw error
  }
  try {
    const result = await resolveFuliCardOperation<T>(requestId)
    clearRequestId(action)
    clearRequestCache()
    return result
  } catch (recoveryError) {
    if (recoveryError instanceof Error && !/结果确认中/.test(recoveryError.message) && !isFuliCardUnknownOutcome(recoveryError)) {
      clearRequestId(action)
    }
    throw recoveryError
  }
}

export const rechargeFuliCard = async (amountCents: number): Promise<FuliCardRechargeResult> => {
  await ensureSession()
  const requestId = getRequestId('recharge')
  try {
    const created = await request<FuliCardRechargeResult>({
      url: '/fuli-card/recharge',
      method: 'POST',
      cacheTtl: 0,
      data: { requestId, amountCents }
    })
    const result = await request<FuliCardRechargeResult>({
      url: '/fuli-card/recharge/complete',
      method: 'POST',
      cacheTtl: 0,
      data: { requestId, rechargeNo: created.rechargeNo }
    })
    clearRequestId('recharge')
    clearRequestCache()
    return result
  } catch (error) {
    return recoverWrite<FuliCardRechargeResult>('recharge', requestId, error)
  }
}

export const transferFuliCard = async (input: { toUsername: string; amountCents: number; remark?: string }): Promise<FuliCardTransferResult> => {
  await ensureSession()
  const requestId = getRequestId('transfer')
  try {
    const result = await request<FuliCardTransferResult>({
      url: '/fuli-card/transfer',
      method: 'POST',
      cacheTtl: 0,
      data: { requestId, ...input }
    })
    clearRequestId('transfer')
    clearRequestCache()
    return result
  } catch (error) {
    return recoverWrite<FuliCardTransferResult>('transfer', requestId, error)
  }
}

import type { FullReductionQuote, FullReductionRule } from '@/types'
import { request } from './api'

export const FALLBACK_FULL_REDUCTION_RULES: FullReductionRule[] = [
  { id: 1, thresholdAmount: 99, discountAmount: 10 },
  { id: 2, thresholdAmount: 199, discountAmount: 25 },
  { id: 3, thresholdAmount: 299, discountAmount: 40 }
]

export const getFullReductionRules = async (): Promise<FullReductionRule[]> => {
  try {
    const result = await request<{ rules: FullReductionRule[] }>({ url: '/h5/promotions/full-reduction', cacheTtl: 300000 })
    const rules = result.rules.filter(rule => rule.id > 0 && rule.thresholdAmount > 0 && rule.discountAmount > 0)
    return rules.length ? rules.sort((a, b) => a.thresholdAmount - b.thresholdAmount) : FALLBACK_FULL_REDUCTION_RULES
  } catch (error) {
    console.error('[Promotion] 满减规则读取失败，使用本地兜底', error)
    return FALLBACK_FULL_REDUCTION_RULES
  }
}

export const calculateFullReduction = (totalAmount: number, rules: FullReductionRule[] = FALLBACK_FULL_REDUCTION_RULES): FullReductionQuote => {
  const totalCents = Math.max(0, Math.round(totalAmount * 100))
  const sortedRules = [...rules].sort((a, b) => a.thresholdAmount - b.thresholdAmount)
  const appliedRule = sortedRules.filter(rule => totalCents >= Math.round(rule.thresholdAmount * 100)).pop() || null
  const nextRule = sortedRules.find(rule => totalCents < Math.round(rule.thresholdAmount * 100)) || null
  const highestRule = sortedRules[sortedRules.length - 1]
  const discountAmount = appliedRule?.discountAmount || 0
  return {
    appliedRule,
    nextRule,
    shortfallAmount: nextRule ? Math.max(0, Math.round(nextRule.thresholdAmount * 100) - totalCents) / 100 : 0,
    discountAmount,
    payAmount: Math.max(0, totalCents - Math.round(discountAmount * 100)) / 100,
    progress: highestRule ? Number(Math.min(100, totalCents / Math.round(highestRule.thresholdAmount * 100) * 100).toFixed(2)) : 0
  }
}

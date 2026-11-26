import type { TraceRecord } from '@/types'
import { request } from './api'
import { isMockMode } from './config'

interface RawTraceRecord {
  traceCode: string
  spuName?: string
  productName?: string
  batchNo?: string
  qualityReport?: string
  status?: string
  steps?: { name: string; time: string; operator: string }[]
}

interface RawVerification {
  valid: boolean
  code: string
  message: string
  verifyTime?: string
  chainName?: string
  blockHeight?: number
  trace?: RawTraceRecord | null
}

export interface TraceVerification {
  valid: boolean
  message: string
  verifyTime: string
  chainName: string
  blockHeight?: number
  record: TraceRecord | null
}

const demoCodes = new Set(['FLS-DEMO-TRACE-2026', 'TRC202630001', 'FLS2026100001'])

const normalize = (raw: RawVerification): TraceVerification => ({
  valid: raw.valid,
  message: raw.message,
  verifyTime: raw.verifyTime || new Date().toISOString(),
  chainName: raw.chainName || '福礼链',
  blockHeight: raw.blockHeight,
  record: raw.trace ? {
    traceCode: raw.trace.traceCode,
    productName: raw.trace.spuName || raw.trace.productName || '福礼社精选商品',
    batchNo: raw.trace.batchNo || 'BATCH-DEMO-2026',
    status: raw.trace.qualityReport || raw.trace.status || '质检合格',
    steps: raw.trace.steps || []
  } : null
})

const verifyDemo = (code: string): TraceVerification => {
  if (!demoCodes.has(code)) {
    return { valid: false, message: '离线演示模式仅支持页面提供的示例溯源码', verifyTime: new Date().toISOString(), chainName: '本地模拟链', record: null }
  }
  return {
    valid: true,
    message: '本地模拟验证通过，未连接真实区块链节点',
    verifyTime: new Date().toISOString(),
    chainName: '福礼链 · 模拟环境',
    blockHeight: 20261121,
    record: {
      traceCode: code,
      productName: '福礼社节庆甄选礼盒',
      batchNo: 'FLS-BATCH-2026-001',
      status: '模拟质检合格',
      steps: [
        { name: '品牌出库', time: '2026-11-18 09:30:00', operator: '品牌直供仓' },
        { name: '质量复核', time: '2026-11-18 14:20:00', operator: '福礼社品控中心' },
        { name: '集采交付', time: '2026-11-20 16:45:00', operator: '企业福利履约中心' }
      ]
    }
  }
}

export const verifyTrace = async (code: string): Promise<TraceVerification> => {
  try {
    const result = await request<RawVerification>({ url: '/trace/verify', method: 'POST', data: { code }, cacheTtl: 0 })
    console.log('[Trace] 验真请求完成', code, result.valid)
    return normalize(result)
  } catch (error) {
    console.error('[Trace] 验真接口不可用', code, error)
    if (!isMockMode()) throw error
    return verifyDemo(code)
  }
}

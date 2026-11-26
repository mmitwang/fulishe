import React, { useEffect, useState } from 'react'
import { View, Text, Image, Input } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { request } from '@/services/api'
import type { VerifyResult } from '@/types'

const samples = ['TRC202630001', 'FLS2026100001', 'TRC202630007']

const TracePage: React.FC = () => {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [loading, setLoading] = useState(false)

  const verify = async (value?: string) => {
    const target = (value || code).trim()
    if (!target) {
      Taro.showToast({ title: '请输入溯源码', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const res = await request<VerifyResult>({ url: '/trace/verify', method: 'POST', data: { code: target } })
      console.log('[Trace] 验真结果', res.valid)
      setResult(res)
      if (!res.valid) {
        Taro.showToast({ title: res.message, icon: 'none' })
      }
    } catch (err) {
      console.error('[Trace] 验真失败', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initial = router.params.code
    if (initial) {
      setCode(initial)
      verify(initial)
    }
  }, [])

  return (
    <View className={styles.page}>
      <View className={styles.hero}>
        <Text className={styles.heroTitle}>福礼链 · 溯源验真</Text>
        <Text className={styles.heroDesc}>输入商品溯源码或卡券编码，查询全链路存证</Text>
        <View className={styles.inputWrap}>
          <Input
            className={styles.input}
            value={code}
            placeholder="如 TRC202630001"
            onInput={e => setCode(e.detail.value)}
            onConfirm={() => verify()}
          />
        </View>
        <View className={styles.verifyBtn} onClick={() => verify()}>
          <Text>{loading ? '验证中...' : '立即验真'}</Text>
        </View>
        <View className={styles.samples}>
          {samples.map(sample => (
            <Text key={sample} className={styles.sample} onClick={() => { setCode(sample); verify(sample) }}>
              {sample}
            </Text>
          ))}
        </View>
      </View>

      {result && (
        <View className={classnames(styles.result, !result.valid && styles.invalid)}>
          <Text className={styles.resultHead}>{result.valid ? '验证通过 · 数据未被篡改' : '验证失败'}</Text>
          <Text className={styles.resultDesc}>{result.message}</Text>
          <View className={styles.metaRow}>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>链名称</Text>
              <Text className={styles.metaValue}>{result.chainName || '福礼链'}</Text>
            </View>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>区块高度</Text>
              <Text className={styles.metaValue}>#{result.blockHeight}</Text>
            </View>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>验证时间</Text>
              <Text className={styles.metaValue}>{(result.verifyTime || '').slice(5, 16)}</Text>
            </View>
          </View>
        </View>
      )}

      {result?.trace && (
        <View className={styles.product}>
          <Image className={styles.cover} src={result.trace.image} mode="aspectFill" />
          <View className={styles.productInfo}>
            <Text className={styles.productName}>{result.trace.spuName}</Text>
            <Text className={styles.productLine}>溯源码：{result.trace.traceCode}</Text>
            <Text className={styles.productLine}>批次号：{result.trace.batchNo}</Text>
            <Text className={styles.productLine}>质检：{result.trace.qualityReport}</Text>
          </View>
        </View>
      )}

      {result?.trace?.steps?.length ? (
        <View className={styles.timeline}>
          <Text className={styles.sectionTitle}>全链路溯源</Text>
          {result.trace.steps.map((step, index) => (
            <View key={step.hash} className={styles.step}>
              <View className={styles.dotWrap}>
                <View className={classnames(styles.dot, index === (result.trace?.steps.length || 0) - 1 && styles.last)} />
                {index !== (result.trace?.steps.length || 0) - 1 && <View className={styles.line} />}
              </View>
              <View className={styles.stepBody}>
                <View className={styles.stepHead}>
                  <Text className={styles.stepName}>{step.name}</Text>
                  <Text className={styles.stepTime}>{step.time}</Text>
                </View>
                <Text className={styles.stepLine}>操作方：{step.operator}</Text>
                <Text className={styles.stepLine}>地点：{step.location}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View className={styles.hint}>
        福礼链采用 PBFT 共识，卡券铸造、发放、核销、转赠与商品生产、质检、仓储、物流节点均实时上链，确保企业福利采购全流程可信可追溯。
      </View>
    </View>
  )
}

export default TracePage

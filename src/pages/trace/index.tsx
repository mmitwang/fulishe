import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import { verifyTrace, type TraceVerification } from '@/services/trace'
import { scanTraceCode } from '@/services/wechat'
import styles from './index.module.scss'

const samples = ['FLS-DEMO-TRACE-2026', 'TRC202630001', 'FLS2026100001']

const TracePage: React.FC = () => {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [result, setResult] = useState<TraceVerification | null>(null)
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)

  const verify = useCallback(async (value: string) => {
    const target = value.trim()
    if (!target) {
      Taro.showToast({ title: '请输入溯源码', icon: 'none' })
      return
    }
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const verification = await verifyTrace(target)
      setResult(verification)
      if (!verification.valid) Taro.showToast({ title: verification.message, icon: 'none' })
    } catch (error) {
      console.error('[TracePage] 验真失败', error)
      Taro.showToast({ title: error instanceof Error ? error.message : '验真失败', icon: 'none' })
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initial = router.params.code
    if (initial) {
      setCode(initial)
      void verify(initial)
    }
  }, [router.params.code, verify])

  const scan = async () => {
    try {
      const value = await scanTraceCode()
      setCode(value)
      await verify(value)
    } catch (error) {
      console.error('[TracePage] 扫码失败', error)
      Taro.showToast({ title: error instanceof Error ? error.message : '扫码未完成', icon: 'none' })
    }
  }

  return (
    <View className={styles.page}>
      <View className={styles.hero}>
        <Text className={styles.eyebrow}>FULISHE TRUSTED GIFT</Text>
        <Text className={styles.title}>一份好礼，全程有据</Text>
        <Text className={styles.description}>输入溯源码或卡券编码，查询批次、质检与交付节点。模拟记录会明确标注，不冒充真实链上存证。</Text>
        <View className={styles.searchBox}>
          <Input className={styles.input} value={code} confirmType="search" placeholder="请输入溯源码" onInput={event => setCode(event.detail.value)} onConfirm={() => void verify(code)} />
          <View className={styles.verifyButton} onClick={() => void verify(code)}>{loading ? '验真中…' : '立即验真'}</View>
        </View>
        <View className={styles.scanButton} onClick={() => void scan()}>扫码查询</View>
      </View>

      <View className={styles.samples}>
        <Text className={styles.sampleLabel}>点击使用演示编码</Text>
        <View className={styles.sampleList}>
          {samples.map(sample => <Text key={sample} className={styles.sample} onClick={() => { setCode(sample); void verify(sample) }}>{sample}</Text>)}
        </View>
      </View>

      {result && (
        <View className={classnames(styles.resultCard, result.valid ? styles.resultValid : styles.resultInvalid)}>
          <Text className={styles.resultStatus}>{result.valid ? '验证通过' : '未通过验证'}</Text>
          <Text className={styles.resultMessage}>{result.message}</Text>
          <View className={styles.chainMeta}>
            <Text>{result.chainName}</Text>
            {result.blockHeight && <Text>区块 #{result.blockHeight}</Text>}
            <Text>{result.verifyTime.replace('T', ' ').slice(5, 19)}</Text>
          </View>
        </View>
      )}

      {result?.record && (
        <View className={styles.recordCard}>
          <Text className={styles.sectionTitle}>溯源档案</Text>
          <Text className={styles.recordName}>{result.record.productName}</Text>
          <View className={styles.recordRow}><Text className={styles.recordLabel}>溯源码</Text><Text className={styles.recordValue}>{result.record.traceCode}</Text></View>
          <View className={styles.recordRow}><Text className={styles.recordLabel}>生产批次</Text><Text className={styles.recordValue}>{result.record.batchNo}</Text></View>
          <View className={styles.recordRow}><Text className={styles.recordLabel}>质检状态</Text><Text className={styles.recordValue}>{result.record.status}</Text></View>
        </View>
      )}

      {result?.record?.steps.length ? (
        <View className={styles.timelineCard}>
          <Text className={styles.sectionTitle}>全链路节点</Text>
          {result.record.steps.map((step, index) => (
            <View className={styles.step} key={`${step.name}-${step.time}`}>
              <View className={styles.stepRail}>
                <View className={styles.stepDot} />
                {index < (result.record?.steps.length || 0) - 1 && <View className={styles.stepLine} />}
              </View>
              <View className={styles.stepBody}>
                <Text className={styles.stepName}>{step.name}</Text>
                <Text className={styles.stepTime}>{step.time}</Text>
                <Text className={styles.stepOperator}>操作方：{step.operator}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View className={styles.disclaimer}>溯源结果用于演示平台交互与接口联调。正式链上存证需接入真实存证服务与业务节点。</View>
    </View>
  )
}

export default TracePage

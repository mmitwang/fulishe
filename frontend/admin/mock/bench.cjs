#!/usr/bin/env node
/**
 * 福礼社 Mock API 压测脚本（零依赖）
 *
 * 用法:
 *   node mock/bench.cjs                          # 默认 50 并发 / 2000 请求
 *   node mock/bench.cjs 100 5000                 # 100 并发 / 5000 请求
 *   node mock/bench.cjs --concurrency=200 --total=10000
 *   node mock/bench.cjs --url=http://127.0.0.1:8080 --json
 */
const http = require('http')

const argv = process.argv.slice(2)
const argOf = name => {
  const hit = argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.split('=')[1] : undefined
}
const positional = argv.filter(a => !a.startsWith('--'))

const BASE = argOf('url') || process.env.BENCH_URL || 'http://127.0.0.1:8080'
const CONCURRENCY = Number(argOf('concurrency') || positional[0] || process.env.CONCURRENCY || 50)
const TOTAL = Number(argOf('total') || positional[1] || process.env.TOTAL || 2000)
const JSON_OUT = argv.includes('--json')

// 模拟真实用户访问：同一类接口会命中不同商品 ID / 分页，避免只压单一 URL
const pagePaths = (prefix, pages) =>
  Array.from({ length: pages }, (_, i) => `${prefix}?current=${i + 1}&size=10`)

const TARGETS = [
  { name: 'H5 首页', paths: ['/api/h5/home'] },
  { name: '商品分页', paths: pagePaths('/api/product/spu/page', 3) },
  { name: '商品详情', paths: Array.from({ length: 32 }, (_, i) => `/api/h5/product/${i + 1}`) },
  { name: '我的卡券', paths: [2, 4, 6, 8].map(uid => `/api/coupon/my?userId=${uid}`) },
  { name: '链上交易', paths: pagePaths('/api/chain/tx/page', 5) },
  { name: '库存分页', paths: pagePaths('/api/supply/inventory/page', 3) }
]

const agent = new http.Agent({ keepAlive: true, maxSockets: CONCURRENCY })
const { hostname, port, protocol } = new URL(BASE)
const transport = protocol === 'https:' ? require('https') : http

let cursor = 0
const stats = {
  total: 0,
  errors: 0,
  bytes: 0,
  latencyAll: [],
  perTarget: TARGETS.map(() => ({ count: 0, errors: 0, latency: [] }))
}

const requestOnce = seq =>
  new Promise(resolve => {
    const targetIdx = seq % TARGETS.length
    const target = TARGETS[targetIdx]
    const path = target.paths[Math.floor(seq / TARGETS.length) % target.paths.length]
    const stat = stats.perTarget[targetIdx]
    const started = process.hrtime.bigint()
    const req = transport.request(
      { hostname, port: port || 80, path, method: 'GET', agent, headers: { Connection: 'keep-alive' } },
      res => {
        let size = 0
        res.on('data', chunk => {
          size += chunk.length
        })
        res.on('end', () => {
          const ms = Number(process.hrtime.bigint() - started) / 1e6
          stats.total += 1
          stats.bytes += size
          stats.latencyAll.push(ms)
          stat.count += 1
          stat.latency.push(ms)
          if (res.statusCode >= 400) {
            stats.errors += 1
            stat.errors += 1
          }
          resolve()
        })
      }
    )
    req.on('error', () => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6
      stats.total += 1
      stats.errors += 1
      stats.latencyAll.push(ms)
      stat.count += 1
      stat.errors += 1
      stat.latency.push(ms)
      resolve()
    })
    req.end()
  })

const percentile = (sorted, p) => {
  if (!sorted.length) return 0
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)]
}
const avg = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
const round = (n, d = 1) => Number(n.toFixed(d))

const worker = async () => {
  while (cursor < TOTAL) {
    const idx = cursor++
    await requestOnce(idx)
  }
}

const main = async () => {
  console.log(`\n福礼社 Mock 压测 | 目标 ${BASE} | 并发 ${CONCURRENCY} | 请求 ${TOTAL}`)
  const started = process.hrtime.bigint()
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  const elapsed = Number(process.hrtime.bigint() - started) / 1e6

  const sorted = [...stats.latencyAll].sort((a, b) => a - b)
  const summary = {
    target: BASE,
    concurrency: CONCURRENCY,
    requests: stats.total,
    elapsedMs: round(elapsed),
    rps: round((stats.total / elapsed) * 1000),
    avgMs: round(avg(stats.latencyAll)),
    p50: round(percentile(sorted, 50)),
    p95: round(percentile(sorted, 95)),
    p99: round(percentile(sorted, 99)),
    p999: round(percentile(sorted, 99.9)),
    maxMs: round(sorted[sorted.length - 1] || 0),
    errorRate: round((stats.errors / Math.max(1, stats.total)) * 100, 2),
    throughputMB: round(stats.bytes / 1024 / 1024 / (elapsed / 1000), 2),
    endpoints: TARGETS.map((t, i) => {
      const s = stats.perTarget[i]
      const sortedLatency = [...s.latency].sort((a, b) => a - b)
      return {
        name: t.name,
        path: t.paths.length > 1 ? `${t.paths[0]} ... (${t.paths.length} 种变体)` : t.paths[0],
        count: s.count,
        errors: s.errors,
        avgMs: round(avg(s.latency)),
        p95: round(percentile(sortedLatency, 95))
      }
    })
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`总耗时 ${(elapsed / 1000).toFixed(2)}s | RPS ${summary.rps} | 平均 ${summary.avgMs}ms`)
    console.log(
      `p50 ${summary.p50}ms | p95 ${summary.p95}ms | p99 ${summary.p99}ms | p99.9 ${summary.p999}ms | 最大 ${summary.maxMs}ms | 错误率 ${summary.errorRate}% | 吞吐 ${summary.throughputMB}MB/s`
    )
    console.log('\n接口明细:')
    summary.endpoints.forEach(e => {
      console.log(`  ${e.name.padEnd(8, ' ')} ${String(e.count).padStart(6, ' ')} 次  avg ${String(e.avgMs).padStart(7, ' ')}ms  p95 ${String(e.p95).padStart(7, ' ')}ms  errors ${e.errors}`)
    })
    console.log('')
  }
  agent.destroy()
}

main().catch(err => {
  console.error('压测失败:', err)
  process.exit(1)
})

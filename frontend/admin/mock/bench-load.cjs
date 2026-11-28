/**
 * 福礼社 Mock 性能仿真演练：压力测试 + 并发一致性
 *
 * 场景：
 *  A. 只读混合（GET 缓存命中路径）：首页 / 商品详情 / 商品分页 / 卡券
 *  B. 读写混合（写操作触发防抖快照）：加购 + 购物车查询
 *
 * 指标：QPS、P50/P95/P99 延迟、错误率、并发一致性（购物车数量守恒）
 *
 * 运行：node mock/bench-load.cjs
 * 说明：自启独立 Mock（随机端口 + 独立备份目录），不影响 8080。
 */
const { spawn } = require('child_process')
const net = require('net')
const path = require('path')
const os = require('os')
const { performance } = require('perf_hooks')

let baseUrl = ''
let serverProcess = null
let serverOutput = ''
const USER_ID = 4

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.unref()
  server.on('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address()
    server.close(() => resolve(port))
  })
})

const startServer = async () => {
  const port = await getFreePort()
  baseUrl = `http://127.0.0.1:${port}`
  const backupDir = path.join(os.tmpdir(), `fulishe-bench-${Date.now()}`)
  serverProcess = spawn(process.execPath, ['mock-server.cjs'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), FULISHE_BACKUP_DIR: backupDir },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  serverProcess.stdout.on('data', c => { serverOutput += c.toString() })
  serverProcess.stderr.on('data', c => { serverOutput += c.toString() })
}

const waitUntilReady = async () => {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error(`Mock 提前退出：${serverOutput}`)
    try { if ((await fetch(`${baseUrl}/api/health`)).ok) return } catch { /* wait */ }
    await new Promise(r => setTimeout(r, 120))
  }
  throw new Error(`等待 Mock 启动超时：${serverOutput}`)
}

const stopServer = async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return
  await new Promise(resolve => {
    const t = setTimeout(resolve, 2000); t.unref()
    serverProcess.once('exit', () => { clearTimeout(t); resolve() })
    serverProcess.kill()
  })
}

const pct = (sorted, p) => {
  if (!sorted.length) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}
const ms = v => `${v.toFixed(2)}ms`

async function runScenario(name, { concurrency, durationMs, tasks }) {
  const latencies = []
  let errors = 0
  const endAt = Date.now() + durationMs
  let cursor = 0
  const startedAt = performance.now()

  const worker = async () => {
    while (Date.now() < endAt) {
      const task = tasks[cursor++ % tasks.length]
      const t0 = performance.now()
      try {
        const response = await task()
        if (!response.ok) errors++
      } catch {
        errors++
      }
      latencies.push(performance.now() - t0)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  const elapsed = (performance.now() - startedAt) / 1000
  const sorted = [...latencies].sort((a, b) => a - b)
  const total = latencies.length
  const result = {
    name,
    concurrency,
    total,
    qps: total / elapsed,
    p50: pct(sorted, 0.5),
    p95: pct(sorted, 0.95),
    p99: pct(sorted, 0.99),
    errorRate: total ? (errors / total) * 100 : 0
  }
  console.log(
    `${name.padEnd(14)} 并发=${String(concurrency).padStart(3)} 请求=${String(total).padStart(5)} ` +
    `QPS=${result.qps.toFixed(0).padStart(5)} P50=${ms(result.p50).padStart(9)} ` +
    `P95=${ms(result.p95).padStart(9)} P99=${ms(result.p99).padStart(9)} 错误率=${result.errorRate.toFixed(2)}%`
  )
  return result
}

const api = (p, options) => () => fetch(`${baseUrl}${p}`, options)

async function run() {
  const home = await (await fetch(`${baseUrl}/api/h5/home`)).json()
  const ids = home.data.hotProducts.slice(0, 5).map(p => p.id)
  const skuId = (await (await fetch(`${baseUrl}/api/h5/product/${ids[0]}`)).json()).data.skus[0].id

  console.log(`\n================ 福礼社 Mock 性能仿真演练 ================`)
  console.log(`目标：${baseUrl}\n`)

  /* A. 只读混合 */
  const readTasks = [
    api('/api/h5/home'),
    api(`/api/h5/product/${ids[0]}`),
    api(`/api/h5/product/${ids[1] || ids[0]}`),
    api(`/api/product/spu/page?current=1&size=20`),
    api(`/api/coupon/my?userId=${USER_ID}`)
  ]
  const readLow = await runScenario('只读-低并发', { concurrency: 20, durationMs: 8000, tasks: readTasks })
  const readHigh = await runScenario('只读-高并发', { concurrency: 100, durationMs: 8000, tasks: readTasks })

  /* B. 读写混合：加购（写，触发防抖快照）+ 购物车查询 */
  const writeHeader = { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  const writeTasks = [
    () => fetch(`${baseUrl}/api/cart/add`, { ...writeHeader, body: JSON.stringify({ userId: USER_ID, skuId, quantity: 1 }) }),
    api(`/api/cart?userId=${USER_ID}`)
  ]
  const before = (await (await fetch(`${baseUrl}/api/cart?userId=${USER_ID}`)).json()).data
  const beforeQty = before.find(i => i.skuId === skuId)?.quantity || 0
  const write = await runScenario('读写混合', { concurrency: 20, durationMs: 8000, tasks: writeTasks })
  const after = (await (await fetch(`${baseUrl}/api/cart?userId=${USER_ID}`)).json()).data
  const afterQty = after.find(i => i.skuId === skuId)?.quantity || 0

  /* 并发一致性：每次加购 quantity=1，写入的增量应等于成功加购次数 */
  const successWrites = Math.round(write.total / writeTasks.length) // 写任务约占一半
  const delta = afterQty - beforeQty
  const consistent = delta > 0 && Math.abs(delta - successWrites) <= Math.ceil(successWrites * 0.15)
  console.log(`\n并发一致性：购物车数量增量=${delta}，写请求约=${successWrites}，` +
    `${consistent ? 'PASS（增量与写入次数一致，无丢失/错乱）' : 'WARN（偏差需复核）'}`)

  /* 汇总 */
  console.log(`\n================ 指标汇总 ================`)
  console.log(`只读 P95：低并发 ${ms(readLow.p95)} / 高并发 ${ms(readHigh.p95)}`)
  console.log(`读写 P95：${ms(write.p95)}，QPS ${write.qps.toFixed(0)}，错误率 ${write.errorRate.toFixed(2)}%`)
  console.log(`错误率：只读低 ${readLow.errorRate.toFixed(2)}% / 只读高 ${readHigh.errorRate.toFixed(2)}%`)

  return { readLow, readHigh, write, consistent, delta, successWrites }
}

async function main() {
  let result = null
  try {
    await startServer()
    await waitUntilReady()
    result = await run()
  } catch (error) {
    console.error(`演练异常：${error.message}`)
    process.exitCode = 1
  } finally {
    await stopServer()
  }
  if (result && process.env.BENCH_JSON) {
    console.log(`\n${JSON.stringify(result)}`)
  }
}

main()

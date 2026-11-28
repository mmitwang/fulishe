const express = require('express')
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const cors = require('cors')
const compression = require('compression')

const PORT = Number(process.env.PORT || 8080)
const app = express()
const SECRET_KEY = 'fulishe-mock-secret-key-2024'

app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
// gzip 压缩大响应（首页/商品详情等），降低传输延迟；1KB 以下不压缩，压缩等级 4 平衡 CPU
app.use(compression({ threshold: 1024, level: 4 }))

const perf = require('./mock/perf.cjs')
app.use(perf.statsMiddleware)
app.use(perf.cacheMiddleware)

// 实时备份：写操作触发 debounce 快照 + 定时兜底 + 手动备份/恢复
const backup = require('./mock/backup.cjs')
backup.mount(app, jwt, SECRET_KEY)

require('./mock/routes-core.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-admin.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-chain.cjs')(app)
require('./mock/routes-supply.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-fuli-card.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-distribution.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-promotion.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-invoice.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-finance.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-trade.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-consumer.cjs')(app)
require('./mock/routes-wechat.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-ops.cjs')(app)

app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() })
})

// 运行时性能统计（调用次数 / 平均耗时 / 缓存命中情况）
app.get('/api/benchmark/stats', (req, res) => {
  res.json({ code: 200, message: 'success', data: perf.getStats() })
})

// 清空响应缓存（调试用）
app.post('/api/benchmark/cache/clear', (req, res) => {
  perf.clearCache()
  res.json({ code: 200, message: '缓存已清空', data: null })
})

app.use('/api', (req, res) => {
  res.status(404).json({ code: 404, message: `Mock 接口不存在: ${req.method} ${req.originalUrl}` })
})

app.listen(PORT, () => {
  const { users } = require('./mock/seed.cjs')
  const status = backup.start()
  console.log(`\n福礼社 Mock API 运行中: http://localhost:${PORT}`)
  console.log(`实时备份已启用: ${backup.backupDir}（最近快照 ${status.lastSnapshotAt || '初始化中'}）`)
  console.log(`演示账号（密码均为 123456）: ${users.map(u => u.username).join(', ')}\n`)
})

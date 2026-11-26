const express = require('express')
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const cors = require('cors')

const PORT = Number(process.env.PORT || 8080)
const app = express()
const SECRET_KEY = 'fulishe-mock-secret-key-2024'

app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())

const perf = require('./mock/perf.cjs')
app.use(perf.statsMiddleware)
app.use(perf.cacheMiddleware)

require('./mock/routes-core.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-admin.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-chain.cjs')(app)
require('./mock/routes-supply.cjs')(app)
require('./mock/routes-fuli-card.cjs')(app, jwt, SECRET_KEY)
require('./mock/routes-trade.cjs')(app, jwt, SECRET_KEY)
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
  console.log(`\n福礼社 Mock API 运行中: http://localhost:${PORT}`)
  console.log(`演示账号（密码均为 123456）: ${users.map(u => u.username).join(', ')}\n`)
})

/**
 * Mock 服务性能组件：
 * 1) statsMiddleware 记录每个接口的调用次数、平均/最大耗时与错误数
 * 2) cacheMiddleware 对 GET /api/* 做短 TTL 内存缓存（序列化结果复用，减少重复 JSON 序列化）
 * 3) getStats 供 /api/benchmark/stats 输出
 *
 * 环境变量:
 *   MOCK_CACHE_TTL=1500   缓存有效期(ms)，设为 0 关闭缓存
 */
const TTL = Number(process.env.MOCK_CACHE_TTL ?? 1500)
const MAX_ENTRIES = 500
const START_AT = Date.now()

const statsMap = new Map()
const cache = new Map()

const statsMiddleware = (req, res, next) => {
  const started = process.hrtime.bigint()
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6
    const key = `${req.method} ${req.path}`
    const item = statsMap.get(key) || { count: 0, totalMs: 0, maxMs: 0, errors: 0 }
    item.count += 1
    item.totalMs += ms
    item.maxMs = Math.max(item.maxMs, ms)
    if (res.statusCode >= 400) item.errors += 1
    statsMap.set(key, item)
  })
  next()
}

const skipCache = path =>
  path === '/api/benchmark/stats' ||
  path.includes('/auth/captcha') ||
  path.startsWith('/api/benchmark') ||
  path.startsWith('/api/fuli-card') ||
  path.startsWith('/api/wechat') ||
  path.startsWith('/api/h5/addresses') ||
  path.startsWith('/api/order/')

const cacheMiddleware = (req, res, next) => {
  if (TTL <= 0 || req.method !== 'GET' || !req.path.startsWith('/api/') || req.headers.authorization || skipCache(req.path)) return next()

  const key = req.originalUrl
  const hit = cache.get(key)
  if (hit && hit.expire > Date.now()) {
    res.setHeader('X-Mock-Cache', 'HIT')
    res.type('application/json').send(hit.body)
    return
  }

  const sendJson = res.json.bind(res)
  res.json = body => {
    if (body && body.code === 200) {
      if (cache.size >= MAX_ENTRIES) {
        const now = Date.now()
        for (const [k, v] of cache) if (v.expire <= now) cache.delete(k)
        if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value)
      }
      cache.set(key, { body: JSON.stringify(body), expire: Date.now() + TTL })
    }
    return sendJson(body)
  }
  res.setHeader('X-Mock-Cache', 'MISS')
  next()
}

const round = (n, d = 2) => Number(n.toFixed(d))

const getStats = () => {
  const endpoints = [...statsMap.entries()]
    .map(([key, v]) => ({
      endpoint: key,
      count: v.count,
      avgMs: round(v.totalMs / v.count),
      maxMs: round(v.maxMs, 1),
      errors: v.errors
    }))
    .sort((a, b) => b.count - a.count)

  const totals = endpoints.reduce((acc, e) => ({ count: acc.count + e.count, errors: acc.errors + e.errors }), { count: 0, errors: 0 })
  const totalMs = [...statsMap.values()].reduce((s, v) => s + v.totalMs, 0)

  return {
    uptimeSec: Math.round((Date.now() - START_AT) / 1000),
    cache: { ttlMs: TTL, entries: cache.size, maxEntries: MAX_ENTRIES },
    totalRequests: totals.count,
    totalErrors: totals.errors,
    avgMs: totals.count ? round(totalMs / totals.count) : 0,
    endpoints
  }
}

const clearCache = () => cache.clear()

module.exports = { statsMiddleware, cacheMiddleware, getStats, clearCache }

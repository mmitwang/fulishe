/**
 * 前端 API 混合代理（真实后端优先，Mock 兜底）
 *
 * 监听 8080（前端 Vite 代理目标不变）
 *   1. 先转发到真实网关 http://127.0.0.1:9000
 *   2. 网关返回 404/502/503/504 或不可达时，回退到 Mock http://127.0.0.1:8090
 *   3. 业务错误（HTTP 200 + code!=200）原样透传，不做兜底
 *
 * 同时把前端分页参数 current/size 转成后端 PageQuery 的 pageNum/pageSize（仅真实链路）。
 */
const http = require('http')

const PORT = Number(process.env.PORT || 8080)
const REAL = { host: '127.0.0.1', port: Number(process.env.REAL_PORT || 9000) }
const MOCK = { host: '127.0.0.1', port: Number(process.env.MOCK_PORT || 8090) }
const FALLBACK_STATUS = new Set([404, 502, 503, 504])

const rewriteForReal = url => {
  const [path, qs] = url.split('?')
  if (!qs) return url
  const params = new URLSearchParams(qs)
  if (params.has('current') && !params.has('pageNum')) params.set('pageNum', params.get('current'))
  if (params.has('size') && !params.has('pageSize')) params.set('pageSize', params.get('size'))
  return `${path}?${params.toString()}`
}

const forward = (upstream, req, body, url) =>
  new Promise(resolve => {
    const headers = { ...req.headers, host: `${upstream.host}:${upstream.port}` }
    // 去掉逐跳头，避免 chunked/content-length 与重新写入的 body 冲突
    delete headers['transfer-encoding']
    delete headers['content-length']
    delete headers.connection
    const proxyReq = http.request(
      { host: upstream.host, port: upstream.port, path: url, method: req.method, headers },
      proxyRes => {
        const chunks = []
        proxyRes.on('data', c => chunks.push(c))
        proxyRes.on('end', () =>
          resolve({ status: proxyRes.statusCode || 502, headers: proxyRes.headers, body: Buffer.concat(chunks) })
        )
      }
    )
    proxyReq.on('error', err => resolve({ status: 502, headers: {}, body: Buffer.from(String(err.message)) }))
    if (body.length) proxyReq.write(body)
    proxyReq.end()
  })

const server = http.createServer((req, res) => {
  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', async () => {
    const body = Buffer.concat(chunks)
    const real = await forward(REAL, req, body, rewriteForReal(req.url))
    let result = real
    let source = 'REAL'

    if (FALLBACK_STATUS.has(real.status)) {
      result = await forward(MOCK, req, body, req.url)
      source = 'MOCK'
      console.log(`[fallback] ${req.method} ${req.url} -> real ${real.status}, mock ${result.status}`)
    }

    const headers = { ...result.headers, 'x-proxy-source': source }
    delete headers['content-length']
    delete headers['transfer-encoding']
    res.writeHead(result.status, headers)
    res.end(result.body)
  })
})

server.listen(PORT, () => {
  console.log(`福礼社混合代理运行中: http://localhost:${PORT}  (real:${REAL.port} mock:${MOCK.port})`)
})

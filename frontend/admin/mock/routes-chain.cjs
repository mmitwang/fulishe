const { ok, fail, paginate, like, numEq, hash, fmt } = require('./helpers.cjs')
const { chainBlocks, chainTxs, chainMeta, traceRecords, coupons, products } = require('./seed-extra.cjs')
const { products: productSeed } = require('./seed.cjs')

const findTraceByCode = code => {
  const c = String(code || '').trim().toUpperCase()
  if (!c) return { trace: null, coupon: null }
  const trace = traceRecords.find(t => t.traceCode.toUpperCase() === c) || null
  const coupon = coupons.find(x => x.couponCode.toUpperCase() === c || String(x.traceCode).toUpperCase() === c) || null
  let linkedTrace = trace
  if (!linkedTrace && coupon && coupon.traceCode) {
    linkedTrace = traceRecords.find(t => t.traceCode === coupon.traceCode) || null
  }
  return { trace: linkedTrace, coupon }
}

module.exports = function registerChainRoutes(app) {
  app.get('/api/chain/overview', (req, res) => {
    const typeStats = Object.keys(chainTxs.reduce((m, t) => { m[t.txType] = (m[t.txType] || 0) + 1; return m }, {})).map(k => ({
      type: k,
      name: chainTxs.find(t => t.txType === k).txTypeName,
      value: chainTxs.filter(t => t.txType === k).length
    }))
    const trend = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      trend.push({ date: `${d.getMonth() + 1}/${d.getDate()}`, tx: 40 + ((d.getDate() * 23) % 90) })
    }
    ok(res, {
      meta: chainMeta,
      typeStats,
      trend,
      latestBlocks: [...chainBlocks].reverse().slice(0, 6),
      latestTxs: [...chainTxs].reverse().slice(0, 8),
      traceCount: traceRecords.length,
      verifyCount: 1286 + traceRecords.length * 7
    })
  })

  app.get('/api/chain/block/page', (req, res) => {
    let list = [...chainBlocks].sort((a, b) => b.height - a.height)
    if (req.query.height) list = list.filter(b => String(b.height).includes(String(req.query.height)))
    if (req.query.blockHash) list = list.filter(b => like(b.blockHash, req.query.blockHash))
    ok(res, paginate(list, req.query))
  })

  app.get('/api/chain/block/:height', (req, res) => {
    const block = chainBlocks.find(b => b.height === Number(req.params.height))
    if (!block) return fail(res, '区块不存在', 404)
    ok(res, { ...block, txs: chainTxs.filter(t => t.blockHeight === block.height) })
  })

  app.get('/api/chain/tx/page', (req, res) => {
    let list = [...chainTxs].sort((a, b) => b.blockHeight - a.blockHeight)
    if (req.query.txType) list = list.filter(t => t.txType === req.query.txType)
    if (req.query.keyword) {
      const k = req.query.keyword
      list = list.filter(t => like(t.txHash, k) || like(t.bizNo, k) || like(t.couponCode, k) || like(t.spuName, k))
    }
    if (req.query.blockHeight) list = list.filter(t => numEq(t.blockHeight, req.query.blockHeight))
    ok(res, paginate(list, req.query))
  })

  app.get('/api/chain/trace/page', (req, res) => {
    let list = [...traceRecords]
    if (req.query.keyword) list = list.filter(t => like(t.traceCode, req.query.keyword) || like(t.spuName, req.query.keyword) || like(t.batchNo, req.query.keyword))
    if (req.query.qualityReport) list = list.filter(t => t.qualityReport === req.query.qualityReport)
    ok(res, paginate(list, req.query))
  })

  app.get('/api/chain/trace/:code', (req, res) => {
    const { trace, coupon } = findTraceByCode(req.params.code)
    if (!trace && !coupon) return fail(res, '未查询到该溯源码或卡券编码', 404)
    const spu = trace ? productSeed.find(p => p.id === trace.spuId) : null
    const txs = chainTxs.filter(t => t.couponCode === req.params.code || (trace && t.bizNo === trace.traceCode))
    ok(res, {
      traceCode: trace ? trace.traceCode : coupon.traceCode,
      trace,
      coupon,
      product: spu ? { id: spu.id, spuName: spu.spuName, image: spu.image, sellPrice: spu.sellPrice, brandName: spu.brandName } : null,
      txs,
      chainStatus: '已上链',
      blockHeight: txs.length ? txs[0].blockHeight : chainMeta.height,
      verified: true
    })
  })

  app.post('/api/chain/verify', (req, res) => {
    const code = req.body.code || req.body.traceCode || req.body.couponCode
    const { trace, coupon } = findTraceByCode(code)
    if (!trace && !coupon) {
      return ok(res, { valid: false, code, message: '该编码未在福礼链上找到存证记录，请核对后重试', verifyTime: fmt(new Date()) })
    }
    const txs = chainTxs.filter(t => (coupon && t.couponCode === coupon.couponCode) || (trace && t.bizNo === trace.traceCode))
    ok(res, {
      valid: true,
      code,
      message: '验证通过，该编码由福礼链存证，数据未被篡改',
      verifyTime: fmt(new Date()),
      chainName: chainMeta.chainName,
      chainId: chainMeta.chainId,
      txCount: txs.length,
      blockHeight: txs.length ? txs[0].blockHeight : chainMeta.height,
      txHash: txs.length ? txs[0].txHash : hash(code),
      trace,
      coupon,
      issuer: '福礼社供应链联盟'
    })
  })

  app.get('/api/chain/certificate/:couponCode', (req, res) => {
    const code = req.params.couponCode
    const { trace, coupon } = findTraceByCode(code)
    if (!coupon) return fail(res, '卡券不存在', 404)
    ok(res, {
      certificateNo: `CERT-${coupon.couponCode}`,
      couponCode: coupon.couponCode,
      holder: coupon.userName,
      faceValue: coupon.faceValue,
      status: coupon.status === 1 ? '已核销' : '有效',
      issueTime: coupon.receivedTime,
      expireTime: coupon.expireTime,
      chainTxHash: hash(`cert-${coupon.couponCode}`),
      traceCode: trace ? trace.traceCode : coupon.traceCode,
      issuer: '福礼链 FuliChain',
      verifyUrl: `/trace/${coupon.couponCode}`
    })
  })
}

module.exports.findTraceByCode = findTraceByCode

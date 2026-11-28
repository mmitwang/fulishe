/**
 * Mock 数据实时备份
 *
 * 设计目标：Mock 数据全部驻留内存，进程异常退出或误操作会导致数据丢失。
 * 本模块把全部可变集合快照到磁盘，并支持：
 *  1. 写操作触发（debounce）自动备份，做到“改完即落盘”；
 *  2. 定时兜底备份，避免长时间无写操作时缺少恢复点；
 *  3. 手动备份 / 恢复 / 删除 / 保留数量轮转；
 *  4. 恢复后原地刷新集合与热点索引，无需重启进程。
 */
const fs = require('fs')
const path = require('path')

const seed = require('./seed.cjs')
const extra = require('./seed-extra.cjs')
const stockService = require('./stock-service.cjs')
const fundService = require('./fund-service.cjs')
const financeService = require('./finance-service.cjs')
const distributionService = require('./distribution-service.cjs')
const promotionService = require('./promotion-service.cjs')
const indexes = require('./indexes.cjs')
const perf = require('./perf.cjs')
const { createAuthz } = require('./authz.cjs')

const DATA_DIR = process.env.FULISHE_BACKUP_DIR
  ? path.resolve(process.env.FULISHE_BACKUP_DIR)
  : path.join(__dirname, '..', 'data')
const BACKUP_DIR = path.join(DATA_DIR, 'backups')
const AUTO_DIR = path.join(BACKUP_DIR, 'auto')
const MANUAL_DIR = path.join(BACKUP_DIR, 'manual')
const SCHEMA = 1

const config = {
  enabled: true,
  intervalMinutes: 5,
  debounceMs: 800,
  maxAuto: 40,
  maxManual: 100
}

const state = {
  timer: null,
  debounceTimer: null,
  startedAt: null,
  lastSnapshotAt: null,
  lastSnapshotFile: null,
  lastSnapshotSize: 0,
  lastError: null,
  snapshotCount: 0,
  dirty: false
}

/* ---------------- 可变数据登记表 ---------------- */
// 数组按“原地替换”恢复，保证其它模块持有的引用不失效；对象按 key 同步。
const registries = [
  { key: 'seed.tenants', type: 'array', ref: seed.tenants },
  { key: 'seed.users', type: 'array', ref: seed.users },
  { key: 'seed.roles', type: 'array', ref: seed.roles },
  { key: 'seed.roleMenus', type: 'object', ref: seed.roleMenus },
  { key: 'seed.categories', type: 'array', ref: seed.categories },
  { key: 'seed.brands', type: 'array', ref: seed.brands },
  { key: 'seed.products', type: 'array', ref: seed.products },
  { key: 'seed.skus', type: 'array', ref: seed.skus },

  { key: 'extra.couponTemplates', type: 'array', ref: extra.couponTemplates },
  { key: 'extra.couponBatches', type: 'array', ref: extra.couponBatches },
  { key: 'extra.coupons', type: 'array', ref: extra.coupons },
  { key: 'extra.orders', type: 'array', ref: extra.orders },
  { key: 'extra.orderItems', type: 'array', ref: extra.orderItems },
  { key: 'extra.payRecords', type: 'array', ref: extra.payRecords },
  { key: 'extra.refunds', type: 'array', ref: extra.refunds },
  { key: 'extra.suppliers', type: 'array', ref: extra.suppliers },
  { key: 'extra.purchaseOrders', type: 'array', ref: extra.purchaseOrders },
  { key: 'extra.inventory', type: 'array', ref: extra.inventory },
  { key: 'extra.shipments', type: 'array', ref: extra.shipments },
  { key: 'extra.settlements', type: 'array', ref: extra.settlements },
  { key: 'extra.traceRecords', type: 'array', ref: extra.traceRecords },
  { key: 'extra.chainBlocks', type: 'array', ref: extra.chainBlocks },
  { key: 'extra.chainTxs', type: 'array', ref: extra.chainTxs },
  { key: 'extra.chainMeta', type: 'object', ref: extra.chainMeta },
  { key: 'extra.carts', type: 'array', ref: extra.carts },
  { key: 'extra.banners', type: 'array', ref: extra.banners },
  { key: 'extra.quickEntries', type: 'array', ref: extra.quickEntries },
  { key: 'extra.notices', type: 'array', ref: extra.notices },
  { key: 'extra.menuList', type: 'array', ref: extra.menuList },
  { key: 'extra.invoices', type: 'array', ref: extra.invoices },
  { key: 'extra.addresses', type: 'array', ref: extra.addresses },
  { key: 'extra.warehouses', type: 'array', ref: extra.warehouses },
  { key: 'extra.carriers', type: 'array', ref: extra.carriers },
  { key: 'extra.fuliAccounts', type: 'array', ref: extra.fuliAccounts },
  { key: 'extra.fuliFlows', type: 'array', ref: extra.fuliFlows },
  { key: 'extra.fuliRecharges', type: 'array', ref: extra.fuliRecharges },
  { key: 'extra.fuliTransfers', type: 'array', ref: extra.fuliTransfers },
  { key: 'extra.fuliOperations', type: 'array', ref: extra.fuliOperations },

  { key: 'service.stock.reservations', type: 'array', ref: stockService.reservations },
  { key: 'service.stock.flows', type: 'array', ref: stockService.stockFlows },
  { key: 'service.fund.flows', type: 'array', ref: fundService.flows },
  { key: 'service.finance.config', type: 'object', ref: financeService.config },
  { key: 'service.finance.splits', type: 'array', ref: financeService.splits },
  { key: 'service.distribution.distributors', type: 'array', ref: distributionService.distributors },
  { key: 'service.distribution.rules', type: 'array', ref: distributionService.distributionRules },
  { key: 'service.distribution.selections', type: 'array', ref: distributionService.distributionSelections },
  { key: 'service.distribution.shares', type: 'array', ref: distributionService.distributionShares },
  { key: 'service.distribution.promotionOrders', type: 'array', ref: distributionService.promotionOrders },
  { key: 'service.promotion.fullReductionRules', type: 'array', ref: promotionService.fullReductionRules }
]

const SUMMARY_KEYS = [
  'seed.tenants', 'seed.users', 'seed.products', 'seed.skus',
  'extra.orders', 'extra.payRecords', 'extra.purchaseOrders', 'extra.inventory',
  'extra.coupons', 'extra.shipments', 'extra.settlements'
]

const clone = value => JSON.parse(JSON.stringify(value))

const ensureDirs = () => {
  ;[DATA_DIR, BACKUP_DIR, AUTO_DIR, MANUAL_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  })
}

const pad = value => String(value).padStart(2, '0')
const stamp = date => {
  const d = new Date(date)
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${String(d.getMilliseconds()).padStart(3, '0')}`
}

const dirOf = kind => (kind === 'manual' ? MANUAL_DIR : AUTO_DIR)
const kindOfPath = file => (String(file || '').startsWith('manual/') || String(file || '').startsWith('auto/'))
  ? String(file).split('/')[0]
  : ''

const safeName = file => {
  const text = String(file || '')
  if (!/^(auto|manual)\/[A-Za-z0-9._-]+\.json$/.test(text)) return null
  return text
}

const collect = () => {
  const data = {}
  registries.forEach(item => {
    data[item.key] = clone(item.ref)
  })
  return data
}

const countsOf = data => {
  const counts = {}
  registries.forEach(item => {
    if (Array.isArray(item.ref)) counts[item.key] = Array.isArray(data[item.key]) ? data[item.key].length : 0
  })
  return counts
}

const summaryOf = data => {
  const summary = {}
  SUMMARY_KEYS.forEach(key => {
    summary[key] = Array.isArray(data[key]) ? data[key].length : 0
  })
  return summary
}

const setObject = (target, source) => {
  Object.keys(target).forEach(key => {
    if (!(key in source)) delete target[key]
  })
  Object.keys(source).forEach(key => {
    target[key] = clone(source[key])
  })
}

const apply = data => {
  let changed = 0
  registries.forEach(item => {
    if (!(item.key in data)) return
    if (Array.isArray(item.ref)) {
      if (!Array.isArray(data[item.key])) throw new Error(`备份数据格式错误：${item.key} 应为数组`)
      item.ref.splice(0, item.ref.length, ...clone(data[item.key]))
    } else {
      if (!data[item.key] || typeof data[item.key] !== 'object') throw new Error(`备份数据格式错误：${item.key} 应为对象`)
      setObject(item.ref, data[item.key])
    }
    changed += 1
  })
  indexes.rebuild()
  perf.clearCache()
  return changed
}

const prune = () => {
  const removeOverflow = (dir, max) => {
    const files = fs.readdirSync(dir)
      .filter(name => name.endsWith('.json'))
      .map(name => ({ name, time: fs.statSync(path.join(dir, name)).mtimeMs }))
      .sort((a, b) => b.time - a.time)
    files.slice(max).forEach(file => fs.unlinkSync(path.join(dir, file.name)))
  }
  removeOverflow(AUTO_DIR, config.maxAuto)
  removeOverflow(MANUAL_DIR, config.maxManual)
}

const writeSnapshot = (kind, label = '') => {
  ensureDirs()
  const now = new Date()
  const data = collect()
  const snapshot = {
    schema: SCHEMA,
    kind: kind === 'manual' ? 'manual' : 'auto',
    label: String(label || (kind === 'manual' ? '手动备份' : '写操作自动备份')).slice(0, 80),
    createdAt: now.toISOString(),
    app: 'fulishe-mock',
    counts: countsOf(data),
    data
  }
  const fileName = `${snapshot.kind}-${stamp(now)}.json`
  const target = path.join(dirOf(snapshot.kind), fileName)
  const temp = `${target}.tmp`
  const payload = JSON.stringify(snapshot)
  fs.writeFileSync(temp, payload, 'utf8')
  fs.renameSync(temp, target)
  prune()

  state.lastSnapshotAt = snapshot.createdAt
  state.lastSnapshotFile = `${snapshot.kind}/${fileName}`
  state.lastSnapshotSize = Buffer.byteLength(payload)
  state.lastError = null
  state.snapshotCount += 1
  state.dirty = false
  return { file: state.lastSnapshotFile, kind: snapshot.kind, label: snapshot.label, size: state.lastSnapshotSize, createdAt: state.lastSnapshotAt, counts: snapshot.counts }
}

const readSnapshot = file => {
  const name = safeName(file)
  if (!name) throw new Error('备份文件名不合法')
  const target = path.join(BACKUP_DIR, name)
  if (!fs.existsSync(target)) throw new Error('备份文件不存在')
  const snapshot = JSON.parse(fs.readFileSync(target, 'utf8'))
  if (!snapshot || snapshot.schema !== SCHEMA || !snapshot.data) throw new Error('备份文件格式不受支持')
  return { snapshot, target }
}

const restore = file => {
  const { snapshot } = readSnapshot(file)
  const changed = apply(snapshot.data)
  const result = writeSnapshot('auto', `恢复自 ${file}`)
  return { file: result.file, restoredFrom: file, restoredAt: new Date().toISOString(), collections: changed, counts: result.counts }
}

const remove = file => {
  const name = safeName(file)
  if (!name) throw new Error('备份文件名不合法')
  const target = path.join(BACKUP_DIR, name)
  if (!fs.existsSync(target)) throw new Error('备份文件不存在')
  fs.unlinkSync(target)
  return { file: name }
}

const list = () => {
  ensureDirs()
  const readDir = (dir, kind) => fs.readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .map(name => {
      const target = path.join(dir, name)
      const stat = fs.statSync(target)
      let meta = {}
      try {
        const parsed = JSON.parse(fs.readFileSync(target, 'utf8'))
        meta = { label: parsed.label || '', createdAt: parsed.createdAt || '', counts: parsed.counts || {} }
      } catch (error) {
        meta = { label: '（文件损坏）', createdAt: '', counts: {} }
      }
      return {
        file: `${kind}/${name}`,
        kind,
        size: stat.size,
        modifiedAt: new Date(stat.mtimeMs).toISOString(),
        ...meta
      }
    })
  return [...readDir(AUTO_DIR, 'auto'), ...readDir(MANUAL_DIR, 'manual')]
    .sort((a, b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt)))
}

const totalSizeOf = () => {
  ensureDirs()
  return [...fs.readdirSync(AUTO_DIR), ...fs.readdirSync(MANUAL_DIR)]
    .filter(name => name.endsWith('.json'))
    .reduce((sum, name) => {
      const target = fs.existsSync(path.join(AUTO_DIR, name)) ? path.join(AUTO_DIR, name) : path.join(MANUAL_DIR, name)
      return sum + fs.statSync(target).size
    }, 0)
}

const status = () => {
  const files = list()
  const data = collect()
  return {
    enabled: config.enabled,
    intervalMinutes: config.intervalMinutes,
    debounceMs: config.debounceMs,
    maxAuto: config.maxAuto,
    maxManual: config.maxManual,
    backupDir: BACKUP_DIR,
    startedAt: state.startedAt,
    lastSnapshotAt: state.lastSnapshotAt,
    lastSnapshotFile: state.lastSnapshotFile,
    lastSnapshotSize: state.lastSnapshotSize,
    lastError: state.lastError,
    snapshotCount: state.snapshotCount,
    dirty: state.dirty,
    autoCount: files.filter(item => item.kind === 'auto').length,
    manualCount: files.filter(item => item.kind === 'manual').length,
    totalSize: totalSizeOf(),
    summary: summaryOf(data)
  }
}

const updateConfig = body => {
  if (body.enabled !== undefined) config.enabled = body.enabled === true || body.enabled === 1 || body.enabled === '1' || body.enabled === 'true'
  if (body.intervalMinutes !== undefined) {
    const value = Number(body.intervalMinutes)
    if (!Number.isFinite(value) || value < 1 || value > 720) throw new Error('备份间隔需在 1-720 分钟之间')
    config.intervalMinutes = Math.floor(value)
  }
  if (body.maxAuto !== undefined) {
    const value = Number(body.maxAuto)
    if (!Number.isInteger(value) || value < 3 || value > 500) throw new Error('自动备份保留数量需在 3-500 之间')
    config.maxAuto = value
  }
  if (body.maxManual !== undefined) {
    const value = Number(body.maxManual)
    if (!Number.isInteger(value) || value < 3 || value > 500) throw new Error('手动备份保留数量需在 3-500 之间')
    config.maxManual = value
  }
  restartTimer()
  return status()
}

const markDirty = () => {
  state.dirty = true
  if (!config.enabled) return
  if (state.debounceTimer) clearTimeout(state.debounceTimer)
  state.debounceTimer = setTimeout(() => {
    state.debounceTimer = null
    if (!state.dirty) return
    try {
      writeSnapshot('auto', '写操作自动备份')
    } catch (error) {
      state.lastError = error.message
      console.error('[backup] 自动备份失败:', error.message)
    }
  }, config.debounceMs)
  if (state.debounceTimer.unref) state.debounceTimer.unref()
}

const restartTimer = () => {
  if (state.timer) clearInterval(state.timer)
  state.timer = null
  if (!config.enabled) return
  state.timer = setInterval(() => {
    if (!state.dirty) return
    try {
      writeSnapshot('auto', '定时兜底备份')
    } catch (error) {
      state.lastError = error.message
      console.error('[backup] 定时备份失败:', error.message)
    }
  }, config.intervalMinutes * 60 * 1000)
  if (state.timer.unref) state.timer.unref()
}

const start = () => {
  ensureDirs()
  state.startedAt = new Date().toISOString()
  try {
    const files = fs.readdirSync(AUTO_DIR).filter(name => name.endsWith('.json'))
    state.snapshotCount = files.length
    if (files.length === 0) writeSnapshot('auto', '系统启动基线快照')
    else {
      const latest = files
        .map(name => ({ name, time: fs.statSync(path.join(AUTO_DIR, name)).mtimeMs }))
        .sort((a, b) => b.time - a.time)[0]
      state.lastSnapshotAt = new Date(latest.time).toISOString()
      state.lastSnapshotFile = `auto/${latest.name}`
      state.lastSnapshotSize = fs.statSync(path.join(AUTO_DIR, latest.name)).size
    }
  } catch (error) {
    state.lastError = error.message
  }
  restartTimer()
  return status()
}

const mount = (app, jwt, SECRET_KEY) => {
  const { authenticate, requireSuperAdmin } = createAuthz(jwt, SECRET_KEY)

  // 任意成功写操作后触发 debounce 备份；登录/验证码等无数据变更的写请求与备份接口本身不触发。
  app.use((req, res, next) => {
    const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
    const requestPath = String(req.path || '')
    const isBackupApi = requestPath.startsWith('/api/admin/backup')
    const isAuthNoise = /^\/api\/(user\/)?auth\/(login|refresh|captcha)/.test(requestPath)
    if (isWrite && !isBackupApi && !isAuthNoise && requestPath.startsWith('/api/')) {
      res.on('finish', () => {
        if (res.statusCode < 400) markDirty()
      })
    }
    next()
  })

  app.use('/api/admin/backup', authenticate, requireSuperAdmin)

  app.get('/api/admin/backup/status', (req, res) => {
    res.json({ code: 200, message: 'success', data: status() })
  })

  app.get('/api/admin/backup/list', (req, res) => {
    res.json({ code: 200, message: 'success', data: list() })
  })

  app.post('/api/admin/backup/create', (req, res) => {
    try {
      const result = writeSnapshot('manual', req.body && req.body.label)
      res.json({ code: 200, message: '备份已创建', data: result })
    } catch (error) {
      res.status(400).json({ code: 400, message: error.message || '备份失败', data: null })
    }
  })

  app.post('/api/admin/backup/trigger', (req, res) => {
    try {
      const result = writeSnapshot('auto', (req.body && req.body.label) || '手动触发自动备份')
      res.json({ code: 200, message: '自动备份已触发', data: result })
    } catch (error) {
      res.status(400).json({ code: 400, message: error.message || '备份失败', data: null })
    }
  })

  app.post('/api/admin/backup/restore', (req, res) => {
    try {
      const result = restore(req.body && req.body.file)
      res.json({ code: 200, message: '数据已恢复', data: result })
    } catch (error) {
      res.status(400).json({ code: 400, message: error.message || '恢复失败', data: null })
    }
  })

  app.delete('/api/admin/backup', (req, res) => {
    try {
      const result = remove((req.query && req.query.file) || (req.body && req.body.file))
      res.json({ code: 200, message: '备份已删除', data: result })
    } catch (error) {
      res.status(400).json({ code: 400, message: error.message || '删除失败', data: null })
    }
  })

  app.put('/api/admin/backup/config', (req, res) => {
    try {
      const result = updateConfig(req.body || {})
      res.json({ code: 200, message: '备份配置已保存', data: result })
    } catch (error) {
      res.status(400).json({ code: 400, message: error.message || '保存失败', data: null })
    }
  })
}

module.exports = {
  start,
  mount,
  markDirty,
  status,
  list,
  backupNow: label => writeSnapshot('manual', label),
  restore,
  remove,
  updateConfig,
  backupDir: BACKUP_DIR,
  config
}

/**
 * 福礼社平台 — 页面自动交互巡检
 *
 * 用 Playwright 真实浏览器遍历管理端(3100)与 PC 商城(3101)的全部页面，
 * 对每个页面执行安全交互（查询 / 切换 Tab / 翻页 / 查看详情 / 滚动），
 * 采集：页面 JS 异常、console error、/api 失败响应、是否被重定向到登录/403、
 * 页面是否渲染出内容，并截图留证，最终输出 Markdown + HTML 测试报告。
 *
 * 原则：只读安全交互，不触发删除/提交/支付/审核等破坏性写操作。
 *
 * 前置：Mock(8080)、管理端(3100)、PC(3101) 已启动。
 * 运行：node mock/auto-page-test.cjs
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require(path.join(__dirname, '..', 'node_modules', 'playwright'))

const ADMIN = 'http://localhost:3100'
const PC = 'http://127.0.0.1:3101'
const H5 = 'http://127.0.0.1:3001'
const MINI = 'http://127.0.0.1:10086'
const PASSWORD = '123456'
const ROOT = path.join(__dirname, '..', '..', '..')
const OUT = path.join(ROOT, 'docs', 'test-reports')
const SHOT = path.join(OUT, 'screenshots')
const ONLY = process.env.ONLY || '' // 可选：仅跑某个前端 admin|pc|perm

const sleep = ms => new Promise(r => setTimeout(r, ms))
const stamp = () => {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 管理端全部叶子路由（取自 src/router/index.ts） */
const ADMIN_PAGES = [
  ['/dashboard', '数据看板'],
  ['/merchant/dashboard', '商户工作台'],
  ['/product/spu', '商品列表'],
  ['/product/category', '商品分类'],
  ['/product/brand', '品牌管理'],
  ['/coupon/template', '卡券模板'],
  ['/coupon/list', '卡券列表'],
  ['/coupon/batch', '发放批次'],
  ['/order/list', '订单列表'],
  ['/pay/record', '支付记录'],
  ['/pay/refund', '退款记录'],
  ['/pay/config', '支付配置'],
  ['/pay/invoice', '发票管理'],
  ['/pay/commission', '平台抽佣'],
  ['/chain/tx', '链上交易'],
  ['/chain/block', '区块浏览器'],
  ['/chain/trace', '溯源验真'],
  ['/supply/supplier', '供应商管理'],
  ['/supply/purchase', '采购订单'],
  ['/supply/inventory', '库存管理'],
  ['/supply/shipment', '物流发货'],
  ['/supply/settlement', '对账结算'],
  ['/promotion/full-reduction', '满减促销'],
  ['/distribution/rules', '佣金规则'],
  ['/distribution/distributors', '分销商管理'],
  ['/distribution/orders', '推广订单'],
  ['/distributor/selection', '选品中心'],
  ['/distributor/shares', '我的分享'],
  ['/distributor/orders', '推广与佣金'],
  ['/system/user', '用户管理'],
  ['/system/role', '角色管理'],
  ['/system/dept', '部门管理'],
  ['/system/menu', '菜单管理'],
  ['/system/tenant', '租户管理'],
  ['/system/backup', '数据备份'],
  ['/merchant/profile', '商户资料']
]

/** PC 商城路由（取自 pc/src/router/index.ts） */
const PC_PAGES = [
  ['/home', '首页'],
  ['/category', '商品分类'],
  ['/product/1', '商品详情'],
  ['/cart', '购物车'],
  ['/order/list', '我的订单'],
  ['/order/confirm', '确认订单'],
  ['/pay', '收银台'],
  ['/coupon', '我的卡券'],
  ['/trace', '区块链溯源'],
  ['/user', '个人中心']
]

/** H5 商城路由（取自 h5/src/router/index.ts） */
const H5_PAGES = [
  ['/home', '首页'],
  ['/category', '商品分类'],
  ['/product/1', '商品详情'],
  ['/cart', '购物车'],
  ['/order/list', '我的订单'],
  ['/coupon', '我的卡券'],
  ['/trace', '区块链溯源'],
  ['/user', '我的']
]

/** 小程序页面（Taro H5 产物路由） */
const MINI_PAGES = [
  ['pages/home/index', '首页'],
  ['pages/category/index', '分类'],
  ['pages/cart/index', '购物车'],
  ['pages/mine/index', '我的'],
  ['pages/product/index?id=1', '商品详情'],
  ['pages/order/index', '我的订单'],
  ['pages/trace/index', '区块链溯源']
]

/** H5 商城安全交互（移动端视口） */
const interactH5 = async (page, route, log) => {
  await safe(() => page.mouse.wheel(0, 480)); await sleep(300)
  await safe(() => page.mouse.wheel(0, -480))
  if (route.startsWith('/product/')) {
    const add = page.locator('button:has-text("加入购物车")').first()
    if (await safe(() => add.isVisible({ timeout: 2000 }))) {
      await safe(() => add.click({ timeout: 3000 })); log.push('加入购物车'); await sleep(800)
    }
  }
  if (route === '/home') {
    const card = page.locator('.product-item').first()
    if (await safe(() => card.isVisible({ timeout: 1500 }))) {
      await safe(() => card.click({ timeout: 2000 })); log.push('点击商品卡'); await sleep(900)
      await page.goBack().catch(() => {})
    }
  }
  if (route === '/category') {
    const item = page.locator('.side-item').nth(1)
    if (await safe(() => item.isVisible({ timeout: 1200 }))) { await safe(() => item.click({ timeout: 2000 })); log.push('切换分类'); await sleep(700) }
  }
  if (route === '/order/list') {
    for (const t of ['全部', '待付款', '待发货', '已完成']) {
      const el = page.locator(`text=${t}`).first()
      if (await safe(() => el.isVisible({ timeout: 400 }))) { await safe(() => el.click({ timeout: 1500 })); log.push(`订单Tab[${t}]`); await sleep(400) }
    }
  }
  if (route === '/user') {
    const cell = page.locator('.van-cell:has-text("我的卡券")').first()
    if (await safe(() => cell.isVisible({ timeout: 1200 }))) {
      await safe(() => cell.click({ timeout: 2000 })); log.push('点击[我的卡券]'); await sleep(700)
      await page.goBack().catch(() => {})
    }
  }
}

/** 小程序（Taro H5）安全交互 */
const interactMini = async (page, route, log) => {
  await safe(() => page.mouse.wheel(0, 480)); await sleep(300)
  await safe(() => page.mouse.wheel(0, -480))
  if (route.includes('pages/product/')) {
    const add = page.locator('text=加入购物车').first()
    if (await safe(() => add.scrollIntoViewIfNeeded({ timeout: 3000 })) !== null) {
      await safe(() => add.click({ timeout: 3000, force: true }))
      log.push('加入购物车'); await sleep(1200)
    }
  }
  if (route.includes('pages/mine/')) {
    const stat = page.locator('text=全部订单').first()
    if (await safe(() => stat.isVisible({ timeout: 1200 }))) {
      await safe(() => stat.click({ timeout: 2000 })); log.push('点击[全部订单]'); await sleep(800)
      await page.goBack().catch(() => {})
    }
  }
}

const loginH5 = async page => {
  await page.goto(`${H5}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[placeholder="请输入用户名"]', { timeout: 20000 })
  await sleep(800)
  await page.fill('input[placeholder="请输入用户名"]', 'user1')
  await page.fill('input[placeholder="请输入密码"]', PASSWORD)
  await page.click('button:has-text("登 录")')
  await page.waitForFunction(() => !location.pathname.includes('/login'), null, { timeout: 20000 })
  await sleep(1500)
}

/** H5 完整下单支付流程（真实写操作：生成 1 笔测试订单） */
const h5Flow = async (page, log) => {
  await page.goto(`${H5}/home`, { waitUntil: 'domcontentloaded' })
  await sleep(2200)
  const card = page.locator('.product-item').first()
  await card.waitFor({ state: 'visible', timeout: 20000 })
  await card.click()
  await page.waitForURL(/\/product\//, { timeout: 15000 })
  await sleep(1800)
  log.push('首页→商品详情')
  if (!await tryClick(page, 'button:has-text("加入购物车")', 5000)) throw new Error('商品详情未找到[加入购物车]')
  await sleep(1200)
  log.push('加入购物车')
  await page.goto(`${H5}/cart`, { waitUntil: 'domcontentloaded' })
  await sleep(1800)
  if (!await tryClick(page, 'button:has-text("去结算")', 5000)) throw new Error('购物车未找到[去结算]')
  await sleep(2200)
  if (!page.url().includes('/order/confirm')) throw new Error(`未进入确认订单页：${page.url()}`)
  log.push('购物车→确认订单')
  if (!await tryClick(page, 'button:has-text("提交订单")', 6000)) throw new Error('确认订单未找到[提交订单]')
  await page.waitForURL(/\/pay/, { timeout: 20000 })
  await sleep(2000)
  log.push('提交订单→收银台')
  if (!await tryClick(page, 'button:has-text("确认支付")', 6000)) throw new Error('收银台未找到[确认支付]')
  await sleep(2600)
  const paid = await safe(() => page.locator('text=支付成功').first().isVisible({ timeout: 4000 }))
  if (!paid) throw new Error('支付后未出现“支付成功”')
  log.push('确认支付成功')
}

/**
 * 角色个人工作台：绑定 distributorId / merchantId，仅对应角色可访问。
 * 超管直接访问被 403 属于「预期的角色隔离」，不算缺陷；
 * 这些页面另用对应角色账号单独实测（见 runRolePages）。
 */
const ROLE_PERSONAL = {
  '/distributor/selection': { account: 'distributor_chen', title: '选品中心' },
  '/distributor/shares': { account: 'distributor_chen', title: '我的分享' },
  '/distributor/orders': { account: 'distributor_chen', title: '推广与佣金' },
  '/merchant/profile': { account: 'fulishe_admin', title: '商户资料' }
}

const results = [] // {frontend, route, title, status, durMs, consoleErrors, pageErrors, failedApis, interactions, screenshot, notes}

const ensureDirs = () => {
  ;[OUT, SHOT].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }) })
}

const safe = async fn => { try { return await fn() } catch (e) { return null } }

const tryClick = async (page, selector, timeout = 3000) => {
  try {
    const target = page.locator(selector).first()
    await target.waitFor({ state: 'visible', timeout })
    await target.click({ timeout })
    return true
  } catch { return false }
}

/** 给 page 挂载一次采集器，返回 reset/collect */
const attachCollectors = page => {
  let consoleErrors = []
  let pageErrors = []
  let failedApis = []
  const onConsole = msg => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // 过滤 Vite 自身的 deprecation / sourcemap 噪音
      if (/legacy-js-api|DeprecationWarning|favicon|source map/i.test(text)) return
      consoleErrors.push(text.slice(0, 240))
    }
  }
  const onPageError = err => { pageErrors.push((err.message || String(err)).slice(0, 240)) }
  const onResponse = res => {
    const url = res.url()
    if (url.includes('/api/')) {
      const s = res.status()
      if (s >= 400) failedApis.push({ url: url.split('?')[0].slice(-90), status: s })
    }
  }
  const onFailed = req => {
    const url = req.url()
    if (url.includes('/api/')) failedApis.push({ url: url.split('?')[0].slice(-90), status: 'failed' })
  }
  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  page.on('response', onResponse)
  page.on('requestfailed', onFailed)
  return {
    reset: () => { consoleErrors = []; pageErrors = []; failedApis = [] },
    collect: () => ({ consoleErrors, pageErrors, failedApis })
  }
}

const loginAdmin = async (page, username) => {
  await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[placeholder="请输入用户名"]', { timeout: 15000 })
  await sleep(700)
  const captcha = page.locator('input[placeholder="请输入验证码"]')
  const val = await captcha.inputValue().catch(() => '')
  if (!val) { await safe(() => page.locator('.captcha').click()); await sleep(500) }
  await page.fill('input[placeholder="请输入用户名"]', username)
  await page.fill('input[placeholder="请输入密码"]', PASSWORD)
  await page.click('button:has-text("登 录")')
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), null, { timeout: 20000 })
  await sleep(1500)
}

const loginPc = async (page, username) => {
  await page.goto(`${PC}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[placeholder="请输入用户名"]', { timeout: 15000 })
  await page.fill('input[placeholder="请输入用户名"]', username)
  await page.fill('input[placeholder="请输入密码"]', PASSWORD)
  await page.click('button:has-text("登 录")')
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), null, { timeout: 20000 })
  await sleep(1200)
}

/** 通用安全交互集合（管理端风格） */
const interactAdmin = async (page, log) => {
  // 滚动
  await safe(() => page.mouse.wheel(0, 360)); await sleep(250)
  await safe(() => page.mouse.wheel(0, -360))
  // 查询 / 搜索 / 刷新 / 重置（安全）
  for (const txt of ['查询', '搜索', '刷新', '重置']) {
    const btn = page.locator(`button:has-text("${txt}")`).first()
    if (await safe(() => btn.isVisible({ timeout: 600 }))) {
      await safe(() => btn.click({ timeout: 2500 }))
      log.push(`点击[${txt}]`)
      await sleep(600)
      break
    }
  }
  // 切换 Tab
  const tabs = page.locator('.el-tabs__item')
  const tabCount = await tabs.count()
  if (tabCount > 1) {
    for (let i = 1; i < Math.min(tabCount, 4); i++) {
      await safe(() => tabs.nth(i).click({ timeout: 2000 }))
      log.push(`切换Tab[${i}]`)
      await sleep(500)
    }
  }
  // 翻到第 2 页再回来
  const p2 = page.locator('.el-pager .number:has-text("2")').first()
  if (await safe(() => p2.isVisible({ timeout: 600 }))) {
    await safe(() => p2.click({ timeout: 2000 })); log.push('翻页[2]'); await sleep(700)
    const p1 = page.locator('.el-pager .number:has-text("1")').first()
    await safe(() => p1.click({ timeout: 2000 })); await sleep(400)
  }
  // 查看/详情（打开只读弹窗后关闭）
  const view = page.locator('button:has-text("查看"), button:has-text("详情"), .el-table a:has-text("详情")').first()
  if (await safe(() => view.isVisible({ timeout: 600 }))) {
    await safe(() => view.click({ timeout: 2000 })); log.push('打开[详情]'); await sleep(700)
    await safe(() => page.keyboard.press('Escape')); await sleep(300)
  }
}

/** PC 商城安全交互 */
const interactPc = async (page, route, log) => {
  await safe(() => page.mouse.wheel(0, 500)); await sleep(300)
  await safe(() => page.mouse.wheel(0, -500))
  if (route.startsWith('/product/')) {
    const add = page.locator('button:has-text("加入购物车")').first()
    if (await safe(() => add.isVisible({ timeout: 1500 }))) {
      await safe(() => add.click({ timeout: 3000 })); log.push('加入购物车'); await sleep(700)
    }
  }
  if (route === '/order/list') {
    for (const t of ['待付款', '待发货', '已完成', '全部']) {
      const el = page.locator(`text=${t}`).first()
      if (await safe(() => el.isVisible({ timeout: 600 }))) { await safe(() => el.click({ timeout: 2000 })); log.push(`订单Tab[${t}]`); await sleep(500) }
    }
  }
  if (route === '/home') {
    const card = page.locator('.product-card, .goods-item, [class*="product"]').first()
    if (await safe(() => card.isVisible({ timeout: 1500 }))) { await safe(() => card.click({ timeout: 2000 })); log.push('点击商品卡'); await sleep(600); await page.goBack().catch(() => {}) }
  }
  if (route === '/category') {
    const cat = page.locator('.category-item, .cate-item, [class*="categor"]').first()
    if (await safe(() => cat.isVisible({ timeout: 1200 }))) { await safe(() => cat.click({ timeout: 2000 })); log.push('点击分类'); await sleep(500) }
  }
  if (route === '/user') {
    const item = page.locator('.user-menu-item, .menu-item, [class*="menu"]').first()
    if (await safe(() => item.isVisible({ timeout: 1200 }))) { await safe(() => item.click({ timeout: 2000 })); log.push('点击用户菜单'); await sleep(500); await page.goBack().catch(() => {}) }
  }
}

const probePage = async (page, base, frontend, route, title, opts = {}) => {
  const coll = opts.collectors
  coll.reset()
  const interactions = []
  const t0 = Date.now()
  let screenshot = ''
  let notes = ''
  let status = 'pass'

  try {
    if (!opts.custom) {
      await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {})
      await sleep(1400)

      const finalUrl = page.url()
      const pathname = new URL(finalUrl).pathname

      // 重定向判定
      if (pathname.includes('/login')) { status = 'fail'; notes = '被重定向到登录页（未登录或会话失效）' }
      else if (pathname.includes('/403')) {
        if (opts.expect403) { status = 'pass'; notes = '权限拦截生效（预期）' }
        else if (opts.expectDenied) { status = 'denied'; notes = '角色隔离：仅对应角色可访问（预期，非缺陷）' }
        else { status = 'fail'; notes = '被重定向到 403 无权限页' }
      }
      else {
        // 渲染判定：body 有实质文本
        const text = await safe(() => page.locator('body').innerText()) || ''
        if (text.length < 40) { status = 'fail'; notes = '页面渲染内容为空/未加载完成' }
      }
    }

    if (status !== 'fail' && status !== 'denied') {
      if (opts.runner) await opts.runner(page, interactions)
      else if (frontend === 'admin') await interactAdmin(page, interactions)
      else if (frontend === 'h5') await interactH5(page, route, interactions)
      else if (frontend === 'mini') await interactMini(page, route, interactions)
      else await interactPc(page, route, interactions)
      await sleep(500)
    }
  } catch (e) {
    status = 'fail'
    notes = `探针异常: ${(e.message || '').slice(0, 160)}`
  }

  const { consoleErrors, pageErrors, failedApis } = coll.collect()
  const durMs = Date.now() - t0

  // 截图（Windows 文件名非法字符统一替换）
  const shotFile = `${frontend}-${route.replace(/[\\/:*?"<>|]/g, '_') || 'root'}.png`
  try { await page.screenshot({ path: path.join(SHOT, shotFile), fullPage: false }); screenshot = shotFile } catch {}

  // 状态综合
  if (status === 'pass') {
    if (pageErrors.length) { status = 'fail'; notes = (notes ? notes + '；' : '') + `存在 ${pageErrors.length} 个页面 JS 异常` }
    else if (failedApis.some(f => f.status >= 500)) { status = 'fail'; notes = (notes ? notes + '；' : '') + '存在 5xx 接口失败' }
    else if (consoleErrors.length || failedApis.length) { status = 'warn'; notes = (notes ? notes + '；' : '') + `console.error×${consoleErrors.length} / 接口异常×${failedApis.length}` }
  }

  const rec = { frontend, route, title, status, durMs, consoleErrors, pageErrors, failedApis, interactions, screenshot, notes }
  results.push(rec)
  const tag = status === 'pass' ? 'PASS' : status === 'warn' ? 'WARN' : status === 'denied' ? 'DENIED' : 'FAIL'
  console.log(`[${tag}] ${frontend.padEnd(5)} ${route.padEnd(28)} ${title}  (${durMs}ms)${interactions.length ? '  ' + interactions.join(',') : ''}${notes ? '  — ' + notes : ''}`)
}

const runAdmin = async browser => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const coll = attachCollectors(page)
  try {
    await loginAdmin(page, 'admin')
    for (const [route, title] of ADMIN_PAGES) {
      const expectDenied = Boolean(ROLE_PERSONAL[route])
      await probePage(page, ADMIN, 'admin', route, title, { collectors: coll, expectDenied })
    }
  } finally {
    await ctx.close()
  }
}

const runPc = async browser => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const coll = attachCollectors(page)
  try {
    await loginPc(page, 'user1')
    for (const [route, title] of PC_PAGES) {
      await probePage(page, PC, 'pc', route, title, { collectors: coll })
    }
  } finally {
    await ctx.close()
  }
}

const runH5 = async browser => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  })
  const page = await ctx.newPage()
  const coll = attachCollectors(page)
  try {
    await loginH5(page)
    for (const [route, title] of H5_PAGES) {
      await probePage(page, H5, 'h5', route, title, { collectors: coll })
    }
    // 完整下单支付流程（单独一条，含真实写操作）
    await probePage(page, H5, 'h5', 'flow:下单支付', '完整下单支付流程', {
      collectors: coll,
      custom: true,
      runner: h5Flow
    })
  } finally {
    await ctx.close()
  }
}

/** 小程序端：Taro H5 产物（微信开发者工具不可用，故以同源 React 页面在浏览器验证） */
const runMini = async browser => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  })
  const page = await ctx.newPage()
  const coll = attachCollectors(page)
  try {
    await page.goto(MINI, { waitUntil: 'domcontentloaded', timeout: 40000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await sleep(2000)
    const url = page.url()
    const hashMode = url.includes('#/')
    console.log(`小程序路由模式：${hashMode ? 'hash' : 'browser'}（${url}）`)
    for (const [route, title] of MINI_PAGES) {
      const target = hashMode ? `/#/${route}` : `/${route}`
      await probePage(page, MINI, 'mini', target, title, { collectors: coll })
    }
  } finally {
    await ctx.close()
  }
}

/** 权限校验：低权限角色访问受限页面应被 403 拦截 */
const runPermCheck = async browser => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const coll = attachCollectors(page)
  try {
    await loginAdmin(page, 'distributor_chen') // 分销商：无 system:user 权限
    await probePage(page, ADMIN, 'perm', '/system/user', '用户管理(分销商应被拒)', { collectors: coll, expect403: true })
  } finally {
    await ctx.close()
  }
}

/** 用对应角色实测角色个人工作台，确认可正常渲染与交互 */
const runRolePages = async browser => {
  const groups = [
    { account: 'distributor_chen', pages: [
      ['/distributor/selection', '选品中心(分销商)'],
      ['/distributor/shares', '我的分享(分销商)'],
      ['/distributor/orders', '推广与佣金(分销商)']
    ] },
    { account: 'fulishe_admin', pages: [
      ['/merchant/profile', '商户资料(商户管理员)']
    ] }
  ]
  for (const g of groups) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const coll = attachCollectors(page)
    try {
      await loginAdmin(page, g.account)
      for (const [route, title] of g.pages) {
        await probePage(page, ADMIN, 'role', route, title, { collectors: coll })
      }
    } finally {
      await ctx.close()
    }
  }
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const writeReport = () => {
  const pass = results.filter(r => r.status === 'pass').length
  const warn = results.filter(r => r.status === 'warn').length
  const fail = results.filter(r => r.status === 'fail').length
  const denied = results.filter(r => r.status === 'denied').length
  const total = results.length

  // Markdown
  let md = `# 福礼社平台 页面自动交互测试报告\n\n`
  md += `- 生成时间：${stamp()}\n`
  md += `- 测试范围：管理端(3100) ${ADMIN_PAGES.length} 页（超管全量遍历 + 4 个角色个人工作台用对应角色实测） + PC 商城(3101) ${PC_PAGES.length} 页 + H5(3001) ${H5_PAGES.length} 页 + 小程序(Taro H5 产物,10086) ${MINI_PAGES.length} 页 + H5 完整下单支付流程 + 权限校验 1 项\n`
  md += `- 小程序说明：微信开发者工具 CLI 不可用，小程序端以 Taro 编译出的 H5 产物在移动端视口验证同一套 React 页面逻辑\n`
  md += `- 交互方式：真实浏览器(Playwright + 系统 Chrome)，仅执行查询/Tab 切换/翻页/查看详情/滚动等只读安全操作；H5 下单支付流程为唯一真实写操作\n`
  md += `- 结果汇总：**通过 ${pass} / 告警 ${warn} / 失败 ${fail} / 角色隔离(预期拒绝) ${denied}**（共 ${total}）\n\n`

  md += `## 汇总\n\n| 前端 | 页面 | 状态 | 耗时 | 交互动作 | 备注 |\n|---|---|---|---|---|---|\n`
  for (const r of results) {
    md += `| ${r.frontend} | ${r.title} \`${r.route}\` | ${r.status.toUpperCase()} | ${r.durMs}ms | ${esc(r.interactions.join('、'))} | ${esc(r.notes)} |\n`
  }

  const detail = r => {
    let s = `### ${r.frontend} · ${r.title} \`${r.route}\` — ${r.status.toUpperCase()}\n\n`
    s += `- 耗时：${r.durMs}ms  ｜ 交互：${r.interactions.join('、') || '无'}\n`
    if (r.notes) s += `- 备注：${r.notes}\n`
    if (r.screenshot) s += `- 截图：![${r.title}](./screenshots/${r.screenshot})\n`
    if (r.pageErrors.length) s += `- 页面异常：\n${r.pageErrors.map(e => '  - ' + esc(e)).join('\n')}\n`
    if (r.consoleErrors.length) s += `- console.error：\n${r.consoleErrors.slice(0, 8).map(e => '  - ' + esc(e)).join('\n')}\n`
    if (r.failedApis.length) s += `- 异常接口：\n${r.failedApis.map(f => `  - ${f.status} ${esc(f.url)}`).join('\n')}\n`
    return s + '\n'
  }
  md += `\n## 失败详情\n\n${results.filter(r => r.status === 'fail').map(detail).join('') || '无'}\n`
  md += `\n## 角色隔离（预期拒绝，非缺陷）\n\n${results.filter(r => r.status === 'denied').map(detail).join('') || '无'}\n`
  md += `\n## 告警详情\n\n${results.filter(r => r.status === 'warn').map(detail).join('') || '无'}\n`
  md += `\n## 通过详情\n\n${results.filter(r => r.status === 'pass').map(detail).join('') || '无'}\n`

  fs.writeFileSync(path.join(OUT, '页面交互测试报告.md'), md, 'utf8')

  // HTML（单文件，截图相对路径）
  const row = r => `<tr class="${r.status}">
    <td>${esc(r.frontend)}</td><td>${esc(r.title)}<br><code>${esc(r.route)}</code></td>
    <td><span class="badge ${r.status}">${r.status.toUpperCase()}</span></td>
    <td>${r.durMs}ms</td><td>${esc(r.interactions.join('、'))}</td><td>${esc(r.notes)}</td>
    <td>${r.screenshot ? `<a href="./screenshots/${r.screenshot}" target="_blank">截图</a>` : ''}</td></tr>`
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>福礼社 页面交互测试报告</title>
<style>
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:24px;color:#1f2937}
h1{font-size:22px}h2{font-size:18px;margin-top:28px;border-left:4px solid #2563eb;padding-left:10px}
.summary{display:flex;gap:12px;margin:16px 0}
.summary div{padding:10px 18px;border-radius:8px;color:#fff;font-weight:600}
.pass{background:#10b981}.warn{background:#f59e0b}.fail{background:#ef4444}.denied{background:#6366f1}.total{background:#374151}
table{border-collapse:collapse;width:100%;font-size:13px;margin-top:10px}
th,td{border:1px solid #e5e7eb;padding:7px 9px;text-align:left;vertical-align:top}
th{background:#f9fafb}code{background:#f3f4f6;padding:1px 5px;border-radius:3px;font-size:11px}
.badge{padding:2px 9px;border-radius:10px;color:#fff;font-size:11px}
tr.pass td:nth-child(3){background:#ecfdf5}tr.warn{background:#fffbeb}tr.fail{background:#fef2f2}tr.denied{background:#eef2ff}
.meta{color:#6b7280;font-size:13px}
</style></head><body>
<h1>福礼社平台 · 页面自动交互测试报告</h1>
<p class="meta">生成时间：${stamp()} ｜ 管理端 3100 + PC 商城 3101 ｜ 仅只读安全交互</p>
<div class="summary">
<div class="pass">通过 ${pass}</div><div class="warn">告警 ${warn}</div><div class="fail">失败 ${fail}</div><div class="denied">角色隔离 ${denied}</div><div class="total">合计 ${total}</div>
</div>
<p class="meta">未覆盖：微信原生小程序真机（开发者工具 CLI 不可用，已用 Taro H5 产物验证）。截图见 screenshots/ 目录，点击"截图"查看。</p>
<h2>明细</h2>
<table><thead><tr><th>前端</th><th>页面</th><th>状态</th><th>耗时</th><th>交互动作</th><th>备注</th><th>证据</th></tr></thead>
<tbody>${results.map(row).join('')}</tbody></table>
</body></html>`
  fs.writeFileSync(path.join(OUT, '页面交互测试报告.html'), html, 'utf8')

  console.log(`\n==== 汇总：通过 ${pass} / 告警 ${warn} / 失败 ${fail} / 角色隔离(预期) ${denied} / 共 ${total} ====`)
  console.log(`报告：${path.join(OUT, '页面交互测试报告.md')}`)
  console.log(`    ：${path.join(OUT, '页面交互测试报告.html')}`)
  if (fail) process.exitCode = 1
}

const main = async () => {
  ensureDirs()
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    if (!ONLY || ONLY === 'admin') await runAdmin(browser)
    if (!ONLY || ONLY === 'role') await runRolePages(browser)
    if (!ONLY || ONLY === 'pc') await runPc(browser)
    if (!ONLY || ONLY === 'h5') await runH5(browser)
    if (!ONLY || ONLY === 'mini') await runMini(browser)
    if (!ONLY || ONLY === 'perm') await runPermCheck(browser)
  } finally {
    await browser.close()
  }
  writeReport()
}

main().catch(e => { console.error('巡检脚本异常:', e); process.exitCode = 1 })

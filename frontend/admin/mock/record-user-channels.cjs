/**
 * 普通用户端三渠道工作流录屏
 *
 * 分别录制同一普通用户（user1）在以下三端的关键操作，文件名与操作一一对应：
 *   08-PC端-普通用户-浏览下单支付售后.webm        (PC 商城 3101，桌面 1440x900)
 *   09-公众号端-普通用户-浏览下单支付售后.webm    (公众号由 H5 承载，3001，移动 390x844)
 *   10-小程序端-普通用户-浏览下单支付售后.webm    (小程序 Taro H5 构建预览，3002，移动 390x844)
 *
 * 前置：Mock(8080)、PC(3101)、H5(3001) 已启动；小程序 H5 预览服务(3002) 可选。
 * 运行：node mock/record-user-channels.cjs
 * 可用 ONLY=pc|mp|mini 只录某一段。
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require(path.join(__dirname, '..', 'node_modules', 'playwright'))

const PC = 'http://127.0.0.1:3101'
const MP = 'http://127.0.0.1:3001'
const MINI = 'http://127.0.0.1:3002'
const OUT = path.join(__dirname, '..', '..', '..', 'docs', 'recordings')
const ONLY = process.env.ONLY || ''
const PASSWORD = '123456'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const ensureOut = () => { if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true }) }

const tryClick = async (page, selector, timeout = 3000) => {
  try {
    const target = page.locator(selector).first()
    await target.waitFor({ state: 'visible', timeout })
    await target.click({ timeout })
    return true
  } catch {
    return false
  }
}

const visit = async (page, base, route, wait = 1600, scroll = 400) => {
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await sleep(wait)
  if (scroll) {
    await page.mouse.move(200, 400)
    await page.mouse.wheel(0, scroll).catch(() => {})
    await sleep(500)
    await page.mouse.wheel(0, -scroll * 0.6).catch(() => {})
  }
}

const record = async (browser, name, viewport, runner) => {
  if (ONLY && !name.includes(ONLY)) return
  const rec = await browser.newContext({ viewport, recordVideo: { dir: OUT, size: viewport } })
  const page = await rec.newPage()
  const video = page.video()
  try {
    await runner(page)
    await rec.close()
    const source = await video.path()
    const target = path.join(OUT, `${name}.webm`)
    if (fs.existsSync(target)) fs.unlinkSync(target)
    fs.renameSync(source, target)
    results.push({ name, ok: true })
    console.log(`PASS  ${name}`)
  } catch (error) {
    await rec.close().catch(() => {})
    results.push({ name, ok: false, error: error.message })
    console.log(`FAIL  ${name} — ${error.message}`)
  }
}

/* PC 端：登录 → 首页 → 详情 → 加购 → 购物车 → 结算 → 下单 → 支付 → 订单 */
const pcFlow = async page => {
  await page.goto(`${PC}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[placeholder="请输入用户名"]', { timeout: 15000 })
  await page.fill('input[placeholder="请输入用户名"]', 'user1')
  await page.fill('input[placeholder="请输入密码"]', PASSWORD)
  await page.click('button:has-text("登 录")')
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), null, { timeout: 20000 })
  await sleep(1400)
  await visit(page, PC, '/home', 2400, 620)
  await visit(page, PC, '/product/1', 2000, 520)
  await tryClick(page, 'button:has-text("加入购物车")', 4000)
  await sleep(1000)
  await visit(page, PC, '/cart', 1700, 300)
  await tryClick(page, 'button:has-text("去结算")', 4000)
  await sleep(1800)
  await page.mouse.wheel(0, 420).catch(() => {})
  await sleep(600)
  await tryClick(page, 'button:has-text("提交订单")', 5000)
  await sleep(2200)
  await tryClick(page, 'button:has-text("确认支付")', 5000)
  await sleep(2400)
  await visit(page, PC, '/order/list', 2000, 420)
}

/* 公众号（H5）端：首页 → 详情 → 加购 → 购物车 → 结算 → 下单 → 支付 → 订单 */
const mpFlow = async page => {
  await page.goto(`${MP}/home`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { localStorage.setItem('userId', '4') })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await sleep(1800)
  await page.mouse.move(180, 400)
  await page.mouse.wheel(0, 560).catch(() => {})
  await sleep(700)
  await page.mouse.wheel(0, -400).catch(() => {})
  await sleep(500)
  await visit(page, MP, '/product/1', 1700, 520)
  await tryClick(page, 'button:has-text("加入购物车")', 4000)
  await sleep(1000)
  await visit(page, MP, '/cart', 1600, 260)
  await tryClick(page, 'button:has-text("去结算")', 4000)
  await sleep(1800)
  await page.mouse.wheel(0, 400).catch(() => {})
  await sleep(600)
  await tryClick(page, 'button:has-text("提交订单")', 5000)
  await sleep(2200)
  await tryClick(page, 'button:has-text("确认支付")', 5000)
  await sleep(2400)
  await visit(page, MP, '/order/list', 1800, 360)
}

/* 小程序（Taro H5 预览）：首页 → 详情 → 购物车 → 订单 */
const miniFlow = async page => {
  await page.goto(`${MINI}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { localStorage.setItem('userId', '4') })
  await sleep(2600)
  await page.mouse.move(180, 380)
  await page.mouse.wheel(0, 560).catch(() => {})
  await sleep(800)
  await page.mouse.wheel(0, -380).catch(() => {})
  await sleep(500)
  // 点击第一个商品卡片进入详情
  await tryClick(page, '[class*="productCard"], [class*="ProductCard"], [class*="goods"]', 3000)
  await sleep(2200)
  await page.mouse.wheel(0, 480).catch(() => {})
  await sleep(900)
  await page.mouse.wheel(0, -280).catch(() => {})
  await sleep(600)
}

const main = async () => {
  ensureOut()
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  await record(browser, '08-PC端-普通用户-浏览下单支付售后', { width: 1440, height: 900 }, pcFlow)
  await record(browser, '09-公众号端-普通用户-浏览下单支付售后', { width: 390, height: 844 }, mpFlow)
  await record(browser, '10-小程序端-普通用户-浏览下单支付售后', { width: 390, height: 844 }, miniFlow)
  await browser.close()

  const failed = results.filter(r => !r.ok)
  console.log(`\n三端录屏：${results.length - failed.length} 成功 / ${failed.length} 失败`)
  failed.forEach(r => console.log(`  - ${r.name}: ${r.error}`))
  console.log(`输出目录：${OUT}`)
  if (failed.length) process.exitCode = 1
}

main().catch(error => { console.error('录屏异常:', error.message); process.exitCode = 1 })

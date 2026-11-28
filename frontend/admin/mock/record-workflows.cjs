/**
 * 角色工作流录屏
 *
 * 使用 Playwright 为 7 类角色录制真实界面操作，输出 webm 到 docs/recordings/。
 * 文件名与角色/操作范围一一对应，便于直接作为交付物演示。
 *
 * 前置：Mock API(8080)、管理端(3100)、PC 商城(3101) 已启动。
 * 运行：node mock/record-workflows.cjs
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require(path.join(__dirname, '..', 'node_modules', 'playwright'))

const ADMIN = 'http://localhost:3100'
// 3101 上的 Vite 绑定在 IPv4，localhost 可能被其它预览服务占用，固定用 127.0.0.1
const PC = 'http://127.0.0.1:3101'
const OUT = path.join(__dirname, '..', '..', '..', 'docs', 'recordings')
const PASSWORD = '123456'
const ONLY_ROLE = process.env.ONLY_ROLE || ''

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const results = []

const ensureOut = () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
}

const startRecording = async (browser, name) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT, size: { width: 1440, height: 900 } }
  })
  const page = await context.newPage()
  return { context, page, video: page.video(), name }
}

const finishRecording = async rec => {
  await rec.context.close()
  if (!rec.video) return
  const source = await rec.video.path()
  const target = path.join(OUT, `${rec.name}.webm`)
  if (fs.existsSync(target)) fs.unlinkSync(target)
  fs.renameSync(source, target)
  return target
}

const tryClick = async (page, selector, timeout = 2500) => {
  try {
    const target = page.locator(selector).first()
    await target.waitFor({ state: 'visible', timeout })
    await target.click({ timeout })
    return true
  } catch (error) {
    return false
  }
}

const visit = async (page, base, route, wait = 1600) => {
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await sleep(wait)
  await page.mouse.move(720, 420)
  await page.mouse.wheel(0, 260).catch(() => {})
  await sleep(320)
  await page.mouse.wheel(0, -260).catch(() => {})
}

const loginAdmin = async (page, username) => {
  await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[placeholder="请输入用户名"]', { timeout: 15000 })
  await sleep(600)
  // 验证码由页面自动获取；若为空则点击刷新
  const captcha = page.locator('input[placeholder="请输入验证码"]')
  const value = await captcha.inputValue().catch(() => '')
  if (!value) {
    await tryClick(page, '.captcha')
    await sleep(500)
  }
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
  await sleep(1500)
}

const recordRole = async (browser, name, runner) => {
  if (ONLY_ROLE && !name.includes(ONLY_ROLE)) return
  const rec = await startRecording(browser, name)
  try {
    await runner(rec.page)
    const file = await finishRecording(rec)
    results.push({ name, ok: true, file })
    console.log(`PASS  ${name} → ${file}`)
  } catch (error) {
    await finishRecording(rec).catch(() => {})
    results.push({ name, ok: false, error: error.message })
    console.log(`FAIL  ${name} — ${error.message}`)
  }
}

const main = async () => {
  ensureOut()
  const browser = await chromium.launch({ channel: 'chrome', headless: true })

  /* 1. 超级管理员 */
  await recordRole(browser, '01-超级管理员-平台初始化和系统管理', async page => {
    await loginAdmin(page, 'admin')
    await visit(page, ADMIN, '/dashboard', 2200)
    await visit(page, ADMIN, '/system/user', 1600)
    await tryClick(page, 'button:has-text("查询")')
    await sleep(900)
    await tryClick(page, 'button:has-text("新增")', 3000)
    await sleep(1500)
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(500)
    await visit(page, ADMIN, '/system/role', 1600)
    await visit(page, ADMIN, '/system/menu', 1600)
    await visit(page, ADMIN, '/system/tenant', 1600)
    await visit(page, ADMIN, '/system/backup', 2000)
    await tryClick(page, 'button:has-text("立即备份")', 4000)
    await sleep(700)
    const label = page.locator('.el-message-box__input input')
    if (await label.count()) await label.fill('录屏演示 · 手动备份')
    await tryClick(page, '.el-message-box__btns button:has-text("开始备份")', 4000)
    await sleep(1500)
    await page.mouse.wheel(0, 420)
    await sleep(1200)
  })

  /* 2. 商户管理员 */
  await recordRole(browser, '02-商户管理员-商户工作台和商品订单财务', async page => {
    await loginAdmin(page, 'fulishe_admin')
    await visit(page, ADMIN, '/merchant/dashboard', 2400)
    await visit(page, ADMIN, '/product/spu', 1800)
    await tryClick(page, 'button:has-text("查询")')
    await sleep(900)
    await tryClick(page, 'button:has-text("新增")', 3000)
    await sleep(1600)
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(500)
    await page.locator('.el-table__row').first().hover().catch(() => {})
    await sleep(600)
    await visit(page, ADMIN, '/order/list', 1800)
    await tryClick(page, 'button:has-text("查询")')
    await sleep(800)
    await visit(page, ADMIN, '/pay/record', 1600)
    await visit(page, ADMIN, '/pay/refund', 1600)
    await visit(page, ADMIN, '/pay/invoice', 1600)
    await visit(page, ADMIN, '/supply/purchase', 1600)
    await visit(page, ADMIN, '/supply/inventory', 1600)
    await visit(page, ADMIN, '/supply/settlement', 1600)
  })

  /* 3. 采购专员 */
  await recordRole(browser, '03-采购专员-供应商和采购入库', async page => {
    await loginAdmin(page, 'zhangsan')
    await visit(page, ADMIN, '/supply/purchase', 2200)
    await tryClick(page, 'button:has-text("查询")')
    await sleep(900)
    await tryClick(page, 'button:has-text("新增")', 3000)
    await sleep(1600)
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(500)
    await visit(page, ADMIN, '/supply/supplier', 1700)
    await tryClick(page, 'button:has-text("查询")')
    await sleep(800)
    await visit(page, ADMIN, '/supply/inventory', 1700)
    await visit(page, ADMIN, '/supply/shipment', 1600)
    await visit(page, ADMIN, '/supply/settlement', 1600)
  })

  /* 4. 供应商 */
  await recordRole(browser, '04-供应商-采购接单发货和对账', async page => {
    await loginAdmin(page, 'supplier_fuli')
    await visit(page, ADMIN, '/supply/purchase', 2400)
    await tryClick(page, 'button:has-text("查询")')
    await sleep(900)
    await visit(page, ADMIN, '/supply/supplier', 1700)
    await visit(page, ADMIN, '/supply/settlement', 1700)
    await page.mouse.wheel(0, 360)
    await sleep(1100)
  })

  /* 5. 运营专员 */
  await recordRole(browser, '05-运营专员-商品订单和分销运营', async page => {
    await loginAdmin(page, 'fulishe_operator')
    await visit(page, ADMIN, '/product/spu', 2200)
    await tryClick(page, 'button:has-text("查询")')
    await sleep(900)
    await tryClick(page, 'button:has-text("新增")', 3000)
    await sleep(1500)
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(500)
    await visit(page, ADMIN, '/order/list', 1700)
    await visit(page, ADMIN, '/distribution/rules', 1700)
    await visit(page, ADMIN, '/distribution/orders', 1700)
    await visit(page, ADMIN, '/pay/invoice', 1700)
  })

  /* 6. 分销商 */
  await recordRole(browser, '06-分销商-选品分享和佣金', async page => {
    await loginAdmin(page, 'distributor_chen')
    await visit(page, ADMIN, '/distributor/selection', 2400)
    await page.mouse.wheel(0, 320)
    await sleep(1100)
    await visit(page, ADMIN, '/distributor/shares', 1700)
    await visit(page, ADMIN, '/distributor/orders', 1700)
    await page.mouse.wheel(0, 320)
    await sleep(1100)
  })

  /* 7. 普通用户 */
  await recordRole(browser, '07-普通用户-商城浏览下单支付和售后', async page => {
    await loginPc(page, 'user1')
    await visit(page, PC, '/home', 2600)
    await page.mouse.wheel(0, 600)
    await sleep(1200)
    await page.mouse.wheel(0, -600)
    await visit(page, PC, '/product/1', 2200)
    await page.mouse.wheel(0, 520)
    await sleep(900)
    await tryClick(page, 'button:has-text("加入购物车")', 4000)
    await sleep(1000)
    await visit(page, PC, '/cart', 1800)
    await tryClick(page, 'button:has-text("去结算")', 4000)
    await sleep(1800)
    await page.mouse.wheel(0, 420)
    await sleep(700)
    await tryClick(page, 'button:has-text("提交订单")', 5000)
    await sleep(2200)
    await tryClick(page, 'button:has-text("确认支付")', 5000)
    await sleep(2600)
    await visit(page, PC, '/order/list', 2000)
    await page.mouse.wheel(0, 420)
    await sleep(1200)
  })

  await browser.close()

  const failed = results.filter(item => !item.ok)
  console.log(`\n录屏完成：${results.length - failed.length} 成功 / ${failed.length} 失败`)
  failed.forEach(item => console.log(`  - ${item.name}: ${item.error}`))
  console.log(`输出目录：${OUT}`)
  if (failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error('录屏脚本异常:', error.message)
  process.exitCode = 1
})

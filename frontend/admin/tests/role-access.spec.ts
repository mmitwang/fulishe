import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

interface AuthSession {
  token: string
  refreshToken: string
  userInfo: {
    merchantId: number | null
    roleCodes: string[]
    [key: string]: unknown
  }
}

const requestLogin = async (page: Page, username: string): Promise<AuthSession> => {
  const response = await page.request.post('/api/user/auth/login', {
    data: { username, password: '123456' }
  })
  expect(response.status()).toBe(200)
  const payload = await response.json()
  expect(payload.code).toBe(200)
  return payload.data
}

const installSession = async (page: Page, session: AuthSession) => {
  await page.goto('/login')
  await page.evaluate(() => localStorage.removeItem('fulishe-auth'))
  await page.reload()
  await page.evaluate((auth: AuthSession) => {
    localStorage.setItem('fulishe-auth', JSON.stringify({
      token: auth.token,
      refreshToken: auth.refreshToken,
      userInfo: auth.userInfo
    }))
  }, session)
}

const loginAs = async (page: Page, username: string) => {
  const session = await requestLogin(page, username)
  await installSession(page, session)
  return session
}

const authHeaders = (session: AuthSession) => ({ Authorization: `Bearer ${session.token}` })

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message))
  page.on('console', message => {
    if (message.type() === 'error') console.error('BROWSER ERROR:', message.text())
  })
})

test('系统管理员通过真实登录进入平台看板', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[placeholder="请输入用户名"]', 'admin')
  await page.fill('input[placeholder="请输入密码"]', '123456')
  const captcha = (await page.locator('.captcha').innerText()).trim()
  await page.fill('input[placeholder="请输入验证码"]', captcha)
  await page.locator('.login-btn').click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.locator('.side-menu')).toContainText('系统管理')
  await expect(page.locator('.user-info')).toContainText('超级管理员')
  await expect(page.locator('.main')).toContainText('待审核商户')
  await expect(page.locator('.main')).toContainText('待处理售后')
})

test('商户只看到授权菜单，直接访问系统管理进入 403，结算只读', async ({ page }) => {
  await loginAs(page, 'fulishe_admin')
  await page.goto('/merchant/dashboard')

  await expect(page).toHaveURL(/\/merchant\/dashboard$/)
  await expect(page.locator('.merchant-dashboard')).toContainText('福礼社运营中心')
  await expect(page.locator('.side-menu')).toContainText('商品管理')
  await expect(page.locator('.side-menu')).not.toContainText('系统管理')

  await page.goto('/system/tenant')
  await expect(page).toHaveURL(/\/403/)
  await expect(page.locator('.forbidden-card')).toContainText('暂无访问权限')
  await page.getByRole('button', { name: '返回我的工作台' }).click()
  await expect(page).toHaveURL(/\/merchant\/dashboard$/)

  await page.goto('/supply/settlement')
  await expect(page.locator('.settlement-page')).toContainText('商户可查看本商户结算单')
  await expect(page.getByRole('button', { name: '确认结算' })).toHaveCount(0)
  await expect(page.locator('.settlement-page')).toContainText('商户只读')
})

test('商户 A/B 商品接口和页面均隔离，切换账号不串缓存', async ({ page }) => {
  const sessionA = await loginAs(page, 'fulishe_admin')
  const responseA = await page.request.get('/api/admin/product/spu/page?size=100', { headers: authHeaders(sessionA) })
  const payloadA = await responseA.json()
  expect(payloadA.data.records.length).toBeGreaterThan(0)
  expect(payloadA.data.records.every((item: any) => item.merchantId === 2)).toBe(true)

  await page.goto('/product/spu')
  await expect(page.locator('.el-table__row').first()).toBeVisible()
  await expect(page.locator('.el-table')).toContainText('福礼社运营中心')
  await expect(page.locator('.el-table')).not.toContainText('新春礼品有限公司')

  const sessionB = await loginAs(page, 'xinchun_admin')
  const responseB = await page.request.get('/api/admin/product/spu/page?size=100', { headers: authHeaders(sessionB) })
  const payloadB = await responseB.json()
  expect(payloadB.data.records.length).toBeGreaterThan(0)
  expect(payloadB.data.records.every((item: any) => item.merchantId === 3)).toBe(true)

  await page.goto('/product/spu')
  await expect(page.locator('.el-table__row').first()).toBeVisible()
  await expect(page.locator('.el-table')).toContainText('新春礼品有限公司')
  await expect(page.locator('.el-table')).not.toContainText('福礼社运营中心')
})

test('商户联系资料保存后刷新仍保持，审核字段不可编辑', async ({ page }) => {
  await loginAs(page, 'fulishe_admin')
  await page.goto('/merchant/profile')

  const contactInput = page.locator('input[placeholder="请输入联系人"]')
  await expect(contactInput).toBeVisible()
  await contactInput.fill('角色验收联系人')
  await expect(page.locator('input[disabled]').first()).toBeDisabled()
  await page.getByRole('button', { name: '保存资料' }).click()
  await expect(page.locator('.el-message').last()).toContainText('商户联系资料已保存')

  await page.reload()
  await expect(page.locator('input[placeholder="请输入联系人"]')).toHaveValue('角色验收联系人')
  await expect(page.locator('.merchant-profile')).toContainText('审核通过')
})

test('商户售后审核保存真实 Mock 记录，不宣称实际退款', async ({ page }) => {
  await loginAs(page, 'xinchun_admin')
  await page.goto('/pay/refund')

  const auditButton = page.getByRole('button', { name: '审核', exact: true }).first()
  await expect(auditButton).toBeVisible()
  await auditButton.click()
  const opinion = `UI角色验收-${Date.now()}`
  await page.fill('textarea[placeholder="请输入审核意见"]', opinion)
  await page.getByRole('button', { name: '保存审核结果' }).click()
  await page.locator('.el-message-box__btns').getByRole('button', { name: '确认保存' }).click()

  await expect(page.locator('.el-message').last()).toContainText('未执行实际退款')
  await expect(page.locator('.el-table')).toContainText(opinion)
  await expect(page.locator('.refund-record')).toContainText('不会变更退款状态或执行真实退款')
})

test('角色撤权同时影响菜单、路由和 API，恢复后权限还原', async ({ page }) => {
  const admin = await requestLogin(page, 'admin')
  const merchant = await requestLogin(page, 'fulishe_admin')
  const menuResponse = await page.request.get('/api/user/role/2/menus', { headers: authHeaders(admin) })
  const menuPayload = await menuResponse.json()
  const originalMenus: number[] = menuPayload.data

  const revokeResponse = await page.request.put('/api/user/role/2/menus', {
    headers: authHeaders(admin),
    data: { menuIds: originalMenus.filter(id => Number(id) !== 3) }
  })
  expect(revokeResponse.status()).toBe(200)

  try {
    await installSession(page, merchant)
    await page.goto('/merchant/dashboard')
    await expect(page.locator('.side-menu')).not.toContainText('商品管理')

    await page.goto('/product/spu')
    await expect(page).toHaveURL(/\/403/)
    await expect(page.locator('.forbidden-card')).toBeVisible()

    const forbiddenResponse = await page.request.get('/api/admin/product/spu/page', { headers: authHeaders(merchant) })
    expect(forbiddenResponse.status()).toBe(403)
  } finally {
    const restoreResponse = await page.request.put('/api/user/role/2/menus', {
      headers: authHeaders(admin),
      data: { menuIds: originalMenus }
    })
    expect(restoreResponse.status()).toBe(200)
  }

  await page.reload()
  await page.goto('/merchant/dashboard')
  await expect(page.locator('.side-menu')).toContainText('商品管理')
})

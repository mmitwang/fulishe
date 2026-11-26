import { test, expect } from '@playwright/test'

const setMockAuth = async (page: any) => {
  await page.evaluate(() => {
    localStorage.setItem('fulishe-auth', JSON.stringify({
      token: 'mock-token-12345',
      userInfo: {
        id: 1,
        tenantId: 1,
        username: 'admin',
        nickname: '管理员',
        realName: '管理员',
        avatar: '',
        mobile: '13800138000',
        userType: 1,
        deptName: '技术部'
      }
    }))
  })
}

test.describe('登录页面测试', () => {
  test('页面加载正常', async ({ page }) => {
    await page.goto('/login')
    await page.waitForTimeout(500)
    await expect(page.locator('h2.title')).toHaveText('管理后台登录')
  })

  test('输入框验证', async ({ page }) => {
    await page.goto('/login')
    await page.waitForTimeout(500)
    
    await page.click('button:has-text("登 录")')
    await page.waitForTimeout(500)
    
    await expect(page.locator('.el-form-item__error:has-text("请输入用户名")')).toBeVisible()
    await expect(page.locator('.el-form-item__error:has-text("请输入密码")')).toBeVisible()
    await expect(page.locator('.el-form-item__error:has-text("请输入验证码")')).toBeVisible()
  })

  test('验证码刷新功能', async ({ page }) => {
    await page.goto('/login')
    await page.waitForTimeout(500)
    
    const initialCaptcha = await page.locator('.captcha').textContent()
    await page.click('.captcha')
    await page.waitForTimeout(300)
    const newCaptcha = await page.locator('.captcha').textContent()
    
    expect(newCaptcha).not.toBe(initialCaptcha)
  })
})

test.describe('用户管理页面测试', () => {
  test('打开新增用户弹窗', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)
    
    await page.click('.table-toolbar .el-button:has-text("新增用户")')
    await page.waitForTimeout(500)
    
    await expect(page.locator('.el-dialog__title')).toHaveText('新增用户')
  })

  test('重置查询条件', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)
    
    await page.fill('input[placeholder="请输入用户名"]', 'test')
    await page.click('button:has-text("重置")')
    await page.waitForTimeout(500)
    
    const inputValue = await page.locator('input[placeholder="请输入用户名"]').inputValue()
    expect(inputValue).toBe('')
  })

  test('查询功能', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)
    
    await page.fill('input[placeholder="请输入用户名"]', 'admin')
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(500)
    
    await expect(page.locator('.el-table')).toBeVisible()
  })

  test('分页功能', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)
    
    await expect(page.locator('.el-pagination')).toBeVisible()
  })
})

test.describe('租户管理页面测试', () => {
  test('打开新增租户弹窗', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/tenant')
    await page.waitForTimeout(1000)
    
    await page.click('.table-toolbar .el-button:has-text("新增租户")')
    await page.waitForTimeout(500)
    
    await expect(page.locator('.el-dialog__title')).toHaveText('新增租户')
  })

  test('查询功能', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/tenant')
    await page.waitForTimeout(1000)
    
    await page.fill('input[placeholder="请输入租户名称"]', '测试')
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(500)
    
    await expect(page.locator('.el-table')).toBeVisible()
  })
})

test.describe('部门管理页面测试', () => {
  test('打开新增部门弹窗', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/dept')
    await page.waitForTimeout(1000)
    
    await page.click('.table-toolbar .el-button:has-text("新增部门")')
    await page.waitForTimeout(500)
    
    await expect(page.locator('.el-dialog__title')).toHaveText(/新增/)
  })

  test('树形结构显示', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/dept')
    await page.waitForTimeout(1000)
    
    await expect(page.locator('.el-tree')).toBeVisible()
  })
})

test.describe('角色管理页面测试', () => {
  test('打开新增角色弹窗', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/role')
    await page.waitForTimeout(1000)
    
    await page.click('.table-toolbar .el-button:has-text("新增角色")')
    await page.waitForTimeout(500)
    
    await expect(page.locator('.el-dialog__title')).toHaveText('新增角色')
  })

  test('查询功能', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/role')
    await page.waitForTimeout(1000)
    
    await page.fill('input[placeholder="请输入角色名称"]', '管理员')
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(500)
    
    await expect(page.locator('.el-table')).toBeVisible()
  })
})

test.describe('菜单管理页面测试', () => {
  test('打开新增菜单弹窗', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/menu')
    await page.waitForTimeout(1000)
    
    const addBtn = page.locator('.table-toolbar').locator('.el-button:has-text("新增菜单")')
    await addBtn.click()
    await page.waitForTimeout(500)
    
    await expect(page.locator('.el-dialog__title')).toHaveText(/新增/)
  })

  test('表格显示', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/menu')
    await page.waitForTimeout(1000)
    
    await expect(page.locator('.el-table')).toBeVisible()
  })
})

test.describe('商品管理页面测试', () => {
  test('商品列表页面加载', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/product/spu')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/product/spu')
    await expect(page.locator('.el-table')).toBeVisible()
  })

  test('打开新增商品弹窗', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/product/spu')
    await page.waitForTimeout(1000)
    
    await page.click('.table-toolbar .el-button:has-text("新增商品")')
    await page.waitForTimeout(500)
    
    await expect(page.locator('.el-dialog__title')).toHaveText(/新增/)
  })

  test('商品分类页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/product/category')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/product/category')
    await expect(page.locator('.el-table')).toBeVisible()
  })

  test('商品品牌页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/product/brand')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/product/brand')
    await expect(page.locator('.el-table')).toBeVisible()
  })
})

test.describe('卡券管理页面测试', () => {
  test('卡券模板页面加载', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/coupon/template')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/coupon/template')
    await expect(page.locator('.el-table')).toBeVisible()
  })

  test('打开新增卡券模板弹窗', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/coupon/template')
    await page.waitForTimeout(1000)
    
    await page.click('.table-toolbar .el-button:has-text("新增模板")')
    await page.waitForTimeout(500)
    
    await expect(page.locator('.el-dialog__title')).toHaveText(/新增/)
  })

  test('卡券列表页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/coupon/list')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/coupon/list')
    await expect(page.locator('.el-table')).toBeVisible()
  })

  test('发放批次页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/coupon/batch')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/coupon/batch')
    await expect(page.locator('.el-table')).toBeVisible()
  })
})

test.describe('订单管理页面测试', () => {
  test('订单列表页面加载', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/order/list')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/order/list')
    await expect(page.locator('.el-table')).toBeVisible()
  })

  test('订单状态筛选', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/order/list')
    await page.waitForTimeout(1000)
    
    const statusSelect = page.locator('select[placeholder="请选择订单状态"]')
    await statusSelect.click()
    await page.waitForTimeout(300)
    
    await expect(page.locator('.el-select-dropdown')).toBeVisible()
  })

  test('订单详情弹窗', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/order/list')
    await page.waitForTimeout(1000)
    
    const detailBtn = page.locator('.el-table').locator('.el-button:has-text("详情")').first()
    if (await detailBtn.isVisible()) {
      await detailBtn.click()
      await page.waitForTimeout(500)
      await expect(page.locator('.el-dialog')).toBeVisible()
    }
  })
})

test.describe('支付管理页面测试', () => {
  test('支付记录页面加载', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/pay/record')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/pay/record')
    await expect(page.locator('.el-table')).toBeVisible()
  })

  test('支付方式筛选', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/pay/record')
    await page.waitForTimeout(1000)
    
    const payMethodSelect = page.locator('select[placeholder="请选择支付方式"]')
    await payMethodSelect.click()
    await page.waitForTimeout(300)
    
    await expect(page.locator('.el-select-dropdown')).toBeVisible()
  })

  test('支付状态筛选', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/pay/record')
    await page.waitForTimeout(1000)
    
    const payStatusSelect = page.locator('select[placeholder="请选择支付状态"]')
    await payStatusSelect.click()
    await page.waitForTimeout(300)
    
    await expect(page.locator('.el-select-dropdown')).toBeVisible()
  })

  test('查看支付详情', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/pay/record')
    await page.waitForTimeout(1000)
    
    const detailBtn = page.locator('.el-table').locator('.el-button:has-text("详情")').first()
    if (await detailBtn.isVisible()) {
      await detailBtn.click()
      await page.waitForTimeout(500)
      await expect(page.locator('.el-dialog')).toBeVisible()
    }
  })

  test('退款记录页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/pay/refund')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/pay/refund')
    await expect(page.locator('.el-table')).toBeVisible()
  })

  test('支付配置页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/pay/config')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/pay/config')
    await expect(page.locator('.el-tabs')).toBeVisible()
  })
})

test.describe('页面布局测试', () => {
  test('侧边栏折叠功能', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)
    
    const collapseBtn = page.locator('.collapse-btn')
    await collapseBtn.click()
    await page.waitForTimeout(500)
    
    const aside = page.locator('.aside')
    const width = await aside.evaluate(el => (el as HTMLElement).getAttribute('style'))
    expect(width).toContain('64px')
  })

  test('用户下拉菜单', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)
    
    await page.click('.user-info')
    await page.waitForTimeout(300)
    
    await expect(page.locator('.el-dropdown-menu')).toBeVisible()
  })

  test('导航菜单显示', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)
    
    await expect(page.locator('.aside .el-menu').first()).toBeVisible()
  })

  test('面包屑导航', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)
    
    await expect(page.locator('.el-breadcrumb')).toBeVisible()
  })
})

test.describe('路由跳转测试', () => {
  test('访问登录页面', async ({ page }) => {
    await page.goto('/login')
    await page.waitForTimeout(500)
    
    await expect(page).toHaveURL('/login')
    await expect(page.locator('h2.title')).toHaveText('管理后台登录')
  })

  test('访问系统管理页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/system/user')
  })

  test('访问租户管理页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/tenant')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/system/tenant')
  })

  test('访问部门管理页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/dept')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/system/dept')
  })

  test('访问角色管理页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/role')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/system/role')
  })

  test('访问菜单管理页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/menu')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/system/menu')
  })

  test('访问商品管理页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/product/spu')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/product/spu')
  })

  test('访问卡券管理页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/coupon/template')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/coupon/template')
  })

  test('访问订单管理页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/order/list')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/order/list')
  })

  test('访问支付管理页面', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/pay/record')
    await page.waitForTimeout(1000)
    
    await expect(page).toHaveURL('/pay/record')
  })
})
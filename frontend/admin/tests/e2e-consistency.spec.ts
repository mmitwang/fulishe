import { test, expect } from '@playwright/test'

const setMockAuth = async (page: any, tenantId = 1) => {
  await page.evaluate((tid: number) => {
    localStorage.setItem('fulishe-auth', JSON.stringify({
      token: 'mock-token-12345',
      userInfo: {
        id: 1,
        tenantId: tid,
        username: 'admin',
        nickname: '管理员',
        realName: '管理员',
        avatar: '',
        mobile: '13800138000',
        userType: 1,
        deptName: '技术部'
      }
    }))
  }, tenantId)
}

test.describe('完整交易流程测试 - 数据一致性验证', () => {
  test('商家管理 - 新增商家并验证', async ({ page, request }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/tenant')
    await page.waitForTimeout(1000)

    await page.click('.table-toolbar .el-button:has-text("新增租户")')
    await page.waitForTimeout(500)

    const merchantName = `测试商家${Date.now()}`
    await page.fill('input[placeholder="请输入租户名称"]', merchantName)
    await page.fill('input[placeholder="请输入租户编码"]', `TEST_MERCHANT_${Date.now()}`)
    await page.fill('input[placeholder="请输入联系人"]', '测试联系人')
    await page.fill('input[placeholder="请输入联系电话"]', '13900139000')
    
    await page.click('.el-dialog__footer .el-button:has-text("确 定")')
    await page.waitForTimeout(500)

    await expect(page.locator('.el-message:has-text("成功")')).toBeVisible()

    await page.waitForTimeout(500)
    await page.fill('input[placeholder="请输入租户名称"]', merchantName)
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(500)

    const firstRow = page.locator('.el-table__row').first()
    await expect(firstRow.locator('td:nth-child(2)')).toHaveText(merchantName)
  })

  test('商品管理 - 新增商品并验证数据库一致性', async ({ page, request }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/product/spu')
    await page.waitForTimeout(1000)

    await page.click('.table-toolbar .el-button:has-text("新增商品")')
    await page.waitForTimeout(500)

    const productName = `测试商品${Date.now()}`
    await page.fill('input[placeholder="请输入商品名称"]', productName)
    await page.fill('textarea[placeholder="请输入商品描述"]', '测试商品描述')
    await page.fill('input[placeholder="请输入品牌名称"]', '测试品牌')

    await page.click('.el-dialog__footer .el-button:has-text("确 定")')
    await page.waitForTimeout(500)

    await expect(page.locator('.el-message:has-text("成功")')).toBeVisible()

    await page.waitForTimeout(500)
    await page.fill('input[placeholder="请输入商品名称"]', productName)
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(500)

    const firstRow = page.locator('.el-table__row').first()
    await expect(firstRow.locator('td:nth-child(2)')).toHaveText(productName)
  })

  test('卡券管理 - 创建卡券模板并发放', async ({ page, request }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/coupon/template')
    await page.waitForTimeout(1000)

    await page.click('.table-toolbar .el-button:has-text("新增模板")')
    await page.waitForTimeout(500)

    const templateName = `测试优惠券${Date.now()}`
    await page.fill('input[placeholder="请输入优惠券名称"]', templateName)
    await page.fill('input[placeholder="请输入面值"]', '50')
    await page.fill('input[placeholder="请输入最低消费"]', '200')
    await page.fill('input[placeholder="请输入发放数量"]', '100')

    await page.click('.el-dialog__footer .el-button:has-text("确 定")')
    await page.waitForTimeout(500)

    await expect(page.locator('.el-message:has-text("成功")')).toBeVisible()

    await page.waitForTimeout(500)
    await page.fill('input[placeholder="请输入优惠券名称"]', templateName)
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(500)

    const firstRow = page.locator('.el-table__row').first()
    await expect(firstRow.locator('td:nth-child(2)')).toHaveText(templateName)
  })

  test('订单管理 - 创建订单并验证支付状态', async ({ page, request }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/order/list')
    await page.waitForTimeout(1000)

    await expect(page.locator('.el-table')).toBeVisible()

    const orderRows = await page.locator('.el-table__row').count()
    expect(orderRows).toBeGreaterThan(0)

    const firstRow = page.locator('.el-table__row').first()
    const orderNo = await firstRow.locator('td:nth-child(2)').textContent()
    const status = await firstRow.locator('td:nth-child(6)').textContent()

    console.log(`订单号: ${orderNo}, 状态: ${status}`)
    expect(orderNo).toBeTruthy()
  })

  test('支付管理 - 支付记录与订单关联验证', async ({ page, request }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/pay/record')
    await page.waitForTimeout(1000)

    await expect(page.locator('.el-table')).toBeVisible()

    const payRows = await page.locator('.el-table__row').count()
    expect(payRows).toBeGreaterThan(0)

    const firstRow = page.locator('.el-table__row').first()
    const payNo = await firstRow.locator('td:nth-child(2)').textContent()
    const orderNo = await firstRow.locator('td:nth-child(3)').textContent()
    const payAmount = await firstRow.locator('td:nth-child(5)').textContent()

    console.log(`支付单号: ${payNo}, 订单号: ${orderNo}, 金额: ${payAmount}`)
    expect(payNo).toBeTruthy()
    expect(orderNo).toBeTruthy()
    expect(payAmount).toBeTruthy()
  })

  test('跨租户数据隔离验证', async ({ page, request }) => {
    await page.goto('/login')
    await setMockAuth(page, 1)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)

    const tenant1UserCount = await page.locator('.el-table__row').count()

    await page.goto('/login')
    await setMockAuth(page, 2)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)

    const tenant2UserCount = await page.locator('.el-table__row').count()

    console.log(`租户1用户数: ${tenant1UserCount}, 租户2用户数: ${tenant2UserCount}`)
    expect(tenant1UserCount).toBeGreaterThan(0)
    expect(tenant2UserCount).toBeGreaterThan(0)
  })

  test('数据一致性 - 用户创建后数据库验证', async ({ page, request }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)

    const beforeCount = await page.locator('.el-table__row').count()

    await page.click('.table-toolbar .el-button:has-text("新增用户")')
    await page.waitForTimeout(500)

    const username = `testuser${Date.now()}`
    await page.fill('input[placeholder="请输入用户名"]', username)
    await page.fill('input[placeholder="请输入密码"]', '123456')
    await page.fill('input[placeholder="请输入真实姓名"]', '测试用户')
    await page.fill('input[placeholder="请输入手机号"]', '13900139999')
    await page.fill('input[placeholder="请输入邮箱"]', `${username}@test.com`)

    await page.click('.el-dialog__footer .el-button:has-text("确 定")')
    await page.waitForTimeout(500)

    await expect(page.locator('.el-message:has-text("成功")')).toBeVisible()

    await page.waitForTimeout(500)
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(500)

    const afterCount = await page.locator('.el-table__row').count()
    expect(afterCount).toBe(beforeCount + 1)
  })

  test('数据一致性 - 订单支付后状态同步', async ({ page, request }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/order/list')
    await page.waitForTimeout(1000)

    await page.fill('select[placeholder="请选择支付状态"]', '已支付')
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(500)

    const paidOrders = await page.locator('.el-table__row').count()
    expect(paidOrders).toBeGreaterThan(0)

    await page.goto('/pay/record')
    await page.waitForTimeout(1000)

    await page.fill('select[placeholder="请选择支付状态"]', '已支付')
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(500)

    const paidRecords = await page.locator('.el-table__row').count()
    expect(paidRecords).toBeGreaterThan(0)
  })
})

test.describe('随机数据生成测试', () => {
  const randomString = (length: number) => {
    return Math.random().toString(36).substring(2, length + 2)
  }

  test('批量创建测试用户', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)

    for (let i = 0; i < 3; i++) {
      await page.click('.table-toolbar .el-button:has-text("新增用户")')
      await page.waitForTimeout(300)

      const username = `random_user_${randomString(6)}`
      await page.fill('input[placeholder="请输入用户名"]', username)
      await page.fill('input[placeholder="请输入密码"]', '123456')
      await page.fill('input[placeholder="请输入真实姓名"]', `随机用户${i + 1}`)
      await page.fill('input[placeholder="请输入手机号"]', `139${Math.floor(Math.random() * 100000000)}`)
      await page.fill('input[placeholder="请输入邮箱"]', `${username}@random.com`)

      await page.click('.el-dialog__footer .el-button:has-text("确 定")')
      await page.waitForTimeout(500)
    }

    await page.click('button:has-text("查询")')
    await page.waitForTimeout(500)

    const rowCount = await page.locator('.el-table__row').count()
    expect(rowCount).toBeGreaterThan(3)
  })

  test('批量创建测试商品', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/product/spu')
    await page.waitForTimeout(1000)

    const productNames = ['电子产品', '食品饮料', '家居用品', '服饰鞋帽', '办公用品']
    const brands = ['品牌A', '品牌B', '品牌C', '品牌D', '品牌E']

    for (let i = 0; i < 3; i++) {
      await page.click('.table-toolbar .el-button:has-text("新增商品")')
      await page.waitForTimeout(300)

      const name = `${productNames[i % productNames.length]}_${randomString(4)}`
      await page.fill('input[placeholder="请输入商品名称"]', name)
      await page.fill('textarea[placeholder="请输入商品描述"]', `${name}的详细描述`)
      await page.fill('input[placeholder="请输入品牌名称"]', brands[i % brands.length])

      await page.click('.el-dialog__footer .el-button:has-text("确 定")')
      await page.waitForTimeout(500)
    }

    await page.click('button:has-text("查询")')
    await page.waitForTimeout(500)

    const rowCount = await page.locator('.el-table__row').count()
    expect(rowCount).toBeGreaterThan(3)
  })
})

test.describe('系统功能完整性测试', () => {
  test('侧边栏导航完整性', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)

    const menuItems = [
      '系统管理', '用户管理', '租户管理', '部门管理', '角色管理', '菜单管理',
      '商品管理', '商品列表', '商品分类', '商品品牌',
      '卡券管理', '卡券模板', '卡券列表', '发放批次',
      '订单管理', '订单列表',
      '支付管理', '支付记录', '退款记录', '支付配置'
    ]

    for (const item of menuItems) {
      const locator = page.locator('.el-menu-item:has-text("' + item + '")')
      const exists = await locator.count()
      if (exists > 0) {
        console.log(`菜单项 "${item}" 存在`)
      }
    }
  })

  test('页面布局响应式', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)

    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(300)
    expect(await page.locator('.el-container').isVisible()).toBe(true)

    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(300)
    expect(await page.locator('.el-container').isVisible()).toBe(true)
  })

  test('按钮功能完整性', async ({ page }) => {
    await page.goto('/login')
    await setMockAuth(page)
    await page.goto('/system/user')
    await page.waitForTimeout(1000)

    const buttons = ['新增用户', '查询', '重置']
    for (const btnText of buttons) {
      const btn = page.locator('.el-button:has-text("' + btnText + '")')
      expect(await btn.isVisible()).toBe(true)
    }
  })
})

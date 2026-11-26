import { test, expect } from '@playwright/test'

const users = [
  { username: 'admin', password: '123456', tenantId: 1, userType: 1, description: '超级管理员' },
  { username: 'fulishe_admin', password: '123456', tenantId: 2, userType: 1, description: '福礼社租户管理员' },
  { username: 'xinchun_admin', password: '123456', tenantId: 3, userType: 1, description: '新春礼品租户管理员' },
  { username: 'zhangsan', password: '123456', tenantId: 1, userType: 2, description: '普通用户' }
]

async function login(page: any, username: string, password: string) {
  await page.goto('/login')
  
  const captchaResponse = await page.request.get('http://localhost:8080/api/auth/captcha')
  const captchaData = await captchaResponse.json()
  const captcha = captchaData.data
  
  await page.fill('input[placeholder="请输入用户名"]', username)
  await page.fill('input[placeholder="请输入密码"]', password)
  await page.fill('input[placeholder="请输入验证码"]', captcha)
  
  await page.click('button[type="primary"]')
  
  await page.waitForURL(/\/dashboard/)
}

async function getCaptcha(page: any): Promise<string> {
  const response = await page.request.get('http://localhost:8080/api/auth/captcha')
  const data = await response.json()
  return data.data
}

test.describe('福礼社平台 - 完整端到端测试', () => {
  test('超级管理员登录测试', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('.el-menu-item').filter({ hasText: '系统管理' })).toBeVisible()
    await expect(page.locator('.el-menu-item').filter({ hasText: '商品管理' })).toBeVisible()
    await expect(page.locator('.el-menu-item').filter({ hasText: '订单管理' })).toBeVisible()
    
    const response = await page.request.get('http://localhost:8080/api/user')
    const data = await response.json()
    expect(data.code).toBe(200)
    expect(data.data.total).toBeGreaterThan(0)
  })

  test('租户管理员登录测试', async ({ page }) => {
    await login(page, 'fulishe_admin', '123456')
    
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('.el-menu-item').filter({ hasText: '商品管理' })).toBeVisible()
  })

  test('普通用户登录测试', async ({ page }) => {
    await login(page, 'zhangsan', '123456')
    
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('用户管理 - 新增用户', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    await page.click('.el-menu-item', { text: '用户管理' })
    await page.waitForSelector('.el-table')
    
    const initialResponse = await page.request.get('http://localhost:8080/api/user')
    const initialData = await initialResponse.json()
    const initialCount = initialData.data.total
    
    await page.click('button', { text: '新增用户' })
    
    const newUsername = `testuser_${Date.now()}`
    await page.fill('input[placeholder="用户名"]', newUsername)
    await page.fill('input[placeholder="密码"]', '123456')
    await page.fill('input[placeholder="真实姓名"]', '测试用户')
    await page.fill('input[placeholder="手机号"]', '13900000000')
    
    await page.click('.el-dialog__footer button', { text: '确定' })
    await page.waitForTimeout(1000)
    
    const afterResponse = await page.request.get('http://localhost:8080/api/user')
    const afterData = await afterResponse.json()
    
    expect(afterData.data.total).toBe(initialCount + 1)
    
    const newUser = afterData.data.records.find((u: any) => u.username === newUsername)
    expect(newUser).toBeDefined()
    expect(newUser.realName).toBe('测试用户')
    expect(newUser.mobile).toBe('13900000000')
  })

  test('用户管理 - 编辑用户', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    await page.click('.el-menu-item', { text: '用户管理' })
    await page.waitForSelector('.el-table')
    
    await page.click('.el-table__body-wrapper tr:first-child .el-button--text', { text: '编辑' })
    
    await page.fill('input[placeholder="真实姓名"]', '编辑后的姓名', { force: true })
    await page.click('.el-dialog__footer button', { text: '确定' })
    await page.waitForTimeout(1000)
    
    const response = await page.request.get('http://localhost:8080/api/user')
    const data = await response.json()
    const firstUser = data.data.records[0]
    
    expect(firstUser.realName).toBe('编辑后的姓名')
  })

  test('用户管理 - 删除用户', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    await page.click('.el-menu-item', { text: '用户管理' })
    await page.waitForSelector('.el-table')
    
    const initialResponse = await page.request.get('http://localhost:8080/api/user')
    const initialData = await initialResponse.json()
    const initialCount = initialData.data.total
    
    await page.click('.el-table__body-wrapper tr:last-child .el-button--text', { text: '删除' })
    await page.click('.el-message-box__btns button', { text: '确定' })
    await page.waitForTimeout(1000)
    
    const afterResponse = await page.request.get('http://localhost:8080/api/user')
    const afterData = await afterResponse.json()
    
    expect(afterData.data.total).toBe(initialCount - 1)
  })

  test('租户管理 - 新增租户', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    await page.click('.el-menu-item', { text: '租户管理' })
    await page.waitForSelector('.el-table')
    
    const initialResponse = await page.request.get('http://localhost:8080/api/tenant')
    const initialData = await initialResponse.json()
    const initialCount = initialData.data.total
    
    await page.click('button', { text: '新增租户' })
    
    const newTenantName = `测试租户_${Date.now()}`
    await page.fill('input[placeholder="租户名称"]', newTenantName)
    await page.fill('input[placeholder="租户编码"]', `TEST_${Date.now()}`)
    await page.fill('input[placeholder="联系人"]', '测试联系人')
    await page.fill('input[placeholder="联系电话"]', '13900000001')
    
    await page.click('.el-dialog__footer button', { text: '确定' })
    await page.waitForTimeout(1000)
    
    const afterResponse = await page.request.get('http://localhost:8080/api/tenant')
    const afterData = await afterResponse.json()
    
    expect(afterData.data.total).toBe(initialCount + 1)
    
    const newTenant = afterData.data.records.find((t: any) => t.tenantName === newTenantName)
    expect(newTenant).toBeDefined()
    expect(newTenant.contactPerson).toBe('测试联系人')
  })

  test('商品管理 - 新增商品', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    await page.click('.el-menu-item', { text: '商品列表' })
    await page.waitForSelector('.el-table')
    
    const initialResponse = await page.request.get('http://localhost:8080/api/product/spu')
    const initialData = await initialResponse.json()
    const initialCount = initialData.data.total
    
    await page.click('button', { text: '新增商品' })
    
    const newProductName = `测试商品_${Date.now()}`
    await page.fill('input[placeholder="商品名称"]', newProductName)
    await page.fill('textarea[placeholder="商品描述"]', '这是一个测试商品')
    
    await page.click('.el-dialog__footer button', { text: '确定' })
    await page.waitForTimeout(1000)
    
    const afterResponse = await page.request.get('http://localhost:8080/api/product/spu')
    const afterData = await afterResponse.json()
    
    expect(afterData.data.total).toBe(initialCount + 1)
    
    const newProduct = afterData.data.records.find((p: any) => p.name === newProductName)
    expect(newProduct).toBeDefined()
    expect(newProduct.description).toBe('这是一个测试商品')
  })

  test('库存一致性测试 - 创建订单扣减库存', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    const skuResponse = await page.request.get('http://localhost:8080/api/product/sku')
    const skuData = await skuResponse.json()
    const testSku = skuData.data.records[0]
    const initialStock = testSku.stock
    
    const orderResponse = await page.request.post('http://localhost:8080/api/order', {
      data: {
        items: [{ skuId: testSku.id, quantity: 2 }],
        address: '测试地址',
        mobile: '13900000002',
        remark: '测试订单'
      }
    })
    
    const orderData = await orderResponse.json()
    expect(orderData.code).toBe(200)
    
    const afterSkuResponse = await page.request.get('http://localhost:8080/api/product/sku')
    const afterSkuData = await afterSkuResponse.json()
    const updatedSku = afterSkuData.data.records.find((s: any) => s.id === testSku.id)
    
    expect(updatedSku.stock).toBe(initialStock - 2)
  })

  test('库存一致性测试 - 取消订单恢复库存', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    const orderResponse = await page.request.get('http://localhost:8080/api/order')
    const orderData = await orderResponse.json()
    const pendingOrder = orderData.data.records.find((o: any) => o.orderStatus === 0)
    
    if (pendingOrder) {
      const itemsResponse = await page.request.get(`http://localhost:8080/api/order/${pendingOrder.id}/items`)
      
      const cancelResponse = await page.request.put(`http://localhost:8080/api/order/${pendingOrder.id}/cancel`)
      const cancelData = await cancelResponse.json()
      expect(cancelData.code).toBe(200)
      
      const afterOrderResponse = await page.request.get(`http://localhost:8080/api/order/${pendingOrder.id}`)
      const afterOrderData = await afterOrderResponse.json()
      expect(afterOrderData.data.orderStatus).toBe(4)
      
      const skuResponse = await page.request.get('http://localhost:8080/api/product/sku')
      const skuData = await skuResponse.json()
      
      const orderItems = orderData.data.records.find((o: any) => o.id === pendingOrder.id)
      expect(orderItems).toBeDefined()
    }
  })

  test('订单管理 - 创建订单', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    await page.click('.el-menu-item', { text: '订单列表' })
    await page.waitForSelector('.el-table')
    
    const initialResponse = await page.request.get('http://localhost:8080/api/order')
    const initialData = await initialResponse.json()
    const initialCount = initialData.data.total
    
    await page.click('button', { text: '创建订单' })
    
    await page.fill('input[placeholder="收货人"]', '测试收货人')
    await page.fill('input[placeholder="联系电话"]', '13900000003')
    await page.fill('textarea[placeholder="收货地址"]', '测试收货地址')
    
    await page.click('.el-dialog__footer button', { text: '确定' })
    await page.waitForTimeout(1000)
    
    const afterResponse = await page.request.get('http://localhost:8080/api/order')
    const afterData = await afterResponse.json()
    
    expect(afterData.data.total).toBe(initialCount + 1)
  })

  test('订单管理 - 支付订单', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    const orderResponse = await page.request.get('http://localhost:8080/api/order')
    const orderData = await orderResponse.json()
    const unpaidOrder = orderData.data.records.find((o: any) => o.orderStatus === 0)
    
    if (unpaidOrder) {
      const payResponse = await page.request.put(`http://localhost:8080/api/order/${unpaidOrder.id}/pay`, {
        data: { payMethod: 1 }
      })
      
      const payData = await payResponse.json()
      expect(payData.code).toBe(200)
      
      const afterOrderResponse = await page.request.get('http://localhost:8080/api/order')
      const afterOrderData = await afterOrderResponse.json()
      const updatedOrder = afterOrderData.data.records.find((o: any) => o.id === unpaidOrder.id)
      
      expect(updatedOrder.orderStatus).toBe(1)
      expect(updatedOrder.payStatus).toBe(1)
      expect(updatedOrder.payNo).toBeDefined()
    }
  })

  test('订单管理 - 发货', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    const orderResponse = await page.request.get('http://localhost:8080/api/order')
    const orderData = await orderResponse.json()
    const paidOrder = orderData.data.records.find((o: any) => o.orderStatus === 1)
    
    if (paidOrder) {
      const shipResponse = await page.request.put(`http://localhost:8080/api/order/${paidOrder.id}/ship`)
      const shipData = await shipResponse.json()
      expect(shipData.code).toBe(200)
      
      const afterOrderResponse = await page.request.get('http://localhost:8080/api/order')
      const afterOrderData = await afterOrderResponse.json()
      const updatedOrder = afterOrderData.data.records.find((o: any) => o.id === paidOrder.id)
      
      expect(updatedOrder.orderStatus).toBe(2)
    }
  })

  test('订单管理 - 确认收货', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    const orderResponse = await page.request.get('http://localhost:8080/api/order')
    const orderData = await orderResponse.json()
    const shippedOrder = orderData.data.records.find((o: any) => o.orderStatus === 2)
    
    if (shippedOrder) {
      const completeResponse = await page.request.put(`http://localhost:8080/api/order/${shippedOrder.id}/complete`)
      const completeData = await completeResponse.json()
      expect(completeData.code).toBe(200)
      
      const afterOrderResponse = await page.request.get('http://localhost:8080/api/order')
      const afterOrderData = await afterOrderResponse.json()
      const updatedOrder = afterOrderData.data.records.find((o: any) => o.id === shippedOrder.id)
      
      expect(updatedOrder.orderStatus).toBe(3)
    }
  })

  test('支付记录查询', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    await page.click('.el-menu-item', { text: '支付记录' })
    await page.waitForSelector('.el-table')
    
    const response = await page.request.get('http://localhost:8080/api/pay/record')
    const data = await response.json()
    
    expect(data.code).toBe(200)
    expect(data.data.total).toBeGreaterThan(0)
  })

  test('卡券管理 - 创建优惠券模板', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    await page.click('.el-menu-item', { text: '卡券模板' })
    await page.waitForSelector('.el-table')
    
    const initialResponse = await page.request.get('http://localhost:8080/api/coupon/template')
    const initialData = await initialResponse.json()
    const initialCount = initialData.data.total
    
    await page.click('button', { text: '新增模板' })
    
    const newTemplateName = `测试优惠券_${Date.now()}`
    await page.fill('input[placeholder="优惠券名称"]', newTemplateName)
    await page.fill('input[placeholder="面值"]', '50')
    await page.fill('input[placeholder="最低消费"]', '200')
    await page.fill('input[placeholder="发放数量"]', '100')
    
    await page.click('.el-dialog__footer button', { text: '确定' })
    await page.waitForTimeout(1000)
    
    const afterResponse = await page.request.get('http://localhost:8080/api/coupon/template')
    const afterData = await afterResponse.json()
    
    expect(afterData.data.total).toBe(initialCount + 1)
    
    const newTemplate = afterData.data.records.find((t: any) => t.name === newTemplateName)
    expect(newTemplate).toBeDefined()
    expect(newTemplate.faceValue).toBe(50)
    expect(newTemplate.minAmount).toBe(200)
  })

  test('卡券管理 - 发放优惠券', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    const templateResponse = await page.request.get('http://localhost:8080/api/coupon/template')
    const templateData = await templateResponse.json()
    const template = templateData.data.records[0]
    
    const issueResponse = await page.request.post('http://localhost:8080/api/coupon/issue', {
      data: { templateId: template.id, userId: 2 }
    })
    
    const issueData = await issueResponse.json()
    expect(issueData.code).toBe(200)
    
    const couponResponse = await page.request.get('http://localhost:8080/api/coupon/list')
    const couponData = await couponResponse.json()
    
    const newCoupon = couponData.data.records.find((c: any) => c.couponTemplateId === template.id && c.userId === 2 && c.status === 1)
    expect(newCoupon).toBeDefined()
    expect(newCoupon.faceValue).toBe(template.faceValue)
  })

  test('跨租户数据隔离测试 - 租户管理员只能查看本租户数据', async ({ page }) => {
    await login(page, 'fulishe_admin', '123456')
    
    const orderResponse = await page.request.get('http://localhost:8080/api/order')
    const orderData = await orderResponse.json()
    
    const allOrders = orderData.data.records
    for (const order of allOrders) {
      expect(order.tenantId).toBe(2)
    }
    
    const productResponse = await page.request.get('http://localhost:8080/api/product/spu')
    const productData = await productResponse.json()
    
    const allProducts = productData.data.records
    for (const product of allProducts) {
      expect(product.tenantId).toBe(2)
    }
  })

  test('跨租户越权测试 - 普通用户无法访问其他租户数据', async ({ page }) => {
    await login(page, 'zhangsan', '123456')
    
    const orderResponse = await page.request.get('http://localhost:8080/api/order')
    const orderData = await orderResponse.json()
    
    const allOrders = orderData.data.records
    for (const order of allOrders) {
      expect(order.tenantId).toBe(1)
    }
  })

  test('数据统计接口测试', async ({ page }) => {
    await login(page, 'admin', '123456')
    
    const response = await page.request.get('http://localhost:8080/api/statistics')
    const data = await response.json()
    
    expect(data.code).toBe(200)
    expect(data.data.totalOrders).toBeDefined()
    expect(data.data.totalPayments).toBeDefined()
    expect(data.data.pendingOrders).toBeDefined()
    expect(data.data.shippedOrders).toBeDefined()
  })

  test('健康检查接口', async ({ page }) => {
    const response = await page.request.get('http://localhost:8080/api/health')
    const data = await response.json()
    
    expect(data.status).toBe('UP')
  })

  test('多用户角色权限测试', async ({ page }) => {
    for (const user of users) {
      await login(page, user.username, user.password)
      
      await expect(page).toHaveURL(/\/dashboard/)
      
      const menuItems = await page.$$('.el-menu-item')
      const menuTexts = await Promise.all(menuItems.map(item => item.textContent))
      
      expect(menuTexts).toContain('系统管理')
      expect(menuTexts).toContain('商品管理')
      expect(menuTexts).toContain('订单管理')
      
      const response = await page.request.get('http://localhost:8080/api/user')
      const data = await response.json()
      expect(data.code).toBe(200)
    }
  })
})

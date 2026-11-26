const { ok, fail, paginate, like, numEq, timeAgo, fmt } = require('./helpers.cjs')
const { tenants, users, roles, roleMenus, categories, brands, products, skus } = require('./seed.cjs')
const { couponTemplates, couponBatches, coupons, orders, orderItems, payRecords, refunds, chains: _c, chainTxs, chainBlocks, chainMeta, suppliers, inventory, shipments, settlements, purchaseOrders, traceRecords, menuList } = require('./seed-extra.cjs')
const { ordersById, ordersByNo, orderItemsByOrderId, orderItemsByOrderNo } = require('./indexes.cjs')
const { createAuthz } = require('./authz.cjs')

const nextId = arr => arr.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1

let currentCaptcha = '8888'
const genCaptcha = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

module.exports = function registerCoreRoutes(app, jwt, SECRET_KEY) {
  const {
    authenticate, requirePermission, requireSuperAdmin, signToken, getUserInfo,
    getAccountRejection, buildMenuTree, forbidden
  } = createAuthz(jwt, SECRET_KEY)

  /* ---------------- 认证 ---------------- */
  app.get('/api/auth/demo-users', (req, res) => {
    ok(res, users.map(u => {
      const info = getUserInfo(u)
      return {
        id: u.id,
        username: u.username,
        password: u.password,
        displayName: u.realName,
        tenantName: info.tenantName,
        userType: u.userType,
        roleName: info.roleName,
        roleCodes: info.roleCodes,
        merchantId: info.merchantId
      }
    }))
  })

  const captchaHandler = (req, res) => {
    currentCaptcha = genCaptcha()
    ok(res, currentCaptcha)
  }
  app.get('/api/auth/captcha', captchaHandler)
  app.get('/api/user/auth/captcha', captchaHandler)

  const loginHandler = (req, res) => {
    const { username, password, captcha } = req.body
    if (req.path === '/api/auth/login' && (!captcha || String(captcha).toUpperCase() !== currentCaptcha.toUpperCase())) {
      return fail(res, '验证码错误')
    }
    const user = users.find(u => u.username === username && u.password === password)
    if (!user) return fail(res, '用户名或密码错误')
    const rejection = getAccountRejection(user)
    if (rejection) return forbidden(res, rejection)
    const token = signToken(user)
    ok(res, { token, refreshToken: token, userInfo: getUserInfo(user) })
  }
  app.post('/api/auth/login', loginHandler)
  app.post('/api/user/auth/login', loginHandler)

  app.get('/api/user/auth/info', authenticate, (req, res) => {
    ok(res, getUserInfo(req.auth.user))
  })

  app.post('/api/user/auth/refresh', authenticate, (req, res) => {
    const token = signToken(req.auth.user)
    ok(res, { token, refreshToken: token, userInfo: getUserInfo(req.auth.user) })
  })

  app.use('/api/user/user', authenticate, requirePermission('system:user'))
  app.use('/api/user/tenant', authenticate, requirePermission('system:tenant'))
  app.use('/api/user/role', authenticate, requirePermission('system:role'))
  app.use('/api/user/dept', authenticate, requirePermission('system:dept'))
  app.use('/api/user/menu', authenticate, requirePermission('system:menu'))

  /* ---------------- 用户 / 租户 ---------------- */
  app.get('/api/user/user/page', (req, res) => {
    let list = users.map(user => {
      const info = getUserInfo(user)
      return { ...user, roleName: info.roleName, roleNames: info.roleNames, roleCodes: info.roleCodes }
    })
    if (req.query.username) list = list.filter(u => like(u.username, req.query.username) || like(u.realName, req.query.username))
    if (req.query.mobile) list = list.filter(u => like(u.mobile, req.query.mobile))
    if (!numEq(null, req.query.status)) list = list.filter(u => numEq(u.status, req.query.status))
    ok(res, paginate(list, req.query))
  })
  app.post('/api/user/user', (req, res) => {
    const roleIds = Array.isArray(req.body.roleIds) ? req.body.roleIds.map(Number) : req.body.roleId ? [Number(req.body.roleId)] : [5]
    users.push({ id: nextId(users), tenantId: 1, userType: 2, status: 1, createTime: fmt(new Date()), nickname: req.body.realName, ...req.body, roleIds })
    ok(res, null, '新增成功')
  })
  app.put('/api/user/user', (req, res) => {
    const u = users.find(x => x.id === Number(req.body.id))
    if (!u) return fail(res, '用户不存在', 404)
    if (u.id === 1) {
      ;['nickname', 'realName', 'mobile', 'email', 'deptName'].forEach(field => {
        if (req.body[field] !== undefined) u[field] = req.body[field]
      })
    } else {
      Object.assign(u, req.body)
      if (!Array.isArray(u.roleIds)) u.roleIds = u.roleId ? [Number(u.roleId)] : []
    }
    ok(res, null, '修改成功')
  })
  app.put('/api/user/user/reset-password', (req, res) => {
    const u = users.find(x => x.id === Number(req.body.id))
    if (u) u.password = '123456'
    ok(res, null, '密码已重置为 123456')
  })
  app.delete('/api/user/user/batch', (req, res) => {
    const ids = (req.body || []).map(Number)
    if (ids.includes(1)) return forbidden(res, '内置系统管理员不可删除')
    for (let i = users.length - 1; i >= 0; i--) if (ids.includes(users[i].id)) users.splice(i, 1)
    ok(res, null, '批量删除成功')
  })
  app.delete('/api/user/user/:id', (req, res) => {
    const i = users.findIndex(x => x.id === Number(req.params.id))
    if (i > -1 && users[i].id === 1) return forbidden(res, '内置系统管理员不可删除')
    if (i > -1) users.splice(i, 1)
    ok(res, null, '删除成功')
  })

  app.get('/api/user/tenant/page', (req, res) => {
    let list = [...tenants]
    if (req.query.tenantName) list = list.filter(t => like(t.tenantName, req.query.tenantName))
    if (!numEq(null, req.query.status)) list = list.filter(t => numEq(t.status, req.query.status))
    ok(res, paginate(list, req.query))
  })
  app.post('/api/user/tenant', (req, res) => {
    tenants.push({ id: nextId(tenants), status: 1, auditStatus: 0, auditRemark: '', createTime: fmt(new Date()), ...req.body })
    ok(res, null, '新增成功')
  })
  app.put('/api/user/tenant', (req, res) => {
    const t = tenants.find(x => x.id === Number(req.body.id))
    if (!t) return fail(res, '租户不存在', 404)
    Object.assign(t, req.body)
    ok(res, null, '修改成功')
  })
  app.put('/api/user/tenant/:id/audit', requireSuperAdmin, (req, res) => {
    const tenant = tenants.find(item => item.id === Number(req.params.id))
    if (!tenant) return fail(res, '租户不存在', 404)
    const auditStatus = Number(req.body.auditStatus)
    if (![0, 1, 2].includes(auditStatus)) return fail(res, '审核状态仅支持 0/1/2')
    tenant.auditStatus = auditStatus
    tenant.auditRemark = req.body.auditRemark || req.body.auditOpinion || ''
    tenant.auditedBy = req.auth.user.realName || req.auth.user.username
    tenant.auditedTime = fmt(new Date())
    ok(res, tenant, '商户审核状态已保存')
  })
  app.delete('/api/user/tenant/:id', (req, res) => {
    const i = tenants.findIndex(x => x.id === Number(req.params.id))
    if (i > -1 && tenants[i].id === 1) return forbidden(res, '内置平台租户不可删除')
    if (i > -1) tenants.splice(i, 1)
    ok(res, null, '删除成功')
  })

  /* ---------------- 角色 / 菜单 / 部门 ---------------- */
  app.get('/api/user/role/page', (req, res) => ok(res, paginate(roles, req.query)))
  app.post('/api/user/role', (req, res) => {
    const role = { id: nextId(roles), dataScope: 'MERCHANT', createTime: fmt(new Date()), ...req.body }
    roles.push(role)
    roleMenus[role.id] = []
    ok(res, null, '新增成功')
  })
  app.put('/api/user/role', (req, res) => {
    const r = roles.find(x => x.id === Number(req.body.id))
    if (!r) return fail(res, '角色不存在', 404)
    if (r.roleCode === 'super_admin') {
      ;['roleName', 'description'].forEach(field => {
        if (req.body[field] !== undefined) r[field] = req.body[field]
      })
    } else {
      Object.assign(r, req.body)
    }
    ok(res, null, '修改成功')
  })
  app.delete('/api/user/role/:id', (req, res) => {
    const i = roles.findIndex(x => x.id === Number(req.params.id))
    if (i > -1 && roles[i].roleCode === 'super_admin') return forbidden(res, '内置系统管理员角色不可删除')
    if (i > -1) {
      const [removed] = roles.splice(i, 1)
      delete roleMenus[removed.id]
    }
    ok(res, null, '删除成功')
  })
  app.get('/api/user/role/:id/menus', (req, res) => {
    const role = roles.find(item => item.id === Number(req.params.id))
    if (!role) return fail(res, '角色不存在', 404)
    ok(res, role.roleCode === 'super_admin' ? menuList.map(menu => menu.id) : (roleMenus[role.id] || []))
  })
  app.put('/api/user/role/:id/menus', (req, res) => {
    const role = roles.find(item => item.id === Number(req.params.id))
    if (!role) return fail(res, '角色不存在', 404)
    if (role.roleCode === 'super_admin') return forbidden(res, '内置系统管理员权限不可撤销')
    const validIds = new Set(menuList.map(menu => menu.id))
    roleMenus[role.id] = [...new Set((req.body.menuIds || []).map(Number).filter(id => validIds.has(id)))]
    ok(res, roleMenus[role.id], '权限已保存')
  })

  const deptTree = [
    { id: 1, parentId: 0, deptName: '南樾星集团', leader: '张经理', phone: '13800138001', orderNum: 1, status: 1, createTime: timeAgo(380) },
    { id: 2, parentId: 1, deptName: '采购供应链中心', leader: '张三', phone: '13800138005', orderNum: 1, status: 1, createTime: timeAgo(300) },
    { id: 3, parentId: 1, deptName: '运营中心', leader: '李总监', phone: '13800138002', orderNum: 2, status: 1, createTime: timeAgo(300) },
    { id: 4, parentId: 1, deptName: '技术中心', leader: '王工', phone: '13800138006', orderNum: 3, status: 1, createTime: timeAgo(300) },
    { id: 5, parentId: 2, deptName: '供应商管理组', leader: '赵敏', phone: '13800138008', orderNum: 1, status: 1, createTime: timeAgo(200) },
    { id: 6, parentId: 4, deptName: '区块链研发组', leader: '李工', phone: '13800138009', orderNum: 1, status: 1, createTime: timeAgo(180) }
  ]
  app.get('/api/user/dept/tree', (req, res) => ok(res, deptTree))
  app.get('/api/user/dept/list', (req, res) => ok(res, deptTree))
  app.post('/api/user/dept', (req, res) => { deptTree.push({ id: nextId(deptTree), status: 1, createTime: fmt(new Date()), ...req.body }); ok(res, null, '新增成功') })
  app.put('/api/user/dept', (req, res) => {
    const d = deptTree.find(x => x.id === Number(req.body.id))
    if (d) Object.assign(d, req.body)
    ok(res, null, '修改成功')
  })
  app.delete('/api/user/dept/:id', (req, res) => {
    const i = deptTree.findIndex(x => x.id === Number(req.params.id))
    if (i > -1) deptTree.splice(i, 1)
    ok(res, null, '删除成功')
  })

  app.get('/api/user/menu/tree', (req, res) => ok(res, buildMenuTree()))
  app.get('/api/user/menu/list', (req, res) => ok(res, menuList))
  app.post('/api/user/menu', (req, res) => { menuList.push({ id: nextId(menuList), status: 1, createTime: fmt(new Date()), ...req.body }); ok(res, null, '新增成功') })
  app.put('/api/user/menu', (req, res) => {
    const m = menuList.find(x => x.id === Number(req.body.id))
    if (m) Object.assign(m, req.body)
    ok(res, null, '修改成功')
  })
  app.delete('/api/user/menu/:id', (req, res) => {
    const i = menuList.findIndex(x => x.id === Number(req.params.id))
    if (i > -1) menuList.splice(i, 1)
    ok(res, null, '删除成功')
  })

  /* ---------------- 商品 ---------------- */
  app.get('/api/product/spu/page', (req, res) => {
    const withDelivery = product => ({
      ...product,
      deliveryTag: product.deliveryTag || (product.categoryId === 1 ? '电子卡券 · 即时到账' : [2, 3, 4, 6].includes(product.categoryId) ? '最快 30 分钟达' : '今日发货 · 预计明日达')
    })
    let list = products.map(withDelivery)
    if (req.query.spuName) {
      list = list.filter(p => [p.spuName, p.brandName, p.categoryName, p.description].some(value => like(value, req.query.spuName)))
    }
    if (!numEq(null, req.query.categoryId)) list = list.filter(p => numEq(p.categoryId, req.query.categoryId))
    if (!numEq(null, req.query.brandId)) list = list.filter(p => numEq(p.brandId, req.query.brandId))
    if (!numEq(null, req.query.status)) list = list.filter(p => numEq(p.status, req.query.status))
    if (req.query.instant === '1') list = list.filter(p => p.deliveryTag.includes('30 分钟') || p.deliveryTag.includes('即时'))
    if (req.query.sort === 'sales') list.sort((a, b) => b.sales - a.sales)
    if (req.query.sort === 'priceAsc') list.sort((a, b) => a.sellPrice - b.sellPrice)
    if (req.query.sort === 'priceDesc') list.sort((a, b) => b.sellPrice - a.sellPrice)
    if (req.query.sort === 'newest') list.sort((a, b) => b.id - a.id)
    ok(res, paginate(list, req.query))
  })
  app.post('/api/product/spu', (req, res) => {
    const body = req.body
    const cat = categories.find(c => c.id === Number(body.categoryId))
    const brand = brands.find(b => b.id === Number(body.brandId))
    products.unshift({
      id: nextId(products), image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=gift%20box%20product%20photo&image_size=square',
      images: [], tags: [], sales: 0, traceable: true, createTime: fmt(new Date()),
      ...body,
      categoryName: cat ? cat.categoryName : '',
      brandName: brand ? brand.brandName : ''
    })
    ok(res, null, '新增成功')
  })
  app.put('/api/product/spu', (req, res) => {
    const p = products.find(x => x.id === Number(req.body.id))
    if (!p) return fail(res, '商品不存在', 404)
    const cat = categories.find(c => c.id === Number(req.body.categoryId))
    const brand = brands.find(b => b.id === Number(req.body.brandId))
    Object.assign(p, req.body, { categoryName: cat ? cat.categoryName : p.categoryName, brandName: brand ? brand.brandName : p.brandName })
    ok(res, null, '修改成功')
  })
  app.delete('/api/product/spu/batch', (req, res) => {
    const ids = (req.body || []).map(Number)
    for (let i = products.length - 1; i >= 0; i--) if (ids.includes(products[i].id)) products.splice(i, 1)
    ok(res, null, '批量删除成功')
  })
  app.delete('/api/product/spu/:id', (req, res) => {
    const i = products.findIndex(x => x.id === Number(req.params.id))
    if (i > -1) products.splice(i, 1)
    ok(res, null, '删除成功')
  })
  app.get('/api/product/spu/:id', (req, res) => {
    const product = products.find(item => item.id === Number(req.params.id))
    if (!product) return fail(res, '商品不存在', 404)
    ok(res, {
      ...product,
      deliveryTag: product.deliveryTag || (product.categoryId === 1 ? '电子卡券 · 即时到账' : [2, 3, 4, 6].includes(product.categoryId) ? '最快 30 分钟达' : '今日发货 · 预计明日达')
    })
  })
  app.get('/api/product/sku/spu/:spuId', (req, res) => {
    ok(res, skus.filter(item => numEq(item.spuId, req.params.spuId)))
  })
  app.get('/api/product/sku', (req, res) => {
    let list = [...skus]
    if (req.query.spuId) list = list.filter(s => numEq(s.spuId, req.query.spuId))
    ok(res, paginate(list, req.query))
  })

  app.get('/api/product/category/page', (req, res) => ok(res, paginate(categories, req.query)))
  app.get('/api/product/category/tree', (req, res) => ok(res, categories))
  app.post('/api/product/category', (req, res) => { categories.push({ id: nextId(categories), status: 1, createTime: fmt(new Date()), ...req.body }); ok(res, null, '新增成功') })
  app.put('/api/product/category', (req, res) => {
    const c = categories.find(x => x.id === Number(req.body.id))
    if (c) Object.assign(c, req.body)
    ok(res, null, '修改成功')
  })
  app.delete('/api/product/category/:id', (req, res) => {
    const i = categories.findIndex(x => x.id === Number(req.params.id))
    if (i > -1) categories.splice(i, 1)
    ok(res, null, '删除成功')
  })

  app.get('/api/product/brand/page', (req, res) => {
    let list = [...brands]
    if (req.query.brandName) list = list.filter(b => like(b.brandName, req.query.brandName))
    if (!numEq(null, req.query.status)) list = list.filter(b => numEq(b.status, req.query.status))
    ok(res, paginate(list, req.query))
  })
  app.get('/api/product/brand/list', (req, res) => ok(res, brands))
  app.post('/api/product/brand', (req, res) => { brands.push({ id: nextId(brands), status: 1, sort: 99, createTime: fmt(new Date()), ...req.body }); ok(res, null, '新增成功') })
  app.put('/api/product/brand', (req, res) => {
    const b = brands.find(x => x.id === Number(req.body.id))
    if (b) Object.assign(b, req.body)
    ok(res, null, '修改成功')
  })
  app.delete('/api/product/brand/:id', (req, res) => {
    const i = brands.findIndex(x => x.id === Number(req.params.id))
    if (i > -1) brands.splice(i, 1)
    ok(res, null, '删除成功')
  })

  /* ---------------- 卡券 ---------------- */
  app.get('/api/coupon/template/page', (req, res) => {
    let list = [...couponTemplates]
    if (req.query.templateName) list = list.filter(t => like(t.templateName, req.query.templateName))
    if (!numEq(null, req.query.couponType)) list = list.filter(t => numEq(t.couponType, req.query.couponType))
    if (!numEq(null, req.query.status)) list = list.filter(t => numEq(t.status, req.query.status))
    ok(res, paginate(list, req.query))
  })
  app.post('/api/coupon/template', (req, res) => { couponTemplates.push({ id: nextId(couponTemplates), issuedCount: 0, status: 1, createTime: fmt(new Date()), ...req.body }); ok(res, null, '新增成功') })
  app.put('/api/coupon/template', (req, res) => {
    const t = couponTemplates.find(x => x.id === Number(req.body.id))
    if (t) Object.assign(t, req.body)
    ok(res, null, '修改成功')
  })
  app.delete('/api/coupon/template/:id', (req, res) => {
    const i = couponTemplates.findIndex(x => x.id === Number(req.params.id))
    if (i > -1) couponTemplates.splice(i, 1)
    ok(res, null, '删除成功')
  })

  app.get('/api/coupon/coupon/page', (req, res) => {
    let list = [...coupons]
    if (req.query.couponCode) list = list.filter(c => like(c.couponCode, req.query.couponCode))
    if (!numEq(null, req.query.status)) list = list.filter(c => numEq(c.status, req.query.status))
    if (req.query.userId) list = list.filter(c => numEq(c.userId, req.query.userId))
    ok(res, paginate(list, req.query))
  })

  app.get('/api/coupon/batch/page', (req, res) => {
    let list = [...couponBatches]
    if (req.query.batchCode) list = list.filter(b => like(b.batchCode, req.query.batchCode))
    if (req.query.templateId) list = list.filter(b => numEq(b.templateId, req.query.templateId))
    ok(res, paginate(list, req.query))
  })
  app.post('/api/coupon/batch', (req, res) => {
    const tpl = couponTemplates.find(t => t.id === Number(req.body.templateId))
    couponBatches.unshift({ id: nextId(couponBatches), receivedCount: 0, usedCount: 0, status: 1, templateName: tpl ? tpl.templateName : '', ...req.body })
    ok(res, null, '新增成功')
  })
  app.put('/api/coupon/batch', (req, res) => {
    const b = couponBatches.find(x => x.id === Number(req.body.id))
    if (b) Object.assign(b, req.body)
    ok(res, null, '修改成功')
  })
  app.delete('/api/coupon/batch/:id', (req, res) => {
    const i = couponBatches.findIndex(x => x.id === Number(req.params.id))
    if (i > -1) couponBatches.splice(i, 1)
    ok(res, null, '删除成功')
  })

  app.post('/api/coupon/issue', (req, res) => {
    const { templateId, userId } = req.body
    const tpl = couponTemplates.find(t => t.id === Number(templateId))
    const user = users.find(u => u.id === Number(userId))
    if (!tpl) return fail(res, '卡券模板不存在', 404)
    if (tpl.issuedCount >= tpl.totalCount) return fail(res, '卡券已发完')
    tpl.issuedCount++
    coupons.unshift({
      id: nextId(coupons),
      tenantId: 1,
      couponCode: `FLS2026${String(200001 + coupons.length)}`,
      traceCode: `TRC2026${String(40001 + coupons.length)}`,
      templateId: tpl.id,
      templateName: tpl.templateName,
      couponType: tpl.couponType,
      userId: user ? user.id : 2,
      userName: user ? user.realName : '张三',
      faceValue: tpl.faceValue || Math.round(tpl.discount * 100),
      minAmount: tpl.minAmount,
      status: 0,
      receiveChannel: '后台发放',
      receivedTime: fmt(new Date()),
      usedTime: null,
      expireTime: tpl.validEndTime,
      orderNo: null
    })
    ok(res, null, '发放成功')
  })

  /* ---------------- 订单 ---------------- */
  app.get('/api/order/info/page', (req, res) => {
    let list = [...orders].sort((a, b) => b.createTime.localeCompare(a.createTime))
    if (req.query.orderNo) list = list.filter(o => like(o.orderNo, req.query.orderNo))
    if (req.query.userName) list = list.filter(o => like(o.userName, req.query.userName))
    if (!numEq(null, req.query.userId)) list = list.filter(o => numEq(o.userId, req.query.userId))
    if (!numEq(null, req.query.orderStatus)) list = list.filter(o => numEq(o.orderStatus, req.query.orderStatus))
    if (!numEq(null, req.query.payStatus)) list = list.filter(o => numEq(o.payStatus, req.query.payStatus))
    const result = paginate(list, req.query)
    result.records = result.records.map(order => ({
      ...order,
      items: (orderItemsByOrderId.get(order.id) || orderItems.filter(item => item.orderId === order.id)).map(item => ({ ...item, spuImage: item.spuImage || item.image }))
    }))
    ok(res, result)
  })
  app.get('/api/order/info/:id', (req, res) => {
    const id = Number(req.params.id)
    const order = ordersById.get(id) || orders.find(o => o.id === id)
    if (!order) return fail(res, '订单不存在', 404)
    ok(res, { ...order, items: orderItemsByOrderId.get(order.id) || orderItems.filter(i => i.orderId === order.id) })
  })
  app.put('/api/order/info', (req, res) => {
    const order = orders.find(o => o.id === Number(req.body.id))
    if (!order) return fail(res, '订单不存在', 404)
    Object.assign(order, req.body)
    if (order.orderStatus === 2 && !order.shipTime) order.shipTime = fmt(new Date())
    if (order.orderStatus === 4) order.payStatus = 0
    ok(res, null, '操作成功')
  })

  app.get('/api/order/list', (req, res) => {
    let list = [...orders].sort((a, b) => b.createTime.localeCompare(a.createTime))
    if (req.query.userId) list = list.filter(o => numEq(o.userId, req.query.userId))
    if (!numEq(null, req.query.orderStatus)) list = list.filter(o => numEq(o.orderStatus, req.query.orderStatus))
    ok(res, list.map(o => ({ ...o, items: orderItemsByOrderId.get(o.id) || orderItems.filter(i => i.orderId === o.id) })))
  })

  app.get('/api/order/detail/:orderNo', (req, res) => {
    const order = ordersByNo.get(req.params.orderNo) || orders.find(o => o.orderNo === req.params.orderNo)
    if (!order) return fail(res, '订单不存在', 404)
    ok(res, { ...order, items: orderItemsByOrderNo.get(order.orderNo) || orderItems.filter(i => i.orderNo === order.orderNo) })
  })

  app.put('/api/order/:id/cancel', (req, res) => {
    const order = orders.find(o => o.id === Number(req.params.id))
    if (!order) return fail(res, '订单不存在', 404)
    order.orderStatus = 4
    order.payStatus = 0
    orderItems.filter(i => i.orderId === order.id).forEach(i => {
      const sku = skus.find(s => s.id === i.skuId)
      if (sku) sku.stock += i.quantity
    })
    ok(res, null, '订单已取消')
  })

  /* ---------------- 支付 ---------------- */
  app.get('/api/pay/record', (req, res) => {
    let list = [...payRecords].sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)))
    if (req.query.payNo) list = list.filter(p => like(p.payNo, req.query.payNo))
    if (req.query.orderNo) list = list.filter(p => like(p.orderNo, req.query.orderNo))
    if (!numEq(null, req.query.payStatus)) list = list.filter(p => numEq(p.payStatus, req.query.payStatus))
    if (!numEq(null, req.query.payMethod)) list = list.filter(p => numEq(p.payMethod, req.query.payMethod))
    ok(res, paginate(list, req.query))
  })
  app.get('/api/pay/refund', (req, res) => ok(res, paginate([...refunds].reverse(), req.query)))
  app.get('/api/pay/config', (req, res) => ok(res, [
    { id: 1, tenantId: 1, tenantName: '南樾星数字科技有限公司', payMethods: '微信支付 / 支付宝 / 余额', enabled: 1, createTime: timeAgo(300) },
    { id: 2, tenantId: 2, tenantName: '福礼社运营中心', payMethods: '微信支付 / 支付宝', enabled: 1, createTime: timeAgo(280) },
    { id: 3, tenantId: 3, tenantName: '新春礼品有限公司', payMethods: '微信支付', enabled: 0, createTime: timeAgo(200) }
  ]))
  app.get('/api/pay/query/:payNo', (req, res) => {
    const p = payRecords.find(x => x.payNo === req.params.payNo)
    if (!p) return fail(res, '支付单不存在', 404)
    ok(res, p)
  })

  /* ---------------- 数据看板 ---------------- */
  const buildOverview = () => {
    const paid = orders.filter(o => o.payStatus === 1)
    const totalSales = paid.reduce((s, o) => s + o.payAmount, 0)
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = `${d.getMonth() + 1}/${d.getDate()}`
      days.push({ date: key, orders: 120 + ((d.getDate() * 37) % 180), sales: 38000 + ((d.getDate() * 913) % 62000) })
    }
    const categorySales = categories.slice(0, 8).map((c, i) => ({
      name: c.categoryName,
      value: products.filter(p => p.categoryId === c.id).reduce((s, p) => s + p.sales, 0) * (30 + i)
    }))
    const orderStatus = [
      { name: '待支付', value: orders.filter(o => o.orderStatus === 0).length },
      { name: '已支付', value: orders.filter(o => o.orderStatus === 1).length },
      { name: '已发货', value: orders.filter(o => o.orderStatus === 2).length },
      { name: '已完成', value: orders.filter(o => o.orderStatus === 3).length },
      { name: '已取消', value: orders.filter(o => o.orderStatus === 4).length }
    ]
    return {
      stats: {
        totalUsers: users.length,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalSales,
        todayOrders: 186,
        todaySales: 128600,
        pendingShipments: orders.filter(o => o.orderStatus === 1).length,
        chainHeight: chainMeta.height,
        chainTx: chainMeta.totalTx,
        totalCoupons: coupons.length,
        usedCoupons: coupons.filter(c => c.status === 1).length,
        supplierCount: suppliers.length,
        lowStock: inventory.filter(i => i.status !== 'normal').length,
        unsettled: settlements.filter(s => s.status !== 2).length
      },
      trend: days,
      categorySales,
      orderStatus,
      recentOrders: [...orders].sort((a, b) => b.createTime.localeCompare(a.createTime)).slice(0, 6),
      chainActivity: chainTxs.slice(-8).reverse(),
      supplyAlerts: inventory.filter(i => i.status !== 'normal').slice(0, 5),
      hotProducts: [...products].sort((a, b) => b.sales - a.sales).slice(0, 5),
      latestBlock: chainBlocks[chainBlocks.length - 1]
    }
  }
  app.get('/api/dashboard/overview', (req, res) => ok(res, buildOverview()))
  app.get('/api/statistics', (req, res) => ok(res, buildOverview().stats))
}

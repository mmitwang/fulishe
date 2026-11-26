const { users, tenants, roles, roleMenus, products, skus } = require('./seed.cjs')
const { menuList, orders, orderItems } = require('./seed-extra.cjs')

const ALL = 'ALL'
const MERCHANT = 'MERCHANT'
const SUPER_ADMIN = 'super_admin'
const MERCHANT_ADMIN = 'merchant_admin'

const respondError = (res, status, message) => res.status(status).json({ code: status, message, msg: message, data: null })
const unauthorized = (res, message = '登录状态无效，请重新登录') => respondError(res, 401, message)
const forbidden = (res, message = '没有权限执行此操作') => respondError(res, 403, message)

const extractToken = req => {
  const headerToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (headerToken) return headerToken
  const bodyToken = typeof req.body === 'string' ? req.body : req.body && req.body.refreshToken
  return String(bodyToken || '').replace(/^Bearer\s+/i, '').trim()
}

function createAuthz(jwt, secretKey) {
  const rolesForUser = user => (Array.isArray(user.roleIds) ? user.roleIds : [])
    .map(id => roles.find(role => role.id === Number(id)))
    .filter(Boolean)

  const permissionsForRoles = userRoles => {
    if (userRoles.some(role => role.roleCode === SUPER_ADMIN)) return ['*:*:*']
    const allowedMenuIds = new Set()
    userRoles.forEach(role => (roleMenus[role.id] || []).forEach(id => allowedMenuIds.add(Number(id))))
    return [...new Set(menuList
      .filter(menu => allowedMenuIds.has(menu.id) && menu.permission)
      .map(menu => menu.permission))]
  }

  const buildContext = user => {
    const userRoles = rolesForUser(user)
    const roleCodes = userRoles.map(role => role.roleCode)
    const roleNames = userRoles.map(role => role.roleName)
    const tenant = tenants.find(item => item.id === Number(user.tenantId)) || null
    const dataScope = userRoles.some(role => role.roleCode === SUPER_ADMIN || role.dataScope === ALL) ? ALL : MERCHANT
    const merchantId = dataScope === MERCHANT ? Number(user.tenantId) : null
    return {
      user,
      tenant,
      roles: userRoles,
      roleIds: userRoles.map(role => role.id),
      roleCodes,
      roleNames,
      permissions: permissionsForRoles(userRoles),
      dataScope,
      merchantId,
      merchantName: dataScope === MERCHANT && tenant ? tenant.tenantName : ''
    }
  }

  const getUserInfo = user => {
    const auth = buildContext(user)
    return {
      id: user.id,
      tenantId: user.tenantId,
      tenantName: auth.tenant ? auth.tenant.tenantName : '',
      username: user.username,
      nickname: user.nickname,
      realName: user.realName,
      avatar: '',
      mobile: user.mobile,
      email: user.email,
      userType: user.userType,
      deptName: user.deptName,
      roleIds: auth.roleIds,
      roleName: auth.roleNames.join('、') || user.roleName || '',
      roleNames: auth.roleNames,
      roleCodes: auth.roleCodes,
      permissions: auth.permissions,
      dataScope: auth.dataScope,
      merchantId: auth.merchantId,
      merchantName: auth.merchantName
    }
  }

  const getAccountRejection = user => {
    if (Number(user.status) !== 1) return '账号已禁用，请联系管理员'
    const auth = buildContext(user)
    if (!auth.roleCodes.includes(MERCHANT_ADMIN)) return ''
    if (!auth.tenant) return '所属商户不存在'
    if (Number(auth.tenant.status) !== 1) return '所属商户已禁用，请联系平台管理员'
    if (Number(auth.tenant.auditStatus) !== 1) {
      const reason = auth.tenant.auditRemark ? `：${auth.tenant.auditRemark}` : ''
      return `${Number(auth.tenant.auditStatus) === 0 ? '商户正在审核中' : '商户审核未通过'}${reason}`
    }
    return ''
  }

  const authenticate = (req, res, next) => {
    const token = extractToken(req)
    if (!token) return unauthorized(res, '请先登录')
    let payload
    try {
      payload = jwt.verify(token, secretKey)
    } catch (error) {
      return unauthorized(res)
    }
    const user = users.find(item => item.id === Number(payload.id))
    if (!user) return unauthorized(res, '用户不存在或已删除')
    const rejection = getAccountRejection(user)
    if (rejection) return forbidden(res, rejection)
    req.auth = buildContext(user)
    next()
  }

  const hasPermission = (auth, permission) => !!auth && (
    auth.roleCodes.includes(SUPER_ADMIN) ||
    auth.permissions.includes('*:*:*') ||
    auth.permissions.includes(permission)
  )

  const requirePermission = permission => (req, res, next) => {
    if (!req.auth) return unauthorized(res, '请先登录')
    if (!hasPermission(req.auth, permission)) return forbidden(res, `缺少权限：${permission}`)
    next()
  }

  const requireSuperAdmin = (req, res, next) => {
    if (!req.auth) return unauthorized(res, '请先登录')
    if (!req.auth.roleCodes.includes(SUPER_ADMIN)) return forbidden(res, '仅系统管理员可执行此操作')
    next()
  }

  const signToken = user => jwt.sign(
    { id: user.id, tenantId: user.tenantId, username: user.username, userType: user.userType },
    secretKey,
    { expiresIn: '24h' }
  )

  const scopeMerchant = (auth, list, merchantIdOf = item => item.merchantId) => {
    if (auth.dataScope === ALL) return [...list]
    return list.filter(item => Number(merchantIdOf(item)) === Number(auth.merchantId))
  }

  const assertMerchantAccess = (auth, merchantId) => auth.dataScope === ALL || Number(merchantId) === Number(auth.merchantId)

  const getOrderItems = order => orderItems.filter(item =>
    item.orderId === order.id || (item.orderNo && item.orderNo === order.orderNo)
  )

  const getOrderMerchantIds = order => {
    const merchantIds = new Set()
    getOrderItems(order).forEach(item => {
      const sku = skus.find(candidate => candidate.id === Number(item.skuId))
      const spuId = sku ? sku.spuId : item.spuId
      const product = products.find(candidate => candidate.id === Number(spuId))
      const merchantId = product ? product.merchantId : sku ? sku.merchantId : null
      if (merchantId != null) merchantIds.add(Number(merchantId))
    })
    return [...merchantIds].sort((a, b) => a - b)
  }

  const getOrderMerchantFields = order => {
    const merchantIds = getOrderMerchantIds(order)
    return {
      merchantId: merchantIds.length === 1 ? merchantIds[0] : null,
      merchantIds,
      merchantNames: merchantIds.map(id => (tenants.find(tenant => tenant.id === id) || {}).tenantName || `商户 ${id}`),
      multiMerchant: merchantIds.length > 1
    }
  }

  const canAccessOrder = (auth, order) => {
    if (auth.dataScope === ALL) return true
    const merchantIds = getOrderMerchantIds(order)
    return merchantIds.length === 1 && merchantIds[0] === Number(auth.merchantId)
  }

  const scopeOrders = (auth, list = orders) => list.filter(order => canAccessOrder(auth, order))
  const getRecordOrder = record => orders.find(order =>
    (record.orderId != null && order.id === Number(record.orderId)) || order.orderNo === record.orderNo
  ) || null

  const buildMenuTree = () => {
    const nodes = new Map(menuList.map(menu => [menu.id, { ...menu, children: [] }]))
    const roots = []
    nodes.forEach(node => {
      const parent = nodes.get(Number(node.parentId))
      if (parent && parent.id !== node.id) parent.children.push(node)
      else roots.push(node)
    })
    const sortNodes = items => {
      items.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0) || a.id - b.id)
      items.forEach(item => sortNodes(item.children))
      return items
    }
    return sortNodes(roots)
  }

  return {
    authenticate,
    requirePermission,
    requireSuperAdmin,
    hasPermission,
    signToken,
    getUserInfo,
    getAccountRejection,
    scopeMerchant,
    assertMerchantAccess,
    getOrderItems,
    getOrderMerchantIds,
    getOrderMerchantFields,
    canAccessOrder,
    scopeOrders,
    getRecordOrder,
    buildMenuTree,
    unauthorized,
    forbidden
  }
}

module.exports = { createAuthz, extractToken, respondError, ALL, MERCHANT, SUPER_ADMIN, MERCHANT_ADMIN }

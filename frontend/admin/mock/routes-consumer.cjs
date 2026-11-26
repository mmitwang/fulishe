const { ok, fail, fmt, like } = require('./helpers.cjs')
const { products } = require('./seed.cjs')

const stores = [
  { id: 1, name: '西湖银泰店', city: '杭州市', district: '西湖区', address: '浙江省杭州市西湖区文三路 90 号', latitude: 30.2741, longitude: 120.1276, businessHours: '08:30-22:00', deliveryMinutes: 30 },
  { id: 2, name: '钱江新城店', city: '杭州市', district: '上城区', address: '浙江省杭州市上城区解放东路 58 号', latitude: 30.2465, longitude: 120.2106, businessHours: '09:00-21:30', deliveryMinutes: 45 },
  { id: 3, name: '滨江星光店', city: '杭州市', district: '滨江区', address: '浙江省杭州市滨江区江南大道 228 号', latitude: 30.2084, longitude: 120.2108, businessHours: '09:00-22:00', deliveryMinutes: 60 }
]

const addresses = [
  { id: 1, userId: 2, receiver: '张三', mobile: '13800138005', region: '浙江省杭州市西湖区', detail: '文三路 90 号 3 幢 502 室', tag: '家', isDefault: true, createTime: '2026-11-01 10:00:00' },
  { id: 2, userId: 2, receiver: '张三', mobile: '13800138005', region: '浙江省杭州市滨江区', detail: '江南大道 228 号行政部', tag: '公司', isDefault: false, createTime: '2026-11-02 10:00:00' },
  { id: 3, userId: 4, receiver: '李静', mobile: '13800138007', region: '上海市浦东新区', detail: '世纪大道 100 号市场部', tag: '公司', isDefault: true, createTime: '2026-11-03 10:00:00' }
]

const hotKeywords = ['节庆礼盒', '员工福利', '月饼', '坚果', '龙井茶', '商务伴手礼']
const nextId = arr => arr.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1
const getUserId = req => Number((req.body && req.body.userId) || req.query.userId || 2)
const sortedAddresses = userId => addresses
  .filter(item => item.userId === userId)
  .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.id - a.id)

const validateAddress = address => {
  if (!address.receiver || String(address.receiver).trim().length < 2) return '请填写收货人姓名'
  if (!/^1\d{10}$/.test(String(address.mobile || ''))) return '请填写 11 位手机号码'
  if (!address.region || String(address.region).trim().length < 2) return '请填写省市区'
  if (!address.detail || String(address.detail).trim().length < 2) return '请填写详细门牌号'
  return ''
}

module.exports = function registerConsumerRoutes(app) {
  app.get('/api/h5/stores', (req, res) => ok(res, stores))

  app.get('/api/h5/fulfillment', (req, res) => {
    const store = stores.find(item => item.id === Number(req.query.storeId || 1)) || stores[0]
    ok(res, {
      store,
      arrivalText: `最快 ${store.deliveryMinutes} 分钟送达`,
      slots: [
        { id: 'asap', label: '尽快送达', period: `预计 ${store.deliveryMinutes} 分钟`, available: true },
        { id: 'today-evening', label: '今天', period: '18:00 - 20:00', available: true },
        { id: 'tomorrow-morning', label: '明天', period: '09:00 - 12:00', available: true },
        { id: 'tomorrow-afternoon', label: '明天', period: '14:00 - 18:00', available: true }
      ]
    })
  })

  app.get('/api/h5/search/hot', (req, res) => ok(res, { hotKeywords }))

  app.get('/api/h5/search/suggest', (req, res) => {
    const keyword = String(req.query.keyword || '').trim()
    if (!keyword) return ok(res, [])
    const candidates = [...hotKeywords, ...products.flatMap(item => [item.spuName, item.brandName, item.categoryName])]
    const result = [...new Set(candidates.filter(item => like(item, keyword)))].slice(0, 8)
    ok(res, result)
  })

  app.get('/api/h5/addresses', (req, res) => ok(res, sortedAddresses(getUserId(req))))

  app.post('/api/h5/addresses', (req, res) => {
    const userId = getUserId(req)
    const error = validateAddress(req.body)
    if (error) return fail(res, error)
    const userAddresses = addresses.filter(item => item.userId === userId)
    const isDefault = Boolean(req.body.isDefault) || userAddresses.length === 0
    if (isDefault) userAddresses.forEach(item => { item.isDefault = false })
    const address = {
      id: nextId(addresses),
      userId,
      receiver: String(req.body.receiver).trim(),
      mobile: String(req.body.mobile).trim(),
      region: String(req.body.region).trim(),
      detail: String(req.body.detail).trim(),
      tag: String(req.body.tag || '家').trim() || '家',
      isDefault,
      createTime: fmt(new Date())
    }
    addresses.push(address)
    ok(res, address, '地址已保存')
  })

  app.put('/api/h5/addresses/:id', (req, res) => {
    const userId = getUserId(req)
    const address = addresses.find(item => item.id === Number(req.params.id) && item.userId === userId)
    if (!address) return fail(res, '收货地址不存在', 404)
    const next = { ...address, ...req.body, id: address.id, userId }
    const error = validateAddress(next)
    if (error) return fail(res, error)
    if (next.isDefault) addresses.filter(item => item.userId === userId).forEach(item => { item.isDefault = false })
    Object.assign(address, {
      receiver: String(next.receiver).trim(),
      mobile: String(next.mobile).trim(),
      region: String(next.region).trim(),
      detail: String(next.detail).trim(),
      tag: String(next.tag || '家').trim() || '家',
      isDefault: Boolean(next.isDefault)
    })
    const remaining = sortedAddresses(userId)
    if (remaining.length && !remaining.some(item => item.isDefault)) remaining[0].isDefault = true
    ok(res, address, '地址已更新')
  })

  app.delete('/api/h5/addresses/:id', (req, res) => {
    const userId = getUserId(req)
    const index = addresses.findIndex(item => item.id === Number(req.params.id) && item.userId === userId)
    if (index < 0) return fail(res, '收货地址不存在', 404)
    const [removed] = addresses.splice(index, 1)
    if (removed.isDefault) {
      const first = sortedAddresses(userId)[0]
      if (first) first.isDefault = true
    }
    ok(res, null, '地址已删除')
  })
}

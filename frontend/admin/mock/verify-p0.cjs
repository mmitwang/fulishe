/**
 * 消费端 P0：门店履约、搜索、地址簿接口回归。
 * 运行：node mock/verify-p0.cjs（需先配置共享 NODE_PATH）。
 */
const { spawn } = require('child_process')
const net = require('net')
const path = require('path')

let failCount = 0
let baseUrl = ''
let serverProcess = null
let serverOutput = ''

const check = (name, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!pass) failCount++
}

const request = async (url, { method = 'GET', body } = {}) => {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  return { status: response.status, body: await response.json() }
}

const expectData = async (name, url, options = {}) => {
  const response = await request(url, options)
  const code = response.body && response.body.code
  const message = response.body && (response.body.message || response.body.msg)
  check(name, response.status === 200 && code === 200, `HTTP ${response.status} / code ${code}${message ? ' / ' + message : ''}`)
  if (response.status !== 200 || code !== 200) throw new Error(`${name}: ${message || response.status}`)
  return response.body.data
}

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.unref()
  server.on('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port
    server.close(() => resolve(port))
  })
})

const waitUntilReady = async () => {
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error(`Mock 进程提前退出：${serverOutput}`)
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) return
    } catch (error) {
      // 服务尚未监听，继续等待。
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`等待 Mock 启动超时：${serverOutput}`)
}

const stopServer = async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 2000)
    timer.unref()
    serverProcess.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
    serverProcess.kill()
  })
}

async function run() {
  const stores = await expectData('门店列表', '/api/h5/stores')
  check('门店包含地址与定位坐标', stores.length >= 3 && stores.every(item => item.address && item.latitude && item.longitude))

  const fulfillment = await expectData('默认门店履约时段', '/api/h5/fulfillment?storeId=1')
  check('30 分钟达与可选时段', fulfillment.arrivalText.includes('30') && fulfillment.slots.length >= 4)
  const secondStore = await expectData('切换门店履约时效', '/api/h5/fulfillment?storeId=2')
  check('不同门店返回不同时效', secondStore.store.id === 2 && secondStore.arrivalText.includes('45'))

  const hot = await expectData('搜索热词', '/api/h5/search/hot')
  check('热词内容可用', hot.hotKeywords.includes('节庆礼盒') && hot.hotKeywords.length >= 6)
  const suggestions = await expectData('搜索联想', '/api/h5/search/suggest?keyword=%E8%8C%B6')
  check('联想词匹配关键词', suggestions.length > 0 && suggestions.some(item => item.includes('茶')))
  const emptySuggestions = await expectData('空关键词不返回联想', '/api/h5/search/suggest')
  check('空联想结果为空数组', Array.isArray(emptySuggestions) && emptySuggestions.length === 0)

  const keywordResult = await expectData('搜索结果', '/api/product/spu/page?spuName=%E5%9D%9A%E6%9E%9C&size=30')
  check('关键词可匹配商品', keywordResult.total > 0 && keywordResult.records.every(item => item.deliveryTag))
  const categoryResult = await expectData('搜索品类筛选', '/api/product/spu/page?spuName=%E7%A4%BC%E7%9B%92&categoryId=3&size=30')
  check('品类筛选结果准确', categoryResult.records.length > 0 && categoryResult.records.every(item => item.categoryId === 3))
  const instantResult = await expectData('极速达筛选', '/api/product/spu/page?instant=1&size=50')
  check('极速达筛选只保留即时履约商品', instantResult.records.length > 0 && instantResult.records.every(item => item.deliveryTag.includes('30 分钟') || item.deliveryTag.includes('即时')))

  const priceAsc = await expectData('价格升序', '/api/product/spu/page?sort=priceAsc&size=50')
  check('价格升序生效', priceAsc.records.every((item, index, list) => index === 0 || list[index - 1].sellPrice <= item.sellPrice))
  const priceDesc = await expectData('价格降序', '/api/product/spu/page?sort=priceDesc&size=50')
  check('价格降序生效', priceDesc.records.every((item, index, list) => index === 0 || list[index - 1].sellPrice >= item.sellPrice))
  const sales = await expectData('销量排序', '/api/product/spu/page?sort=sales&size=50')
  check('销量排序生效', sales.records.every((item, index, list) => index === 0 || list[index - 1].sales >= item.sales))

  const initialAddresses = await expectData('用户地址簿', '/api/h5/addresses?userId=2')
  check('多地址与默认地址种子可用', initialAddresses.length >= 2 && initialAddresses.filter(item => item.isDefault).length === 1)
  const created = await expectData('新增收货地址', '/api/h5/addresses', {
    method: 'POST',
    body: { userId: 2, receiver: '测试收货人', mobile: '13800138099', region: '浙江省杭州市拱墅区', detail: '湖墅南路 66 号', tag: '公司', isDefault: false }
  })
  check('新增地址保留原默认地址', created.id > 0 && created.isDefault === false)

  const updated = await expectData('编辑并设为默认地址', `/api/h5/addresses/${created.id}`, {
    method: 'PUT',
    body: { userId: 2, receiver: '测试收货人甲', isDefault: true }
  })
  check('编辑内容与默认标记生效', updated.receiver === '测试收货人甲' && updated.isDefault === true)
  const afterDefault = await expectData('默认地址唯一性检查', '/api/h5/addresses?userId=2')
  check('同一用户仅一个默认地址', afterDefault.filter(item => item.isDefault).length === 1 && afterDefault[0].id === created.id)
  const otherUser = await expectData('其他用户地址隔离', '/api/h5/addresses?userId=4')
  check('默认地址切换不影响其他用户', otherUser.length === 1 && otherUser[0].isDefault === true)

  await expectData('删除收货地址', `/api/h5/addresses/${created.id}?userId=2`, { method: 'DELETE' })
  const afterDelete = await expectData('删除后地址簿', '/api/h5/addresses?userId=2')
  check('删除默认地址后自动递补', !afterDelete.some(item => item.id === created.id) && afterDelete.filter(item => item.isDefault).length === 1)
  const invalid = await request('/api/h5/addresses', {
    method: 'POST',
    body: { userId: 2, receiver: '测试', mobile: '123', region: '浙江省杭州市', detail: '测试地址' }
  })
  check('非法手机号被拦截', invalid.body.code !== 200)

  const product = keywordResult.records[0]
  const detail = await expectData('履约商品详情', `/api/h5/product/${product.id}`)
  const order = await expectData('订单携带门店与配送时段', '/api/order/info/create', {
    method: 'POST',
    body: {
      userId: 2,
      addressId: initialAddresses[0].id,
      receiver: '张三',
      mobile: '13800138005',
      address: '浙江省杭州市西湖区文三路 90 号',
      storeId: 1,
      storeName: '西湖银泰店',
      deliverySlot: '尽快送达 预计 30 分钟',
      items: [{ skuId: detail.skus[0].id, quantity: 1 }]
    }
  })
  check('订单履约字段完整', order.storeId === 1 && order.storeName === '西湖银泰店' && order.deliverySlot.includes('30 分钟') && order.addressId === initialAddresses[0].id)
}

;(async () => {
  try {
    const port = await getFreePort()
    baseUrl = `http://127.0.0.1:${port}`
    serverProcess = spawn(process.execPath, [path.join(__dirname, '..', 'mock-server.cjs')], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    serverProcess.stdout.on('data', chunk => { serverOutput += chunk.toString() })
    serverProcess.stderr.on('data', chunk => { serverOutput += chunk.toString() })
    await waitUntilReady()
    console.log(`独立 Mock 进程 PID=${serverProcess.pid}，端口=${port}\n`)
    await run()
  } catch (error) {
    console.error('\nP0 回归执行失败：', error.message)
    failCount++
  } finally {
    await stopServer()
    console.log(`\nP0 回归结束：${failCount === 0 ? '全部通过' : `${failCount} 项失败`}`)
    process.exitCode = failCount === 0 ? 0 : 1
  }
})()

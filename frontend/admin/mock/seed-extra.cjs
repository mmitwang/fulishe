const { img, hash, fmt, daysAgo, timeAgo, randInt } = require('./helpers.cjs')
const { users, products, skus, tenants } = require('./seed.cjs')

/* ---------------- 卡券模板 / 批次 / 卡券 ---------------- */
const couponTemplates = [
  { id: 1, tenantId: 1, templateCode: 'TPL2026001', templateName: '新人专享 50 元券', couponType: 1, faceValue: 50, discount: 1, minAmount: 200, totalCount: 1000, issuedCount: 668, perUserLimit: 2, applicableScope: '全场通用', validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-12-31 23:59:59', status: 1, createTime: timeAgo(300) },
  { id: 2, tenantId: 1, templateCode: 'TPL2026002', templateName: '满 500 减 100 券', couponType: 1, faceValue: 100, discount: 1, minAmount: 500, totalCount: 500, issuedCount: 356, perUserLimit: 1, applicableScope: '全场通用', validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-12-31 23:59:59', status: 1, createTime: timeAgo(280) },
  { id: 3, tenantId: 1, templateCode: 'TPL2026003', templateName: '中秋 8.8 折券', couponType: 2, faceValue: 0, discount: 0.88, minAmount: 300, totalCount: 800, issuedCount: 423, perUserLimit: 3, applicableScope: '节庆礼盒', validStartTime: '2026-08-01 00:00:00', validEndTime: '2026-10-31 23:59:59', status: 1, createTime: timeAgo(200) },
  { id: 4, tenantId: 1, templateCode: 'TPL2026004', templateName: '无门槛 30 元券', couponType: 3, faceValue: 30, discount: 1, minAmount: 0, totalCount: 2000, issuedCount: 1560, perUserLimit: 5, applicableScope: '全场通用', validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-12-31 23:59:59', status: 1, createTime: timeAgo(180) },
  { id: 5, tenantId: 1, templateCode: 'TPL2026005', templateName: '企业集采 9 折券', couponType: 2, faceValue: 0, discount: 0.9, minAmount: 1000, totalCount: 300, issuedCount: 128, perUserLimit: 1, applicableScope: '企业采购', validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-12-31 23:59:59', status: 1, createTime: timeAgo(150) },
  { id: 6, tenantId: 1, templateCode: 'TPL2026006', templateName: '茶酒专享 80 元券', couponType: 1, faceValue: 80, discount: 1, minAmount: 500, totalCount: 400, issuedCount: 210, perUserLimit: 2, applicableScope: '茶酒饮品', validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-12-31 23:59:59', status: 1, createTime: timeAgo(120) },
  { id: 7, tenantId: 1, templateCode: 'TPL2026007', templateName: '数码焕新 150 元券', couponType: 1, faceValue: 150, discount: 1, minAmount: 800, totalCount: 200, issuedCount: 96, perUserLimit: 1, applicableScope: '数码家电', validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-12-31 23:59:59', status: 1, createTime: timeAgo(90) },
  { id: 8, tenantId: 1, templateCode: 'TPL2026008', templateName: '年货节 7.5 折券', couponType: 2, faceValue: 0, discount: 0.75, minAmount: 200, totalCount: 600, issuedCount: 480, perUserLimit: 2, applicableScope: '全场通用', validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-02-28 23:59:59', status: 0, createTime: timeAgo(60) }
]

const couponBatches = [
  { id: 1, batchCode: 'BATCH2026001', templateId: 1, templateName: '新人专享 50 元券', releaseCount: 500, receivedCount: 468, usedCount: 286, releaseTime: timeAgo(90), validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-12-31 23:59:59', status: 1, remark: '新客首单自动发放' },
  { id: 2, batchCode: 'BATCH2026002', templateId: 2, templateName: '满 500 减 100 券', releaseCount: 300, receivedCount: 268, usedCount: 156, releaseTime: timeAgo(80), validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-12-31 23:59:59', status: 1, remark: '企业客户定向发放' },
  { id: 3, batchCode: 'BATCH2026003', templateId: 3, templateName: '中秋 8.8 折券', releaseCount: 800, receivedCount: 423, usedCount: 301, releaseTime: timeAgo(60), validStartTime: '2026-08-01 00:00:00', validEndTime: '2026-10-31 23:59:59', status: 1, remark: '中秋营销活动' },
  { id: 4, batchCode: 'BATCH2026004', templateId: 4, templateName: '无门槛 30 元券', releaseCount: 1000, receivedCount: 860, usedCount: 640, releaseTime: timeAgo(45), validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-12-31 23:59:59', status: 1, remark: '小程序拉新活动' },
  { id: 5, batchCode: 'BATCH2026005', templateId: 5, templateName: '企业集采 9 折券', releaseCount: 200, receivedCount: 128, usedCount: 88, releaseTime: timeAgo(30), validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-12-31 23:59:59', status: 1, remark: '集采客户专属' },
  { id: 6, batchCode: 'BATCH2026006', templateId: 7, templateName: '数码焕新 150 元券', releaseCount: 200, receivedCount: 96, usedCount: 42, releaseTime: timeAgo(15), validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-12-31 23:59:59', status: 1, remark: '数码品类活动' },
  { id: 7, batchCode: 'BATCH2026007', templateId: 6, templateName: '茶酒专享 80 元券', releaseCount: 100, receivedCount: 96, usedCount: 55, releaseTime: timeAgo(8), validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-12-31 23:59:59', status: 1, remark: '茶酒专区' },
  { id: 8, batchCode: 'BATCH2026008', templateId: 8, templateName: '年货节 7.5 折券', releaseCount: 600, receivedCount: 480, usedCount: 402, releaseTime: timeAgo(120), validStartTime: '2026-01-01 00:00:00', validEndTime: '2026-02-28 23:59:59', status: 2, remark: '活动已结束' }
]

const coupons = []
const couponStatusPool = [1, 1, 0, 0, 1, 0, 2, 1, 0, 3, 1, 0, 1, 0, 2, 1, 0, 1, 1, 0, 3, 0, 1, 1, 0, 2, 1, 0, 1, 0]
for (let i = 0; i < 30; i++) {
  const tpl = couponTemplates[i % 8]
  const user = users[i % 10]
  const status = couponStatusPool[i]
  const receivedDay = 40 - i
  coupons.push({
    id: i + 1,
    tenantId: 1,
    couponCode: `FLS2026${String(100001 + i)}`,
    traceCode: `TRC2026${String(30001 + i)}`,
    templateId: tpl.id,
    templateName: tpl.templateName,
    couponType: tpl.couponType,
    userId: user.id,
    userName: user.realName,
    faceValue: tpl.faceValue || Math.round(tpl.discount * 100),
    minAmount: tpl.minAmount,
    status,
    receiveChannel: i % 3 === 0 ? '小程序领取' : i % 3 === 1 ? '企业发放' : 'H5 领取',
    receivedTime: timeAgo(receivedDay, 9 + (i % 8)),
    usedTime: status === 1 ? timeAgo(Math.max(1, receivedDay - 3), 15) : null,
    expireTime: tpl.validEndTime,
    orderNo: status === 1 ? `ORD2026${String(900100 + i)}` : null,
    transferTo: status === 3 ? users[(i + 3) % 10].realName : null
  })
}

/* ---------------- 订单 / 支付 / 退款 ---------------- */
const addresses = [
  '浙江省杭州市西湖区文三路 90 号东部软件园 3 号楼',
  '上海市浦东新区世纪大道 100 号环球金融中心',
  '北京市朝阳区建国路 88 号 SOHO 现代城',
  '广东省深圳市南山区科技园南区 8 栋',
  '四川省成都市高新区天府大道 666 号',
  '江苏省南京市鼓楼区中山北路 200 号',
  '湖北省武汉市洪山区光谷大道 77 号',
  '陕西省西安市高新区锦业路 66 号'
]
const payMethods = ['wechat', 'alipay', 'balance']
const orderStatusPool = [3, 3, 2, 2, 1, 1, 0, 4, 3, 2, 1, 3, 4, 2, 0, 3, 1, 2, 3, 0]
const orders = []
const orderItems = []
for (let u = 0; u < users.length; u++) {
  const user = users[u]
  for (let k = 0; k < 4; k++) {
    const idx = u * 4 + k
    const orderStatus = orderStatusPool[idx % orderStatusPool.length]
    const payStatus = orderStatus === 0 ? 0 : 1
    const payMethod = orderStatus === 0 ? '' : payMethods[idx % 3]
    const first = skus[(idx * 3) % skus.length]
    const second = skus[(idx * 7 + 5) % skus.length]
    const useSecond = idx % 3 === 0 && second.id !== first.id
    const quantity = (idx % 3) + 1
    const totalAmount = first.price * quantity + (useSecond ? second.price : 0)
    const discountAmount = idx % 4 === 0 ? 30 : 0
    const payAmount = totalAmount - discountAmount
    const orderNo = `ORD2026${String(900100 + idx)}`
    const createDay = 45 - idx
    const order = {
      id: idx + 1,
      orderNo,
      userId: user.id,
      userName: user.realName,
      mobile: user.mobile,
      address: addresses[idx % addresses.length],
      orderType: idx % 5 === 0 ? 1 : 0,
      orderStatus,
      payStatus,
      totalAmount,
      discountAmount,
      payAmount,
      payMethod,
      payNo: payStatus === 1 ? `PAY2026${String(700100 + idx)}` : null,
      payTime: payStatus === 1 ? timeAgo(createDay, 14) : null,
      shipTime: orderStatus >= 2 ? timeAgo(Math.max(0, createDay - 1), 10) : null,
      completeTime: orderStatus === 3 ? timeAgo(Math.max(0, createDay - 2), 16) : null,
      remark: orderStatus === 4 ? '客户取消订单' : '',
      source: idx % 3 === 0 ? '小程序' : idx % 3 === 1 ? 'H5 商城' : '企业集采',
      tenantId: user.tenantId,
      createTime: timeAgo(createDay, 11),
      itemCount: useSecond ? 2 : 1
    }
    orders.push(order)
    orderItems.push({
      id: orderItems.length + 1,
      orderId: order.id,
      orderNo,
      spuId: first.spuId,
      spuName: products.find(p => p.id === first.spuId)?.spuName || '',
      image: products.find(p => p.id === first.spuId)?.image || '',
      skuId: first.id,
      skuCode: first.skuCode,
      skuName: first.skuName,
      quantity,
      unitPrice: first.price,
      totalPrice: first.price * quantity,
      tenantId: user.tenantId
    })
    if (useSecond) {
      orderItems.push({
        id: orderItems.length + 1,
        orderId: order.id,
        orderNo,
        spuId: second.spuId,
        spuName: products.find(p => p.id === second.spuId)?.spuName || '',
        image: products.find(p => p.id === second.spuId)?.image || '',
        skuId: second.id,
        skuCode: second.skuCode,
        skuName: second.skuName,
        quantity: 1,
        unitPrice: second.price,
        totalPrice: second.price,
        tenantId: user.tenantId
      })
    }
  }
}

const payRecords = orders.filter(o => o.payStatus === 1).map((o, i) => ({
  id: i + 1,
  payNo: o.payNo,
  orderNo: o.orderNo,
  tenantId: o.tenantId,
  userId: o.userId,
  payMethod: o.payMethod === 'wechat' ? 1 : o.payMethod === 'alipay' ? 2 : 3,
  payAmount: o.payAmount,
  payStatus: o.orderStatus === 4 ? 4 : 2,
  thirdPayNo: o.payMethod === 'wechat' ? `wx${Date.now()}${i}` : o.payMethod === 'alipay' ? `ali${Date.now()}${i}` : `bank${Date.now()}${i}`,
  payTime: o.payTime,
  createTime: o.createTime,
  notifyCount: 1,
  remark: o.orderStatus === 4 ? '已原路退款' : '',
  channel: o.payMethod === 'wechat' ? '微信支付' : o.payMethod === 'alipay' ? '支付宝' : '余额支付'
}))

const refunds = payRecords.filter(p => p.payStatus === 4).map((p, i) => ({
  id: i + 1,
  refundNo: `REF2026${String(600100 + i)}`,
  payNo: p.payNo,
  orderNo: p.orderNo,
  tenantId: p.tenantId,
  refundAmount: p.payAmount,
  payAmount: p.payAmount,
  refundStatus: 2,
  refundReason: '客户取消订单，原路退回',
  thirdRefundNo: `rf${Date.now()}${i}`,
  refundTime: timeAgo(20 - i, 12),
  createTime: timeAgo(21 - i, 12)
}))
refunds.push(
  { id: refunds.length + 1, refundNo: 'REF202600901', payNo: payRecords[2].payNo, orderNo: payRecords[2].orderNo, tenantId: 1, refundAmount: 168, payAmount: 168, refundStatus: 1, refundReason: '商品包装破损，申请退款', thirdRefundNo: '', refundTime: null, createTime: timeAgo(2, 9) },
  { id: refunds.length + 2, refundNo: 'REF202600902', payNo: payRecords[5].payNo, orderNo: payRecords[5].orderNo, tenantId: 1, refundAmount: 99, payAmount: 99, refundStatus: 0, refundReason: '重复下单，申请退款', thirdRefundNo: '', refundTime: null, createTime: timeAgo(1, 10) }
)

/* ---------------- 发票 ---------------- */
// 发票与订单勾稽：仅已支付且未取消的订单可开票，merchantId 由订单商品归属推导
const invoices = orders
  .filter(o => Number(o.payStatus) === 1 && [1, 2, 3].includes(Number(o.orderStatus)))
  .slice(0, 3)
  .map((o, i) => {
    const item = orderItems.find(it => it.orderId === o.id)
    const product = products.find(p => p.id === Number(item && item.spuId))
    const merchantId = product ? product.merchantId : null
    const tenant = tenants.find(t => t.id === Number(merchantId)) || {}
    const taxRate = 0.06
    const status = i < 2 ? 1 : 0
    return {
      id: i + 1,
      invoiceNo: status === 1 ? `INV2026${String(800100 + i)}` : '',
      orderNo: o.orderNo,
      orderId: o.id,
      merchantId,
      merchantName: tenant.tenantName || '',
      userId: o.userId,
      titleType: i % 2 === 0 ? 2 : 1,
      invoiceType: i % 3 === 0 ? 2 : 1,
      buyerName: i % 2 === 0 ? (tenant.tenantName || '企业客户') : o.userName,
      taxNo: i % 2 === 0 ? `91330100MA2XXXXXX${i}` : '',
      email: `invoice${i + 1}@fulishe.cn`,
      amount: o.payAmount,
      taxRate,
      taxAmount: Number((o.payAmount * taxRate / (1 + taxRate)).toFixed(2)),
      status,
      applyTime: o.createTime,
      issueTime: status === 1 ? o.payTime : null,
      redFlushTime: null,
      redFlushReason: '',
      redFlushNo: '',
      remark: ''
    }
  })

/* ---------------- 福礼社卡（模拟资金账本） ---------------- */
const fuliAccounts = []
const fuliFlows = []
const fuliRecharges = []
const fuliTransfers = []
const fuliOperations = []

/* ---------------- 供应链 ---------------- */
const suppliers = [
  { id: 1, supplierCode: 'SUP001', supplierName: '杭州福礼食品有限公司', contactPerson: '林海', contactPhone: '13900010001', category: '食品礼盒', level: 'A', status: 1, address: '浙江省杭州市余杭区良渚街道 88 号', creditScore: 96, cooperationYears: 5, settledAmount: 1286000, createTime: timeAgo(360) },
  { id: 2, supplierCode: 'SUP002', supplierName: '苏州稻香村食品厂', contactPerson: '顾晓', contactPhone: '13900010002', category: '节庆礼盒', level: 'A', status: 1, address: '江苏省苏州市工业园区星湖街 66 号', creditScore: 94, cooperationYears: 6, settledAmount: 986000, createTime: timeAgo(340) },
  { id: 3, supplierCode: 'SUP003', supplierName: '深圳数码优选供应链', contactPerson: '黄涛', contactPhone: '13900010003', category: '数码家电', level: 'B', status: 1, address: '广东省深圳市南山区科技园北区 12 栋', creditScore: 91, cooperationYears: 3, settledAmount: 1560000, createTime: timeAgo(280) },
  { id: 4, supplierCode: 'SUP004', supplierName: '福建武夷山茶业合作社', contactPerson: '陈茶', contactPhone: '13900010004', category: '茶酒饮品', level: 'A', status: 1, address: '福建省南平市武夷山市星村镇', creditScore: 97, cooperationYears: 4, settledAmount: 620000, createTime: timeAgo(260) },
  { id: 5, supplierCode: 'SUP005', supplierName: '上海歌帝梵贸易有限公司', contactPerson: '周琳', contactPhone: '13900010005', category: '食品礼盒', level: 'A', status: 1, address: '上海市静安区南京西路 1266 号', creditScore: 93, cooperationYears: 2, settledAmount: 410000, createTime: timeAgo(220) },
  { id: 6, supplierCode: 'SUP006', supplierName: '景德镇御窑陶瓷有限公司', contactPerson: '胡窑', contactPhone: '13900010006', category: '家居生活', level: 'B', status: 1, address: '江西省景德镇市珠山区陶溪川', creditScore: 89, cooperationYears: 3, settledAmount: 268000, createTime: timeAgo(180) },
  { id: 7, supplierCode: 'SUP007', supplierName: '北京同仁堂健康药业', contactPerson: '李药', contactPhone: '13900010007', category: '健康关怀', level: 'A', status: 1, address: '北京市大兴区中关村科技园大兴生物医药基地', creditScore: 98, cooperationYears: 7, settledAmount: 890000, createTime: timeAgo(150) },
  { id: 8, supplierCode: 'SUP008', supplierName: '宁波得力办公用品有限公司', contactPerson: '王办', contactPhone: '13900010008', category: '办公用品', level: 'B', status: 1, address: '浙江省宁波市宁海县得力工业园', creditScore: 90, cooperationYears: 2, settledAmount: 156000, createTime: timeAgo(120) }
]
suppliers.forEach((supplier, index) => {
  supplier.merchantId = index % 2 === 0 ? 2 : 3
  supplier.merchantName = (tenants.find(tenant => tenant.id === supplier.merchantId) || {}).tenantName || ''
})

const warehouses = ['杭州中心仓', '上海前置仓', '成都区域仓']
const purchaseOrders = []
const poStatusPool = [3, 2, 1, 1, 3, 0, 2, 3, 1, 0, 3, 2, 1, 3, 0, 2, 3, 1]
for (let i = 0; i < 18; i++) {
  const p1 = products[i % products.length]
  let p2 = products[(i * 5 + 3) % products.length]
  if (p2.merchantId !== p1.merchantId) p2 = products[(products.indexOf(p2) + 1) % products.length]
  const merchantSuppliers = suppliers.filter(item => item.merchantId === p1.merchantId)
  const supplier = merchantSuppliers[Math.floor(i / 2) % merchantSuppliers.length]
  const qty1 = 100 + i * 10
  const items = [{ spuId: p1.id, spuName: p1.spuName, quantity: qty1, price: p1.costPrice }]
  let total = p1.costPrice * qty1
  if (i % 3 === 0) {
    items.push({ spuId: p2.id, spuName: p2.spuName, quantity: 60, price: p2.costPrice })
    total += p2.costPrice * 60
  }
  purchaseOrders.push({
    id: i + 1,
    purchaseNo: `PO2026${String(400100 + i)}`,
    merchantId: p1.merchantId,
    merchantName: p1.merchantName,
    supplierId: supplier.id,
    supplierName: supplier.supplierName,
    items,
    totalAmount: Math.round(total),
    status: poStatusPool[i],
    warehouse: warehouses[i % 3],
    creator: '采购部 · 张三',
    createTime: timeAgo(50 - i * 2, 9 + (i % 8)),
    expectedDate: `2026-${String(11 + (i % 2)).padStart(2, '0')}-${String(15 + (i % 10)).padStart(2, '0')}`,
    remark: i % 4 === 0 ? '节日备货，优先入库' : ''
  })
}

const inventory = products.map((p, i) => {
  const stock = p.stock
  const locked = Math.min(stock, (i * 37) % 120)
  const warningLine = 100
  const available = stock - locked
  return {
    id: i + 1,
    merchantId: p.merchantId,
    merchantName: p.merchantName,
    spuId: p.id,
    spuName: p.spuName,
    image: p.image,
    skuCode: `SKU${2001 + i}`,
    warehouse: warehouses[i % 3],
    stock,
    lockedStock: locked,
    availableStock: available,
    warningLine,
    status: available < warningLine ? 'danger' : available < warningLine * 2.5 ? 'warning' : 'normal',
    updateTime: timeAgo(i % 7, 8 + (i % 10))
  }
})

const carriers = ['顺丰速运', '京东物流', '中通快递', '德邦快递']
const shipments = []
for (let i = 0; i < 16; i++) {
  const order = orders[(i * 3) % orders.length]
  const orderItem = orderItems.find(item => item.orderId === order.id || item.orderNo === order.orderNo)
  const shipmentProduct = orderItem ? products.find(item => item.id === Number(orderItem.spuId)) : null
  const status = i % 4 === 0 ? 0 : i % 4 === 1 ? 1 : 2
  shipments.push({
    id: i + 1,
    merchantId: shipmentProduct ? shipmentProduct.merchantId : null,
    shipmentNo: `SH2026${String(500100 + i)}`,
    orderNo: order.orderNo,
    carrier: carriers[i % carriers.length],
    trackingNo: `SF${Date.now()}${String(1000 + i)}`,
    receiver: order.userName,
    mobile: order.mobile,
    address: order.address,
    status,
    shipTime: status >= 1 ? timeAgo(10 - (i % 8), 9 + (i % 8)) : null,
    arrivalTime: status === 2 ? timeAgo(Math.max(0, 8 - (i % 8)), 15) : null,
    warehouse: warehouses[i % 3],
    chainTxHash: hash(`ship-${i}-${order.orderNo}`)
  })
}

const settlements = suppliers.map((s, i) => {
  const payable = 80000 + i * 23500
  const status = i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 0
  const merchantId = i % 2 === 0 ? 2 : 3
  return {
    id: i + 1,
    settlementNo: `ST2026${String(300100 + i)}`,
    merchantId,
    merchantName: (tenants.find(t => t.id === merchantId) || {}).tenantName || '',
    supplierId: s.id,
    supplierName: s.supplierName,
    period: '2026-10',
    payableAmount: payable,
    paidAmount: status === 2 ? payable : status === 1 ? Math.round(payable * 0.5) : 0,
    status,
    invoiceNo: `INV${202600 + i}`,
    settleTime: status === 2 ? timeAgo(10 - i, 16) : null,
    createTime: timeAgo(20 - i, 10)
  }
})

/* ---------------- 区块链溯源 ---------------- */
const traceRecords = products.slice(0, 16).map((p, i) => {
  const supplier = suppliers[i % suppliers.length]
  const base = 12 - (i % 6)
  const steps = [
    { name: '原料采购', time: timeAgo(base + 6, 9), operator: supplier.supplierName, location: supplier.address, status: 'done' },
    { name: '生产加工', time: timeAgo(base + 4, 11), operator: '福礼社智能制造基地', location: '浙江省杭州市余杭区福礼产业园', status: 'done' },
    { name: '质量检测', time: timeAgo(base + 3, 15), operator: 'SGS 通标检测', location: '上海市浦东新区检测中心', status: 'done' },
    { name: '仓储入库', time: timeAgo(base + 2, 10), operator: `${warehouses[i % 3]}`, location: warehouses[i % 3], status: 'done' },
    { name: '物流配送', time: timeAgo(base, 8), operator: carriers[i % carriers.length], location: '华东分拨中心', status: 'done' },
    { name: '终端签收', time: timeAgo(Math.max(0, base - 1), 16), operator: '企业客户', location: '企业收货地址', status: 'done' }
  ].map((s, idx) => ({ ...s, hash: hash(`${p.spuCode}-${p.id}-${idx}`) }))
  return {
    traceCode: `TRC2026${String(30001 + i)}`,
    spuId: p.id,
    spuName: p.spuName,
    image: p.image,
    batchNo: `BATCH${2026100 + i}`,
    origin: supplier.address,
    manufacturer: '福礼社智能制造基地',
    supplierId: supplier.id,
    supplierName: supplier.supplierName,
    productionDate: timeAgo(base + 5).slice(0, 10),
    expireDate: `2027-${String(((i % 9) + 3)).padStart(2, '0')}-28`,
    qualityReport: i % 7 === 0 ? '待复检' : '检验合格',
    inspector: 'SGS 通标检测',
    warehouse: warehouses[i % 3],
    steps,
    chainTxHash: hash(`trace-${p.id}-${i}`)
  }
})

const txTypeNames = {
  COUPON_MINT: '卡券铸造',
  COUPON_ISSUE: '卡券发放',
  COUPON_REDEEM: '卡券核销',
  COUPON_TRANSFER: '卡券转赠',
  ORDER_PAY: '订单支付',
  TRACE_ANCHOR: '溯源存证'
}

const txPool = []
coupons.slice(0, 18).forEach((c, i) => {
  txPool.push({ txType: 'COUPON_MINT', bizNo: c.couponCode, couponCode: c.couponCode, spuName: '福礼社卡券', from: '0x0000000000000000', to: '福礼社发行账户', amount: c.faceValue, status: 'success', timestamp: fmt(new Date(Date.now() - (200 - i) * 3600 * 1000)) })
  txPool.push({ txType: 'COUPON_ISSUE', bizNo: c.couponCode, couponCode: c.couponCode, spuName: '福礼社卡券', from: '福礼社发行账户', to: c.userName, amount: c.faceValue, status: 'success', timestamp: fmt(new Date(Date.now() - (190 - i) * 3600 * 1000)) })
  if (c.status === 1) {
    txPool.push({ txType: 'COUPON_REDEEM', bizNo: c.orderNo, couponCode: c.couponCode, spuName: '订单核销', from: c.userName, to: '福礼社商户', amount: c.faceValue, status: 'success', timestamp: fmt(new Date(Date.now() - (150 - i) * 3600 * 1000)) })
  }
  if (c.status === 3) {
    txPool.push({ txType: 'COUPON_TRANSFER', bizNo: c.couponCode, couponCode: c.couponCode, spuName: '卡券转赠', from: c.userName, to: c.transferTo, amount: c.faceValue, status: 'success', timestamp: fmt(new Date(Date.now() - (120 - i) * 3600 * 1000)) })
  }
})
orders.slice(0, 16).filter(o => o.payStatus === 1).forEach((o, i) => {
  txPool.push({ txType: 'ORDER_PAY', bizNo: o.orderNo, couponCode: '', spuName: o.itemCount > 1 ? '组合订单' : '礼品订单', from: o.userName, to: '福礼社商户', amount: o.payAmount, status: 'success', timestamp: fmt(new Date(Date.now() - (100 - i) * 3600 * 1000)) })
})
traceRecords.forEach((t, i) => {
  txPool.push({ txType: 'TRACE_ANCHOR', bizNo: t.traceCode, couponCode: '', spuName: t.spuName, from: t.supplierName, to: '福礼链存证', amount: 0, status: 'success', timestamp: fmt(new Date(Date.now() - (80 - i) * 3600 * 1000)) })
})

const chainBlocks = []
const chainTxs = []
let prevHash = '0x' + '0'.repeat(64)
let height = 1
for (let i = 0; i < txPool.length; i += 3) {
  const group = txPool.slice(i, i + 3)
  const txs = group.map((t, j) => {
    const tx = { ...t, id: chainTxs.length + 1, blockHeight: height, txHash: hash(`${t.bizNo}-${t.txType}-${i + j}`), txTypeName: txTypeNames[t.txType] }
    chainTxs.push(tx)
    return tx
  })
  const timestamp = txs[0].timestamp
  const blockHash = hash(`${prevHash}-${height}-${txs.map(t => t.txHash).join('')}`)
  chainBlocks.push({
    height,
    blockHash,
    prevHash,
    txCount: txs.length,
    timestamp,
    proposer: `node-${(height % 4) + 1}`,
    size: `${(0.8 + txs.length * 0.3).toFixed(1)}KB`,
    status: 'confirmed'
  })
  prevHash = blockHash
  height++
}

const chainMeta = {
  chainName: '福礼链 FuliChain',
  chainId: 'FLS-CHAIN-2026',
  consensus: 'PBFT',
  nodeCount: 4,
  height: chainBlocks.length,
  totalBlocks: chainBlocks.length,
  totalTx: chainTxs.length,
  avgBlockTime: '2.4s',
  tps: 386,
  latestBlockTime: chainBlocks[chainBlocks.length - 1].timestamp,
  contractAddress: '0xF7a3B9c2E14d5A6b8C0dE9f1A2b3C4d5E6f70819'
}

/* ---------------- 购物车 / 首页运营位 ---------------- */
const carts = [
  { id: 1, userId: 2, skuId: 1, spuId: 1, spuName: products[0].spuName, image: products[0].image, skuName: skus[0].skuName, price: skus[0].price, quantity: 2, selected: true },
  { id: 2, userId: 2, skuId: 10, spuId: 9, spuName: products[8].spuName, image: products[8].image, skuName: skus[10].skuName, price: skus[10].price, quantity: 1, selected: true },
  { id: 3, userId: 2, skuId: 40, spuId: 18, spuName: products[17].spuName, image: products[17].image, skuName: skus[40].skuName, price: skus[40].price, quantity: 1, selected: false },
  { id: 4, userId: 4, skuId: 15, spuId: 13, spuName: products[12].spuName, image: products[12].image, skuName: skus[15].skuName, price: skus[15].price, quantity: 1, selected: true }
]

const banners = [
  { id: 1, title: '企业年货节 · 满 1000 减 150', image: img('Chinese New Year corporate gift banner, red and gold, festive, wide banner', 'landscape_16_9'), link: '/category' },
  { id: 2, title: '区块链溯源 · 每一份心意都可验真', image: img('blockchain traceability technology concept banner, blue gradient, gift box', 'landscape_16_9'), link: '/trace' },
  { id: 3, title: '中秋礼盒预售 · 企业集采 8.8 折', image: img('mid autumn festival mooncake gift box banner, elegant Chinese style', 'landscape_16_9'), link: '/category' }
]

const quickEntries = [
  { id: 1, name: '礼品卡', icon: img('red gift card icon, flat minimal'), path: '/category?categoryId=1' },
  { id: 2, name: '节庆礼盒', icon: img('festive gift box icon, flat minimal'), path: '/category?categoryId=2' },
  { id: 3, name: '企业集采', icon: img('corporate procurement icon, flat minimal'), path: '/category' },
  { id: 4, name: '溯源验真', icon: img('blockchain verify shield icon, flat minimal'), path: '/trace' },
  { id: 5, name: '我的卡券', icon: img('coupon ticket icon, flat minimal'), path: '/coupon' }
]

const notices = [
  '福礼链已累计存证 10 万+ 礼品流转记录，支持扫码验真。',
  '年货节企业集采专享 8.8 折，支持一件代发与定制包装。',
  '新春礼品卡支持全国 300+ 城市门店通兑，有效期 3 年。'
]

const menuList = [
  { id: 1, parentId: 0, menuName: '数据看板', menuType: 1, path: '/dashboard', component: 'dashboard/index', icon: 'DataBoard', sort: 1, status: 1, createTime: timeAgo(300) },
  { id: 2, parentId: 0, menuName: '商品管理', menuType: 1, path: '/product', component: 'Layout', icon: 'Goods', sort: 2, status: 1, createTime: timeAgo(300) },
  { id: 3, parentId: 2, menuName: '商品列表', menuType: 1, path: '/product/spu', component: 'product/spu/index', icon: 'List', sort: 1, status: 1, createTime: timeAgo(300) },
  { id: 4, parentId: 2, menuName: '商品分类', menuType: 1, path: '/product/category', component: 'product/category/index', icon: 'Grid', sort: 2, status: 1, createTime: timeAgo(300) },
  { id: 5, parentId: 2, menuName: '品牌管理', menuType: 1, path: '/product/brand', component: 'product/brand/index', icon: 'Flag', sort: 3, status: 1, createTime: timeAgo(300) },
  { id: 6, parentId: 0, menuName: '卡券管理', menuType: 1, path: '/coupon', component: 'Layout', icon: 'Tickets', sort: 3, status: 1, createTime: timeAgo(300) },
  { id: 7, parentId: 6, menuName: '卡券模板', menuType: 1, path: '/coupon/template', component: 'coupon/template/index', icon: 'Document', sort: 1, status: 1, createTime: timeAgo(300) },
  { id: 8, parentId: 6, menuName: '卡券列表', menuType: 1, path: '/coupon/list', component: 'coupon/list/index', icon: 'Ticket', sort: 2, status: 1, createTime: timeAgo(300) },
  { id: 9, parentId: 6, menuName: '发放批次', menuType: 1, path: '/coupon/batch', component: 'coupon/batch/index', icon: 'Box', sort: 3, status: 1, createTime: timeAgo(300) },
  { id: 10, parentId: 0, menuName: '订单管理', menuType: 1, path: '/order', component: 'Layout', icon: 'List', sort: 4, status: 1, createTime: timeAgo(300) },
  { id: 11, parentId: 10, menuName: '订单列表', menuType: 1, path: '/order/list', component: 'order/list/index', icon: 'Document', sort: 1, status: 1, createTime: timeAgo(300) },
  { id: 12, parentId: 0, menuName: '支付管理', menuType: 1, path: '/pay', component: 'Layout', icon: 'Wallet', sort: 5, status: 1, createTime: timeAgo(300) },
  { id: 13, parentId: 12, menuName: '支付记录', menuType: 1, path: '/pay/record', component: 'pay/record/index', icon: 'Wallet', sort: 1, status: 1, createTime: timeAgo(300) },
  { id: 14, parentId: 12, menuName: '退款记录', menuType: 1, path: '/pay/refund', component: 'pay/refund/index', icon: 'RefreshLeft', sort: 2, status: 1, createTime: timeAgo(300) },
  { id: 15, parentId: 12, menuName: '支付配置', menuType: 1, path: '/pay/config', component: 'pay/config/index', icon: 'Setting', sort: 3, status: 1, createTime: timeAgo(300) },
  { id: 16, parentId: 0, menuName: '区块链溯源', menuType: 1, path: '/chain', component: 'Layout', icon: 'Link', sort: 6, status: 1, createTime: timeAgo(200) },
  { id: 17, parentId: 16, menuName: '链上交易', menuType: 1, path: '/chain/tx', component: 'chain/tx/index', icon: 'Connection', sort: 1, status: 1, createTime: timeAgo(200) },
  { id: 18, parentId: 16, menuName: '区块浏览器', menuType: 1, path: '/chain/block', component: 'chain/block/index', icon: 'Coin', sort: 2, status: 1, createTime: timeAgo(200) },
  { id: 19, parentId: 16, menuName: '溯源验真', menuType: 1, path: '/chain/trace', component: 'chain/trace/index', icon: 'Search', sort: 3, status: 1, createTime: timeAgo(200) },
  { id: 20, parentId: 0, menuName: '供应链协同', menuType: 1, path: '/supply', component: 'Layout', icon: 'Van', sort: 7, status: 1, createTime: timeAgo(180) },
  { id: 21, parentId: 20, menuName: '供应商管理', menuType: 1, path: '/supply/supplier', component: 'supply/supplier/index', icon: 'OfficeBuilding', sort: 1, status: 1, createTime: timeAgo(180) },
  { id: 22, parentId: 20, menuName: '采购订单', menuType: 1, path: '/supply/purchase', component: 'supply/purchase/index', icon: 'ShoppingCart', sort: 2, status: 1, createTime: timeAgo(180) },
  { id: 23, parentId: 20, menuName: '库存管理', menuType: 1, path: '/supply/inventory', component: 'supply/inventory/index', icon: 'Box', sort: 3, status: 1, createTime: timeAgo(180) },
  { id: 24, parentId: 20, menuName: '物流发货', menuType: 1, path: '/supply/shipment', component: 'supply/shipment/index', icon: 'Van', sort: 4, status: 1, createTime: timeAgo(180) },
  { id: 25, parentId: 20, menuName: '对账结算', menuType: 1, path: '/supply/settlement', component: 'supply/settlement/index', icon: 'Money', sort: 5, status: 1, createTime: timeAgo(180) },
  { id: 26, parentId: 0, menuName: '系统管理', menuType: 1, path: '/system', component: 'Layout', icon: 'Setting', sort: 8, status: 1, createTime: timeAgo(300) },
  { id: 27, parentId: 26, menuName: '用户管理', menuType: 1, path: '/system/user', component: 'system/user/index', icon: 'User', sort: 1, status: 1, createTime: timeAgo(300) },
  { id: 28, parentId: 26, menuName: '角色管理', menuType: 1, path: '/system/role', component: 'system/role/index', icon: 'UserFilled', sort: 2, status: 1, createTime: timeAgo(300) },
  { id: 29, parentId: 26, menuName: '部门管理', menuType: 1, path: '/system/dept', component: 'system/dept/index', icon: 'OfficeBuilding', sort: 3, status: 1, createTime: timeAgo(300) },
  { id: 30, parentId: 26, menuName: '菜单管理', menuType: 1, path: '/system/menu', component: 'system/menu/index', icon: 'Menu', sort: 4, status: 1, createTime: timeAgo(300) },
  { id: 31, parentId: 26, menuName: '租户管理', menuType: 1, path: '/system/tenant', component: 'system/tenant/index', icon: 'Building', sort: 5, status: 1, createTime: timeAgo(300) }
]

menuList.push(
  { id: 32, parentId: 0, menuName: '商户工作台', menuType: 1, path: '/merchant/dashboard', component: 'merchant/dashboard/index', icon: 'DataAnalysis', sort: 0, status: 1, createTime: timeAgo(300) },
  { id: 33, parentId: 0, menuName: '商户资料', menuType: 1, path: '/merchant/profile', component: 'merchant/profile/index', icon: 'Shop', sort: 9, status: 1, createTime: timeAgo(300) },
  { id: 34, parentId: 0, menuName: '分销管理', menuType: 1, path: '/distribution', component: 'Layout', icon: 'Share', sort: 8, status: 1, createTime: timeAgo(120) },
  { id: 35, parentId: 34, menuName: '佣金规则', menuType: 1, path: '/distribution/rules', component: 'distribution/rules/index', icon: 'SetUp', sort: 1, status: 1, createTime: timeAgo(120) },
  { id: 36, parentId: 34, menuName: '分销商管理', menuType: 1, path: '/distribution/distributors', component: 'distribution/distributors/index', icon: 'UserFilled', sort: 2, status: 1, createTime: timeAgo(120) },
  { id: 37, parentId: 34, menuName: '推广订单', menuType: 1, path: '/distribution/orders', component: 'distribution/orders/index', icon: 'Document', sort: 3, status: 1, createTime: timeAgo(120) },
  { id: 38, parentId: 0, menuName: '分销商工作台', menuType: 1, path: '/distributor', component: 'Layout', icon: 'Promotion', sort: 0, status: 1, createTime: timeAgo(120) },
  { id: 39, parentId: 38, menuName: '选品中心', menuType: 1, path: '/distributor/selection', component: 'distributor/selection/index', icon: 'Goods', sort: 1, status: 1, createTime: timeAgo(120) },
  { id: 40, parentId: 38, menuName: '分享链接', menuType: 1, path: '/distributor/shares', component: 'distributor/shares/index', icon: 'Link', sort: 2, status: 1, createTime: timeAgo(120) },
  { id: 41, parentId: 38, menuName: '推广与佣金', menuType: 1, path: '/distributor/orders', component: 'distributor/orders/index', icon: 'Money', sort: 3, status: 1, createTime: timeAgo(120) },
  { id: 42, parentId: 0, menuName: '营销管理', menuType: 1, path: '/promotion', component: 'Layout', icon: 'Present', sort: 9, status: 1, createTime: timeAgo(100) },
  { id: 43, parentId: 42, menuName: '满减促销', menuType: 1, path: '/promotion/full-reduction', component: 'promotion/full-reduction/index', icon: 'Discount', sort: 1, status: 1, createTime: timeAgo(100) },
  { id: 44, parentId: 12, menuName: '发票管理', menuType: 1, path: '/pay/invoice', component: 'pay/invoice/index', icon: 'Tickets', sort: 4, status: 1, createTime: timeAgo(90) },
  { id: 45, parentId: 12, menuName: '平台抽佣', menuType: 1, path: '/pay/commission', component: 'pay/commission/index', icon: 'Money', sort: 5, status: 1, createTime: timeAgo(90) },
  { id: 46, parentId: 26, menuName: '数据备份', menuType: 1, path: '/system/backup', component: 'system/backup/index', icon: 'FolderOpened', sort: 6, status: 1, createTime: timeAgo(30) }
)

const menuPermissions = {
  1: 'dashboard:view', 2: 'product:manage', 3: 'product:spu', 4: 'product:category', 5: 'product:brand',
  6: 'coupon:manage', 7: 'coupon:template', 8: 'coupon:list', 9: 'coupon:batch',
  10: 'order:manage', 11: 'order:info', 12: 'pay:manage', 13: 'pay:record', 14: 'pay:refund', 15: 'pay:config',
  16: 'chain:manage', 17: 'chain:tx', 18: 'chain:block', 19: 'chain:trace',
  20: 'supply:manage', 21: 'supply:supplier', 22: 'supply:purchase', 23: 'supply:inventory', 24: 'supply:shipment', 25: 'settlement',
  26: 'system:manage', 27: 'system:user', 28: 'system:role', 29: 'system:dept', 30: 'system:menu', 31: 'system:tenant',
  32: 'merchant:dashboard', 33: 'merchant:profile',
  34: 'distribution:manage', 35: 'distribution:rule', 36: 'distribution:distributor', 37: 'distribution:order',
  38: 'distributor:workspace', 39: 'distributor:selection', 40: 'distributor:share', 41: 'distributor:order',
  42: 'promotion:manage', 43: 'promotion:fullreduction',
  44: 'pay:invoice', 45: 'pay:commission',
  46: 'system:backup'
}
menuList.forEach(menu => { menu.permission = menuPermissions[menu.id] || '' })

module.exports = {
  couponTemplates, couponBatches, coupons, orders, orderItems, payRecords, refunds,
  suppliers, purchaseOrders, inventory, shipments, settlements,
  traceRecords, chainBlocks, chainTxs, chainMeta,
  carts, banners, quickEntries, notices, menuList, invoices,
  addresses, warehouses, carriers,
  fuliAccounts, fuliFlows, fuliRecharges, fuliTransfers, fuliOperations
}

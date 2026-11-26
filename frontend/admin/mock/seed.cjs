const { img, hash, timeAgo, fmt, daysAgo, randInt } = require('./helpers.cjs')

/* ---------------- 租户 / 用户 ---------------- */
const tenants = [
  { id: 1, tenantName: '南樾星数字科技有限公司', tenantCode: 'NANYUEXING', contactPerson: '张经理', contactPhone: '13800138001', contactEmail: 'zhang@nanyuexing.com', address: '浙江省杭州市西湖区文三路 90 号', maxUsers: 500, userCount: 8, status: 1, auditStatus: 1, auditRemark: '审核通过', createTime: timeAgo(380), expireTime: '2027-12-31' },
  { id: 2, tenantName: '福礼社运营中心', tenantCode: 'FULISHE', contactPerson: '李总监', contactPhone: '13800138002', contactEmail: 'li@fulishe.cn', address: '上海市浦东新区世纪大道 100 号', maxUsers: 300, userCount: 6, status: 1, auditStatus: 1, auditRemark: '审核通过', createTime: timeAgo(360), expireTime: '2027-12-31' },
  { id: 3, tenantName: '新春礼品有限公司', tenantCode: 'XINCHUN', contactPerson: '陈总', contactPhone: '13800138010', contactEmail: 'chen@xinchun.com', address: '北京市朝阳区建国路 88 号', maxUsers: 120, userCount: 4, status: 1, auditStatus: 1, auditRemark: '审核通过', createTime: timeAgo(300), expireTime: '2026-12-31' },
  { id: 4, tenantName: '美食汇商贸', tenantCode: 'MEISHIHUI', contactPerson: '刘经理', contactPhone: '13800138011', contactEmail: 'liu@meishihui.com', address: '广东省深圳市南山区科技园南区 8 栋', maxUsers: 100, userCount: 3, status: 1, auditStatus: 1, auditRemark: '审核通过', createTime: timeAgo(240), expireTime: '2026-12-31' },
  { id: 5, tenantName: '数码优选科技', tenantCode: 'SHUMAYOUXUAN', contactPerson: '周总监', contactPhone: '13800138012', contactEmail: 'zhou@shumayouxuan.com', address: '四川省成都市高新区天府大道 666 号', maxUsers: 80, userCount: 3, status: 1, auditStatus: 1, auditRemark: '审核通过', createTime: timeAgo(180), expireTime: '2026-12-31' }
]

const roles = [
  { id: 1, roleName: '超级管理员', roleCode: 'super_admin', dataScope: 'ALL', description: '拥有平台全部权限', createTime: timeAgo(380) },
  { id: 2, roleName: '商户管理员', roleCode: 'merchant_admin', dataScope: 'MERCHANT', description: '管理本商户经营数据', createTime: timeAgo(360) },
  { id: 3, roleName: '采购专员', roleCode: 'purchase', dataScope: 'MERCHANT', description: '供应商、采购单与库存', createTime: timeAgo(300) },
  { id: 4, roleName: '运营专员', roleCode: 'operator', dataScope: 'MERCHANT', description: '商品、卡券与订单运营', createTime: timeAgo(280) },
  { id: 5, roleName: '普通用户', roleCode: 'user', dataScope: 'MERCHANT', description: '商城下单与卡券使用', createTime: timeAgo(260) }
]

// 角色菜单关系保存在共享状态中，授权调整会即时影响后续权限计算。
const roleMenus = {
  1: Array.from({ length: 33 }, (_, i) => i + 1),
  2: [2, 3, 10, 11, 12, 13, 14, 20, 25, 32, 33],
  3: [20, 21, 22, 23, 24],
  4: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  5: []
}

const users = [
  { id: 1, tenantId: 1, username: 'admin', password: '123456', nickname: '超级管理员', realName: '系统管理员', mobile: '13800138001', email: 'admin@fulishe.com', deptName: '总部', roleIds: [1], roleName: '超级管理员', userType: 1, status: 1, createTime: timeAgo(380) },
  { id: 2, tenantId: 1, username: 'zhangsan', password: '123456', nickname: '张三', realName: '张三', mobile: '13800138005', email: 'zhangsan@fulishe.com', deptName: '采购部', roleIds: [3], roleName: '采购专员', userType: 2, status: 1, createTime: timeAgo(200) },
  { id: 3, tenantId: 2, username: 'fulishe_admin', password: '123456', nickname: '福礼社管理员', realName: '王敏', mobile: '13800138002', email: 'admin@fulishe.cn', deptName: '运营中心', roleIds: [2], roleName: '商户管理员', userType: 1, status: 1, createTime: timeAgo(360) },
  { id: 4, tenantId: 2, username: 'user1', password: '123456', nickname: '李女士', realName: '李静', mobile: '13800138007', email: 'lijing@fulishe.cn', deptName: '市场部', roleIds: [5], roleName: '普通用户', userType: 2, status: 1, createTime: timeAgo(150) },
  { id: 5, tenantId: 3, username: 'xinchun_admin', password: '123456', nickname: '新春礼品管理员', realName: '陈建国', mobile: '13800138010', email: 'admin@xinchun.com', deptName: '总经办', roleIds: [2], roleName: '商户管理员', userType: 1, status: 1, createTime: timeAgo(300) },
  { id: 6, tenantId: 3, username: 'customer1', password: '123456', nickname: '客户A', realName: '赵一鸣', mobile: '13800138013', email: 'customer1@xinchun.com', deptName: '行政部', roleIds: [5], roleName: '普通用户', userType: 2, status: 1, createTime: timeAgo(120) },
  { id: 7, tenantId: 4, username: 'meishihui_admin', password: '123456', nickname: '美食汇管理员', realName: '刘强', mobile: '13800138011', email: 'admin@meishihui.com', deptName: '总经办', roleIds: [2], roleName: '商户管理员', userType: 1, status: 1, createTime: timeAgo(240) },
  { id: 8, tenantId: 4, username: 'customer2', password: '123456', nickname: '客户B', realName: '孙晓', mobile: '13800138014', email: 'customer2@meishihui.com', deptName: '工会', roleIds: [5], roleName: '普通用户', userType: 2, status: 1, createTime: timeAgo(90) },
  { id: 9, tenantId: 5, username: 'shuma_admin', password: '123456', nickname: '数码优选管理员', realName: '周涛', mobile: '13800138012', email: 'admin@shumayouxuan.com', deptName: '总经办', roleIds: [2], roleName: '商户管理员', userType: 1, status: 1, createTime: timeAgo(180) },
  { id: 10, tenantId: 5, username: 'customer3', password: '123456', nickname: '客户C', realName: '吴桐', mobile: '13800138015', email: 'customer3@shumayouxuan.com', deptName: '采购部', roleIds: [5], roleName: '普通用户', userType: 2, status: 1, createTime: timeAgo(60) }
]

/* ---------------- 分类 / 品牌 ---------------- */
const categories = [
  { id: 1, parentId: 0, categoryCode: 'C1001', categoryName: '礼品卡券', level: 1, sort: 1, status: 1, createTime: timeAgo(360) },
  { id: 2, parentId: 0, categoryCode: 'C1002', categoryName: '节庆礼盒', level: 1, sort: 2, status: 1, createTime: timeAgo(360) },
  { id: 3, parentId: 0, categoryCode: 'C1003', categoryName: '食品礼盒', level: 1, sort: 3, status: 1, createTime: timeAgo(360) },
  { id: 4, parentId: 0, categoryCode: 'C1004', categoryName: '茶酒饮品', level: 1, sort: 4, status: 1, createTime: timeAgo(360) },
  { id: 5, parentId: 0, categoryCode: 'C1005', categoryName: '数码家电', level: 1, sort: 5, status: 1, createTime: timeAgo(360) },
  { id: 6, parentId: 0, categoryCode: 'C1006', categoryName: '家居生活', level: 1, sort: 6, status: 1, createTime: timeAgo(360) },
  { id: 7, parentId: 0, categoryCode: 'C1007', categoryName: '健康关怀', level: 1, sort: 7, status: 1, createTime: timeAgo(360) },
  { id: 8, parentId: 0, categoryCode: 'C1008', categoryName: '办公用品', level: 1, sort: 8, status: 1, createTime: timeAgo(360) },
  { id: 9, parentId: 1, categoryCode: 'C100101', categoryName: '电子礼品卡', level: 2, sort: 1, status: 1, createTime: timeAgo(300) },
  { id: 10, parentId: 1, categoryCode: 'C100102', categoryName: '实体礼品卡', level: 2, sort: 2, status: 1, createTime: timeAgo(300) }
]

const categoryCoverMap = {
  1: 'red gift card and envelope flat lay, festive Chinese style',
  2: 'Chinese festival gift box arrangement, red and gold, elegant',
  3: 'premium food gift hamper, nuts and pastries, warm studio light',
  4: 'Chinese tea and wine gift set display, elegant wooden table',
  5: 'modern consumer electronics gift set, minimal white background',
  6: 'home lifestyle gift set, ceramic and aromatherapy, cozy',
  7: 'Chinese health tonic gift box, traditional herbal, warm tones',
  8: 'business stationery gift set, elegant dark packaging'
}
categories.forEach(c => {
  const prompt = categoryCoverMap[c.id] || 'corporate gifting category cover, minimal style'
  c.icon = img(prompt + ', flat icon style')
  c.image = img(prompt + ', wide banner composition', 'landscape_4_3')
})

const brands = [
  { id: 1, brandCode: 'B001', brandName: '福礼社', logo: img('minimalist red gift box logo on white background, brand mark'), website: 'https://www.fulishe.cn', description: '福礼社自有品牌，专注企业福利与节日礼赠', sort: 1, status: 1, createTime: timeAgo(380) },
  { id: 2, brandCode: 'B002', brandName: '稻香村', logo: img('traditional Chinese pastry brand logo, elegant'), website: 'https://www.daoxiangcun.com', description: '中华老字号传统糕点品牌', sort: 2, status: 1, createTime: timeAgo(360) },
  { id: 3, brandCode: 'B003', brandName: '美心', logo: img('modern mooncake brand logo, gold and red'), website: 'https://www.maxims.com.hk', description: '港式月饼与烘焙品牌', sort: 3, status: 1, createTime: timeAgo(340) },
  { id: 4, brandCode: 'B004', brandName: '五芳斋', logo: img('Chinese rice dumpling brand logo, traditional, red'), website: 'https://www.wufangzhai.com', description: '江南粽子代表性品牌', sort: 4, status: 1, createTime: timeAgo(330) },
  { id: 5, brandCode: 'B005', brandName: '歌帝梵', logo: img('luxury chocolate brand logo, gold lettering'), website: 'https://www.godiva.com', description: '比利时皇室御用巧克力', sort: 5, status: 1, createTime: timeAgo(320) },
  { id: 6, brandCode: 'B006', brandName: '西湖', logo: img('Chinese tea brand logo, green and gold'), website: 'https://www.xihutea.com', description: '西湖龙井核心产区茶叶品牌', sort: 6, status: 1, createTime: timeAgo(300) },
  { id: 7, brandCode: 'B007', brandName: '拉菲', logo: img('French wine chateau logo, elegant black and gold'), website: 'https://www.lafite.com', description: '法国波尔多列级名庄', sort: 7, status: 1, createTime: timeAgo(290) },
  { id: 8, brandCode: 'B008', brandName: '华为', logo: img('Huawei style tech brand logo, minimal, silver'), website: 'https://www.huawei.com', description: '全球领先的智能终端品牌', sort: 8, status: 1, createTime: timeAgo(280) },
  { id: 9, brandCode: 'B009', brandName: '小米', logo: img('Xiaomi style orange tech brand logo, square'), website: 'https://www.mi.com', description: '智能家居与消费电子品牌', sort: 9, status: 1, createTime: timeAgo(270) },
  { id: 10, brandCode: 'B010', brandName: '苹果', logo: img('minimal apple silhouette logo, silver on white'), website: 'https://www.apple.com.cn', description: 'Apple 智能配件', sort: 10, status: 1, createTime: timeAgo(260) },
  { id: 11, brandCode: 'B011', brandName: '膳魔师', logo: img('thermos brand logo, blue and silver'), website: 'https://www.thermos.com', description: '百年保温杯品牌', sort: 11, status: 1, createTime: timeAgo(250) },
  { id: 12, brandCode: 'B012', brandName: '景德镇', logo: img('Chinese porcelain brand logo, blue and white'), website: 'https://www.jdzceramic.com', description: '景德镇陶瓷茶具', sort: 12, status: 1, createTime: timeAgo(240) },
  { id: 13, brandCode: 'B013', brandName: '同仁堂', logo: img('traditional Chinese medicine brand logo, gold on red'), website: 'https://www.tongrentang.com', description: '百年中医药老字号', sort: 13, status: 1, createTime: timeAgo(230) },
  { id: 14, brandCode: 'B014', brandName: '得力', logo: img('office stationery brand logo, blue'), website: 'https://www.deliworld.com', description: '办公文具与礼赠定制', sort: 14, status: 1, createTime: timeAgo(220) }
]

/* ---------------- 商品（32 款） ---------------- */
const rawProducts = [
  ['福礼贺岁礼品卡 · 500型', 1, 1, 500, 588, 470, 1200, 2862, 'premium red and gold Chinese New Year gift card in elegant envelope, studio product photography'],
  ['福礼贺岁礼品卡 · 1000型', 1, 1, 1000, 1188, 950, 800, 1345, 'luxury gold Chinese gift card with red ribbon, high end product photo'],
  ['企业员工福利卡 · 300型', 1, 1, 300, 330, 285, 3000, 5210, 'corporate employee benefit gift card, clean minimal studio shot'],
  ['中秋团圆礼品卡', 1, 1, 268, 328, 240, 1500, 1980, 'mid autumn festival gift card with mooncake pattern, warm lighting'],
  ['稻香村中秋月饼礼盒', 2, 2, 188, 228, 150, 600, 1420, 'traditional Chinese mooncake gift box, red and gold packaging, studio photo'],
  ['稻香村京式糕点礼盒', 2, 2, 128, 158, 98, 800, 960, 'Beijing style pastry gift box, elegant Chinese packaging, product photography'],
  ['美心流心奶黄月饼', 2, 3, 328, 388, 270, 400, 1180, 'Hong Kong style lava custard mooncake gift box, premium packaging'],
  ['五芳斋粽子礼盒', 2, 4, 168, 198, 130, 700, 860, 'traditional Chinese zongzi rice dumpling gift box, bamboo leaves'],
  ['五芳斋咸蛋黄肉粽礼盒', 2, 4, 218, 258, 175, 500, 640, 'premium zongzi gift box with salted egg yolk, Chinese style packaging'],
  ['新春坚果大礼包', 3, 1, 158, 188, 120, 900, 1320, 'mixed nuts gift box, festive red packaging, product photo'],
  ['每日坚果混合装 30袋', 3, 1, 99, 128, 72, 1500, 2450, 'daily mixed nuts snack packs, healthy food product photography'],
  ['进口巧克力尊享礼盒', 3, 5, 268, 328, 210, 350, 580, 'imported chocolate gift box, luxury gold packaging, studio shot'],
  ['歌帝梵松露巧克力礼盒', 3, 5, 398, 468, 320, 220, 410, 'Godiva style truffle chocolate gift box, elegant gold ribbon'],
  ['西湖龙井明前茶礼盒', 4, 6, 568, 688, 450, 180, 320, 'West Lake Longjing green tea gift box, Chinese tea ceremony style'],
  ['武夷山岩茶大红袍礼盒', 4, 6, 468, 568, 380, 200, 290, 'Wuyi rock tea Da Hong Pao gift box, wooden texture packaging'],
  ['法国波尔多红酒双支礼盒', 4, 7, 688, 828, 560, 120, 260, 'French Bordeaux red wine two bottle gift box, luxury wooden case'],
  ['拉菲传奇红酒礼盒', 4, 7, 1288, 1588, 1050, 80, 150, 'premium French red wine gift box, chateau style, elegant'],
  ['华为 FreeBuds 无线耳机', 5, 8, 499, 599, 410, 300, 720, 'white wireless earbuds with charging case, tech product photography'],
  ['华为智能手环 8', 5, 8, 269, 299, 220, 500, 980, 'black smart fitness band, modern tech product photo'],
  ['小米充电宝 20000mAh', 5, 9, 159, 199, 128, 800, 1560, 'white power bank 20000mAh, minimal tech product photography'],
  ['小米智能音箱 Pro', 5, 9, 299, 349, 240, 400, 670, 'smart speaker with voice assistant, minimal white design'],
  ['苹果 AirTag 防丢器', 5, 10, 249, 279, 205, 260, 430, 'white round bluetooth tracker tag, apple style product photo'],
  ['膳魔师保温杯礼盒', 6, 11, 268, 328, 200, 450, 720, 'stainless steel thermos bottle gift box, premium product shot'],
  ['福礼社香薰礼盒', 6, 1, 168, 208, 110, 600, 540, 'aromatherapy diffuser gift set, cozy lifestyle product photography'],
  ['景德镇陶瓷茶具套装', 6, 12, 388, 458, 300, 200, 310, 'blue and white porcelain tea set, Chinese ceramic craftsmanship'],
  ['同仁堂滋补养生礼盒', 7, 13, 598, 698, 480, 180, 260, 'traditional Chinese health tonic gift box, premium herbal packaging'],
  ['东阿阿胶固元膏礼盒', 7, 13, 458, 528, 370, 220, 300, 'Chinese ejiao health paste gift box, traditional red packaging'],
  ['得力商务办公礼盒', 8, 14, 198, 238, 150, 700, 480, 'business office stationery gift set, elegant black packaging'],
  ['派克钢笔礼盒', 8, 14, 358, 428, 280, 260, 300, 'premium fountain pen gift box, black and gold, luxury'],
  ['福礼社定制台历礼盒', 8, 1, 88, 108, 60, 1200, 650, 'custom desk calendar gift box, minimal corporate design'],
  ['阳澄湖大闸蟹礼券', 2, 1, 398, 498, 320, 300, 520, 'hairy crab gift voucher, Chinese premium packaging, red and gold'],
  ['有机杂粮礼盒', 3, 1, 138, 168, 100, 650, 498, 'organic whole grains gift box, natural healthy packaging']
]

const unitMap = { 1: '张', 2: '盒', 3: '盒', 4: '盒', 5: '件', 6: '套', 7: '盒', 8: '套' }
const catName = id => (categories.find(c => c.id === id) || {}).categoryName || ''
const brandName = id => (brands.find(b => b.id === id) || {}).brandName || ''

// 商品图集：主图 / 包装 / 细节 / 场景 / 开箱
const imageSuffixes = [
  '',
  ', elegant gift packaging box, front view, studio lighting, white background',
  ', close-up macro detail, texture and craftsmanship, high resolution',
  ', lifestyle scene, corporate gifting occasion, warm lighting, depth of field',
  ', unboxing flat lay with greeting card and ribbon, top view, clean composition'
]

const specTemplates = {
  1: p => [
    { name: '面值', value: `¥${p[3]}` },
    { name: '卡券类型', value: '电子礼品卡 / 实体礼品卡' },
    { name: '适用范围', value: '全国 300+ 城市合作门店' },
    { name: '有效期', value: '自激活起 3 年' },
    { name: '兑换方式', value: '扫码核销 / 线上下单' }
  ],
  2: p => [
    { name: '礼盒规格', value: `${p[6] > 600 ? '家庭分享装' : '标准礼盒装'}` },
    { name: '净含量', value: `${600 + (p[6] % 9) * 80}g` },
    { name: '保质期', value: '60 天' },
    { name: '储存方式', value: '常温阴凉干燥处保存' },
    { name: '产地', value: '中国' }
  ],
  3: p => [
    { name: '礼盒规格', value: '独立小包装礼盒' },
    { name: '净含量', value: `${480 + (p[6] % 7) * 60}g` },
    { name: '保质期', value: '180 天' },
    { name: '储存方式', value: '密封避光，阴凉干燥处' },
    { name: '产地', value: '中国' }
  ],
  4: p => [
    { name: '规格', value: p[0].includes('双支') ? '750ml × 2 支' : '礼盒装' },
    { name: '产地', value: '原产地直采' },
    { name: '保质期', value: '长期（适宜条件下）' },
    { name: '储存方式', value: '避光、阴凉、干燥处' },
    { name: '包装', value: '高档礼盒 + 手提袋' }
  ],
  5: p => [
    { name: '型号', value: `FL-${3000 + p[6] % 97}` },
    { name: '颜色', value: '经典白 / 曜石黑' },
    { name: '保修', value: '全国联保 1 年' },
    { name: '包装清单', value: '主机 × 1、说明书 × 1、保修卡 × 1' },
    { name: '产地', value: '中国' }
  ],
  6: p => [
    { name: '材质', value: '食品级不锈钢 / 陶瓷 / 香氛复合材质' },
    { name: '尺寸', value: `${18 + (p[6] % 8)} × ${12 + (p[6] % 5)} cm` },
    { name: '套装内容', value: '主品 × 1、礼盒 × 1、手提袋 × 1' },
    { name: '产地', value: '中国' },
    { name: '包装', value: '精装礼盒' }
  ],
  7: p => [
    { name: '规格', value: `${300 + (p[6] % 5) * 100}g / 盒` },
    { name: '保质期', value: '24 个月' },
    { name: '食用方法', value: '每日 1-2 次，温水冲调' },
    { name: '产地', value: '中国' },
    { name: '储存方式', value: '密封、避光、阴凉干燥处' }
  ],
  8: p => [
    { name: '材质', value: '金属 / 纸质复合材质' },
    { name: '规格', value: '商务礼盒装' },
    { name: '套装内容', value: '主品 × 1、礼盒 × 1、贺卡 × 1' },
    { name: '定制服务', value: '支持 LOGO 烫金 / 丝印' },
    { name: '产地', value: '中国' }
  ]
}

const categoryHighlights = {
  1: '支持企业批量采购与面值定制，电子卡即时发放，实体卡可定制卡面与专属贺卡，全国 300+ 城市门店通兑。',
  2: '节庆礼盒均来自品牌直供渠道，包装喜庆大气，适合企业年节福利、客户答谢与商务馈赠。',
  3: '精选当季原料，独立小包装锁鲜，礼盒外观简约大方，适合员工日常福利与节日慰问。',
  4: '原产地直采，全程温控仓储，配备防伪溯源标签，扫码即可查验真伪与流转记录。',
  5: '官方正品行货，全国联保，支持企业批量采购、激光刻字与专属礼盒定制。',
  6: '精选优质材质，兼顾实用与颜值，可作为居家自用、乔迁贺礼或商务伴手礼。',
  7: '甄选道地原料，传统工艺制作，适合长辈关怀、健康慰问与节日问候场景。',
  8: '支持 LOGO 定制与商务礼盒包装，适合会议伴手礼、员工入职礼包与客户拜访。'
}

const serviceTagMap = {
  1: ['企业定制', '一件代发', '开具发票', '全国通兑'],
  2: ['企业定制', '一件代发', '开具发票', '顺丰包邮'],
  3: ['企业定制', '一件代发', '开具发票', '7天无理由'],
  4: ['原产地直采', '一件代发', '开具发票', '顺丰包邮'],
  5: ['官方正品', '全国联保', '开具发票', '激光刻字'],
  6: ['企业定制', '一件代发', '开具发票', '精装礼盒'],
  7: ['道地原料', '一件代发', '开具发票', '冷链配送'],
  8: ['企业定制', 'LOGO 烫金', '开具发票', '一件代发']
}

const detailSectionsFor = (catId, name) => [
  { title: '产品亮点', content: `${name}，${categoryHighlights[catId] || '福礼社精选供应链直供，品质保障。'}` },
  { title: '服务保障', content: '福礼社自营仓直发，48 小时内出库；企业集采支持开票、对公转账与专属客服；商品支持 7 天无理由退换（定制类除外）。' },
  { title: '区块链溯源', content: '本品已接入福礼链，生产、质检、仓储、物流全流程上链存证，扫描商品溯源码即可查看区块高度与交易哈希。' },
  { title: '温馨提示', content: '图片为实物拍摄，因显示器色差可能存在轻微差异；礼盒内含干燥剂请勿食用；如有疑问请联系企业专属客服 400-888-6688。' }
]

// 示例商品视频（生产环境替换为自有 CDN 并加入小程序域名白名单）
const PRODUCT_VIDEOS = {
  1: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  2: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
  3: 'https://media.w3.org/2010/05/video/movie_300.mp4'
}

const products = rawProducts.map((p, i) => {
  const id = i + 1
  const catId = p[1]
  const merchantId = i % 2 === 0 ? 2 : 3
  return {
    id,
    merchantId,
    merchantName: (tenants.find(t => t.id === merchantId) || {}).tenantName || '',
    spuCode: `SPU${1001 + i}`,
    spuName: p[0],
    categoryId: catId,
    categoryName: catName(catId),
    brandId: p[2],
    brandName: brandName(p[2]),
    image: img(p[8]),
    images: imageSuffixes.map(suffix => img(p[8] + suffix)),
    videoUrl: PRODUCT_VIDEOS[id] || null,
    description: `${p[0]}，福礼社精选供应链直供，支持企业批量采购、定制包装与区块链溯源验真。`,
    unit: unitMap[catId] || '件',
    originalPrice: p[4],
    sellPrice: p[3],
    costPrice: p[5],
    stock: p[6],
    sales: p[7],
    weight: `${(0.2 + (i % 5) * 0.3).toFixed(1)}kg`,
    status: i === 29 ? 0 : 1,
    traceable: true,
    tags: ['企业集采', '支持定制', '区块链溯源'],
    serviceTags: serviceTagMap[catId] || ['企业集采', '开具发票'],
    specs: (specTemplates[catId] || specTemplates[6])(p),
    detailSections: detailSectionsFor(catId, p[0]),
    createTime: timeAgo(200 - i * 3),
    updateTime: timeAgo(randInt(0, 30))
  }
})

const skus = []
products.forEach((p, i) => {
  skus.push({
    id: i + 1,
    tenantId: 1,
    merchantId: p.merchantId,
    spuId: p.id,
    skuCode: `SKU${2001 + i}`,
    skuName: `${p.spuName} 标准装`,
    specs: '标准装',
    price: p.sellPrice,
    originalPrice: p.originalPrice,
    costPrice: p.costPrice,
    stock: p.stock,
    status: 1
  })
  if (p.categoryId === 1 || p.categoryId === 2) {
    skus.push({
      id: skus.length + 1,
      tenantId: 1,
      merchantId: p.merchantId,
      spuId: p.id,
      skuCode: `SKU${2001 + i}-B`,
      skuName: `${p.spuName} 尊享装`,
      specs: '尊享装',
      price: Math.round(p.sellPrice * 1.6),
      originalPrice: Math.round(p.originalPrice * 1.6),
      costPrice: Math.round(p.costPrice * 1.5),
      stock: Math.max(20, Math.round(p.stock * 0.3)),
      status: 1
    })
  }
})

module.exports = { tenants, users, roles, roleMenus, categories, brands, products, skus }

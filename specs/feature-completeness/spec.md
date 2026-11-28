# 福礼社平台 · 功能因素清单剩余项补齐 Spec

> 目标：按指南「常被忽略的功能因素」清单，补齐 P0/P2 缺失模块，且不破坏既有回归。
> 范围：A 首页新品曝光、B 发票与税务勾稽、C 平台抽佣与分账、D 物流签收与分享域名配置、E 回归与指南更新。

## 0. 代码现状（已核实）

| 能力 | 现状 | 关键位置 |
| --- | --- | --- |
| Mock 路由注册 | `mock-server.cjs` 逐个 `require('./mock/routes-*.cjs')` | `frontend/admin/mock-server.cjs#L18-L28` |
| H5 首页 | `recommend = products.filter(status===1).slice(4,12)`，新商品 `unshift` + `sales=0`，既进不了热销也被 recommend 跳过 | `frontend/admin/mock/routes-trade.cjs#L75-L88` |
| 发票 | 仅结算单有 `invoiceNo` 字段，无申请/开具/红冲 | `frontend/admin/mock/seed-extra.cjs#L288-L307` |
| 支付成功 | 扣库存、记 `PAY_IN`、`distributionService.onOrderPaid` | `frontend/admin/mock/routes-trade.cjs#L282-L332` |
| 退款审核通过 | 记 `REFUND_OUT`、佣金冲正 | `frontend/admin/mock/routes-admin.cjs#L328-L379` |
| 资金流水 | 5 类：PAY_IN/REFUND_OUT/COMMISSION_ACCRUAL/COMMISSION_REVERSE/COMMISSION_SETTLE；direction 仅 PAY_IN 为 IN | `frontend/admin/mock/fund-service.cjs#L13-L41` |
| 采购状态机 | 0→1→2→3（审核/接单/入库），无供应商发货与到货签收 | `frontend/admin/mock/routes-supply.cjs#L161-L199` |
| 菜单/权限 | 菜单到 43，`menuPermissions` 1-43，`roleMenus[1]=1..43` | `frontend/admin/mock/seed-extra.cjs#L471-L498`、`frontend/admin/mock/seed.cjs#L23-L31` |
| 管理端路由 | 无发票、无平台抽佣页面 | `frontend/admin/src/router/index.ts` |
| 分享链接 | 分销商工作台已用 `VITE_H5_BASE_URL`，但布局页仍硬编码 `http://localhost:3001` | `frontend/admin/src/views/distributor/shares/index.vue#L85`、`frontend/admin/src/layout/index.vue#L68` |
| H5 订单 | 有「申请退款」，无「申请开票」 | `frontend/h5/src/views/order/list.vue` |
| 指南 | 缺陷表、待补齐 callout | `frontend/admin/test-results/guides/index.html#L462-L475`、`#L565-L568` |

约束（不得破坏）：
- 采购单状态码 `0/1/2/3` 与既有流转顺序不可变（`verify-supply-distribution.cjs` 153 项依赖）。
- 既有列表兼容 `current/size`（helpers.paginate）。
- 商户数据必须隔离；越权返回 403。
- `verify-integrity.cjs` 40 项、`verify-authz.cjs`、`verify-supply-distribution.cjs` 153 项必须全过。

---

## A. H5 首页新品曝光（P0）

### A1. 接口
文件：`frontend/admin/mock/routes-trade.cjs`，`app.get('/api/h5/home'...)`
- 取 `visible = products.filter(p => p.status === 1)`。
- 新增 `newProducts`：按 `id` 倒序（新建 `unshift` 即最新）取前 8 个，带 `isNew: true`。
- `hotProducts` 保持按 `sales` 倒序前 10（不变）。
- `recommend` 改为：`newProducts` 在前、再补 `hotProducts` 去重，最多 12 条（保证新商品必被推荐）。
- 保留 `banners/quickEntries/notices/categories/coupons` 字段不变。

### A2. 缓存失效
文件：`frontend/admin/mock/perf.cjs`（现有 `clearCache` 导出）+ `routes-admin.cjs`
- 在商品新增 `POST /api/admin/product/spu`、上下架 `PUT /api/admin/product/spu/:id/status` 成功后调用 `perf.clearCache()`，避免首页/分页缓存命中旧数据。
- 若 `perf` 未导出 `clearCache`，在 `perf.cjs` 补齐导出。

### A3. H5 展示
文件：`frontend/h5/src/views/home/index.vue`
- 在「精选好物」之前新增「新品上架」区块，渲染 `data.newProducts`，卡片复用现有 `product-item` 样式；无数据时不渲染。

---

## B. 发票与税务（申请 / 开具 / 红冲 / 勾稽）

### B1. 数据
文件：`frontend/admin/mock/seed-extra.cjs`
- 新增 `invoices` 种子（3 条，来自已支付订单），字段：
  `id, invoiceNo, orderNo, orderId, merchantId, merchantName, userId, titleType(1个人/2企业), invoiceType(1电子普票/2增值税专票), buyerName, taxNo, email, amount, taxRate(0.06), taxAmount, status(0待开票/1已开票/2已红冲), applyTime, issueTime, redFlushTime, redFlushReason, redFlushNo, remark`。
- 导出 `invoices`。
- 菜单追加：
  - `{ id: 44, parentId: 12, menuName: '发票管理', path: '/pay/invoice', component: 'pay/invoice/index', icon: 'Tickets', sort: 4 }`
  - `{ id: 45, parentId: 12, menuName: '平台抽佣', path: '/pay/commission', component: 'pay/commission/index', icon: 'Money', sort: 5 }`
- `menuPermissions` 增补：`44: 'pay:invoice'`、`45: 'pay:commission'`。
- 角色菜单：`seed.cjs` `roleMenus[1]` 改为 `Array.from({ length: 45 }, ...)`；`roleMenus[2]` 追加 `44`；`roleMenus[4]` 追加 `44`。

### B2. 服务
新文件：`frontend/admin/mock/invoice-service.cjs`
- 状态常量、`page({merchantId, orderNo, status, pageNum, pageSize})`、`summary(merchantId)`。
- `apply(userId, payload)`：
  - 校验订单存在、`payStatus===1`、`orderStatus∈{1,2,3}`、订单属于该 `userId`。
  - 同订单不存在 `status∈{0,1}` 的有效发票。
  - `amount` 默认 `payAmount`，上限 `payAmount`；专票必须填 `taxNo`。
  - 生成 `status=0` 记录，返回。
- `issue(id, operatorName)`：仅 `status===0`，生成 `invoiceNo = 'INV' + Date.now()`、`issueTime`、`status=1`；返回。
- `redFlush(id, reason, operatorName)`：仅 `status===1`，生成 `redFlushNo`、`redFlushTime`、`status=2`；返回。
- 异常抛 `Error`（带可选 `status`），由路由转 `fail`。

### B3. 路由
新文件：`frontend/admin/mock/routes-invoice.cjs`
- H5（无需登录，沿用 refund/apply 风格）：
  - `POST /api/invoice/apply`（body: `userId, orderNo, titleType, invoiceType, buyerName, taxNo, email, amount`）
  - `GET /api/invoice/my?userId=`
- 管理端（`createAuthz` + `authenticate`）：
  - `GET /api/admin/invoice/page`（`requirePermission('pay:invoice')`，`scopeMerchant` 隔离）
  - `GET /api/admin/invoice/summary`（同上）
  - `PUT /api/admin/invoice/:id/issue`（`requirePermission('pay:invoice')`，`scopeMerchant` 校验）
  - `PUT /api/admin/invoice/:id/red-flush`（同上，body `reason`）
- 在 `mock-server.cjs` 注册 `require('./mock/routes-invoice.cjs')(app, jwt, SECRET_KEY)`。

### B4. 管理端页面
- 新增 `frontend/admin/src/views/pay/invoice/index.vue`：筛选（订单号/状态）、列表（发票号、订单号、抬头、类型、金额、税额、状态、申请/开票时间）、操作（开具、红冲）、汇总卡片。
- `frontend/admin/src/router/index.ts` 在 `pay` children 增加 `invoice`，`meta.permission = 'pay:invoice'`。

### B5. H5 入口
- `frontend/h5/src/views/order/list.vue`：已支付/已完成且未有有效发票的订单增加「申请开票」按钮，弹窗收集抬头/类型/税号/邮箱，调用 `POST /invoice/apply`，成功 toast 并刷新。

---

## C. 平台抽佣与分账

### C1. 资金流水扩展
文件：`frontend/admin/mock/fund-service.cjs`
- `BIZ_LABEL` 增加：`PLATFORM_FEE:'平台技术服务费'`、`PLATFORM_FEE_REVERSE:'平台服务费冲正'`、`MERCHANT_SPLIT:'商户应结分账'`、`MERCHANT_SPLIT_REVERSE:'商户分账冲正'`。
- 用 `DIRECTION` 映射替代三元判断：`PAY_IN/PLATFORM_FEE/MERCHANT_SPLIT_REVERSE → IN`，其余 `OUT`。
- `summary()` 增加 `platformFeeCents/platformFee`、`merchantSplitCents/merchantSplit`；现有 `income/net/commission*` 语义保持不变。

### C2. 分账服务
新文件：`frontend/admin/mock/finance-service.cjs`
- `config = { enabled: true, rateBp: 500, settleDays: 7, updateTime }`（默认技术服务费 5%）。
- `getConfig()`、`updateConfig(body)`（校验 `0 ≤ rateBp ≤ 2000`）。
- `splits = []`；字段：`id, splitNo, orderNo, orderId, merchantId, merchantName, payAmount, platformFee, merchantNet, supplierCost, commissionAmount, status(1已分账/2已退款), createTime`。
- `onOrderPaid(order)`：
  - `enabled=false` 或非已支付跳过；按 `orderNo` 幂等。
  - `platformFee = round(payAmount * rateBp / 10000)`；`merchantNet = payAmount - platformFee`。
  - `supplierCost = Σ(product.costPrice × item.quantity)`（多商品按采购成本）。
  - `commissionAmount = Σ(distribution-service.promotionOrders 中该订单佣金)`（require 该服务读取数组，不反向依赖）。
  - 写 split；`fundService.record` 两条：`PLATFORM_FEE`(IN)、`MERCHANT_SPLIT`(OUT)。
- `onOrderRefunded(order, refundAmount)`：按订单找到 split，`status=2`，记 `PLATFORM_FEE_REVERSE`(OUT)、`MERCHANT_SPLIT_REVERSE`(IN)。
- `page({merchantId, orderNo, pageNum, pageSize})`、`summary(merchantId)`。

### C3. 接入支付/退款
- `routes-trade.cjs`：`/api/pay/create` 福卡分支与非福卡分支，在 `distributionService.onOrderPaid(order)` 后调用 `financeService.onOrderPaid(order)`；`/api/pay/wechat/notify` 同样补一次（幂等）。
- `routes-admin.cjs`：退款审核通过分支在 `distributionService.onOrderRefunded(...)` 后调用 `financeService.onOrderRefunded(order, refund.refundAmount)`。

### C4. 接口与页面
- 路由（`routes-admin.cjs` 或新 `routes-finance.cjs`，注册到 `mock-server.cjs`）：
  - `GET /api/admin/finance/config`、`PUT /api/admin/finance/config`（`pay:commission`，超管可写）
  - `GET /api/admin/finance/split/page`、`GET /api/admin/finance/split/summary`（`pay:commission`，`scopeMerchant`）
- 新增 `frontend/admin/src/views/pay/commission/index.vue`：技术服务费率配置（百分比、启停、T+N）、分账记录列表（订单号、商户、支付额、平台服务费、商户应结、供应商成本、佣金、状态）、汇总。
- `router/index.ts` 在 `pay` children 增加 `commission`，`meta.permission = 'pay:commission'`。

---

## D. 物流签收与分享域名配置

### D1. 采购发货/签收（不改状态码）
文件：`frontend/admin/mock/routes-supply.cjs`
- 新增 `POST /api/supply/purchase/:id/ship`：
  - 权限 `supply:purchase`；仅当 `status===2`；操作者须为该供应商或商户侧人员（复用 `assertSupplierAccess` + 角色判断）。
  - body `{ carrier, trackingNo }` → 写 `logisticsCompany, trackingNo, shipTime, shipBy`；缺单号返回 400。
- 新增 `POST /api/supply/purchase/:id/receive`：
  - 权限 `supply:purchase`；仅当 `status===2` 且已发货；`merchantStaff` 可操作。
  - body `{ receiver }` → 写 `receivedTime, receivedBy`；不改变 `status`（后续入库仍走 3）。
- 不改动 `PUT /api/supply/purchase/:id/status` 的 0→1→2→3 逻辑。

### D2. 采购页展示
文件：`frontend/admin/src/views/supply/purchase/index.vue`
- 列表增加「物流公司 / 物流单号 / 签收人 / 签收时间」列。
- 状态 2 且未发货：显示「发货」按钮（弹窗填物流公司、单号）；已发货未签收：显示「签收」按钮（填签收人）。

### D3. 分享域名配置
- 新增 `frontend/admin/src/config.ts`：`export const H5_BASE_URL = import.meta.env.VITE_H5_BASE_URL || 'http://localhost:3001'`。
- `layout/index.vue#L68` 改为 `:href="H5_BASE_URL"`；`distributor/shares/index.vue` 改为引用 `H5_BASE_URL`（保留默认值）。
- 根目录/管理端 `.env.development`、`.env.production` 增加说明项 `VITE_H5_BASE_URL=`（按环境覆盖，缺省 localhost:3001）。

---

## E. 回归、构建与指南

### E1. 回归补充
文件：`frontend/admin/mock/verify-integrity.cjs`（新增断言，保持既有 40 项通过）
- 首页：`/api/h5/home` 的 `newProducts` 存在且包含最近上架商品；`recommend` 含新商品。
- 发票：对已支付订单 `apply → issue → red-flush`，状态 0→1→2，金额与订单 `payAmount` 一致；重复申请被拒。
- 抽佣：支付后 `fund/flow` 出现 `PLATFORM_FEE` 与 `MERCHANT_SPLIT`；`finance/split` 有记录且 `platformFee + merchantNet = payAmount`。
- 采购：状态 2 采购单 `ship` 后写物流单号，`receive` 后写签收人，状态仍为 2，随后 `status:3` 入库成功。
- 注意：`verify-integrity.cjs` 直连 8080 会污染数据，跑完必须重启 Mock（取 PID → Stop-Process → 后台 `node mock-server.cjs`）。

### E2. 执行命令
- `node mock/verify-integrity.cjs`
- `node mock/verify-authz.cjs`
- `node mock/verify-supply-distribution.cjs`
- 管理端：`npm run build`（cwd `frontend/admin`，含 vue-tsc）
- H5：`npm run build`（cwd `frontend/h5`）

### E3. 指南更新
文件：`frontend/admin/test-results/guides/index.html`
- 缺陷表：P0「上架商品不进入 H5 首页/推荐」标记已修复；P2「分享链接域名硬编码」标记已修复；P2「采购单缺少发货/签收」标记已修复；新增「发票无申请/开具/红冲」「无平台抽佣/分账」两行并标记本轮已补齐。
- 新增「本轮补齐（2026-11-27 追加二）」小节：A/B/C/D 四块能力说明与入口。
- 更新待补齐 callout 与回归统计（新增断言数、构建结果）。
- 交付边界保持：真实支付/退款/开票/税务仍不在 Mock 范围。

---

## 验收标准
1. 新建并上架商品后，`/api/h5/home` 的 `newProducts` 与 `recommend` 均可见，H5 首页出现「新品上架」。
2. H5 可提交发票申请；管理端可开具/红冲，状态与订单金额勾稽；重复有效申请被拒。
3. 支付成功后生成分账记录与两类资金流水，`platformFee + merchantNet = payAmount`；退款后分账置为已退款并冲正。
4. 采购单状态 2 可发货/签收，物流与签收字段落库，随后入库仍为 3。
5. 分享链接域名由 `VITE_H5_BASE_URL` 控制，缺省 `localhost:3001`。
6. `verify-integrity` / `verify-authz` / `verify-supply-distribution` 全过；admin 与 H5 构建通过。
7. 指南缺陷表与待补齐项同步更新。

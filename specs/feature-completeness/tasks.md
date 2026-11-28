# 任务清单 · 功能因素清单剩余项补齐

> 依赖顺序执行：A → B → C → D → E。每完成一项即更新状态并做最小验证。

## A. H5 首页新品曝光（P0）
- [x] A1 `routes-trade.cjs`：`/api/h5/home` 增加 `newProducts`，`recommend` 合并新品 + 热销去重
- [x] A2 `routes-admin.cjs` 商品新增/上下架后调用 `perf.clearCache()`
- [x] A3 `frontend/h5/src/views/home/index.vue` 新增「新品上架」区块

## B. 发票与税务
- [x] B1 `seed-extra.cjs`：新增并导出 `invoices` 种子；菜单 44/45；`menuPermissions` 44/45
- [x] B2 `seed.cjs`：`roleMenus[1]` 扩到 45；`roleMenus[2]`、`roleMenus[4]` 追加 44
- [x] B3 新增 `mock/invoice-service.cjs`（apply / issue / redFlush / page / summary）
- [x] B4 新增 `mock/routes-invoice.cjs` 并在 `mock-server.cjs` 注册
- [x] B5 新增 `frontend/admin/src/views/pay/invoice/index.vue` + 路由 `pay/invoice`
- [x] B6 `frontend/h5/src/views/order/list.vue` 增加「申请开票」入口

## C. 平台抽佣与分账
- [x] C1 `fund-service.cjs`：新增 4 类流水与 DIRECTION 映射，扩展 summary
- [x] C2 新增 `mock/finance-service.cjs`（config / onOrderPaid / onOrderRefunded / page / summary）
- [x] C3 `routes-trade.cjs` 支付成功接入 `financeService.onOrderPaid`；`routes-admin.cjs` 退款接入 `onOrderRefunded`
- [x] C4 新增财务接口（config / split page / summary）并注册
- [x] C5 新增 `frontend/admin/src/views/pay/commission/index.vue` + 路由 `pay/commission`

## D. 物流签收与分享域名
- [x] D1 `routes-supply.cjs` 新增采购 `ship` / `receive` 接口（不改状态机）
- [x] D2 `frontend/admin/src/views/supply/purchase/index.vue` 展示物流/签收并加操作按钮
- [x] D3 新增 `src/config.ts`，`layout/index.vue` 与 `distributor/shares/index.vue` 使用 `VITE_H5_BASE_URL`；补 `.env.development/.env.production`

## E. 回归、构建与指南
- [x] E1 `verify-integrity.cjs` 补充首页/发票/抽佣/采购发货签收断言（58 项）
- [x] E2 `verify-integrity` 58/58、`verify-authz` 全过、`verify-supply-distribution` 153/153
- [x] E3 admin `npm run build`、h5 `npm run build` 均通过
- [x] E4 更新 `frontend/admin/test-results/guides/index.html`

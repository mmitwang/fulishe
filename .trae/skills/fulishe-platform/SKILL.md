---
name: fulishe-platform
description: 福礼社电商平台（管理端 Vue3 + H5 + Taro 小程序 + Node Mock API）的日常开发与交付流程。适用于在本仓库新增/修改接口、管理端页面、H5 页面、状态机、资金/佣金/发票/分账规则，或执行回归与构建。包含分层规范、菜单权限联动、高频工作流与回归红线。
---

# 福礼社平台开发 Skill

## 何时使用
- 在本仓库新增或修改 Mock API、管理端页面、H5 页面、小程序页面。
- 调整订单/退款/采购/发票/分销/资金/分账的状态或金额规则。
- 需要执行回归、构建、更新指南或验收文档。

## 环境与命令
| 项 | 值 |
| --- | --- |
| 工作目录 | `f:\百度同步\立项文件\0.南樾星数字科技\6.电商平台\福礼社平台` |
| Mock API | `frontend/admin` 下 `node mock-server.cjs`，端口 8080 |
| 管理端 | `frontend/admin`，`npm run dev` 端口 3100，`npm run build` |
| H5 | `frontend/h5`，`npm run dev` 端口 3001，`npm run build` |
| 回归 | `cd frontend/admin && node mock/verify-integrity.cjs`、`verify-authz.cjs`、`verify-supply-distribution.cjs`、`verify-api-smoke.cjs` |

重启 Mock：
```powershell
$pid8080 = (Get-NetTCPConnection -LocalPort 8080 -State Listen).OwningProcess | Select-Object -First 1
if ($pid8080) { Stop-Process -Id $pid8080 -Force }
node mock-server.cjs   # 后台运行
```

## 代码地图
- 响应/分页：`mock/helpers.cjs`（`ok/fail/paginate/like/numEq/fmt`）。
- 鉴权/数据范围：`mock/authz.cjs`（`authenticate/requirePermission/scopeMerchant/scopeSupplier/assertMerchantAccess/ALL`）。
- 领域服务：`stock-service`（库存预占）、`fund-service`（资金流水，分存储）、`distribution-service`（二级分销 + T+N）、`promotion-service`（满减）、`invoice-service`（发票）、`finance-service`（平台抽佣分账）。
- 路由注册：`mock-server.cjs` 逐个 `require('./mock/routes-*.cjs')(app, jwt, SECRET_KEY)`。
- 种子：`mock/seed.cjs`（基础）、`mock/seed-extra.cjs`（订单/采购/发票/菜单）。
- 管理端：`src/router/index.ts`（路由 + `meta.permission`）、`src/views/**`、`src/config.ts`（H5 域名）。
- 指南：`frontend/admin/test-results/guides/index.html`。

## 高频工作流

### 工作流 1：新增一个 Mock API
1. 在对应 `*-service.cjs` 实现规则（金额、状态机、幂等），禁止在路由里写业务规则。
2. 在 `routes-*.cjs` 加路由：`authenticate` → `requirePermission` → 参数校验 → 调 service → `ok/fail`。
3. 如需数据，在 `seed-extra.cjs` 加数组并导出；服务用同一数组引用，保证运行时读写一致。
4. 若是新文件，在 `mock-server.cjs` 注册。
5. `node --check` → 重启 Mock → 补 `verify-integrity.cjs` 断言 → 全量回归。

### 工作流 2：新增管理端页面
1. 新建 `src/views/<模块>/<页面>/index.vue`（列表四件套：loading/tableData/pagination/searchForm）。
2. 在 `src/router/index.ts` 增加路由，`meta.permission` 与后端权限码一致。
3. 在 `seed-extra.cjs` 的 `menuList.push` 增加菜单（id 递增），同步 `menuPermissions`。
4. `seed.cjs` 的 `roleMenus` 给对应角色追加菜单 id；超管默认 `1..N`。
5. `npm run build` 验证 vue-tsc 通过。

### 工作流 3：新增 H5 页面/入口
1. 页面放 `src/views/<模块>/index.vue`，路由懒加载。
2. 接口统一 `request.get/post`，金额用 `formatMoney`。
3. 域名/端口不要硬编码，使用 `@/config`（管理端）或环境变量（H5）。
4. 验证：移动端布局、空态、loading、错误提示。

### 工作流 4：修改状态机或资金规则
1. 先读 `verify-supply-distribution.cjs` / `verify-integrity.cjs` 中既有断言，确认不可破坏的顺序与字段。
2. 状态码与流转顺序是红线：采购 `0→1→2→3`、订单既有状态值不可改。
3. 资金用“分”；新增流水类型必须加 `BIZ_LABEL` 与 `DIRECTION`，并扩展 `summary`。
4. 新增状态/字段优先，禁止重命名既有字段。
5. 修改后跑全部回归 + 双端构建。

### 工作流 5：发布前验证
```powershell
cd frontend/admin
node --check mock-server.cjs
node mock/verify-integrity.cjs
node mock/verify-authz.cjs
node mock/verify-supply-distribution.cjs
node mock/verify-api-smoke.cjs
npm run build
cd ../h5
npm run build
```
- 回归脚本会污染内存数据，跑完重启 Mock 恢复干净种子。
- 更新 `docs/功能验收标准.md` 与 `test-results/guides/index.html`。

## 红线与易错点
- **采购状态码**：`0/1/2/3` 与顺序不可变（153 项回归依赖）；发货/签收不得改状态。
- **资金口径**：`fund-service` 全部用分；平台服务费 + 商户应结 = 实付。
- **权限**：越权必须 403；列表不得静默返回他人数据。
- **分页**：必须兼容 `current/size` 与 `pageNum/pageSize`。
- **菜单联动**：新菜单要同时改 `menuList`、`menuPermissions`、`roleMenus`（超管长度）。
- **幂等**：支付回调、退款审核、入库、开票、分账按业务主键去重。
- **发票**：同订单存在待开票/已开票时不可重复申请；红冲后才可重开。
- **缓存**：商品新增/编辑/上下架/删除后调用 `perf.clearCache()`。

## 参考文档
- `docs/术语表.md`：统一术语与状态码。
- `docs/功能验收标准.md`：逐页面 AC。
- `docs/代码开发规范.md`：分层、规范与重构评估。
- `docs/用户操作手册.md`、`docs/架构评审报告.md`：业务与架构背景。

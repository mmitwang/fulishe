# 福礼社商户与系统管理员功能完善计划

## Context

管理端已经具备商品、订单、支付、供应链和系统管理等页面，但当前所有登录用户共享静态菜单，路由守卫只检查 Token；角色菜单授权没有真正生效，部分页面仍使用组件内置数据。商户与平台管理员因此缺少清晰的工作台、操作边界和数据隔离。

本次在现有 Vue 3 + Element Plus 管理端和 Express Mock 上，完善两条可独立验收的角色主线，同时保持消费端商品、购物车、订单、支付、退款和福卡逻辑不变。

默认业务边界：

- 商户是平台内的“经营租户”，不与供应链中的供应商混用。
- 本期验收 `super_admin`（系统管理员）和 `merchant_admin`（商户管理员）；其他角色保留配置能力，不新增工作台。
- 单商户订单由所属商户处理；多商户订单仅平台管理员处理，不实现拆单、分账和跨商户部分售后。
- 售后审核与结算均为 Mock 状态流转，不触发真实资金、微信支付或福卡账本变化。
- 本次交付不包含真实数据库 RBAC、生产级多租户安全和部署。

## 一、统一角色、权限和商户归属

### 1. 建立可复用的 Mock 授权上下文

新增 `frontend/admin/mock/authz.cjs`，集中提供 JWT 校验、权限校验、数据范围和商户归属校验：

- 从 Token 获取真实用户，返回 401/403，不再从 Token 字符串提取数字或默认回退管理员。
- 登录与 `/user/auth/info` 返回 `roleCodes`、`roleNames`、`permissions`、`dataScope`、`merchantId` 和商户名称。
- `userType` 仅保留兼容，不再作为授权依据；刷新 Token 时保持原用户身份。
- `requirePermission`、`scopeMerchant`、`assertMerchantAccess` 同时保护列表、详情和写操作。

调整 `frontend/admin/mock/routes-core.cjs`、`seed.cjs`、`seed-extra.cjs`：

- 将现有租户管理员账号映射为商户管理员，系统管理员使用 `admin / 123456`，商户演示复用 `fulishe_admin`、`xinchun_admin`。
- 角色增加数据范围；用户通过角色 ID 关联角色，不再只保存展示用 `roleName`。
- 角色菜单关系持久化到共享 Mock 状态，`/user/role/:id/menus` 返回并保存各角色真实授权。
- 菜单统一权限标识和树形结构；内置系统管理员禁止删除或撤销核心权限，避免演示账号失效。
- 禁用或审核未通过的商户账号登录时返回明确原因。

### 2. 明确经营数据归属

为 Mock 商品增加 `merchantId`，SKU 继承 SPU 归属；订单卖方通过 `orderItems -> spuId -> product.merchantId` 计算，支付、退款通过订单关联，结算单增加经营商户归属。

保留原 `tenantId` 的下单用户/租户语义，不改造成卖方字段。消费端原有 `/product/*`、`/order/*`、`/pay/*` 路由和交易状态机不增加后台权限限制。

## 二、新增受保护的管理接口

新增 `frontend/admin/mock/routes-admin.cjs`，并在 `frontend/admin/mock-server.cjs` 注册。管理端页面使用 `/api/admin/*`，避免影响消费端：

- 商户工作台：`GET /admin/merchant/dashboard/overview`。
- 商户资料：`GET/PUT /admin/merchant/profile`，仅开放联系人、电话、邮箱、地址等资料字段。
- 商品：分页、详情、新增、编辑、上下架和删除；商户新增/编辑时由服务端强制写入自身 `merchantId`。
- 订单：分页、详情和限定状态的发货/取消操作；更新只接收白名单字段。
- 支付与售后：支付记录、退款分页和售后审核保存；审核保存结果、意见、审核人和时间，不调用消费端立即退款接口。
- 结算：商户只读，本商户数据；确认结算仅系统管理员可执行。
- 商户审核：系统管理员通过租户审核接口更新审核状态和意见。

所有分页先应用数据范围再分页；工作台统计、最新订单和列表使用同一过滤函数。详情、编辑、删除、发货、审核和结算均单独校验归属；批量操作发现任意越权记录时整批拒绝。

## 三、完善角色登录、菜单与页面

### 1. 登录和访问控制

修改：

- `frontend/admin/src/stores/auth.ts`
- `frontend/admin/src/router/index.ts`
- `frontend/admin/src/layout/index.vue`
- `frontend/admin/src/views/login/index.vue`
- `frontend/admin/src/utils/request.ts`

实现：

- `authStore` 增加 `hasPermission`、`isPlatformAdmin`、`homePath` 和 `ensureReady`；刷新页面后重新获取服务端权限。
- 叶子路由声明 `meta.permission`，守卫按权限放行；侧边栏使用同一权限集合过滤，并隐藏空目录。
- 系统管理员进入 `/dashboard`，商户进入 `/merchant/dashboard`；无权限路由进入 `/403`。
- 登录页按“平台管理员 / 商户管理员”分组演示账号；切换角色通过退出并重新登录完成，不允许前端伪造角色或商户 ID。
- 顶栏展示真实角色与商户名称，商户个人中心进入商户资料。
- 请求层统一识别 `msg/message`；401 清理会话，403 展示服务端原因，不再用内置数据掩盖失败。
- `cachedGet` 的缓存键加入用户身份并在登录/退出时清理；`mock/perf.cjs` 跳过带 `Authorization` 的 GET 缓存，防止跨商户串数据。

新增页面：

- `frontend/admin/src/views/merchant/dashboard/index.vue`：本商户销售额、订单、待发货、待售后、待结算和最新订单。
- `frontend/admin/src/views/merchant/profile/index.vue`：商户资料查看与编辑，审核状态只读。
- `frontend/admin/src/views/error/403.vue`：返回当前角色工作台或切换账号。

### 2. 复用并补齐业务页面

优先修改现有页面，不重复建设平行业务模块：

- `views/product/spu/index.vue`：接入受保护商品接口；商户仅管理本商户商品，分类和品牌继续读取公共选项。
- `views/order/list/index.vue`：接入商户数据范围，保留详情和符合状态约束的发货/取消。
- `views/pay/refund/index.vue`：删除组件内置退款数据，接入查询与审核保存，刷新后结果仍可见。
- `views/pay/record/index.vue`：修正支付记录接口，删除请求失败后的内置数据回退。
- `views/supply/settlement/index.vue`：商户只读自己的结算单；确认结算按钮和接口同时校验管理员权限。
- `views/system/tenant/index.vue`：增加审核状态、审核意见和审核操作；新租户默认待审核。
- `views/system/user/index.vue`：支持维护租户和角色关联，并展示真实角色。
- `views/system/role/index.vue`：保留 CRUD 与分配菜单，补充数据范围；授权变更在重新获取身份后生效。
- `views/dashboard/index.vue`：保留平台看板，补充待审核商户和待处理售后入口。

商品分类、品牌、卡券、供应链、溯源等现有模块保留给具备相应权限的管理员，不在本次额外扩张功能。

## 四、验证与回归

### 自动化验证

新增 `frontend/admin/mock/verify-authz.cjs` 和必要的 Playwright 角色用例，覆盖：

1. 无 Token 返回 401；商户访问系统管理接口或越权资源返回 403。
2. 商户 A 的商品、订单、售后、结算均只属于 A，伪造 `merchantId=B` 不能改变数据范围或商品归属。
3. 商户 A 查询/修改 B 的详情被拒绝且数据不变化；批量越权操作不产生部分成功。
4. 商户不能确认结算，系统管理员可以；商户售后审核结果和意见可持久查看，且不改变支付和福卡账本。
5. 角色菜单撤销后，侧边栏、直接路由和 API 三层权限同时失效。
6. 切换商户后无上一账号缓存；商户直接访问 `/system/tenant` 显示 403 且没有系统管理菜单。
7. 消费端原商品列表、本人订单、下单、支付、退款和福卡验证保持原行为。

执行：

- `frontend/admin`: `npm run build`。
- 使用新的 Mock 进程运行 `node mock/verify-authz.cjs`。
- 运行相关 Playwright 角色验收，并复跑受登录/路由影响的既有用例。
- 最后运行 `node mock/verify.cjs`，保持现有商品、订单、支付、退款和福卡回归全部通过。

### 手工验收

1. 系统管理员登录，审核商户，查看全量订单、售后和结算，并调整一次角色菜单。
2. 商户 A 登录，查看本商户工作台，修改资料与商品，发货一笔订单并处理一笔售后。
3. 直接输入系统管理路由，验证菜单、路由和 API 均拒绝越权。
4. 切换商户 B，确认看不到 A 的经营数据。
5. 验证管理端桌面与窄屏布局、加载/空态/错误提示和操作反馈。

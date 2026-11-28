# 新建 PC 桌面端买家商城（frontend/pc）实施计划

## Context（背景）

当前仓库只有三端独立代码：管理端（`frontend/admin`，PC 桌面布局，端口 3100）、H5 商城（`frontend/h5`，移动端 Vant 布局，端口 3001）、Taro 小程序。**缺少面向买家的电脑桌面版商城**——H5 在桌面浏览器打开会全宽拉伸，无居中限宽容器，不是为 PC 设计。

用户明确要求「新建独立 PC 桌面端商城」。目标是让 PC 用户获得真正的桌面购物体验，同时复用同一套 Mock API，与 H5/小程序保持业务口径一致（呼应此前跨端一致性测试的结论）。

## 目标与范围

- 新建 `frontend/pc` 独立工程：Vue3 + Vite + TypeScript + Element Plus + Pinia + Vue Router + Axios + Sass。
- 复刻 H5 买家侧全部 11 个路由与完整购买闭环，桌面化 UI。
- **只新增 PC 前端**，不改 Mock / H5 / 小程序 / 管理端任何代码，不新增 `/api/pc/*` 接口，继续复用 `/api/h5/*` 与公共交易接口。
- 开发端口 **3101**（避开 admin 3100 / h5 3001），`/api` 代理到 `http://localhost:8080`。

## 已确认的关键契约（探索结论，作为事实依据）

- 买家接口**全部公开**（无 `authenticate`），靠 `userId` query/body 区分用户，默认 2。→ PC 不做强制登录守卫。
- `POST /api/h5/login`（body `{username,password}`）→ `{code:200, data:{token, userInfo}}`。
- `GET /api/h5/home` → `{banners, quickEntries, notices, categories[8], hotProducts, newProducts, coupons, recommend}`。
- `GET /api/h5/product/:id` → 商品 + `{skus, trace, reviews, related}`。
- 商品分页 `GET /api/product/spu/page`（`current/size` → `records/total`）；`/order/list`、`/coupon/my` 返回**数组**（非分页）。
- 统一响应信封 `{code:200, data, message}`，code===200 为成功。
- 金额已是**元**，直接 `toFixed(2)` 展示，不除 100。

## 工程结构

```
frontend/pc/
├─ index.html / package.json / tsconfig.json / tsconfig.node.json / vite.config.ts
└─ src/
   ├─ main.ts / App.vue / vite-env.d.ts
   ├─ api/            # types.ts + auth/home/product/cart/order/pay/coupon/promotion/invoice/trace/distribution
   ├─ components/     # ProductCard.vue、PriceText.vue
   ├─ constants/      # business.ts：订单/退款/发票/卡券状态、支付方式（唯一定义处）
   ├─ layout/         # index.vue + AppHeader.vue + AppFooter.vue
   ├─ router/index.ts
   ├─ store/          # user.ts（持久化 token/userInfo/userId）、cart.ts（角标，不持久化）
   ├─ styles/index.scss
   ├─ utils/          # request.ts、format.ts
   └─ views/          # home / category / product/detail / cart / order/confirm / order/list / pay / coupon / trace / login / user
```

## 复用与新写边界

| 内容 | 方式 |
|---|---|
| 依赖版本、vite.config、tsconfig、main.ts | 复制管理端，改名称/端口 3101/标题，去掉 ECharts/Express/JWT/Playwright 等管理端专属依赖 |
| H5 `request.ts` 解包与错误语义 | 复用，Vant Toast 换成 `ElMessage`；**不复制**管理端 401 强制跳转（买家接口公开） |
| H5 路由路径与页面业务流程 | 路径原样保留，业务抽到 service/常量复用 |
| H5 Vant 模板/移动样式/TabBar/滑动转场 | 不复制，全部用 Element Plus 新写桌面界面 |
| Mock / 种子 / 回归脚本 | 不修改 |

## 桌面布局

- 顶部吸顶 Header：品牌「福礼社 · 企业福利数智平台」+ 全局搜索框（回车跳 `/category?keyword=`）+ 购物车 el-badge 角标 + 溯源入口 + 订单入口 + 登录态下拉。
- 内容容器 `max-width: 1200px` 居中，左右留白 24px；首版最小适配宽 1024px。
- 底部 Footer。
- 品牌色沿用 H5：深蓝 `#1f2b52`、主蓝 `#2f5fd0`、亮蓝 `#38b6ff`、价格红 `#ee0a24`、背景 `#f5f6fa`。

## 页面实施顺序（P0 购物闭环 → P1 账户）

1. **脚手架**：package.json / vite.config.ts（端口 3101 + strictPort + `/api` 代理 + ElementPlusResolver）/ tsconfig / index.html / main.ts / App.vue / styles。
2. **基础设施**：`request.ts`（baseURL `/api`、30s 超时、code!==200 reject、ElMessage 报错）、`store/user.ts`（持久化 `pc-user`，`effectiveUserId` 默认 2）、`store/cart.ts`、`format.ts`、`constants/business.ts`、`api/*`。
3. **路由 + Layout**：11 路由懒加载，登录页独立于 Layout；`afterEach` 设 `document.title` + 滚动恢复。
4. **首页**：el-carousel 轮播、公告条、快捷入口、溯源卡片、优惠券条（仅展示不领取）、新品/热销五列网格；抽 `ProductCard`。
5. **分类/列表**：左栏平级分类（来自 `/h5/home` 的 categories，不虚构二级）+ 搜索 + 四列网格 + 分页（`/product/spu/page`），URL query 与状态双向同步。
6. **商品详情**：双栏（图集 + 信息）、SKU 选择（无库存禁用）、数量、加购（`/cart/add`）、立即购买（写 `sessionStorage.checkoutItems` 含 `spuId/skuId/quantity`）、溯源、评价、相关推荐（监听 `route.params.id` 重载）、分销归因（`/distribution/attribution`，失败不阻断购买）。
7. **购物车**：el-table 勾选/全选/改数量（`/cart/update`）/删除（`DELETE /cart/:id`）、底部汇总结算（写 `checkoutItems` 必带 `spuId`）、角标同步。
8. **订单确认**：收货表单校验、并行 `/coupon/my` + `/h5/promotions/full-reduction`、优惠券/满减选择、金额预览（以服务端为准）、提交 `/order/create`（防重复提交）、成功后跳收银台。
9. **收银台**：`/order/detail/:orderNo` 取 `payAmount`、支付方式 1 微信/2 支付宝/3 余额、`/pay/create` → `/pay/query/:payNo`（`payStatus===2` 成功）。
10. **我的订单**：`/order/list`（数组）+ 状态页签 + 操作（去支付 / 确认收货 `/order/:id/complete` / 申请退款 `/refund/apply` / 申请开票 `/invoice/apply`），操作显隐沿用 H5 规则。
11. **登录 / 个人中心 / 卡券 / 溯源**：登录用 `/h5/login`（演示账号张三 123456）；卡券核销 `/coupon/redeem`、转赠 `/coupon/transfer`；溯源 `/trace/verify` 支持 query 自动带入。

## 一致性红线（必须遵守，与已对齐的三端保持一致）

1. 订单状态 `0待支付 1已支付 2已发货 3已完成 4已取消 5售后中 6已退款`，未知显示「未知」。
2. 退款状态 `0审核中 1处理中 2已完成 3已驳回`。
3. 买家退款**只走 `/refund/apply`（传 orderNo）**，禁止 `/pay/refund`，不得显示「已即时退款」。
4. 发票 `/invoice/apply`，遵守待开票/已开票不可重复、红冲后可重开。
5. 沿用既有接口路径（含带 `h5` 前缀的），不因 PC 改名。
6. 商品分页用 `records/total`；订单/卡券列表是数组，不混用解析。
7. 金额以元 `toFixed(2)`；客户端金额仅预览，下单/支付/退款/开票以服务端为准。
8. PC 不单独修改订单状态机、库存、资金、佣金、发票规则。
9. Mock 创建订单 `source` 固定「H5 商城」——PC 首版接受该值，不在前端伪造「PC 商城」（如需显示需另开契约变更）。

## 验证方式

1. `npm --prefix frontend/pc install` → `npm run dev`（3101）→ 浏览器开 `http://localhost:3101/home`。
2. `npm run build`（vue-tsc + vite build）类型检查通过。
3. Mock 回归：`node frontend/admin/mock/verify-api-smoke.cjs`、`node frontend/admin/mock/verify-channel.cjs` 均全绿（证明共享接口未受影响）。
4. 浏览器验收：覆盖首页/分类/详情/购物车/下单/支付/订单/退款/开票/卡券/溯源/登录全链路；**跨端一致性**：PC 创建的订单能在 H5 与管理端查到，状态与金额一致。

## 风险与说明

- 首次 `npm install` 受网络影响；图片用 Mock 的外链 URL，需 `el-image` 错误占位 + 固定宽高，布局不依赖图片加载成功。
- Mock 内存数据重启即重置，手工验收不假设跨重启保留。
- 3001 与 3101 不同 origin，token/`checkoutItems` 不共享；共享的是 8080 服务端购物车/订单数据。
- 公开接口仅靠 `userId` 识别用户是 Mock 契约，非生产安全方案，PC 不自行加权限判断。

## 京东风格改版（第二轮联调优化）

参考 `https://www.jd.com/` 的桌面商城信息架构，在保留福礼社品牌蓝色体系与既有业务契约的前提下，重构 PC 端外壳与首页/分类页：

- **AppHeader**：新增顶部工具条（配送至 / 登录注册 / 我的订单·卡券 / 溯源 / 客服）、Logo + 大搜索框 + 热搜词 + 购物车入口、`全部商品分类` 悬停下拉 + 横向导航；整块吸顶。
- **首页**：左侧分类栏 + 中部轮播（叠加标题蒙层）+ 快捷服务条 + 右侧公告/溯源卡片；优惠券横条；新品/精选/为你推荐三楼层，5 列商品网格。
- **分类页**：面包屑、独立搜索、左侧分类、数量 + 综合/销量/价格/新品排序条（当前页内排序）、4 列商品卡与分页。
- **ProductCard / AppFooter**：红价+划线原价+已售+自营/新品角标；页脚增加正品保障/极速配送/无忧售后/企业专享服务承诺条。
- **兼容性**：路由、接口、`checkoutItems`、Mock 契约均未改动；Playwright 全链路 18 项断言与跨端后台核验仍全部通过；`vue-tsc + vite build` 通过。


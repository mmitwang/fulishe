-- =====================================================
-- 福礼社平台多租户种子数据
-- 包含3个租户的完整业务数据
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- 租户数据 (3个租户)
-- -----------------------------------------------------
INSERT INTO sys_tenant (id, tenant_name, tenant_code, contact_person, contact_phone, contact_email, address, status, expire_time, tenant_type, create_time, update_time, deleted) VALUES
(1, '福礼社平台', 'FULISHE', '管理员', '13800138000', 'admin@fulishe.com', '北京市朝阳区建国路88号', 1, '2027-12-31 23:59:59', 1, NOW(), NOW(), 0),
(2, '腾讯科技', 'TENCENT', '张经理', '13900139000', 'hr@tencent.com', '广东省深圳市南山区科技园', 1, '2027-12-31 23:59:59', 2, NOW(), NOW(), 0),
(3, '阿里巴巴', 'ALIBABA', '李总监', '13700137000', 'hr@alibaba.com', '浙江省杭州市余杭区文一西路', 1, '2027-12-31 23:59:59', 2, NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 部门数据 (每个租户3个部门)
-- -----------------------------------------------------
INSERT INTO sys_dept (id, tenant_id, parent_id, ancestors, dept_name, dept_code, order_num, leader, phone, email, status, create_time, update_time, deleted) VALUES
-- 租户1: 福礼社平台
(1, 1, 0, '', '总部', 'HQ', 0, '王总', '13800138000', 'wang@fulishe.com', 1, NOW(), NOW(), 0),
(2, 1, 1, '1', '技术部', 'TECH', 1, '李工', '13800138001', 'li@fulishe.com', 1, NOW(), NOW(), 0),
(3, 1, 1, '1', '运营部', 'OPS', 2, '张经理', '13800138002', 'zhang@fulishe.com', 1, NOW(), NOW(), 0),

-- 租户2: 腾讯科技
(4, 2, 0, '', '腾讯总部', 'TEN-HQ', 0, '马总', '13900139000', 'ma@tencent.com', 1, NOW(), NOW(), 0),
(5, 2, 4, '4', '微信事业部', 'WECHAT', 1, '张小龙', '13900139001', 'zhangxl@tencent.com', 1, NOW(), NOW(), 0),
(6, 2, 4, '4', '游戏事业部', 'GAME', 2, '姚晓光', '13900139002', 'yaoxg@tencent.com', 1, NOW(), NOW(), 0),

-- 租户3: 阿里巴巴
(7, 3, 0, '', '阿里总部', 'ALI-HQ', 0, '马老师', '13700137000', 'ma@alibaba.com', 1, NOW(), NOW(), 0),
(8, 3, 7, '7', '淘宝事业部', 'TAOBAO', 1, '蒋凡', '13700137001', 'jiangf@alibaba.com', 1, NOW(), NOW(), 0),
(9, 3, 7, '7', '阿里云事业部', 'ALIYUN', 2, '张建锋', '13700137002', 'zhangjf@alibaba.com', 1, NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 用户数据 (每个租户5个用户，包含管理员)
-- -----------------------------------------------------
INSERT INTO sys_user (id, tenant_id, username, password, nickname, real_name, avatar, gender, mobile, email, user_type, status, last_login_time, last_login_ip, dept_id, position, employee_no, create_time, update_time, deleted) VALUES
-- 租户1: 福礼社平台
(1, 1, 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '系统管理员', '王管理员', NULL, 1, '13800138000', 'admin@fulishe.com', 3, 1, NOW(), '127.0.0.1', 1, '系统管理员', 'EMP001', NOW(), NOW(), 0),
(2, 1, 'user001', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '张三', '张三', NULL, 1, '13800138003', 'zhang3@fulishe.com', 1, 1, NULL, NULL, 2, '前端开发', 'EMP002', NOW(), NOW(), 0),
(3, 1, 'user002', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '李四', '李四', NULL, 1, '13800138004', 'li4@fulishe.com', 1, 1, NULL, NULL, 2, '后端开发', 'EMP003', NOW(), NOW(), 0),
(4, 1, 'user003', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '王五', '王五', NULL, 2, '13800138005', 'wang5@fulishe.com', 1, 1, NULL, NULL, 3, '运营专员', 'EMP004', NOW(), NOW(), 0),
(5, 1, 'user004', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '赵六', '赵六', NULL, 1, '13800138006', 'zhao6@fulishe.com', 2, 1, NULL, NULL, 3, '运营经理', 'EMP005', NOW(), NOW(), 0),

-- 租户2: 腾讯科技
(6, 2, 'tencent_admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '腾讯管理员', '陈管理员', NULL, 1, '13900139000', 'admin@tencent.com', 2, 1, NOW(), '127.0.0.1', 4, '企业管理员', 'TX001', NOW(), NOW(), 0),
(7, 2, 'tx_user001', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '小明', '小明', NULL, 1, '13900139003', 'xiaoming@tencent.com', 1, 1, NULL, NULL, 5, '产品经理', 'TX002', NOW(), NOW(), 0),
(8, 2, 'tx_user002', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '小红', '小红', NULL, 2, '13900139004', 'xiaohong@tencent.com', 1, 1, NULL, NULL, 5, 'UI设计师', 'TX003', NOW(), NOW(), 0),
(9, 2, 'tx_user003', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '小刚', '小刚', NULL, 1, '13900139005', 'xiaogang@tencent.com', 1, 1, NULL, NULL, 6, '游戏策划', 'TX004', NOW(), NOW(), 0),
(10, 2, 'tx_user004', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '小丽', '小丽', NULL, 2, '13900139006', 'xiaoli@tencent.com', 1, 1, NULL, NULL, 6, '游戏运营', 'TX005', NOW(), NOW(), 0),

-- 租户3: 阿里巴巴
(11, 3, 'alibaba_admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '阿里管理员', '周管理员', NULL, 1, '13700137000', 'admin@alibaba.com', 2, 1, NOW(), '127.0.0.1', 7, '企业管理员', 'AL001', NOW(), NOW(), 0),
(12, 3, 'ali_user001', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '阿华', '阿华', NULL, 1, '13700137003', 'ahua@alibaba.com', 1, 1, NULL, NULL, 8, '电商运营', 'AL002', NOW(), NOW(), 0),
(13, 3, 'ali_user002', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '阿美', '阿美', NULL, 2, '13700137004', 'amei@alibaba.com', 1, 1, NULL, NULL, 8, '客服专员', 'AL003', NOW(), NOW(), 0),
(14, 3, 'ali_user003', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '阿强', '阿强', NULL, 1, '13700137005', 'aqiang@alibaba.com', 1, 1, NULL, NULL, 9, '云计算工程师', 'AL004', NOW(), NOW(), 0),
(15, 3, 'ali_user004', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '阿珍', '阿珍', NULL, 2, '13700137006', 'azhen@alibaba.com', 1, 1, NULL, NULL, 9, '产品经理', 'AL005', NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 角色数据
-- -----------------------------------------------------
INSERT INTO sys_role (id, tenant_id, role_name, role_key, role_sort, data_scope, status, remark, create_time, update_time, deleted) VALUES
-- 租户1
(1, 1, '超级管理员', 'SUPER_ADMIN', 0, 1, 1, '系统超级管理员', NOW(), NOW(), 0),
(2, 1, '管理员', 'ADMIN', 1, 1, 1, '普通管理员', NOW(), NOW(), 0),
(3, 1, '员工', 'EMPLOYEE', 2, 4, 1, '普通员工', NOW(), NOW(), 0),

-- 租户2
(4, 2, '企业管理员', 'TENANT_ADMIN', 0, 1, 1, '腾讯企业管理员', NOW(), NOW(), 0),
(5, 2, '员工', 'EMPLOYEE', 1, 4, 1, '腾讯员工', NOW(), NOW(), 0),

-- 租户3
(6, 3, '企业管理员', 'TENANT_ADMIN', 0, 1, 1, '阿里巴巴企业管理员', NOW(), NOW(), 0),
(7, 3, '员工', 'EMPLOYEE', 1, 4, 1, '阿里员工', NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 用户角色关联
-- -----------------------------------------------------
INSERT INTO sys_user_role (id, tenant_id, user_id, role_id, create_time) VALUES
-- 租户1
(1, 1, 1, 1, NOW()),
(2, 1, 5, 2, NOW()),
(3, 1, 2, 3, NOW()),
(4, 1, 3, 3, NOW()),
(5, 1, 4, 3, NOW()),

-- 租户2
(6, 2, 6, 4, NOW()),
(7, 2, 7, 5, NOW()),
(8, 2, 8, 5, NOW()),
(9, 2, 9, 5, NOW()),
(10, 2, 10, 5, NOW()),

-- 租户3
(11, 3, 11, 6, NOW()),
(12, 3, 12, 7, NOW()),
(13, 3, 13, 7, NOW()),
(14, 3, 14, 7, NOW()),
(15, 3, 15, 7, NOW());

-- -----------------------------------------------------
-- 菜单数据 (系统共用)
-- -----------------------------------------------------
INSERT INTO sys_menu (id, parent_id, menu_name, path, component, perms, menu_type, visible, sort_order, icon, remark, create_time, update_time, deleted) VALUES
(1, 0, '系统管理', '/system', NULL, NULL, 'M', '0', 0, 'Setting', '系统管理模块', NOW(), NOW(), 0),
(2, 1, '用户管理', '/system/user', 'system/user/index', 'sys:user:list', 'C', '0', 1, 'User', '用户管理', NOW(), NOW(), 0),
(3, 1, '租户管理', '/system/tenant', 'system/tenant/index', 'sys:tenant:list', 'C', '0', 2, 'Building', '租户管理', NOW(), NOW(), 0),
(4, 1, '部门管理', '/system/dept', 'system/dept/index', 'sys:dept:list', 'C', '0', 3, 'OfficeBuilding', '部门管理', NOW(), NOW(), 0),
(5, 1, '角色管理', '/system/role', 'system/role/index', 'sys:role:list', 'C', '0', 4, 'UserFilled', '角色管理', NOW(), NOW(), 0),
(6, 1, '菜单管理', '/system/menu', 'system/menu/index', 'sys:menu:list', 'C', '0', 5, 'Menu', '菜单管理', NOW(), NOW(), 0),
(7, 2, '用户新增', NULL, NULL, 'sys:user:add', 'F', '1', 1, NULL, '新增用户', NOW(), NOW(), 0),
(8, 2, '用户编辑', NULL, NULL, 'sys:user:edit', 'F', '1', 2, NULL, '编辑用户', NOW(), NOW(), 0),
(9, 2, '用户删除', NULL, NULL, 'sys:user:delete', 'F', '1', 3, NULL, '删除用户', NOW(), NOW(), 0),
(10, 0, '商品管理', '/product', NULL, NULL, 'M', '0', 10, 'Goods', '商品管理模块', NOW(), NOW(), 0),
(11, 10, '商品列表', '/product/spu', 'product/spu/index', 'product:spu:list', 'C', '0', 1, 'Goods', '商品SPU管理', NOW(), NOW(), 0),
(12, 10, '商品分类', '/product/category', 'product/category/index', 'product:category:list', 'C', '0', 2, 'Grid', '商品分类管理', NOW(), NOW(), 0),
(13, 10, '品牌管理', '/product/brand', 'product/brand/index', 'product:brand:list', 'C', '0', 3, 'Flag', '品牌管理', NOW(), NOW(), 0),
(14, 0, '卡券管理', '/coupon', NULL, NULL, 'M', '0', 20, 'Discount', '卡券管理模块', NOW(), NOW(), 0),
(15, 14, '卡券模板', '/coupon/template', 'coupon/template/index', 'coupon:template:list', 'C', '0', 1, 'Tickets', '卡券模板管理', NOW(), NOW(), 0),
(16, 14, '卡券列表', '/coupon/list', 'coupon/list/index', 'coupon:list', 'C', '0', 2, 'Ticket', '卡券列表', NOW(), NOW(), 0),
(17, 14, '发放批次', '/coupon/batch', 'coupon/batch/index', 'coupon:batch:list', 'C', '0', 3, 'Box', '发放批次管理', NOW(), NOW(), 0),
(18, 0, '订单管理', '/order', NULL, NULL, 'M', '0', 30, 'List', '订单管理模块', NOW(), NOW(), 0),
(19, 18, '订单列表', '/order/list', 'order/list/index', 'order:list', 'C', '0', 1, 'Document', '订单列表', NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 角色菜单关联
-- -----------------------------------------------------
INSERT INTO sys_role_menu (id, role_id, menu_id, create_time) VALUES
-- 超级管理员(角色1)拥有所有权限
(1, 1, 1, NOW()), (2, 1, 2, NOW()), (3, 1, 3, NOW()), (4, 1, 4, NOW()),
(5, 1, 5, NOW()), (6, 1, 6, NOW()), (7, 1, 7, NOW()), (8, 1, 8, NOW()),
(9, 1, 9, NOW()), (10, 1, 10, NOW()), (11, 1, 11, NOW()), (12, 1, 12, NOW()),
(13, 1, 13, NOW()), (14, 1, 14, NOW()), (15, 1, 15, NOW()), (16, 1, 16, NOW()),
(17, 1, 17, NOW()), (18, 1, 18, NOW()), (19, 1, 19, NOW()),

-- 管理员(角色2)拥有管理权限
(20, 2, 1, NOW()), (21, 2, 2, NOW()), (22, 2, 4, NOW()), (23, 2, 5, NOW()),
(24, 2, 6, NOW()), (25, 2, 7, NOW()), (26, 2, 8, NOW()), (27, 2, 9, NOW()),
(28, 2, 10, NOW()), (29, 2, 11, NOW()), (30, 2, 12, NOW()), (31, 2, 13, NOW()),
(32, 2, 14, NOW()), (33, 2, 15, NOW()), (34, 2, 16, NOW()), (35, 2, 17, NOW()),
(36, 2, 18, NOW()), (37, 2, 19, NOW()),

-- 租户管理员(角色4,6)拥有企业管理权限
(38, 4, 2, NOW()), (39, 4, 4, NOW()), (40, 4, 5, NOW()), (41, 4, 6, NOW()),
(42, 4, 7, NOW()), (43, 4, 8, NOW()), (44, 4, 9, NOW()), (45, 4, 10, NOW()),
(46, 4, 11, NOW()), (47, 4, 12, NOW()), (48, 4, 13, NOW()), (49, 4, 14, NOW()),
(50, 4, 15, NOW()), (51, 4, 16, NOW()), (52, 4, 17, NOW()), (53, 4, 18, NOW()),
(54, 4, 19, NOW()),

(55, 6, 2, NOW()), (56, 6, 4, NOW()), (57, 6, 5, NOW()), (58, 6, 6, NOW()),
(59, 6, 7, NOW()), (60, 6, 8, NOW()), (61, 6, 9, NOW()), (62, 6, 10, NOW()),
(63, 6, 11, NOW()), (64, 6, 12, NOW()), (65, 6, 13, NOW()), (66, 6, 14, NOW()),
(67, 6, 15, NOW()), (68, 6, 16, NOW()), (69, 6, 17, NOW()), (70, 6, 18, NOW()),
(71, 6, 19, NOW());

-- -----------------------------------------------------
-- 商品分类数据
-- -----------------------------------------------------
INSERT INTO pms_category (id, tenant_id, parent_id, name, icon, sort_order, level, status, create_time, update_time, deleted) VALUES
-- 租户1
(1, 1, 0, '精选礼品', NULL, 1, 1, 1, NOW(), NOW(), 0),
(2, 1, 0, '食品礼盒', NULL, 2, 1, 1, NOW(), NOW(), 0),
(3, 1, 0, '家居生活', NULL, 3, 1, 1, NOW(), NOW(), 0),
(4, 1, 1, '节日礼品', NULL, 1, 2, 1, NOW(), NOW(), 0),
(5, 1, 1, '商务礼品', NULL, 2, 2, 1, NOW(), NOW(), 0),
(6, 1, 2, '坚果礼盒', NULL, 1, 2, 1, NOW(), NOW(), 0),
(7, 1, 2, '茶叶礼盒', NULL, 2, 2, 1, NOW(), NOW(), 0),

-- 租户2
(8, 2, 0, '腾讯福利', NULL, 1, 1, 1, NOW(), NOW(), 0),
(9, 2, 0, '数码产品', NULL, 2, 1, 1, NOW(), NOW(), 0),
(10, 2, 8, '游戏周边', NULL, 1, 2, 1, NOW(), NOW(), 0),
(11, 2, 8, '办公福利', NULL, 2, 2, 1, NOW(), NOW(), 0),

-- 租户3
(12, 3, 0, '阿里福利', NULL, 1, 1, 1, NOW(), NOW(), 0),
(13, 3, 0, '电商好物', NULL, 2, 1, 1, NOW(), NOW(), 0),
(14, 3, 12, '员工福利', NULL, 1, 2, 1, NOW(), NOW(), 0),
(15, 3, 13, '爆款商品', NULL, 1, 2, 1, NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 品牌数据
-- -----------------------------------------------------
INSERT INTO pms_brand (id, tenant_id, name, logo, description, sort_order, status, create_time, update_time, deleted) VALUES
-- 租户1
(1, 1, '福礼社精选', NULL, '福礼社自有品牌', 1, 1, NOW(), NOW(), 0),
(2, 1, '良品铺子', NULL, '知名零食品牌', 2, 1, NOW(), NOW(), 0),
(3, 1, '八马茶业', NULL, '知名茶叶品牌', 3, 1, NOW(), NOW(), 0),

-- 租户2
(4, 2, '腾讯文创', NULL, '腾讯文创品牌', 1, 1, NOW(), NOW(), 0),
(5, 2, '雷蛇', NULL, '游戏外设品牌', 2, 1, NOW(), NOW(), 0),

-- 租户3
(6, 3, '淘宝心选', NULL, '淘宝精选品牌', 1, 1, NOW(), NOW(), 0),
(7, 3, '三只松鼠', NULL, '知名坚果品牌', 2, 1, NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 商品SPU数据
-- -----------------------------------------------------
INSERT INTO pms_spu (id, tenant_id, spu_no, name, subtitle, category_id, brand_id, main_image, images, description, sale_count, view_count, sort_order, status, publish_time, create_time, update_time, deleted) VALUES
-- 租户1
(1, 1, 'SPU001', '精美礼品套装', '节日福利首选', 4, 1, 'https://picsum.photos/300/300?random=1', '["https://picsum.photos/300/300?random=1","https://picsum.photos/300/300?random=2"]', '精选优质材料制作，精美包装', 128, 520, 1, 1, NOW(), NOW(), NOW(), 0),
(2, 1, 'SPU002', '高端坚果礼盒', '健康营养精选', 6, 2, 'https://picsum.photos/300/300?random=3', '["https://picsum.photos/300/300?random=3","https://picsum.photos/300/300?random=4"]', '精选6种坚果，营养丰富', 89, 360, 2, 1, NOW(), NOW(), NOW(), 0),
(3, 1, 'SPU003', '创意家居摆件', '生活美学', 3, 1, 'https://picsum.photos/300/300?random=5', '["https://picsum.photos/300/300?random=5"]', '简约现代风格，提升生活品质', 56, 280, 3, 1, NOW(), NOW(), NOW(), 0),
(4, 1, 'SPU004', '精选茶叶礼盒', '送礼佳品', 7, 3, 'https://picsum.photos/300/300?random=6', '["https://picsum.photos/300/300?random=6","https://picsum.photos/300/300?random=7"]', '精选铁观音、大红袍', 34, 180, 4, 1, NOW(), NOW(), NOW(), 0),

-- 租户2
(5, 2, 'SPU201', '腾讯游戏手办', '限量版游戏角色', 10, 4, 'https://picsum.photos/300/300?random=8', '["https://picsum.photos/300/300?random=8"]', '精美游戏角色手办', 256, 1200, 1, 1, NOW(), NOW(), NOW(), 0),
(6, 2, 'SPU202', '雷蛇游戏鼠标', '专业电竞鼠标', 9, 5, 'https://picsum.photos/300/300?random=9', '["https://picsum.photos/300/300?random=9"]', 'RGB灯光，高精度传感器', 189, 850, 2, 1, NOW(), NOW(), NOW(), 0),
(7, 2, 'SPU203', '腾讯定制笔记本', '商务办公必备', 11, 4, 'https://picsum.photos/300/300?random=10', '["https://picsum.photos/300/300?random=10"]', '高品质纸张，精美封面', 312, 1500, 3, 1, NOW(), NOW(), NOW(), 0),

-- 租户3
(8, 3, 'SPU301', '阿里定制背包', '大容量通勤背包', 14, 6, 'https://picsum.photos/300/300?random=11', '["https://picsum.photos/300/300?random=11"]', '防水面料，多功能分区', 167, 780, 1, 1, NOW(), NOW(), NOW(), 0),
(9, 3, 'SPU302', '三只松鼠坚果大礼包', '超值坚果组合', 15, 7, 'https://picsum.photos/300/300?random=12', '["https://picsum.photos/300/300?random=12"]', '8种坚果，1.5kg装', 423, 2100, 2, 1, NOW(), NOW(), NOW(), 0),
(10, 3, 'SPU303', '淘宝心选保温杯', '316不锈钢', 14, 6, 'https://picsum.photos/300/300?random=13', '["https://picsum.photos/300/300?random=13"]', '保温12小时，时尚外观', 234, 960, 3, 1, NOW(), NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 商品SKU数据
-- -----------------------------------------------------
INSERT INTO pms_sku (id, tenant_id, spu_id, sku_no, name, spec_values, price, market_price, cost_price, stock, locked_stock, sku_image, weight, volume, sort_order, status, create_time, update_time, deleted) VALUES
-- 租户1
(1, 1, 1, 'SKU001', '精美礼品套装-标准装', '{"规格":"标准装"}', 199.00, 299.00, 120.00, 100, 5, 'https://picsum.photos/200/200?random=1', 1500.00, 3000.00, 1, 1, NOW(), NOW(), 0),
(2, 1, 1, 'SKU002', '精美礼品套装-豪华装', '{"规格":"豪华装"}', 399.00, 499.00, 250.00, 50, 2, 'https://picsum.photos/200/200?random=2', 3000.00, 6000.00, 2, 1, NOW(), NOW(), 0),
(3, 1, 2, 'SKU003', '高端坚果礼盒-500g', '{"规格":"500g"}', 158.00, 198.00, 90.00, 200, 10, 'https://picsum.photos/200/200?random=3', 500.00, 1000.00, 1, 1, NOW(), NOW(), 0),
(4, 1, 2, 'SKU004', '高端坚果礼盒-1kg', '{"规格":"1kg"}', 268.00, 328.00, 150.00, 100, 5, 'https://picsum.photos/200/200?random=4', 1000.00, 2000.00, 2, 1, NOW(), NOW(), 0),
(5, 1, 3, 'SKU005', '创意家居摆件-小号', '{"规格":"小号"}', 89.00, 129.00, 50.00, 500, 20, 'https://picsum.photos/200/200?random=5', 200.00, 500.00, 1, 1, NOW(), NOW(), 0),
(6, 1, 4, 'SKU006', '精选茶叶礼盒-200g', '{"规格":"200g"}', 268.00, 328.00, 150.00, 80, 3, 'https://picsum.photos/200/200?random=6', 200.00, 600.00, 1, 1, NOW(), NOW(), 0),

-- 租户2
(7, 2, 5, 'SKU201', '腾讯游戏手办-Lol角色', '{"角色":"LOL-盲僧"}', 299.00, 399.00, 180.00, 100, 10, 'https://picsum.photos/200/200?random=8', 300.00, 500.00, 1, 1, NOW(), NOW(), 0),
(8, 2, 6, 'SKU202', '雷蛇游戏鼠标-标准版', '{"版本":"标准版"}', 299.00, 349.00, 180.00, 150, 8, 'https://picsum.photos/200/200?random=9', 150.00, 300.00, 1, 1, NOW(), NOW(), 0),
(9, 2, 7, 'SKU203', '腾讯定制笔记本-A5', '{"规格":"A5"}', 58.00, 78.00, 30.00, 500, 30, 'https://picsum.photos/200/200?random=10', 500.00, 800.00, 1, 1, NOW(), NOW(), 0),

-- 租户3
(10, 3, 8, 'SKU301', '阿里定制背包-黑色', '{"颜色":"黑色"}', 199.00, 259.00, 120.00, 200, 15, 'https://picsum.photos/200/200?random=11', 500.00, 3000.00, 1, 1, NOW(), NOW(), 0),
(11, 3, 9, 'SKU302', '三只松鼠坚果大礼包-1.5kg', '{"规格":"1.5kg"}', 168.00, 198.00, 95.00, 300, 20, 'https://picsum.photos/200/200?random=12', 1500.00, 3000.00, 1, 1, NOW(), NOW(), 0),
(12, 3, 10, 'SKU303', '淘宝心选保温杯-白色', '{"颜色":"白色"}', 89.00, 119.00, 50.00, 400, 25, 'https://picsum.photos/200/200?random=13', 300.00, 450.00, 1, 1, NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 卡券模板数据
-- -----------------------------------------------------
INSERT INTO cms_coupon_template (id, tenant_id, template_name, coupon_type, face_value, validity_type, validity_days, validity_start_time, validity_end_time, applicable_type, applicable_ids, min_amount, total_count, received_count, used_count, description, use_instructions, status, create_time, update_time, deleted) VALUES
-- 租户1
(1, 1, '新人专享券', 1, 50.00, 1, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), 1, NULL, 200.00, 100, 30, 15, '新人注册专享优惠券', '仅限新人首次下单使用', 1, NOW(), NOW(), 0),
(2, 1, '满减优惠券', 1, 30.00, 1, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1, NULL, 100.00, 500, 120, 85, '全场通用满减券', '全场商品通用', 1, NOW(), NOW(), 0),
(3, 1, '无门槛券', 1, 10.00, 2, 30, NULL, NULL, 1, NULL, 0.00, 200, 50, 25, '无门槛优惠券', '无最低消费限制', 1, NOW(), NOW(), 0),

-- 租户2
(4, 2, '腾讯员工福利券', 1, 100.00, 1, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY), 1, NULL, 500.00, 1000, 200, 80, '腾讯员工专属福利', '仅限腾讯员工使用', 1, NOW(), NOW(), 0),
(5, 2, '游戏周边折扣券', 1, 50.00, 1, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 60 DAY), 2, '[10]', 200.00, 500, 150, 60, '游戏周边专享', '仅限游戏周边分类使用', 1, NOW(), NOW(), 0),

-- 租户3
(6, 3, '阿里员工福利券', 1, 150.00, 1, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY), 1, NULL, 800.00, 800, 180, 70, '阿里员工专属福利', '仅限阿里员工使用', 1, NOW(), NOW(), 0),
(7, 3, '电商好物优惠券', 1, 20.00, 2, 15, NULL, NULL, 1, NULL, 50.00, 1000, 300, 120, '电商好物专享', '电商分类商品通用', 1, NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 卡券实例数据
-- -----------------------------------------------------
INSERT INTO cms_coupon (id, tenant_id, template_id, coupon_code, coupon_password, coupon_type, face_value, balance, user_id, bind_time, validity_start_time, validity_end_time, status, receive_time, receive_channel, used_time, used_order_id, source_type, source_id, remark, create_time, update_time, deleted) VALUES
-- 租户1 - 未领取
(1, 1, 1, 'FLS-202401-0001', NULL, 1, 50.00, 50.00, NULL, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), 0, NULL, NULL, NULL, NULL, 1, 1, '新人专享券', NOW(), NOW(), 0),
(2, 1, 1, 'FLS-202401-0002', NULL, 1, 50.00, 50.00, NULL, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), 0, NULL, NULL, NULL, NULL, 1, 1, '新人专享券', NOW(), NOW(), 0),
(3, 1, 2, 'FLS-202401-0003', NULL, 1, 30.00, 30.00, NULL, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 0, NULL, NULL, NULL, NULL, 1, 2, '满减优惠券', NOW(), NOW(), 0),

-- 租户1 - 已领取未使用
(4, 1, 1, 'FLS-202401-0004', NULL, 1, 50.00, 50.00, 2, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), 1, NOW(), 3, NULL, NULL, 1, 1, '新人专享券', NOW(), NOW(), 0),
(5, 1, 2, 'FLS-202401-0005', NULL, 1, 30.00, 30.00, 3, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1, NOW(), 3, NULL, NULL, 1, 2, '满减优惠券', NOW(), NOW(), 0),

-- 租户1 - 已使用
(6, 1, 2, 'FLS-202401-0006', NULL, 1, 30.00, 0.00, 4, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 2, NOW(), 3, NOW(), 1, 1, 2, '满减优惠券', NOW(), NOW(), 0),

-- 租户2
(7, 2, 4, 'TX-202401-0001', NULL, 1, 100.00, 100.00, 7, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY), 1, NOW(), 3, NULL, NULL, 1, 4, '腾讯员工福利券', NOW(), NOW(), 0),
(8, 2, 5, 'TX-202401-0002', NULL, 1, 50.00, 50.00, 8, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 60 DAY), 1, NOW(), 3, NULL, NULL, 1, 5, '游戏周边折扣券', NOW(), NOW(), 0),
(9, 2, 4, 'TX-202401-0003', NULL, 1, 100.00, 0.00, 9, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY), 2, NOW(), 3, NOW(), 2, 1, 4, '腾讯员工福利券', NOW(), NOW(), 0),

-- 租户3
(10, 3, 6, 'ALI-202401-0001', NULL, 1, 150.00, 150.00, 12, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY), 1, NOW(), 3, NULL, NULL, 1, 6, '阿里员工福利券', NOW(), NOW(), 0),
(11, 3, 7, 'ALI-202401-0002', NULL, 1, 20.00, 20.00, 13, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY), 1, NOW(), 3, NULL, NULL, 1, 7, '电商好物优惠券', NOW(), NOW(), 0),
(12, 3, 6, 'ALI-202401-0003', NULL, 1, 150.00, 0.00, 14, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY), 2, NOW(), 3, NOW(), 3, 1, 6, '阿里员工福利券', NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 订单数据
-- -----------------------------------------------------
INSERT INTO oms_order (id, tenant_id, order_no, user_id, order_type, order_source, total_amount, pay_amount, freight_amount, discount_amount, coupon_amount, pay_type, status, pay_time, delivery_time, receive_time, complete_time, cancel_time, cancel_reason, receiver_name, receiver_phone, receiver_province, receiver_city, receiver_district, receiver_detail_address, remark, coupon_id, out_trade_no, create_time, update_time, deleted) VALUES
-- 租户1
(1, 1, 'FLS202401150001', 2, 1, 1, 199.00, 199.00, 0.00, 0.00, 0.00, 2, 3, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), NULL, NULL, '张三', '13800138003', '北京市', '北京市', '朝阳区', '朝阳区某某街道1号', NULL, NULL, 'TXN202401150001', NOW(), NOW(), 0),
(2, 1, 'FLS202401150002', 3, 1, 1, 158.00, 128.00, 0.00, 0.00, 30.00, 2, 3, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), NULL, NULL, '李四', '13800138004', '上海市', '上海市', '浦东新区', '浦东新区某某路2号', NULL, 6, 'TXN202401150002', NOW(), NOW(), 0),
(3, 1, 'FLS202401150003', 4, 1, 1, 89.00, 89.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, '王五', '13800138005', '广州市', '广州市', '天河区', '天河区某某街3号', NULL, NULL, NULL, NOW(), NOW(), 0),

-- 租户2
(4, 2, 'TX202401150001', 7, 1, 1, 299.00, 299.00, 0.00, 0.00, 0.00, 1, 2, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), NULL, NULL, NULL, NULL, '小明', '13900139003', '广东省', '深圳市', '南山区', '南山区科技园路1号', NULL, NULL, 'TXN202401150003', NOW(), NOW(), 0),
(5, 2, 'TX202401150002', 8, 1, 1, 299.00, 199.00, 0.00, 0.00, 100.00, 1, 3, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), NULL, NULL, '小红', '13900139004', '广东省', '深圳市', '福田区', '福田区某某大厦2号', NULL, 9, 'TXN202401150004', NOW(), NOW(), 0),
(6, 2, 'TX202401150003', 9, 1, 1, 58.00, 58.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, '小刚', '13900139005', '广东省', '深圳市', '宝安区', '宝安区某某路3号', NULL, NULL, NULL, NOW(), NOW(), 0),

-- 租户3
(7, 3, 'ALI202401150001', 12, 1, 1, 199.00, 199.00, 0.00, 0.00, 0.00, 2, 1, NOW(), NULL, NULL, NULL, NULL, NULL, '阿华', '13700137003', '浙江省', '杭州市', '西湖区', '西湖区某某街1号', NULL, NULL, 'TXN202401150005', NOW(), NOW(), 0),
(8, 3, 'ALI202401150002', 13, 1, 1, 168.00, 148.00, 0.00, 0.00, 20.00, 2, 3, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), NULL, NULL, '阿美', '13700137004', '浙江省', '杭州市', '余杭区', '余杭区某某大厦2号', NULL, 11, 'TXN202401150006', NOW(), NOW(), 0),
(9, 3, 'ALI202401150003', 14, 1, 1, 89.00, 89.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, '阿强', '13700137005', '浙江省', '杭州市', '滨江区', '滨江区某某路3号', NULL, NULL, NULL, NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 订单商品数据
-- -----------------------------------------------------
INSERT INTO oms_order_item (id, tenant_id, order_id, order_no, spu_id, sku_id, spu_name, sku_name, spec_values, product_image, price, quantity, total_amount, discount_amount, real_amount, create_time, update_time) VALUES
-- 租户1
(1, 1, 1, 'FLS202401150001', 1, 1, '精美礼品套装', '精美礼品套装-标准装', '{"规格":"标准装"}', 'https://picsum.photos/200/200?random=1', 199.00, 1, 199.00, 0.00, 199.00, NOW(), NOW()),
(2, 1, 2, 'FLS202401150002', 2, 3, '高端坚果礼盒', '高端坚果礼盒-500g', '{"规格":"500g"}', 'https://picsum.photos/200/200?random=3', 158.00, 1, 158.00, 30.00, 128.00, NOW(), NOW()),
(3, 1, 3, 'FLS202401150003', 3, 5, '创意家居摆件', '创意家居摆件-小号', '{"规格":"小号"}', 'https://picsum.photos/200/200?random=5', 89.00, 1, 89.00, 0.00, 89.00, NOW(), NOW()),

-- 租户2
(4, 2, 4, 'TX202401150001', 5, 7, '腾讯游戏手办', '腾讯游戏手办-Lol角色', '{"角色":"LOL-盲僧"}', 'https://picsum.photos/200/200?random=8', 299.00, 1, 299.00, 0.00, 299.00, NOW(), NOW()),
(5, 2, 5, 'TX202401150002', 6, 8, '雷蛇游戏鼠标', '雷蛇游戏鼠标-标准版', '{"版本":"标准版"}', 'https://picsum.photos/200/200?random=9', 299.00, 1, 299.00, 100.00, 199.00, NOW(), NOW()),
(6, 2, 6, 'TX202401150003', 7, 9, '腾讯定制笔记本', '腾讯定制笔记本-A5', '{"规格":"A5"}', 'https://picsum.photos/200/200?random=10', 58.00, 1, 58.00, 0.00, 58.00, NOW(), NOW()),

-- 租户3
(7, 3, 7, 'ALI202401150001', 8, 10, '阿里定制背包', '阿里定制背包-黑色', '{"颜色":"黑色"}', 'https://picsum.photos/200/200?random=11', 199.00, 1, 199.00, 0.00, 199.00, NOW(), NOW()),
(8, 3, 8, 'ALI202401150002', 9, 11, '三只松鼠坚果大礼包', '三只松鼠坚果大礼包-1.5kg', '{"规格":"1.5kg"}', 'https://picsum.photos/200/200?random=12', 168.00, 1, 168.00, 20.00, 148.00, NOW(), NOW()),
(9, 3, 9, 'ALI202401150003', 10, 12, '淘宝心选保温杯', '淘宝心选保温杯-白色', '{"颜色":"白色"}', 'https://picsum.photos/200/200?random=13', 89.00, 1, 89.00, 0.00, 89.00, NOW(), NOW());

-- -----------------------------------------------------
-- 收货地址数据
-- -----------------------------------------------------
INSERT INTO oms_user_address (id, tenant_id, user_id, receiver_name, receiver_phone, province, city, district, detail_address, is_default, sort_order, create_time, update_time, deleted) VALUES
-- 租户1
(1, 1, 2, '张三', '13800138003', '北京市', '北京市', '朝阳区', '朝阳区某某街道1号', 1, 0, NOW(), NOW(), 0),
(2, 1, 3, '李四', '13800138004', '上海市', '上海市', '浦东新区', '浦东新区某某路2号', 1, 0, NOW(), NOW(), 0),
(3, 1, 4, '王五', '13800138005', '广州市', '广州市', '天河区', '天河区某某街3号', 1, 0, NOW(), NOW(), 0),

-- 租户2
(4, 2, 7, '小明', '13900139003', '广东省', '深圳市', '南山区', '南山区科技园路1号', 1, 0, NOW(), NOW(), 0),
(5, 2, 8, '小红', '13900139004', '广东省', '深圳市', '福田区', '福田区某某大厦2号', 1, 0, NOW(), NOW(), 0),
(6, 2, 9, '小刚', '13900139005', '广东省', '深圳市', '宝安区', '宝安区某某路3号', 1, 0, NOW(), NOW(), 0),

-- 租户3
(7, 3, 12, '阿华', '13700137003', '浙江省', '杭州市', '西湖区', '西湖区某某街1号', 1, 0, NOW(), NOW(), 0),
(8, 3, 13, '阿美', '13700137004', '浙江省', '杭州市', '余杭区', '余杭区某某大厦2号', 1, 0, NOW(), NOW(), 0),
(9, 3, 14, '阿强', '13700137005', '浙江省', '杭州市', '滨江区', '滨江区某某路3号', 1, 0, NOW(), NOW(), 0);

-- -----------------------------------------------------
-- 账户数据
-- -----------------------------------------------------
INSERT INTO acc_account (id, tenant_id, user_id, account_type, balance, frozen_amount, total_income, total_expense, status, last_trans_time, create_time, update_time) VALUES
-- 租户1
(1, 1, 2, 1, 500.00, 0.00, 1000.00, 500.00, 1, NOW(), NOW(), NOW()),
(2, 1, 3, 1, 800.00, 0.00, 1500.00, 700.00, 1, NOW(), NOW(), NOW()),
(3, 1, 4, 1, 300.00, 0.00, 500.00, 200.00, 1, NOW(), NOW(), NOW()),
(4, 1, 5, 1, 2000.00, 0.00, 3000.00, 1000.00, 1, NOW(), NOW(), NOW()),

-- 租户2
(5, 2, 7, 1, 1000.00, 0.00, 2000.00, 1000.00, 1, NOW(), NOW(), NOW()),
(6, 2, 8, 1, 1200.00, 0.00, 2500.00, 1300.00, 1, NOW(), NOW(), NOW()),
(7, 2, 9, 1, 600.00, 0.00, 1000.00, 400.00, 1, NOW(), NOW(), NOW()),

-- 租户3
(8, 3, 12, 1, 1500.00, 0.00, 3000.00, 1500.00, 1, NOW(), NOW(), NOW()),
(9, 3, 13, 1, 800.00, 0.00, 1500.00, 700.00, 1, NOW(), NOW(), NOW()),
(10, 3, 14, 1, 2000.00, 0.00, 4000.00, 2000.00, 1, NOW(), NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 数据验证查询
-- =====================================================
-- 验证租户数据
SELECT tenant_id, tenant_name, tenant_code FROM sys_tenant;

-- 验证租户隔离
SELECT '租户1用户' as label, COUNT(*) as count FROM sys_user WHERE tenant_id = 1
UNION ALL
SELECT '租户2用户' as label, COUNT(*) as count FROM sys_user WHERE tenant_id = 2
UNION ALL
SELECT '租户3用户' as label, COUNT(*) as count FROM sys_user WHERE tenant_id = 3;

-- 验证商品数据
SELECT '租户1商品' as label, COUNT(*) as count FROM pms_spu WHERE tenant_id = 1
UNION ALL
SELECT '租户2商品' as label, COUNT(*) as count FROM pms_spu WHERE tenant_id = 2
UNION ALL
SELECT '租户3商品' as label, COUNT(*) as count FROM pms_spu WHERE tenant_id = 3;

-- 验证订单数据
SELECT '租户1订单' as label, COUNT(*) as count FROM oms_order WHERE tenant_id = 1
UNION ALL
SELECT '租户2订单' as label, COUNT(*) as count FROM oms_order WHERE tenant_id = 2
UNION ALL
SELECT '租户3订单' as label, COUNT(*) as count FROM oms_order WHERE tenant_id = 3;

-- 验证卡券数据
SELECT '租户1卡券' as label, COUNT(*) as count FROM cms_coupon WHERE tenant_id = 1
UNION ALL
SELECT '租户2卡券' as label, COUNT(*) as count FROM cms_coupon WHERE tenant_id = 2
UNION ALL
SELECT '租户3卡券' as label, COUNT(*) as count FROM cms_coupon WHERE tenant_id = 3;
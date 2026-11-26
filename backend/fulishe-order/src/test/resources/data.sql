INSERT INTO sys_tenant (id, tenant_name, tenant_code, contact_person, contact_phone, status) VALUES
(1, '南樾星数字科技有限公司', 'NANYUEXING', '张经理', '13800138001', 1),
(2, '福礼社运营中心', 'FULISHE', '李总监', '13800138002', 1),
(3, '测试租户A', 'TEST_A', '王测试', '13800138003', 1),
(4, '测试租户B', 'TEST_B', '赵测试', '13800138004', 0),
(5, '新春礼品有限公司', 'XINCHUN', '陈总', '13800138010', 1),
(6, '美食汇商贸', 'MEISHIHUI', '刘经理', '13800138011', 1),
(7, '数码优选科技', 'SHUMAYOUXUAN', '周总监', '13800138012', 1);

INSERT INTO sys_user (id, tenant_id, username, password, real_name, mobile, email, status) VALUES
(1, 1, 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '管理员', '13800138001', 'admin@fulishe.com', 1),
(2, 1, 'zhangsan', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '张三', '13800138005', 'zhangsan@fulishe.com', 1),
(3, 1, 'lisi', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '李四', '13800138006', 'lisi@fulishe.com', 1),
(4, 2, 'fulishe_admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '福礼社管理员', '13800138002', 'admin@fulishe.cn', 1),
(5, 2, 'user1', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '用户一', '13800138007', 'user1@fulishe.cn', 1),
(6, 3, 'tenant_a_admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '租户A管理员', '13800138003', 'admin@testa.com', 1),
(7, 3, 'test_user1', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '测试用户1', '13800138008', 'user1@testa.com', 1),
(8, 3, 'test_user2', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '测试用户2', '13800138009', 'user2@testa.com', 1),
(9, 5, 'xinchun_admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '新春礼品管理员', '13800138010', 'admin@xinchun.com', 1),
(10, 5, 'customer1', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '客户A', '13800138013', 'customer1@xinchun.com', 1),
(11, 6, 'meishihui_admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '美食汇管理员', '13800138011', 'admin@meishihui.com', 1),
(12, 6, 'customer2', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '客户B', '13800138014', 'customer2@meishihui.com', 1),
(13, 7, 'shuma_admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '数码优选管理员', '13800138012', 'admin@shumayouxuan.com', 1),
(14, 7, 'customer3', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '客户C', '13800138015', 'customer3@shumayouxuan.com', 1),
(15, 1, 'wangwu', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '王五', '13800138016', 'wangwu@fulishe.com', 1),
(16, 2, 'user2', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '用户二', '13800138017', 'user2@fulishe.cn', 1);

INSERT INTO pms_product (id, tenant_id, name, description, category_id, brand, status) VALUES
(1, 1, '春节礼品卡', '精选春节礼品，送礼首选', 1, '福礼社', 1),
(2, 1, '中秋月饼礼盒', '传统工艺，美味可口', 2, '稻香村', 1),
(3, 1, '端午粽子礼盒', '新鲜水果，手工制作', 2, '五芳斋', 1),
(4, 1, '员工福利卡', '企业员工福利首选', 3, '福礼社', 1),
(5, 2, '水果礼盒', '新鲜水果，健康之选', 1, '福礼社', 1),
(6, 2, '坚果礼盒', '精选坚果，营养丰富', 1, '福礼社', 1),
(7, 3, '办公用品套装', '办公必备，品质保证', 4, '得力', 1),
(8, 3, '数码配件礼包', '手机配件，实用便捷', 5, '小米', 1),
(9, 5, '新年红包袋', '精美红包袋，喜庆吉祥', 1, '新春礼品', 1),
(10, 5, '春联礼盒', '名家书法春联，福到家门', 1, '新春礼品', 1),
(11, 5, '年画套装', '传统年画，年味十足', 1, '新春礼品', 1),
(12, 6, '进口巧克力礼盒', '比利时进口，丝滑口感', 2, 'Godiva', 1),
(13, 6, '红酒礼盒', '法国波尔多红酒，品味人生', 2, '拉菲', 1),
(14, 6, '茶叶礼盒', '西湖龙井，清香四溢', 2, '西湖', 1),
(15, 7, '蓝牙耳机', '无线降噪，音质出众', 5, '华为', 1),
(16, 7, '智能手表', '健康监测，运动伴侣', 5, '苹果', 1),
(17, 7, '充电宝', '大容量快充，出行必备', 5, '小米', 1),
(18, 1, '端午鸭蛋礼盒', '高邮咸鸭蛋，油润鲜香', 2, '高邮', 1),
(19, 2, '海鲜礼盒', '新鲜海鲜，送礼佳品', 2, '福礼社', 1),
(20, 3, '电脑外设套装', '键盘鼠标耳机，游戏必备', 5, '雷蛇', 1);

INSERT INTO pms_sku (id, tenant_id, product_id, sku_code, name, price, original_price, stock, status, version) VALUES
(1, 1, 1, 'SKU001', '春节礼品卡100元', 100.00, 120.00, 1000, 1, 1),
(2, 1, 1, 'SKU002', '春节礼品卡200元', 200.00, 240.00, 500, 1, 1),
(3, 1, 1, 'SKU003', '春节礼品卡500元', 500.00, 580.00, 200, 1, 1),
(4, 1, 2, 'SKU004', '中秋月饼礼盒-经典款', 188.00, 228.00, 300, 1, 1),
(5, 1, 2, 'SKU005', '中秋月饼礼盒-豪华款', 388.00, 458.00, 100, 1, 1),
(6, 1, 3, 'SKU006', '端午粽子礼盒-经典款', 168.00, 198.00, 250, 1, 1),
(7, 1, 4, 'SKU007', '员工福利卡100元', 100.00, 110.00, 2000, 1, 1),
(8, 1, 4, 'SKU008', '员工福利卡500元', 500.00, 550.00, 500, 1, 1),
(9, 2, 5, 'SKU009', '水果礼盒-标准版', 128.00, 158.00, 400, 1, 1),
(10, 2, 5, 'SKU010', '水果礼盒-豪华版', 268.00, 328.00, 150, 1, 1),
(11, 2, 6, 'SKU011', '坚果礼盒-标准版', 158.00, 188.00, 300, 1, 1),
(12, 3, 7, 'SKU012', '办公用品套装-A4纸', 58.00, 68.00, 1000, 1, 1),
(13, 3, 7, 'SKU013', '办公用品套装-笔记本', 88.00, 108.00, 500, 1, 1),
(14, 3, 8, 'SKU014', '数码配件礼包-手机壳', 38.00, 48.00, 800, 1, 1),
(15, 3, 8, 'SKU015', '数码配件礼包-充电器', 68.00, 88.00, 400, 1, 1),
(16, 5, 9, 'SKU016', '新年红包袋-小号(10个)', 28.00, 35.00, 500, 1, 1),
(17, 5, 9, 'SKU017', '新年红包袋-大号(10个)', 38.00, 45.00, 300, 1, 1),
(18, 5, 10, 'SKU018', '春联礼盒-标准版', 58.00, 78.00, 200, 1, 1),
(19, 5, 10, 'SKU019', '春联礼盒-豪华版', 128.00, 168.00, 100, 1, 1),
(20, 5, 11, 'SKU020', '年画套装-传统款', 48.00, 68.00, 150, 1, 1),
(21, 6, 12, 'SKU021', '进口巧克力礼盒-200g', 168.00, 198.00, 100, 1, 1),
(22, 6, 12, 'SKU022', '进口巧克力礼盒-500g', 328.00, 388.00, 50, 1, 1),
(23, 6, 13, 'SKU023', '红酒礼盒-单支装', 298.00, 358.00, 80, 1, 1),
(24, 6, 13, 'SKU024', '红酒礼盒-双支装', 568.00, 688.00, 40, 1, 1),
(25, 6, 14, 'SKU025', '茶叶礼盒-龙井', 268.00, 328.00, 60, 1, 1),
(26, 7, 15, 'SKU026', '蓝牙耳机-标准版', 198.00, 258.00, 120, 1, 1),
(27, 7, 15, 'SKU027', '蓝牙耳机-降噪版', 398.00, 498.00, 60, 1, 1),
(28, 7, 16, 'SKU028', '智能手表-基础款', 1298.00, 1598.00, 30, 1, 1),
(29, 7, 17, 'SKU029', '充电宝-10000mAh', 88.00, 128.00, 200, 1, 1),
(30, 7, 17, 'SKU030', '充电宝-20000mAh', 158.00, 198.00, 100, 1, 1),
(31, 1, 18, 'SKU031', '端午鸭蛋礼盒-20枚', 98.00, 128.00, 200, 1, 1),
(32, 2, 19, 'SKU032', '海鲜礼盒-海鲜拼盘', 398.00, 498.00, 50, 1, 1),
(33, 3, 20, 'SKU033', '电脑外设套装-入门款', 298.00, 358.00, 80, 1, 1);

CREATE TABLE IF NOT EXISTS coupon_template (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    face_value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2),
    total_count INT DEFAULT 0,
    used_count INT DEFAULT 0,
    status TINYINT DEFAULT 1,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

INSERT INTO coupon_template (id, tenant_id, name, face_value, min_amount, total_count, used_count, status, start_time, end_time) VALUES
(1, 1, '新人专享券', 50.00, 200.00, 1000, 234, 1, '2024-01-01 00:00:00', '2024-12-31 23:59:59'),
(2, 1, '满减优惠券', 100.00, 500.00, 500, 156, 1, '2024-01-01 00:00:00', '2024-12-31 23:59:59'),
(3, 1, '员工福利券', 200.00, 1000.00, 200, 67, 1, '2024-01-01 00:00:00', '2024-12-31 23:59:59'),
(4, 2, '节日特惠券', 30.00, 100.00, 800, 423, 1, '2024-01-01 00:00:00', '2024-12-31 23:59:59'),
(5, 3, '测试优惠券', 10.00, 50.00, 100, 45, 1, '2024-01-01 00:00:00', '2024-12-31 23:59:59'),
(6, 5, '新春特惠券', 30.00, 100.00, 500, 123, 1, '2024-01-01 00:00:00', '2024-12-31 23:59:59'),
(7, 6, '美食尊享券', 50.00, 200.00, 300, 89, 1, '2024-01-01 00:00:00', '2024-12-31 23:59:59'),
(8, 7, '数码折扣券', 100.00, 500.00, 200, 45, 1, '2024-01-01 00:00:00', '2024-12-31 23:59:59');

INSERT INTO coupon (id, tenant_id, user_id, coupon_template_id, face_value, min_amount, status, order_no, used_time, expire_time) VALUES
(1, 1, 2, 1, 50.00, 200.00, 0, 'ORD20240115001', '2024-01-15 10:30:00', '2024-12-31 23:59:59'),
(2, 1, 2, 2, 100.00, 500.00, 1, NULL, NULL, '2024-12-31 23:59:59'),
(3, 1, 3, 1, 50.00, 200.00, 1, NULL, NULL, '2024-12-31 23:59:59'),
(4, 1, 3, 3, 200.00, 1000.00, 1, NULL, NULL, '2024-12-31 23:59:59'),
(5, 2, 5, 4, 30.00, 100.00, 0, 'ORD20240115002', '2024-01-15 11:45:00', '2024-12-31 23:59:59'),
(6, 3, 7, 5, 10.00, 50.00, 1, NULL, NULL, '2024-12-31 23:59:59'),
(7, 3, 8, 5, 10.00, 50.00, 0, 'ORD20240115003', '2024-01-15 14:00:00', '2024-12-31 23:59:59'),
(8, 5, 10, 6, 30.00, 100.00, 1, NULL, NULL, '2024-12-31 23:59:59'),
(9, 6, 12, 7, 50.00, 200.00, 1, NULL, NULL, '2024-12-31 23:59:59'),
(10, 7, 14, 8, 100.00, 500.00, 1, NULL, NULL, '2024-12-31 23:59:59'),
(11, 1, 15, 1, 50.00, 200.00, 1, NULL, NULL, '2024-12-31 23:59:59'),
(12, 2, 16, 4, 30.00, 100.00, 1, NULL, NULL, '2024-12-31 23:59:59');

INSERT INTO order_info (id, order_no, user_id, user_name, mobile, address, order_type, order_status, pay_status, total_amount, discount_amount, pay_amount, pay_method, pay_no, pay_time, ship_time, complete_time, remark, tenant_id) VALUES
(1, 'ORD20240115001', 2, '张三', '13800138005', '北京市朝阳区xxx街道xxx小区1号楼101室', 0, 3, 2, 250.00, 50.00, 200.00, 1, 'PAY20240115001', '2024-01-15 10:30:00', '2024-01-15 14:00:00', '2024-01-16 10:00:00', '', 1),
(2, 'ORD20240115002', 5, '用户一', '13800138007', '上海市浦东新区xxx路xxx号', 0, 2, 2, 158.00, 30.00, 128.00, 2, 'PAY20240115002', '2024-01-15 11:45:00', '2024-01-15 15:00:00', NULL, '', 2),
(3, 'ORD20240115003', 7, '测试用户1', '13800138008', '广州市天河区xxx大道xxx号', 0, 1, 1, 68.00, 10.00, 58.00, 1, 'PAY20240115003', '2024-01-15 14:00:00', NULL, NULL, '', 3),
(4, 'ORD20240115004', 3, '李四', '13800138006', '深圳市南山区xxx路xxx大厦', 0, 0, 0, 500.00, 0.00, 500.00, 0, NULL, NULL, NULL, NULL, '', 1),
(5, 'ORD20240115005', 8, '测试用户2', '13800138009', '杭州市西湖区xxx街xxx号', 0, 4, 2, 320.00, 0.00, 320.00, 2, 'PAY20240115004', '2024-01-15 09:00:00', NULL, NULL, '用户申请退款', 3),
(6, 'ORD20240116001', 10, '客户A', '13800138013', '成都市锦江区xxx路xxx号', 0, 3, 2, 128.00, 30.00, 98.00, 1, 'PAY20240116001', '2024-01-16 09:30:00', '2024-01-16 14:00:00', '2024-01-17 10:00:00', '', 5),
(7, 'ORD20240116002', 12, '客户B', '13800138014', '南京市鼓楼区xxx街xxx号', 0, 2, 2, 328.00, 50.00, 278.00, 2, 'PAY20240116002', '2024-01-16 10:15:00', '2024-01-16 15:00:00', NULL, '', 6),
(8, 'ORD20240116003', 14, '客户C', '13800138015', '武汉市洪山区xxx路xxx大厦', 0, 1, 1, 198.00, 0.00, 198.00, 1, 'PAY20240116003', '2024-01-16 11:00:00', NULL, NULL, '', 7),
(9, 'ORD20240116004', 15, '王五', '13800138016', '西安市雁塔区xxx路xxx号', 0, 0, 0, 398.00, 0.00, 398.00, 0, NULL, NULL, NULL, NULL, '', 1),
(10, 'ORD20240116005', 16, '用户二', '13800138017', '重庆市渝中区xxx街xxx号', 0, 3, 2, 198.00, 30.00, 168.00, 2, 'PAY20240116004', '2024-01-16 14:30:00', '2024-01-16 18:00:00', '2024-01-17 11:00:00', '', 2);

INSERT INTO order_item (id, order_id, order_no, spu_id, spu_name, sku_id, sku_code, sku_name, quantity, unit_price, total_price, discount_amount, tenant_id) VALUES
(1, 1, 'ORD20240115001', 1, '春节礼品卡', 2, 'SKU002', '春节礼品卡200元', 1, 200.00, 200.00, 0.00, 1),
(2, 1, 'ORD20240115001', 4, '员工福利卡', 7, 'SKU007', '员工福利卡100元', 1, 100.00, 100.00, 50.00, 1),
(3, 2, 'ORD20240115002', 5, '水果礼盒', 9, 'SKU009', '水果礼盒-标准版', 1, 128.00, 128.00, 0.00, 2),
(4, 3, 'ORD20240115003', 7, '办公用品套装', 12, 'SKU012', '办公用品套装-A4纸', 1, 58.00, 58.00, 0.00, 3),
(5, 4, 'ORD20240115004', 2, '中秋月饼礼盒', 5, 'SKU005', '中秋月饼礼盒-豪华款', 1, 388.00, 388.00, 0.00, 1),
(6, 4, 'ORD20240115004', 3, '端午粽子礼盒', 6, 'SKU006', '端午粽子礼盒-经典款', 1, 168.00, 168.00, 36.00, 1),
(7, 5, 'ORD20240115005', 8, '数码配件礼包', 14, 'SKU014', '数码配件礼包-手机壳', 4, 38.00, 152.00, 0.00, 3),
(8, 5, 'ORD20240115005', 8, '数码配件礼包', 15, 'SKU015', '数码配件礼包-充电器', 2, 68.00, 136.00, 0.00, 3),
(9, 5, 'ORD20240115005', 7, '办公用品套装', 13, 'SKU013', '办公用品套装-笔记本', 2, 88.00, 176.00, 44.00, 3),
(10, 6, 'ORD20240116001', 10, '春联礼盒', 19, 'SKU019', '春联礼盒-豪华版', 1, 128.00, 128.00, 0.00, 5),
(11, 7, 'ORD20240116002', 12, '进口巧克力礼盒', 22, 'SKU022', '进口巧克力礼盒-500g', 1, 328.00, 328.00, 0.00, 6),
(12, 8, 'ORD20240116003', 15, '蓝牙耳机', 26, 'SKU026', '蓝牙耳机-标准版', 1, 198.00, 198.00, 0.00, 7),
(13, 9, 'ORD20240116004', 18, '端午鸭蛋礼盒', 31, 'SKU031', '端午鸭蛋礼盒-20枚', 2, 98.00, 196.00, 0.00, 1),
(14, 9, 'ORD20240116004', 19, '海鲜礼盒', 32, 'SKU032', '海鲜礼盒-海鲜拼盘', 0.5, 398.00, 199.00, 0.00, 1),
(15, 10, 'ORD20240116005', 6, '坚果礼盒', 11, 'SKU011', '坚果礼盒-标准版', 1, 158.00, 158.00, 0.00, 2),
(16, 10, 'ORD20240116005', 5, '水果礼盒', 9, 'SKU009', '水果礼盒-标准版', 1, 128.00, 128.00, 30.00, 2);

CREATE TABLE IF NOT EXISTS pay_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pay_no VARCHAR(100) NOT NULL UNIQUE,
    order_no VARCHAR(100) NOT NULL,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    pay_method TINYINT NOT NULL,
    pay_amount DECIMAL(10,2) NOT NULL,
    pay_status TINYINT DEFAULT 0,
    third_pay_no VARCHAR(200),
    pay_time TIMESTAMP,
    notify_count INT DEFAULT 0,
    remark VARCHAR(500),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS refund_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    refund_no VARCHAR(100) NOT NULL UNIQUE,
    pay_no VARCHAR(100) NOT NULL,
    order_no VARCHAR(100) NOT NULL,
    tenant_id BIGINT NOT NULL,
    refund_amount DECIMAL(10,2) NOT NULL,
    pay_amount DECIMAL(10,2) NOT NULL,
    refund_status TINYINT DEFAULT 0,
    refund_reason VARCHAR(500),
    third_refund_no VARCHAR(200),
    refund_time TIMESTAMP,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

INSERT INTO pay_record (id, pay_no, order_no, tenant_id, user_id, pay_method, pay_amount, pay_status, third_pay_no, pay_time, notify_count) VALUES
(1, 'PAY20240115001', 'ORD20240115001', 1, 2, 1, 200.00, 2, 'wx1234567890001', '2024-01-15 10:30:00', 1),
(2, 'PAY20240115002', 'ORD20240115002', 2, 5, 2, 128.00, 2, 'ali1234567890001', '2024-01-15 11:45:00', 1),
(3, 'PAY20240115003', 'ORD20240115003', 3, 7, 1, 58.00, 1, '', NULL, 0),
(4, 'PAY20240115004', 'ORD20240115005', 3, 8, 2, 320.00, 4, 'ali1234567890002', '2024-01-15 09:00:00', 1),
(5, 'PAY20240116001', 'ORD20240116001', 5, 10, 1, 98.00, 2, 'wx1234567890003', '2024-01-16 09:30:00', 1),
(6, 'PAY20240116002', 'ORD20240116002', 6, 12, 2, 278.00, 2, 'ali1234567890003', '2024-01-16 10:15:00', 1),
(7, 'PAY20240116003', 'ORD20240116003', 7, 14, 1, 198.00, 1, '', NULL, 0),
(8, 'PAY20240116004', 'ORD20240116005', 2, 16, 2, 168.00, 2, 'ali1234567890004', '2024-01-16 14:30:00', 1);

INSERT INTO refund_record (id, refund_no, pay_no, order_no, tenant_id, refund_amount, pay_amount, refund_status, refund_reason, third_refund_no, refund_time) VALUES
(1, 'REF20240115001', 'PAY20240115004', 'ORD20240115005', 3, 320.00, 320.00, 2, '用户申请退款', 'rf1234567890001', '2024-01-15 16:00:00');

ALTER TABLE sys_tenant ALTER COLUMN id RESTART WITH 100;
ALTER TABLE sys_user ALTER COLUMN id RESTART WITH 100;
ALTER TABLE pms_product ALTER COLUMN id RESTART WITH 100;
ALTER TABLE pms_sku ALTER COLUMN id RESTART WITH 100;
ALTER TABLE coupon_template ALTER COLUMN id RESTART WITH 100;
ALTER TABLE coupon ALTER COLUMN id RESTART WITH 100;
ALTER TABLE order_info ALTER COLUMN id RESTART WITH 100;
ALTER TABLE order_item ALTER COLUMN id RESTART WITH 100;
ALTER TABLE pay_record ALTER COLUMN id RESTART WITH 100;
ALTER TABLE refund_record ALTER COLUMN id RESTART WITH 100;

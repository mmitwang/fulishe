-- =====================================================
-- 福礼社真实后端最小可运行库表（与 Java 实体字段严格对齐）
-- 适用：fulishe-user / fulishe-product / fulishe-order / fulishe-pay
-- 说明：docs/database/fulishe_mysql.sql 为早期设计稿，字段与实体不一致，
--       真实服务请以本文件为准。
-- =====================================================

CREATE DATABASE IF NOT EXISTS `fulishe` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `fulishe`;

-- 租户
CREATE TABLE IF NOT EXISTS `sys_tenant` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint DEFAULT NULL,
  `tenant_name` varchar(100) NOT NULL,
  `tenant_code` varchar(50) NOT NULL,
  `contact_person` varchar(50) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `business_license` varchar(255) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT 1,
  `expire_time` datetime DEFAULT NULL,
  `tenant_type` tinyint DEFAULT 1,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_code` (`tenant_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户
CREATE TABLE IF NOT EXISTS `sys_user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(100) NOT NULL,
  `nickname` varchar(50) DEFAULT NULL,
  `real_name` varchar(50) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `gender` tinyint DEFAULT 1,
  `mobile` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `user_type` tinyint DEFAULT 2,
  `status` tinyint NOT NULL DEFAULT 1,
  `last_login_time` datetime DEFAULT NULL,
  `last_login_ip` varchar(50) DEFAULT NULL,
  `dept_id` bigint DEFAULT NULL,
  `position` varchar(50) DEFAULT NULL,
  `employee_no` varchar(50) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_username` (`tenant_id`, `username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品分类
CREATE TABLE IF NOT EXISTS `pms_category` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint DEFAULT NULL,
  `category_code` varchar(50) DEFAULT NULL,
  `category_name` varchar(100) NOT NULL,
  `parent_id` bigint DEFAULT 0,
  `level` tinyint DEFAULT 1,
  `sort` int DEFAULT 0,
  `status` tinyint NOT NULL DEFAULT 1,
  `icon` varchar(500) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 品牌
CREATE TABLE IF NOT EXISTS `pms_brand` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint DEFAULT NULL,
  `brand_code` varchar(50) DEFAULT NULL,
  `brand_name` varchar(100) NOT NULL,
  `logo` varchar(500) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `sort` int DEFAULT 0,
  `status` tinyint NOT NULL DEFAULT 1,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品 SPU
CREATE TABLE IF NOT EXISTS `pms_spu` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `spu_code` varchar(50) NOT NULL,
  `spu_name` varchar(200) NOT NULL,
  `description` text,
  `detail` text,
  `category_id` bigint DEFAULT NULL,
  `brand_id` bigint DEFAULT NULL,
  `category_name` varchar(100) DEFAULT NULL,
  `brand_name` varchar(100) DEFAULT NULL,
  `original_price` decimal(10,2) DEFAULT NULL,
  `sell_price` decimal(10,2) NOT NULL,
  `cost_price` decimal(10,2) DEFAULT NULL,
  `stock` int NOT NULL DEFAULT 0,
  `min_stock` int DEFAULT 0,
  `status` tinyint NOT NULL DEFAULT 1,
  `sort` int DEFAULT 0,
  `cover_image` varchar(1000) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_spu_code` (`spu_code`),
  KEY `idx_spu_category` (`category_id`),
  KEY `idx_spu_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品 SKU
CREATE TABLE IF NOT EXISTS `pms_sku` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `spu_id` bigint NOT NULL,
  `sku_code` varchar(50) NOT NULL,
  `sku_name` varchar(200) NOT NULL,
  `specifications` varchar(500) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int NOT NULL DEFAULT 0,
  `image` varchar(1000) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sku_code` (`sku_code`),
  KEY `idx_sku_spu` (`spu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单
CREATE TABLE IF NOT EXISTS `order_info` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `order_no` varchar(50) NOT NULL,
  `user_id` bigint NOT NULL,
  `user_name` varchar(50) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `order_type` tinyint DEFAULT 0,
  `order_status` tinyint DEFAULT 0,
  `pay_status` tinyint DEFAULT 0,
  `total_amount` decimal(10,2) NOT NULL,
  `discount_amount` decimal(10,2) DEFAULT 0,
  `pay_amount` decimal(10,2) NOT NULL,
  `pay_method` varchar(20) DEFAULT NULL,
  `pay_no` varchar(64) DEFAULT NULL,
  `pay_time` datetime DEFAULT NULL,
  `ship_time` datetime DEFAULT NULL,
  `complete_time` datetime DEFAULT NULL,
  `remark` varchar(500) DEFAULT NULL,
  `cancel_reason` varchar(500) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_order_user` (`user_id`),
  KEY `idx_order_status` (`order_status`, `pay_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单明细
CREATE TABLE IF NOT EXISTS `order_item` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `order_id` bigint NOT NULL,
  `order_no` varchar(50) DEFAULT NULL,
  `spu_id` bigint DEFAULT NULL,
  `spu_name` varchar(200) DEFAULT NULL,
  `spu_image` varchar(1000) DEFAULT NULL,
  `sku_id` bigint NOT NULL,
  `sku_code` varchar(50) DEFAULT NULL,
  `sku_name` varchar(200) NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `discount_amount` decimal(10,2) DEFAULT 0,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_item_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 支付记录
CREATE TABLE IF NOT EXISTS `pay_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `pay_no` varchar(64) NOT NULL,
  `order_no` varchar(64) NOT NULL,
  `user_id` bigint NOT NULL,
  `pay_method` int NOT NULL,
  `pay_amount` decimal(18,2) NOT NULL,
  `pay_status` int NOT NULL DEFAULT 0,
  `third_pay_no` varchar(128) DEFAULT NULL,
  `pay_time` datetime DEFAULT NULL,
  `notify_data` text,
  `notify_count` int DEFAULT 0,
  `notify_time` datetime DEFAULT NULL,
  `remark` varchar(500) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pay_no` (`pay_no`),
  KEY `idx_pay_order` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 卡券模板（订单带 couponId 时才会访问）
CREATE TABLE IF NOT EXISTS `coupon_template` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `template_name` varchar(100) NOT NULL,
  `coupon_type` tinyint DEFAULT 1,
  `face_value` decimal(10,2) DEFAULT 0,
  `discount` decimal(4,2) DEFAULT 1,
  `min_amount` decimal(10,2) DEFAULT 0,
  `valid_days` int DEFAULT 30,
  `status` tinyint NOT NULL DEFAULT 1,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 卡券
CREATE TABLE IF NOT EXISTS `coupon` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `template_id` bigint DEFAULT NULL,
  `coupon_code` varchar(64) DEFAULT NULL,
  `face_value` decimal(10,2) DEFAULT 0,
  `min_amount` decimal(10,2) DEFAULT 0,
  `status` tinyint NOT NULL DEFAULT 1,
  `order_no` varchar(64) DEFAULT NULL,
  `used_time` datetime DEFAULT NULL,
  `expire_time` datetime DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_coupon_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

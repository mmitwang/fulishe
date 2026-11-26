-- =====================================================
-- 福礼社平台数据库索引优化脚本
-- 针对高频查询场景添加复合索引
-- =====================================================

-- =====================================================
-- 一、用户租户域索引优化
-- =====================================================

-- 用户表：按租户+状态查询，按租户+手机号查询
ALTER TABLE sys_user ADD INDEX idx_tenant_status (tenant_id, status);
ALTER TABLE sys_user ADD INDEX idx_tenant_username (tenant_id, username);

-- 部门表：按租户+父部门查询
ALTER TABLE sys_dept ADD INDEX idx_tenant_parent (tenant_id, parent_id);

-- 角色表：按租户+状态查询
ALTER TABLE sys_role ADD INDEX idx_tenant_status (tenant_id, status);

-- 用户角色关联：按租户+用户ID查询
ALTER TABLE sys_user_role ADD INDEX idx_tenant_user (tenant_id, user_id);

-- =====================================================
-- 二、商品域索引优化
-- =====================================================

-- 商品SPU表：按租户+状态查询（上架商品），按租户+分类查询
ALTER TABLE pms_spu ADD INDEX idx_tenant_status (tenant_id, status);
ALTER TABLE pms_spu ADD INDEX idx_tenant_category (tenant_id, category_id);
ALTER TABLE pms_spu ADD INDEX idx_tenant_brand (tenant_id, brand_id);

-- 商品SKU表：按租户+SPU查询，按租户+状态+库存查询（库存扣减）
ALTER TABLE pms_sku ADD INDEX idx_tenant_spu (tenant_id, spu_id);
ALTER TABLE pms_sku ADD INDEX idx_tenant_status_stock (tenant_id, status, stock);

-- 商品分类表：按租户+父分类查询
ALTER TABLE pms_category ADD INDEX idx_tenant_parent (tenant_id, parent_id);

-- 品牌表：按租户+状态查询
ALTER TABLE pms_brand ADD INDEX idx_tenant_status (tenant_id, status);

-- =====================================================
-- 三、卡券域索引优化
-- =====================================================

-- 卡券模板表：按租户+状态查询，按租户+类型查询
ALTER TABLE cms_coupon_template ADD INDEX idx_tenant_status (tenant_id, status);
ALTER TABLE cms_coupon_template ADD INDEX idx_tenant_type (tenant_id, coupon_type);

-- 卡券实例表：按租户+状态查询（未领取/已领取），按租户+用户ID查询，按租户+模板ID查询
ALTER TABLE cms_coupon ADD INDEX idx_tenant_status (tenant_id, status);
ALTER TABLE cms_coupon ADD INDEX idx_tenant_user (tenant_id, user_id);
ALTER TABLE cms_coupon ADD INDEX idx_tenant_template (tenant_id, template_id);
ALTER TABLE cms_coupon ADD INDEX idx_coupon_code_idx (coupon_code);

-- 卡券发放批次表：按租户+状态查询
ALTER TABLE cms_coupon_batch ADD INDEX idx_tenant_status (tenant_id, status);

-- =====================================================
-- 四、订单域索引优化
-- =====================================================

-- 订单表：按租户+状态查询（待支付/待发货等），按租户+用户ID查询，按租户+创建时间查询
ALTER TABLE oms_order ADD INDEX idx_tenant_status (tenant_id, status);
ALTER TABLE oms_order ADD INDEX idx_tenant_user (tenant_id, user_id);
ALTER TABLE oms_order ADD INDEX idx_tenant_create_time (tenant_id, create_time);

-- 订单商品表：按租户+订单ID查询
ALTER TABLE oms_order_item ADD INDEX idx_tenant_order (tenant_id, order_id);

-- 购物车表：按租户+用户ID查询
ALTER TABLE oms_cart ADD INDEX idx_tenant_user (tenant_id, user_id);

-- 收货地址表：按租户+用户ID查询
ALTER TABLE oms_user_address ADD INDEX idx_tenant_user (tenant_id, user_id);

-- =====================================================
-- 五、支付账户域索引优化
-- =====================================================

-- 账户表：按租户+用户ID查询，按租户+账户类型查询
ALTER TABLE acc_account ADD INDEX idx_tenant_user (tenant_id, user_id);
ALTER TABLE acc_account ADD INDEX idx_tenant_type (tenant_id, account_type);

-- 账户流水表：按租户+账户ID查询，按租户+用户ID查询，按租户+创建时间查询
ALTER TABLE acc_account_flow ADD INDEX idx_tenant_account (tenant_id, account_id);
ALTER TABLE acc_account_flow ADD INDEX idx_tenant_user (tenant_id, user_id);
ALTER TABLE acc_account_flow ADD INDEX idx_tenant_create_time (tenant_id, create_time);

-- 支付订单表：按租户+订单号查询，按租户+支付状态查询
ALTER TABLE pay_order ADD INDEX idx_tenant_order_no (tenant_id, order_no);
ALTER TABLE pay_order ADD INDEX idx_tenant_pay_status (tenant_id, pay_status);

-- 退款订单表：按租户+支付订单ID查询
ALTER TABLE pay_refund ADD INDEX idx_tenant_pay_order (tenant_id, pay_order_id);

-- =====================================================
-- 索引查询验证
-- =====================================================
SHOW INDEX FROM sys_user;
SHOW INDEX FROM pms_spu;
SHOW INDEX FROM pms_sku;
SHOW INDEX FROM oms_order;
SHOW INDEX FROM cms_coupon;
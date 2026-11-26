INSERT INTO tenant_pay_config (tenant_id, pay_method, config_key, config_value, status, create_time, update_time) VALUES
(1, 1, 'wechat_appid', 'wx1234567890abcdef', 1, NOW(), NOW()),
(1, 1, 'wechat_mch_id', '1234567890', 1, NOW(), NOW()),
(1, 2, 'alipay_appid', '2021000000000000', 1, NOW(), NOW()),
(1, 3, 'bank_channel', 'unionpay', 1, NOW(), NOW()),
(2, 1, 'wechat_appid', 'wxabcdef1234567890', 1, NOW(), NOW()),
(2, 2, 'alipay_appid', '2021000000000001', 1, NOW(), NOW());

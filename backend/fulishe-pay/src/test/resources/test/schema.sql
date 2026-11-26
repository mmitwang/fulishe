DROP TABLE IF EXISTS pay_record;
CREATE TABLE pay_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pay_no VARCHAR(64) NOT NULL,
    order_no VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    pay_method INT NOT NULL,
    pay_amount DECIMAL(18,2) NOT NULL,
    pay_status INT NOT NULL DEFAULT 0,
    third_pay_no VARCHAR(128),
    pay_time TIMESTAMP,
    notify_data CLOB,
    notify_count INT DEFAULT 0,
    notify_time TIMESTAMP,
    remark VARCHAR(500),
    create_time TIMESTAMP NOT NULL,
    update_time TIMESTAMP NOT NULL,
    deleted INT DEFAULT 0
);

DROP TABLE IF EXISTS tenant_pay_config;
CREATE TABLE tenant_pay_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    pay_method INT NOT NULL,
    config_key VARCHAR(128) NOT NULL,
    config_value CLOB,
    status INT DEFAULT 1,
    create_time TIMESTAMP NOT NULL,
    update_time TIMESTAMP NOT NULL,
    deleted INT DEFAULT 0
);

DROP TABLE IF EXISTS refund_record;
CREATE TABLE refund_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    refund_no VARCHAR(64) NOT NULL,
    pay_no VARCHAR(64) NOT NULL,
    order_no VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    refund_amount DECIMAL(18,2) NOT NULL,
    refund_status INT NOT NULL DEFAULT 0,
    third_refund_no VARCHAR(128),
    refund_time TIMESTAMP,
    refund_reason VARCHAR(500),
    remark VARCHAR(500),
    create_time TIMESTAMP NOT NULL,
    update_time TIMESTAMP NOT NULL,
    deleted INT DEFAULT 0
);

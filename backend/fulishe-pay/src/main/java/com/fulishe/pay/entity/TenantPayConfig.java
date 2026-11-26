package com.fulishe.pay.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("tenant_pay_config")
public class TenantPayConfig extends BaseEntity<TenantPayConfig> {

    private Long tenantId;

    private Integer payMethod;

    private String configKey;

    private String configValue;

    private Integer status;
}

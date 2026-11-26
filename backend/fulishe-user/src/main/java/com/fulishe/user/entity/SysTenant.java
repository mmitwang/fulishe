package com.fulishe.user.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_tenant")
public class SysTenant extends BaseEntity<SysTenant> {

    private static final long serialVersionUID = 1L;

    private String tenantName;

    private String tenantCode;

    private String contactPerson;

    private String contactPhone;

    private String contactEmail;

    private String address;

    private String businessLicense;

    private Integer status;

    private LocalDateTime expireTime;

    private Integer tenantType;
}

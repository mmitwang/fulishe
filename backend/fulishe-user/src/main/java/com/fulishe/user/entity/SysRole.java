package com.fulishe.user.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_role")
public class SysRole extends BaseEntity<SysRole> {

    private static final long serialVersionUID = 1L;

    private String roleName;

    private String roleCode;

    private String roleDesc;

    private Integer orderNum;

    private Integer status;
}

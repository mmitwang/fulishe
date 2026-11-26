package com.fulishe.user.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_dept")
public class SysDept extends BaseEntity<SysDept> {

    private static final long serialVersionUID = 1L;

    private Long parentId;

    private String ancestors;

    private String deptName;

    private String deptCode;

    private Integer orderNum;

    private String leader;

    private String phone;

    private String email;

    private Integer status;

    @TableField(exist = false)
    private Integer childrenCount;
}

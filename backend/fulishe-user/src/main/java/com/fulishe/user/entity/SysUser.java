package com.fulishe.user.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Tolerate;

import java.time.LocalDateTime;

@Data
@Builder
@EqualsAndHashCode(callSuper = true)
@TableName("sys_user")
public class SysUser extends BaseEntity<SysUser> {

    private static final long serialVersionUID = 1L;

    @Tolerate
    public SysUser() {
    }

    private String username;

    private String password;

    private String nickname;

    private String realName;

    private String avatar;

    private Integer gender;

    private String mobile;

    private String email;

    private Integer userType;

    private Integer status;

    private LocalDateTime lastLoginTime;

    private String lastLoginIp;

    private Long deptId;

    private String position;

    private String employeeNo;

    @TableField(exist = false)
    private String deptName;

    @TableField(exist = false)
    private String roleNames;
}

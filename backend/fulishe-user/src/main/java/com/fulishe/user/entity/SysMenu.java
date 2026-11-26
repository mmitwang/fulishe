package com.fulishe.user.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_menu")
public class SysMenu extends BaseEntity<SysMenu> {

    private static final long serialVersionUID = 1L;

    private Long parentId;

    private String menuName;

    private String menuCode;

    private String path;

    private String component;

    private String icon;

    private Integer menuType;

    private Integer orderNum;

    private Integer status;

    private String perms;

    private String redirect;

    private String frameSrc;

    @TableField(exist = false)
    private Boolean hasChildren;
}

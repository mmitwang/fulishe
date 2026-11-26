package com.fulishe.user.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.fulishe.user.entity.SysUserRole;

import java.util.List;

public interface SysUserRoleService extends IService<SysUserRole> {

    void saveUserRoles(Long userId, List<Long> roleIds);
}

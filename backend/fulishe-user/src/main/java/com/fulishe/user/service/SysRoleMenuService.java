package com.fulishe.user.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.fulishe.user.entity.SysRoleMenu;

import java.util.List;

public interface SysRoleMenuService extends IService<SysRoleMenu> {

    void saveRoleMenus(Long roleId, List<Long> menuIds);
}

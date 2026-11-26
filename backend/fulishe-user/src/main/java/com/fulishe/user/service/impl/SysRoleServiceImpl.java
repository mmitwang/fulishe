package com.fulishe.user.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fulishe.user.entity.SysRole;
import com.fulishe.user.mapper.SysRoleMapper;
import com.fulishe.user.service.SysRoleService;
import org.springframework.stereotype.Service;

@Service
public class SysRoleServiceImpl extends ServiceImpl<SysRoleMapper, SysRole> implements SysRoleService {
}

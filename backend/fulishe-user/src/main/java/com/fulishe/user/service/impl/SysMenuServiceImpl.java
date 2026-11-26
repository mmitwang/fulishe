package com.fulishe.user.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fulishe.user.entity.SysMenu;
import com.fulishe.user.mapper.SysMenuMapper;
import com.fulishe.user.service.SysMenuService;
import org.springframework.stereotype.Service;

@Service
public class SysMenuServiceImpl extends ServiceImpl<SysMenuMapper, SysMenu> implements SysMenuService {
}

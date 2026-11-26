package com.fulishe.user.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fulishe.user.entity.SysTenant;
import com.fulishe.user.mapper.SysTenantMapper;
import com.fulishe.user.service.SysTenantService;
import org.springframework.stereotype.Service;

@Service
public class SysTenantServiceImpl extends ServiceImpl<SysTenantMapper, SysTenant> implements SysTenantService {
}

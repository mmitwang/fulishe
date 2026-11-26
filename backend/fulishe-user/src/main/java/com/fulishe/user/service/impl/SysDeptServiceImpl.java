package com.fulishe.user.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fulishe.user.entity.SysDept;
import com.fulishe.user.mapper.SysDeptMapper;
import com.fulishe.user.service.SysDeptService;
import org.springframework.stereotype.Service;

@Service
public class SysDeptServiceImpl extends ServiceImpl<SysDeptMapper, SysDept> implements SysDeptService {
}

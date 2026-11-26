package com.fulishe.product.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.product.entity.PmsSpu;
import com.fulishe.product.mapper.PmsSpuMapper;
import com.fulishe.product.service.PmsSpuService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class PmsSpuServiceImpl extends ServiceImpl<PmsSpuMapper, PmsSpu> implements PmsSpuService {

    @Override
    public IPage<PmsSpu> page(PageQuery query, Long categoryId, String spuName) {
        LambdaQueryWrapper<PmsSpu> wrapper = new LambdaQueryWrapper<PmsSpu>()
                .eq(categoryId != null, PmsSpu::getCategoryId, categoryId)
                .like(StringUtils.hasText(spuName), PmsSpu::getSpuName, spuName)
                .orderByDesc(PmsSpu::getId);
        return baseMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
    }
}

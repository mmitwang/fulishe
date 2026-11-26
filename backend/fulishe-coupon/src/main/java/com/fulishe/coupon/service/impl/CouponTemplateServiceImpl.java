package com.fulishe.coupon.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.coupon.entity.CouponTemplate;
import com.fulishe.coupon.mapper.CouponTemplateMapper;
import com.fulishe.coupon.service.CouponTemplateService;
import org.springframework.stereotype.Service;

@Service
public class CouponTemplateServiceImpl extends ServiceImpl<CouponTemplateMapper, CouponTemplate> implements CouponTemplateService {

    @Override
    public IPage<CouponTemplate> page(PageQuery query) {
        return baseMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), null);
    }
}

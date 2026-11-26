package com.fulishe.coupon.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.coupon.entity.CouponTemplate;

public interface CouponTemplateService extends IService<CouponTemplate> {

    IPage<CouponTemplate> page(PageQuery query);
}

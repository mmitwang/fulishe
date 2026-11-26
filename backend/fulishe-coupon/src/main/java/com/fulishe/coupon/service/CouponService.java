package com.fulishe.coupon.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.coupon.entity.Coupon;

public interface CouponService extends IService<Coupon> {

    IPage<Coupon> page(PageQuery query);

    boolean useCoupon(Long couponId, String orderNo);

    boolean rollbackCoupon(Long couponId);
}

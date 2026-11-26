package com.fulishe.coupon.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.coupon.entity.Coupon;
import com.fulishe.coupon.mapper.CouponMapper;
import com.fulishe.coupon.service.CouponService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
public class CouponServiceImpl extends ServiceImpl<CouponMapper, Coupon> implements CouponService {

    @Override
    public IPage<Coupon> page(PageQuery query) {
        return baseMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean useCoupon(Long couponId, String orderNo) {
        Coupon coupon = getById(couponId);
        if (coupon == null || coupon.getStatus() != 1) {
            return false;
        }

        int rows = baseMapper.update(null, new LambdaUpdateWrapper<Coupon>()
                .eq(Coupon::getId, couponId)
                .eq(Coupon::getStatus, 1)
                .set(Coupon::getStatus, 2)
                .set(Coupon::getOrderNo, orderNo)
                .set(Coupon::getUsedTime, LocalDateTime.now()));

        if (rows > 0) {
            log.info("Coupon used: couponId={}, orderNo={}", couponId, orderNo);
        }
        return rows > 0;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean rollbackCoupon(Long couponId) {
        Coupon coupon = getById(couponId);
        if (coupon == null || coupon.getStatus() != 2) {
            return false;
        }

        int rows = baseMapper.update(null, new LambdaUpdateWrapper<Coupon>()
                .eq(Coupon::getId, couponId)
                .eq(Coupon::getStatus, 2)
                .set(Coupon::getStatus, 1)
                .set(Coupon::getOrderNo, null)
                .set(Coupon::getUsedTime, null));

        if (rows > 0) {
            log.info("Coupon rolled back: couponId={}", couponId);
        }
        return rows > 0;
    }
}

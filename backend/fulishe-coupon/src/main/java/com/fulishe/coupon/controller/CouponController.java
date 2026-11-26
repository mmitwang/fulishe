package com.fulishe.coupon.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.coupon.entity.Coupon;
import com.fulishe.coupon.service.CouponService;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

@RestController
@RequestMapping("/coupon")
public class CouponController {

    @Resource
    private CouponService couponService;

    @GetMapping("/page")
    public R<PageResult<Coupon>> page(PageQuery query) {
        IPage<Coupon> page = couponService.page(query);
        return R.ok(PageResult.of(page));
    }

    @GetMapping("/{id}")
    public R<Coupon> getById(@PathVariable Long id) {
        return R.ok(couponService.getById(id));
    }

    @PostMapping
    public R<Void> save(@RequestBody Coupon coupon) {
        couponService.save(coupon);
        return R.ok();
    }

    @PutMapping
    public R<Void> update(@RequestBody Coupon coupon) {
        couponService.updateById(coupon);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        couponService.removeById(id);
        return R.ok();
    }

    @PostMapping("/use")
    public R<Void> useCoupon(@RequestParam Long couponId, @RequestParam String orderNo) {
        boolean success = couponService.useCoupon(couponId, orderNo);
        if (success) {
            return R.ok();
        }
        return R.fail("卡券核销失败");
    }

    @PostMapping("/rollback")
    public R<Void> rollbackCoupon(@RequestParam Long couponId) {
        boolean success = couponService.rollbackCoupon(couponId);
        if (success) {
            return R.ok();
        }
        return R.fail("卡券回滚失败");
    }
}

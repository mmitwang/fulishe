package com.fulishe.order.feign;

import com.fulishe.common.core.result.R;
import com.fulishe.coupon.entity.Coupon;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "fulishe-coupon", url = "${fulishe.services.coupon-url:}")
public interface CouponFeignClient {

    @GetMapping("/coupon/{id}")
    R<Coupon> getCouponById(@PathVariable("id") Long id);

    @PostMapping("/coupon/use")
    R<Void> useCoupon(@RequestParam("couponId") Long couponId, @RequestParam("orderNo") String orderNo);

    @PostMapping("/coupon/rollback")
    R<Void> rollbackCoupon(@RequestParam("couponId") Long couponId);
}

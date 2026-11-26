package com.fulishe.coupon.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.coupon.entity.CouponTemplate;
import com.fulishe.coupon.service.CouponTemplateService;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

@RestController
@RequestMapping("/coupon/template")
public class CouponTemplateController {

    @Resource
    private CouponTemplateService couponTemplateService;

    @GetMapping("/page")
    public R<PageResult<CouponTemplate>> page(PageQuery query) {
        IPage<CouponTemplate> page = couponTemplateService.page(query);
        return R.ok(PageResult.of(page));
    }

    @GetMapping("/{id}")
    public R<CouponTemplate> getById(@PathVariable Long id) {
        return R.ok(couponTemplateService.getById(id));
    }

    @PostMapping
    public R<Void> save(@RequestBody CouponTemplate template) {
        couponTemplateService.save(template);
        return R.ok();
    }

    @PutMapping
    public R<Void> update(@RequestBody CouponTemplate template) {
        couponTemplateService.updateById(template);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        couponTemplateService.removeById(id);
        return R.ok();
    }
}

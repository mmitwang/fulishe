package com.fulishe.coupon.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.coupon.entity.CouponBatch;
import com.fulishe.coupon.service.CouponBatchService;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

@RestController
@RequestMapping("/coupon/batch")
public class CouponBatchController {

    @Resource
    private CouponBatchService couponBatchService;

    @GetMapping("/page")
    public R<PageResult<CouponBatch>> page(PageQuery query) {
        IPage<CouponBatch> page = couponBatchService.page(query);
        return R.ok(PageResult.of(page));
    }

    @GetMapping("/{id}")
    public R<CouponBatch> getById(@PathVariable Long id) {
        return R.ok(couponBatchService.getById(id));
    }

    @PostMapping
    public R<Void> save(@RequestBody CouponBatch batch) {
        couponBatchService.save(batch);
        return R.ok();
    }

    @PutMapping
    public R<Void> update(@RequestBody CouponBatch batch) {
        couponBatchService.updateById(batch);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        couponBatchService.removeById(id);
        return R.ok();
    }
}

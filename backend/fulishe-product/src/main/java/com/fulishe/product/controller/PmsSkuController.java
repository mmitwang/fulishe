package com.fulishe.product.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.product.entity.PmsSku;
import com.fulishe.product.service.PmsSkuService;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

import java.util.List;

@RestController
@RequestMapping("/product/sku")
public class PmsSkuController {

    @Resource
    private PmsSkuService pmsSkuService;

    @GetMapping("/page")
    public R<PageResult<PmsSku>> page(PageQuery query) {
        IPage<PmsSku> page = pmsSkuService.page(query);
        return R.ok(PageResult.of(page));
    }

    @GetMapping("/spu/{spuId}")
    public R<List<PmsSku>> listBySpuId(@PathVariable Long spuId) {
        return R.ok(pmsSkuService.listBySpuId(spuId));
    }

    @GetMapping("/{id}")
    public R<PmsSku> getById(@PathVariable Long id) {
        return R.ok(pmsSkuService.getById(id));
    }

    @PostMapping
    public R<Void> save(@RequestBody PmsSku sku) {
        pmsSkuService.save(sku);
        return R.ok();
    }

    @PutMapping
    public R<Void> update(@RequestBody PmsSku sku) {
        pmsSkuService.updateById(sku);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        pmsSkuService.removeById(id);
        return R.ok();
    }

    @PostMapping("/deduct-stock")
    public R<Void> deductStock(@RequestParam Long skuId, @RequestParam Integer quantity) {
        boolean success = pmsSkuService.deductStock(skuId, quantity);
        if (success) {
            return R.ok();
        }
        return R.fail("库存扣减失败");
    }

    @PostMapping("/restore-stock")
    public R<Void> restoreStock(@RequestParam Long skuId, @RequestParam Integer quantity) {
        boolean success = pmsSkuService.restoreStock(skuId, quantity);
        if (success) {
            return R.ok();
        }
        return R.fail("库存恢复失败");
    }
}

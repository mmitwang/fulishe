package com.fulishe.product.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.product.entity.PmsSpu;
import com.fulishe.product.service.PmsSpuService;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

@RestController
@RequestMapping("/product/spu")
public class PmsSpuController {

    @Resource
    private PmsSpuService pmsSpuService;

    @GetMapping("/page")
    public R<PageResult<PmsSpu>> page(PageQuery query,
                                      @RequestParam(required = false) Long categoryId,
                                      @RequestParam(required = false) String spuName) {
        IPage<PmsSpu> page = pmsSpuService.page(query, categoryId, spuName);
        return R.ok(PageResult.of(page));
    }

    @GetMapping("/{id}")
    public R<PmsSpu> getById(@PathVariable Long id) {
        return R.ok(pmsSpuService.getById(id));
    }

    @PostMapping
    public R<Void> save(@RequestBody PmsSpu spu) {
        pmsSpuService.save(spu);
        return R.ok();
    }

    @PutMapping
    public R<Void> update(@RequestBody PmsSpu spu) {
        pmsSpuService.updateById(spu);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        pmsSpuService.removeById(id);
        return R.ok();
    }
}

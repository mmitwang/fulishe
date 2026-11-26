package com.fulishe.product.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.product.entity.PmsBrand;
import com.fulishe.product.service.PmsBrandService;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;
import java.util.List;

@RestController
@RequestMapping("/product/brand")
public class PmsBrandController {

    @Resource
    private PmsBrandService pmsBrandService;

    @GetMapping("/page")
    public R<PageResult<PmsBrand>> page(PageQuery query) {
        IPage<PmsBrand> page = pmsBrandService.page(query);
        return R.ok(PageResult.of(page));
    }

    @GetMapping("/list")
    public R<List<PmsBrand>> list() {
        return R.ok(pmsBrandService.list());
    }

    @GetMapping("/{id}")
    public R<PmsBrand> getById(@PathVariable Long id) {
        return R.ok(pmsBrandService.getById(id));
    }

    @PostMapping
    public R<Void> save(@RequestBody PmsBrand brand) {
        pmsBrandService.save(brand);
        return R.ok();
    }

    @PutMapping
    public R<Void> update(@RequestBody PmsBrand brand) {
        pmsBrandService.updateById(brand);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        pmsBrandService.removeById(id);
        return R.ok();
    }
}

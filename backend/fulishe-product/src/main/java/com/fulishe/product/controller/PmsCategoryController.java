package com.fulishe.product.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.product.entity.PmsCategory;
import com.fulishe.product.service.PmsCategoryService;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;
import java.util.List;

@RestController
@RequestMapping("/product/category")
public class PmsCategoryController {

    @Resource
    private PmsCategoryService pmsCategoryService;

    @GetMapping("/page")
    public R<PageResult<PmsCategory>> page(PageQuery query) {
        IPage<PmsCategory> page = pmsCategoryService.page(query);
        return R.ok(PageResult.of(page));
    }

    @GetMapping("/tree")
    public R<List<PmsCategory>> tree() {
        return R.ok(pmsCategoryService.tree());
    }

    @GetMapping("/{id}")
    public R<PmsCategory> getById(@PathVariable Long id) {
        return R.ok(pmsCategoryService.getById(id));
    }

    @PostMapping
    public R<Void> save(@RequestBody PmsCategory category) {
        pmsCategoryService.save(category);
        return R.ok();
    }

    @PutMapping
    public R<Void> update(@RequestBody PmsCategory category) {
        pmsCategoryService.updateById(category);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        pmsCategoryService.removeById(id);
        return R.ok();
    }
}

package com.fulishe.user.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.user.entity.SysTenant;
import com.fulishe.user.service.SysTenantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "租户管理")
@RestController
@RequestMapping("/tenant")
@RequiredArgsConstructor
public class SysTenantController {

    private final SysTenantService sysTenantService;

    @Operation(summary = "分页查询租户")
    @GetMapping("/page")
    public R<PageResult<SysTenant>> page(SysTenant tenant, PageQuery pageQuery) {
        Page<SysTenant> page = sysTenantService.page(
                new Page<>(pageQuery.getCurrent(), pageQuery.getSize()),
                new LambdaQueryWrapper<SysTenant>()
                        .like(tenant.getTenantName() != null, SysTenant::getTenantName, tenant.getTenantName())
                        .like(tenant.getTenantCode() != null, SysTenant::getTenantCode, tenant.getTenantCode())
                        .eq(tenant.getStatus() != null, SysTenant::getStatus, tenant.getStatus())
        );
        return R.ok(PageResult.of(page));
    }

    @Operation(summary = "获取租户详情")
    @GetMapping("/{id}")
    public R<SysTenant> getById(@PathVariable Long id) {
        return R.ok(sysTenantService.getById(id));
    }

    @Operation(summary = "新增租户")
    @PostMapping
    public R<Void> save(@Valid @RequestBody SysTenant tenant) {
        sysTenantService.save(tenant);
        return R.ok();
    }

    @Operation(summary = "更新租户")
    @PutMapping
    public R<Void> update(@Valid @RequestBody SysTenant tenant) {
        sysTenantService.updateById(tenant);
        return R.ok();
    }

    @Operation(summary = "删除租户")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        sysTenantService.removeById(id);
        return R.ok();
    }
}

package com.fulishe.user.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.user.entity.SysDept;
import com.fulishe.user.service.SysDeptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "部门管理")
@RestController
@RequestMapping("/dept")
@RequiredArgsConstructor
public class SysDeptController {

    private final SysDeptService sysDeptService;

    @Operation(summary = "分页查询部门")
    @GetMapping("/page")
    public R<PageResult<SysDept>> page(SysDept dept, PageQuery pageQuery) {
        Page<SysDept> page = sysDeptService.page(
                new Page<>(pageQuery.getCurrent(), pageQuery.getSize()),
                new LambdaQueryWrapper<SysDept>()
                        .like(dept.getDeptName() != null, SysDept::getDeptName, dept.getDeptName())
                        .eq(dept.getStatus() != null, SysDept::getStatus, dept.getStatus())
        );
        return R.ok(PageResult.of(page));
    }

    @Operation(summary = "获取部门树")
    @GetMapping("/tree")
    public R<List<SysDept>> tree() {
        List<SysDept> depts = sysDeptService.list(new LambdaQueryWrapper<SysDept>().orderByAsc(SysDept::getOrderNum));
        return R.ok(depts);
    }

    @Operation(summary = "获取部门详情")
    @GetMapping("/{id}")
    public R<SysDept> getById(@PathVariable Long id) {
        return R.ok(sysDeptService.getById(id));
    }

    @Operation(summary = "新增部门")
    @PostMapping
    public R<Void> save(@Valid @RequestBody SysDept dept) {
        sysDeptService.save(dept);
        return R.ok();
    }

    @Operation(summary = "更新部门")
    @PutMapping
    public R<Void> update(@Valid @RequestBody SysDept dept) {
        sysDeptService.updateById(dept);
        return R.ok();
    }

    @Operation(summary = "删除部门")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        sysDeptService.removeById(id);
        return R.ok();
    }
}

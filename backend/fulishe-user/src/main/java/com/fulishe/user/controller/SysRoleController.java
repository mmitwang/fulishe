package com.fulishe.user.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.user.entity.SysRole;
import com.fulishe.user.service.SysRoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "角色管理")
@RestController
@RequestMapping("/role")
@RequiredArgsConstructor
public class SysRoleController {

    private final SysRoleService sysRoleService;

    @Operation(summary = "分页查询角色")
    @GetMapping("/page")
    public R<PageResult<SysRole>> page(SysRole role, PageQuery pageQuery) {
        Page<SysRole> page = sysRoleService.page(
                new Page<>(pageQuery.getCurrent(), pageQuery.getSize()),
                new LambdaQueryWrapper<SysRole>()
                        .like(role.getRoleName() != null, SysRole::getRoleName, role.getRoleName())
                        .like(role.getRoleCode() != null, SysRole::getRoleCode, role.getRoleCode())
                        .eq(role.getStatus() != null, SysRole::getStatus, role.getStatus())
        );
        return R.ok(PageResult.of(page));
    }

    @Operation(summary = "获取所有角色")
    @GetMapping("/list")
    public R<List<SysRole>> list() {
        return R.ok(sysRoleService.list());
    }

    @Operation(summary = "获取角色详情")
    @GetMapping("/{id}")
    public R<SysRole> getById(@PathVariable Long id) {
        return R.ok(sysRoleService.getById(id));
    }

    @Operation(summary = "新增角色")
    @PostMapping
    public R<Void> save(@Valid @RequestBody SysRole role) {
        sysRoleService.save(role);
        return R.ok();
    }

    @Operation(summary = "更新角色")
    @PutMapping
    public R<Void> update(@Valid @RequestBody SysRole role) {
        sysRoleService.updateById(role);
        return R.ok();
    }

    @Operation(summary = "删除角色")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        sysRoleService.removeById(id);
        return R.ok();
    }
}

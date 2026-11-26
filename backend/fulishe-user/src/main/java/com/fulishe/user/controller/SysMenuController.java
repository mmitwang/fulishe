package com.fulishe.user.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.user.entity.SysMenu;
import com.fulishe.user.service.SysMenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "菜单管理")
@RestController
@RequestMapping("/menu")
@RequiredArgsConstructor
public class SysMenuController {

    private final SysMenuService sysMenuService;

    @Operation(summary = "分页查询菜单")
    @GetMapping("/page")
    public R<PageResult<SysMenu>> page(SysMenu menu, PageQuery pageQuery) {
        Page<SysMenu> page = sysMenuService.page(
                new Page<>(pageQuery.getCurrent(), pageQuery.getSize()),
                new LambdaQueryWrapper<SysMenu>()
                        .like(menu.getMenuName() != null, SysMenu::getMenuName, menu.getMenuName())
                        .eq(menu.getMenuType() != null, SysMenu::getMenuType, menu.getMenuType())
                        .eq(menu.getStatus() != null, SysMenu::getStatus, menu.getStatus())
        );
        return R.ok(PageResult.of(page));
    }

    @Operation(summary = "获取菜单树")
    @GetMapping("/tree")
    public R<List<SysMenu>> tree() {
        List<SysMenu> menus = sysMenuService.list(new LambdaQueryWrapper<SysMenu>().orderByAsc(SysMenu::getOrderNum));
        return R.ok(menus);
    }

    @Operation(summary = "获取菜单详情")
    @GetMapping("/{id}")
    public R<SysMenu> getById(@PathVariable Long id) {
        return R.ok(sysMenuService.getById(id));
    }

    @Operation(summary = "新增菜单")
    @PostMapping
    public R<Void> save(@Valid @RequestBody SysMenu menu) {
        sysMenuService.save(menu);
        return R.ok();
    }

    @Operation(summary = "更新菜单")
    @PutMapping
    public R<Void> update(@Valid @RequestBody SysMenu menu) {
        sysMenuService.updateById(menu);
        return R.ok();
    }

    @Operation(summary = "删除菜单")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        sysMenuService.removeById(id);
        return R.ok();
    }
}

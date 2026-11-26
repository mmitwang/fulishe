package com.fulishe.user.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.user.entity.SysUser;
import com.fulishe.user.service.SysUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

@Tag(name = "用户管理")
@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class SysUserController {

    private final SysUserService sysUserService;
    private final BCryptPasswordEncoder passwordEncoder;

    @Operation(summary = "分页查询用户")
    @GetMapping("/page")
    public R<PageResult<SysUser>> page(SysUser user, PageQuery pageQuery) {
        Page<SysUser> page = sysUserService.page(
                new Page<>(pageQuery.getCurrent(), pageQuery.getSize()),
                new LambdaQueryWrapper<SysUser>()
                        .like(user.getUsername() != null, SysUser::getUsername, user.getUsername())
                        .like(user.getNickname() != null, SysUser::getNickname, user.getNickname())
                        .like(user.getMobile() != null, SysUser::getMobile, user.getMobile())
                        .eq(user.getStatus() != null, SysUser::getStatus, user.getStatus())
                        .eq(user.getDeptId() != null, SysUser::getDeptId, user.getDeptId())
        );
        return R.ok(PageResult.of(page));
    }

    @Operation(summary = "获取用户详情")
    @GetMapping("/{id}")
    public R<SysUser> getById(@PathVariable Long id) {
        return R.ok(sysUserService.getById(id));
    }

    @Operation(summary = "新增用户")
    @PostMapping
    public R<Void> save(@Valid @RequestBody SysUser user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        sysUserService.save(user);
        return R.ok();
    }

    @Operation(summary = "更新用户")
    @PutMapping
    public R<Void> update(@Valid @RequestBody SysUser user) {
        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        sysUserService.updateById(user);
        return R.ok();
    }

    @Operation(summary = "删除用户")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        sysUserService.removeById(id);
        return R.ok();
    }

    @Operation(summary = "批量删除用户")
    @DeleteMapping("/batch")
    public R<Void> batchDelete(@RequestBody Long[] ids) {
        sysUserService.removeByIds(java.util.Arrays.asList(ids));
        return R.ok();
    }

    @Operation(summary = "修改用户状态")
    @PutMapping("/status")
    public R<Void> updateStatus(@RequestBody SysUser user) {
        SysUser updateUser = new SysUser();
        updateUser.setId(user.getId());
        updateUser.setStatus(user.getStatus());
        sysUserService.updateById(updateUser);
        return R.ok();
    }

    @Operation(summary = "重置密码")
    @PutMapping("/reset-password")
    public R<Void> resetPassword(@RequestBody SysUser user) {
        user.setPassword(passwordEncoder.encode("123456"));
        sysUserService.updateById(user);
        return R.ok();
    }
}

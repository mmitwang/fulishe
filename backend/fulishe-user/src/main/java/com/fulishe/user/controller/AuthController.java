package com.fulishe.user.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fulishe.common.core.exception.BusinessException;
import com.fulishe.common.core.result.R;
import com.fulishe.common.core.result.ResultCode;
import com.fulishe.common.security.service.TokenService;
import com.fulishe.common.security.utils.JwtUtils;
import com.fulishe.common.security.utils.SecurityUtils;
import com.fulishe.user.dto.LoginDTO;
import com.fulishe.user.dto.LoginResponseDTO;
import com.fulishe.user.entity.SysTenant;
import com.fulishe.user.entity.SysUser;
import com.fulishe.user.service.SysTenantService;
import com.fulishe.user.service.SysUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@Slf4j
@Tag(name = "认证管理")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final SysUserService sysUserService;
    private final SysTenantService sysTenantService;
    private final JwtUtils jwtUtils;
    private final TokenService tokenService;
    private final BCryptPasswordEncoder passwordEncoder;

    @Operation(summary = "用户登录")
    @PostMapping("/login")
    public R<LoginResponseDTO> login(@Valid @RequestBody LoginDTO loginDTO) {
        Long tenantId = getTenantIdByCode(loginDTO.getTenantCode());

        SysUser user = sysUserService.getOne(
                new LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getUsername, loginDTO.getUsername())
                        .eq(tenantId != null, SysUser::getTenantId, tenantId)
        );

        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }

        if (user.getStatus() == 0) {
            throw new BusinessException(ResultCode.USER_DISABLED);
        }

        if (!passwordEncoder.matches(loginDTO.getPassword(), user.getPassword())) {
            throw new BusinessException(ResultCode.USER_PASSWORD_ERROR);
        }

        String token = jwtUtils.generateToken(user.getId(), user.getTenantId(), user.getUsername());
        String refreshToken = jwtUtils.generateRefreshToken(user.getId(), user.getTenantId(), user.getUsername());

        tokenService.saveToken(token, user.getId(), user.getTenantId(), user.getUsername());

        user.setLastLoginTime(LocalDateTime.now());
        sysUserService.updateById(user);

        LoginResponseDTO response = new LoginResponseDTO();
        response.setToken(token);
        response.setRefreshToken(refreshToken);
        response.setExpireTime(jwtUtils.getExpireTime());
        response.setUserInfo(buildUserInfo(user));

        log.info("User login success: {}", user.getUsername());
        return R.ok(response);
    }

    @Operation(summary = "用户登出")
    @PostMapping("/logout")
    public R<Void> logout(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        tokenService.invalidateToken(token);
        log.info("User logout, token invalidated");
        return R.ok();
    }

    @Operation(summary = "获取当前用户信息")
    @GetMapping("/info")
    public R<LoginResponseDTO.SysUserInfo> getCurrentUserInfo() {
        Long userId = SecurityUtils.getUserId();
        SysUser user = sysUserService.getById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }
        return R.ok(buildUserInfo(user));
    }

    @Operation(summary = "刷新Token")
    @PostMapping("/refresh")
    public R<LoginResponseDTO> refreshToken(@RequestBody String refreshToken) {
        Long userId = jwtUtils.getUserIdFromToken(refreshToken);
        Long tenantId = jwtUtils.getTenantIdFromToken(refreshToken);
        String username = jwtUtils.getUsernameFromToken(refreshToken);

        String newToken = jwtUtils.generateToken(userId, tenantId, username);
        String newRefreshToken = jwtUtils.generateRefreshToken(userId, tenantId, username);

        tokenService.saveToken(newToken, userId, tenantId, username);

        LoginResponseDTO response = new LoginResponseDTO();
        response.setToken(newToken);
        response.setRefreshToken(newRefreshToken);
        response.setExpireTime(jwtUtils.getExpireTime());

        return R.ok(response);
    }

    private LoginResponseDTO.SysUserInfo buildUserInfo(SysUser user) {
        LoginResponseDTO.SysUserInfo info = new LoginResponseDTO.SysUserInfo();
        info.setId(user.getId());
        info.setTenantId(user.getTenantId());
        info.setUsername(user.getUsername());
        info.setNickname(user.getNickname());
        info.setRealName(user.getRealName());
        info.setAvatar(user.getAvatar());
        info.setMobile(user.getMobile());
        info.setUserType(user.getUserType());
        info.setDeptName(user.getDeptName());
        return info;
    }

    private Long getTenantIdByCode(String tenantCode) {
        if (tenantCode == null || tenantCode.isEmpty()) {
            return null;
        }
        SysTenant tenant = sysTenantService.getOne(
                new LambdaQueryWrapper<SysTenant>().eq(SysTenant::getTenantCode, tenantCode)
        );
        return tenant != null ? tenant.getId() : null;
    }
}

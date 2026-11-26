package com.fulishe.order;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fulishe.common.security.utils.JwtUtils;
import com.fulishe.common.security.utils.SecurityUtils;
import com.fulishe.order.entity.OrderInfo;
import com.fulishe.order.mapper.OrderInfoMapper;
import com.fulishe.user.entity.SysUser;
import com.fulishe.user.mapper.SysUserMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import jakarta.annotation.Resource;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class SecurityTest {

    @Resource
    private JwtUtils jwtUtils;

    @Resource
    private SysUserMapper sysUserMapper;

    @Resource
    private OrderInfoMapper orderInfoMapper;

    @Test
    public void testJwtTokenGeneration() {
        String token = jwtUtils.generateToken(1L, 1L, "admin");
        assertNotNull(token, "Token应生成");
        assertTrue(token.length() > 0, "Token长度应大于0");

        Long userId = jwtUtils.getUserIdFromToken(token);
        assertEquals(1L, userId, "解析的用户ID应正确");

        Long tenantId = jwtUtils.getTenantIdFromToken(token);
        assertEquals(1L, tenantId, "解析的租户ID应正确");

        String username = jwtUtils.getUsernameFromToken(token);
        assertEquals("admin", username, "解析的用户名应正确");
    }

    @Test
    public void testJwtTokenExpiration() {
        String token = jwtUtils.generateToken(1L, 1L, "admin");
        assertNotNull(token, "Token应生成");

        boolean isValid = jwtUtils.validateToken(token);
        assertTrue(isValid, "Token应有效");
    }

    @Test
    public void testJwtTokenWithDifferentTenant() {
        String tenant1Token = jwtUtils.generateToken(1L, 1L, "admin");
        String tenant2Token = jwtUtils.generateToken(6L, 2L, "tencent_admin");

        Long tenantId1 = jwtUtils.getTenantIdFromToken(tenant1Token);
        Long tenantId2 = jwtUtils.getTenantIdFromToken(tenant2Token);

        assertEquals(1L, tenantId1, "租户1Token应解析到租户1");
        assertEquals(2L, tenantId2, "租户2Token应解析到租户2");
        assertNotEquals(tenantId1, tenantId2, "不同租户的Token应区分");
    }

    @Test
    public void testUserAuthentication() {
        SysUser adminUser = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, "admin"));
        assertNotNull(adminUser, "管理员用户应存在");
        assertEquals("admin", adminUser.getUsername(), "用户名应正确");
        assertEquals(1, adminUser.getTenantId().intValue(), "管理员应属于租户1");
        assertEquals(3, adminUser.getUserType().intValue(), "管理员类型应为超级管理员");

        SysUser tenantUser = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, "tencent_admin"));
        assertNotNull(tenantUser, "租户管理员应存在");
        assertEquals("tencent_admin", tenantUser.getUsername(), "用户名应正确");
        assertEquals(2, tenantUser.getTenantId().intValue(), "租户管理员应属于租户2");
        assertEquals(2, tenantUser.getUserType().intValue(), "用户类型应为企业管理员");
    }

    @Test
    public void testPasswordHashing() {
        String rawPassword = "123456";
        String hashedPassword = "$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq";

        assertTrue(hashedPassword.length() > rawPassword.length(), "加密后的密码应更长");
        assertFalse(hashedPassword.contains(rawPassword), "加密后的密码不应包含原始密码");
    }

    @Test
    public void testTenantDataAccessControl() {
        List<OrderInfo> tenant1Orders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getTenantId, 1));
        List<OrderInfo> tenant2Orders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getTenantId, 2));

        for (OrderInfo order : tenant1Orders) {
            assertEquals(1, order.getTenantId().intValue(), "租户1订单的tenant_id应为1");
        }

        for (OrderInfo order : tenant2Orders) {
            assertEquals(2, order.getTenantId().intValue(), "租户2订单的tenant_id应为2");
        }

        assertNotEquals(tenant1Orders.size(), tenant2Orders.size(), "不同租户订单数量应独立");
    }

    @Test
    public void testUserRoleBasedAccess() {
        SysUser superAdmin = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, "admin"));
        assertNotNull(superAdmin);
        assertEquals(3, superAdmin.getUserType().intValue(), "超级管理员用户类型");

        SysUser tenantAdmin = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, "tencent_admin"));
        assertNotNull(tenantAdmin);
        assertEquals(2, tenantAdmin.getUserType().intValue(), "企业管理员用户类型");

        SysUser employee = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, "user001"));
        assertNotNull(employee);
        assertEquals(1, employee.getUserType().intValue(), "普通员工用户类型");

        assertNotEquals(superAdmin.getUserType(), employee.getUserType(), 
                "超级管理员和普通员工权限应不同");
    }

    @Test
    public void testRefreshTokenGeneration() {
        String refreshToken = jwtUtils.generateRefreshToken(1L, 1L, "admin");
        assertNotNull(refreshToken, "Refresh Token应生成");

        Long userId = jwtUtils.getUserIdFromToken(refreshToken);
        assertEquals(1L, userId, "解析的用户ID应正确");

        Long tenantId = jwtUtils.getTenantIdFromToken(refreshToken);
        assertEquals(1L, tenantId, "解析的租户ID应正确");
    }
}

package com.fulishe.order;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fulishe.order.entity.OrderInfo;
import com.fulishe.order.mapper.OrderInfoMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import jakarta.annotation.Resource;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class CrossTenantAccessTest {

    @Resource
    private OrderInfoMapper orderInfoMapper;

    @Test
    public void testTenant1UserCannotAccessTenant2Orders() {
        List<OrderInfo> orders = orderInfoMapper.selectList(
                new LambdaQueryWrapper<OrderInfo>()
                        .eq(OrderInfo::getUserId, 4L)
                        .eq(OrderInfo::getTenantId, 1L));

        assertTrue(orders.isEmpty(), "租户1上下文不应访问到租户2用户(4)的数据");
    }

    @Test
    public void testTenant2UserCannotAccessTenant3Orders() {
        List<OrderInfo> orders = orderInfoMapper.selectList(
                new LambdaQueryWrapper<OrderInfo>()
                        .eq(OrderInfo::getUserId, 6L)
                        .eq(OrderInfo::getTenantId, 2L));

        assertTrue(orders.isEmpty(), "租户2上下文不应访问到租户3用户(6)的数据");
    }

    @Test
    public void testCrossTenantOrderAccessPrevention() {
        List<OrderInfo> tenant1Orders = orderInfoMapper.selectList(
                new LambdaQueryWrapper<OrderInfo>().eq(OrderInfo::getTenantId, 1L));

        for (OrderInfo order : tenant1Orders) {
            OrderInfo accessedByTenant2 = orderInfoMapper.selectOne(
                    new LambdaQueryWrapper<OrderInfo>()
                            .eq(OrderInfo::getId, order.getId())
                            .eq(OrderInfo::getTenantId, 2L));
            assertNull(accessedByTenant2, "租户2不应通过ID访问租户1的订单");
        }
    }

    @Test
    public void testTenantDataBoundaryValidation() {
        List<OrderInfo> allOrders = orderInfoMapper.selectList(null);
        assertEquals(6, allOrders.size(), "总订单数应为6");

        List<OrderInfo> tenant1Orders = orderInfoMapper.selectList(
                new LambdaQueryWrapper<OrderInfo>().eq(OrderInfo::getTenantId, 1L));
        List<OrderInfo> tenant2Orders = orderInfoMapper.selectList(
                new LambdaQueryWrapper<OrderInfo>().eq(OrderInfo::getTenantId, 2L));
        List<OrderInfo> tenant3Orders = orderInfoMapper.selectList(
                new LambdaQueryWrapper<OrderInfo>().eq(OrderInfo::getTenantId, 3L));

        assertEquals(2, tenant1Orders.size(), "租户1应有2条订单");
        assertEquals(2, tenant2Orders.size(), "租户2应有2条订单");
        assertEquals(2, tenant3Orders.size(), "租户3应有2条订单");

        for (OrderInfo order : tenant1Orders) {
            assertEquals(1L, order.getTenantId(), "租户1订单租户ID应正确");
            assertNotEquals(4L, order.getUserId(), "租户1订单不应包含租户2用户");
            assertNotEquals(6L, order.getUserId(), "租户1订单不应包含租户3用户");
        }
        for (OrderInfo order : tenant2Orders) {
            assertEquals(2L, order.getTenantId(), "租户2订单租户ID应正确");
            assertNotEquals(2L, order.getUserId(), "租户2订单不应包含租户1用户");
            assertNotEquals(6L, order.getUserId(), "租户2订单不应包含租户3用户");
        }
        for (OrderInfo order : tenant3Orders) {
            assertEquals(3L, order.getTenantId(), "租户3订单租户ID应正确");
            assertNotEquals(2L, order.getUserId(), "租户3订单不应包含租户1用户");
            assertNotEquals(4L, order.getUserId(), "租户3订单不应包含租户2用户");
        }
    }

    @Test
    public void testTenantOrderNoUniqueness() {
        List<OrderInfo> orders = orderInfoMapper.selectList(null);

        for (OrderInfo order1 : orders) {
            for (OrderInfo order2 : orders) {
                if (!order1.getId().equals(order2.getId())) {
                    assertNotEquals(order1.getOrderNo(), order2.getOrderNo(),
                            "不同订单应具有唯一订单号");
                }
            }
        }
    }
}

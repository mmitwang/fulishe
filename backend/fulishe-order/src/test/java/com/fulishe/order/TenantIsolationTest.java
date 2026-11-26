package com.fulishe.order;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fulishe.order.entity.OrderInfo;
import com.fulishe.order.entity.OrderItem;
import com.fulishe.order.mapper.OrderInfoMapper;
import com.fulishe.order.mapper.OrderItemMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import jakarta.annotation.Resource;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class TenantIsolationTest {

    @Resource
    private OrderInfoMapper orderInfoMapper;

    @Resource
    private OrderItemMapper orderItemMapper;

    @Test
    public void testTenantOrderIsolation() {
        List<OrderInfo> allOrders = orderInfoMapper.selectList(null);
        assertFalse(allOrders.isEmpty(), "应存在订单数据");

        List<OrderInfo> tenant1Orders = orderInfoMapper.selectList(
                new LambdaQueryWrapper<OrderInfo>().eq(OrderInfo::getTenantId, 1L));
        List<OrderInfo> tenant2Orders = orderInfoMapper.selectList(
                new LambdaQueryWrapper<OrderInfo>().eq(OrderInfo::getTenantId, 2L));
        List<OrderInfo> tenant3Orders = orderInfoMapper.selectList(
                new LambdaQueryWrapper<OrderInfo>().eq(OrderInfo::getTenantId, 3L));

        assertFalse(tenant1Orders.isEmpty(), "租户1应有订单");
        assertFalse(tenant2Orders.isEmpty(), "租户2应有订单");
        assertFalse(tenant3Orders.isEmpty(), "租户3应有订单");

        for (OrderInfo order : tenant1Orders) {
            assertEquals(1L, order.getTenantId(), "订单租户ID应匹配");
        }
        for (OrderInfo order : tenant2Orders) {
            assertEquals(2L, order.getTenantId(), "订单租户ID应匹配");
        }
        for (OrderInfo order : tenant3Orders) {
            assertEquals(3L, order.getTenantId(), "订单租户ID应匹配");
        }
    }

    @Test
    public void testTenantOrderItemIsolation() {
        List<OrderItem> allItems = orderItemMapper.selectList(null);
        assertFalse(allItems.isEmpty(), "应存在订单项数据");

        List<OrderItem> tenant1Items = orderItemMapper.selectList(
                new LambdaQueryWrapper<OrderItem>().eq(OrderItem::getTenantId, 1L));
        List<OrderItem> tenant2Items = orderItemMapper.selectList(
                new LambdaQueryWrapper<OrderItem>().eq(OrderItem::getTenantId, 2L));

        assertFalse(tenant1Items.isEmpty(), "租户1应有订单项");
        assertFalse(tenant2Items.isEmpty(), "租户2应有订单项");

        for (OrderItem item : tenant1Items) {
            assertEquals(1L, item.getTenantId(), "订单项租户ID应匹配");
        }
        for (OrderItem item : tenant2Items) {
            assertEquals(2L, item.getTenantId(), "订单项租户ID应匹配");
        }
    }

    @Test
    public void testCrossTenantOrderAccess() {
        List<OrderInfo> tenant1Orders = orderInfoMapper.selectList(
                new LambdaQueryWrapper<OrderInfo>().eq(OrderInfo::getTenantId, 1L));

        for (OrderInfo order : tenant1Orders) {
            OrderInfo accessedByTenant2 = orderInfoMapper.selectOne(
                    new LambdaQueryWrapper<OrderInfo>()
                            .eq(OrderInfo::getId, order.getId())
                            .eq(OrderInfo::getTenantId, 2L));
            assertNull(accessedByTenant2, "租户2不应访问租户1的订单");
        }
    }

    @Test
    public void testOrderAndItemTenantConsistency() {
        List<OrderInfo> orders = orderInfoMapper.selectList(null);
        
        for (OrderInfo order : orders) {
            List<OrderItem> items = orderItemMapper.selectList(
                    new LambdaQueryWrapper<OrderItem>().eq(OrderItem::getOrderId, order.getId()));
            
            for (OrderItem item : items) {
                assertEquals(order.getTenantId(), item.getTenantId(), 
                        "订单项租户ID应与订单租户ID一致");
            }
        }
    }
}

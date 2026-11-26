package com.fulishe.order;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fulishe.common.core.result.R;
import com.fulishe.common.core.utils.TenantContext;
import com.fulishe.order.dto.CreateOrderDTO;
import com.fulishe.order.entity.OrderInfo;
import com.fulishe.order.feign.CouponFeignClient;
import com.fulishe.order.feign.ProductFeignClient;
import com.fulishe.order.mapper.OrderInfoMapper;
import com.fulishe.order.service.OrderInfoService;
import com.fulishe.product.entity.PmsSku;
import com.fulishe.coupon.entity.Coupon;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import jakarta.annotation.Resource;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class PerformanceStressTest {

    @Resource
    private OrderInfoService orderInfoService;

    @Resource
    private OrderInfoMapper orderInfoMapper;

    @MockBean
    private ProductFeignClient productFeignClient;

    @MockBean
    private CouponFeignClient couponFeignClient;

    @BeforeEach
    public void setUp() {
        Mockito.when(productFeignClient.getSkuById(Mockito.anyLong()))
                .thenAnswer(invocation -> {
                    Long id = invocation.getArgument(0);
                    PmsSku sku = new PmsSku();
                    sku.setId(id);
                    sku.setStock(1000);
                    sku.setPrice(BigDecimal.valueOf(100));
                    sku.setTenantId(1L);
                    sku.setSkuCode("SKU" + id);
                    sku.setSkuName("测试商品" + id);
                    return R.ok(sku);
                });

        Mockito.when(productFeignClient.deductStock(Mockito.anyLong(), Mockito.anyInt()))
                .thenReturn(R.ok());

        Mockito.when(couponFeignClient.getCouponById(Mockito.anyLong()))
                .thenAnswer(invocation -> {
                    Coupon coupon = new Coupon();
                    coupon.setId(1L);
                    coupon.setFaceValue(BigDecimal.valueOf(20));
                    coupon.setMinAmount(BigDecimal.valueOf(100));
                    coupon.setStatus(1);
                    coupon.setTenantId(1L);
                    return R.ok(coupon);
                });

        Mockito.when(couponFeignClient.useCoupon(Mockito.anyLong(), Mockito.anyString()))
                .thenReturn(R.ok());
    }

    @Test
    public void testConcurrentOrderCreation() throws InterruptedException {
        int threadCount = 10;
        int ordersPerThread = 5;
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        CountDownLatch latch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        for (int t = 0; t < threadCount; t++) {
            final int tenantId = (t % 3) + 1;
            executor.submit(() -> {
                try {
                    TenantContext.setTenantId((long) tenantId);
                    for (int i = 0; i < ordersPerThread; i++) {
                        try {
                            CreateOrderDTO dto = new CreateOrderDTO();
                            dto.setTenantId((long) tenantId);
                            dto.setUserId((long) ((tenantId - 1) * 2 + 2));
                            dto.setUserName("用户" + tenantId + "-" + i);

                            CreateOrderDTO.OrderItemDTO item = new CreateOrderDTO.OrderItemDTO();
                            item.setSkuId(1L);
                            item.setQuantity(1);
                            dto.setItems(Arrays.asList(item));

                            OrderInfo order = orderInfoService.createOrder(dto);
                            assertNotNull(order);
                            assertEquals(tenantId, order.getTenantId());
                            successCount.incrementAndGet();
                        } catch (Exception e) {
                            failureCount.incrementAndGet();
                        }
                    }
                } finally {
                    TenantContext.clear();
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        System.out.println("并发测试结果 - 成功: " + successCount.get() + ", 失败: " + failureCount.get());
        assertEquals(threadCount * ordersPerThread, successCount.get(), "所有订单应创建成功");
        assertEquals(0, failureCount.get(), "不应有失败");
    }

    @Test
    public void testMultiTenantConcurrentAccess() throws InterruptedException {
        int threadCount = 15;
        CountDownLatch latch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        AtomicInteger errors = new AtomicInteger(0);

        for (int t = 0; t < threadCount; t++) {
            final int tenantId = (t % 3) + 1;
            executor.submit(() -> {
                try {
                    TenantContext.setTenantId((long) tenantId);

                    List<OrderInfo> orders = orderInfoMapper.selectList(
                            new LambdaQueryWrapper<OrderInfo>().eq(OrderInfo::getTenantId, tenantId));

                    for (OrderInfo order : orders) {
                        if (!order.getTenantId().equals((long) tenantId)) {
                            errors.incrementAndGet();
                        }
                    }
                } finally {
                    TenantContext.clear();
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        assertEquals(0, errors.get(), "跨租户数据泄漏应不存在");
    }

    @Test
    public void testOrderCreationPerformance() throws InterruptedException {
        int orderCount = 20;
        CountDownLatch latch = new CountDownLatch(orderCount);
        ExecutorService executor = Executors.newFixedThreadPool(8);
        AtomicInteger successCount = new AtomicInteger(0);
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < orderCount; i++) {
            executor.submit(() -> {
                try {
                    TenantContext.setTenantId(1L);
                    CreateOrderDTO dto = new CreateOrderDTO();
                    dto.setTenantId(1L);
                    dto.setUserId(2L);
                    dto.setUserName("测试用户");

                    CreateOrderDTO.OrderItemDTO item = new CreateOrderDTO.OrderItemDTO();
                    item.setSkuId(1L);
                    item.setQuantity(1);
                    dto.setItems(Arrays.asList(item));

                    OrderInfo order = orderInfoService.createOrder(dto);
                    if (order != null) {
                        successCount.incrementAndGet();
                    }
                } finally {
                    TenantContext.clear();
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;
        double tps = (double) successCount.get() / (duration / 1000.0);

        System.out.println("性能测试结果 - 订单数: " + successCount.get() + ", 耗时: " + duration + "ms, TPS: " + String.format("%.2f", tps));
        assertTrue(tps > 10, "TPS应大于10");
        assertEquals(orderCount, successCount.get(), "所有订单应创建成功");
    }

    @Test
    public void testTransactionConsistencyUnderLoad() throws InterruptedException {
        int threadCount = 8;
        CountDownLatch latch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int t = 0; t < threadCount; t++) {
            executor.submit(() -> {
                try {
                    TenantContext.setTenantId(1L);
                    CreateOrderDTO dto = new CreateOrderDTO();
                    dto.setTenantId(1L);
                    dto.setUserId(2L);
                    dto.setUserName("测试用户");
                    dto.setCouponId(1L);

                    CreateOrderDTO.OrderItemDTO item = new CreateOrderDTO.OrderItemDTO();
                    item.setSkuId(1L);
                    item.setQuantity(2);
                    dto.setItems(Arrays.asList(item));

                    OrderInfo order = orderInfoService.createOrder(dto);
                    assertNotNull(order);
                    assertEquals(BigDecimal.valueOf(180), order.getPayAmount(), "折扣后金额应为180");
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    TenantContext.clear();
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        System.out.println("事务一致性测试 - 成功: " + successCount.get() + ", 失败: " + failureCount.get());
        assertEquals(threadCount, successCount.get(), "所有事务应成功");
        assertEquals(0, failureCount.get(), "不应有失败");
    }

    @AfterEach
    public void tearDown() {
        TenantContext.clear();
    }
}

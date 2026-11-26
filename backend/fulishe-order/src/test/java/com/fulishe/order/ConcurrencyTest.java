package com.fulishe.order;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fulishe.common.core.result.R;
import com.fulishe.order.dto.CreateOrderDTO;
import com.fulishe.order.entity.OrderInfo;
import com.fulishe.order.feign.CouponFeignClient;
import com.fulishe.order.feign.ProductFeignClient;
import com.fulishe.order.mapper.OrderInfoMapper;
import com.fulishe.order.service.OrderInfoService;
import com.fulishe.product.entity.PmsSku;
import com.fulishe.product.mapper.PmsSkuMapper;
import com.fulishe.coupon.entity.Coupon;
import com.fulishe.coupon.mapper.CouponMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import jakarta.annotation.Resource;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class ConcurrencyTest {

    @Resource
    private OrderInfoService orderInfoService;

    @Resource
    private OrderInfoMapper orderInfoMapper;

    @Resource
    private PmsSkuMapper pmsSkuMapper;

    @Resource
    private CouponMapper couponMapper;

    @MockBean
    private ProductFeignClient productFeignClient;

    @MockBean
    private CouponFeignClient couponFeignClient;

    private Long testSkuId = 1L;
    private Long testCouponId = 4L;

    @BeforeEach
    public void setUp() {
        Mockito.when(productFeignClient.getSkuById(Mockito.anyLong()))
                .thenAnswer(invocation -> {
                    Long id = invocation.getArgument(0);
                    PmsSku sku = pmsSkuMapper.selectById(id);
                    return R.ok(sku);
                });

        Mockito.when(productFeignClient.deductStock(Mockito.anyLong(), Mockito.anyInt()))
                .thenAnswer(invocation -> {
                    Long skuId = invocation.getArgument(0);
                    Integer quantity = invocation.getArgument(1);
                    PmsSku sku = pmsSkuMapper.selectById(skuId);
                    if (sku != null && sku.getStock() >= quantity) {
                        sku.setStock(sku.getStock() - quantity);
                        pmsSkuMapper.updateById(sku);
                        return R.ok();
                    }
                    return R.fail();
                });

        Mockito.when(couponFeignClient.getCouponById(Mockito.anyLong()))
                .thenAnswer(invocation -> {
                    Long id = invocation.getArgument(0);
                    Coupon coupon = couponMapper.selectById(id);
                    return R.ok(coupon);
                });

        Mockito.when(couponFeignClient.useCoupon(Mockito.anyLong(), Mockito.anyString()))
                .thenAnswer(invocation -> {
                    Long couponId = invocation.getArgument(0);
                    String orderNo = invocation.getArgument(1);
                    Coupon coupon = couponMapper.selectById(couponId);
                    if (coupon != null && coupon.getStatus() == 1) {
                        coupon.setStatus(2);
                        coupon.setOrderNo(orderNo);
                        coupon.setUsedTime(java.time.LocalDateTime.now());
                        couponMapper.updateById(coupon);
                        return R.ok();
                    }
                    return R.fail();
                });
        PmsSku sku = pmsSkuMapper.selectById(testSkuId);
        if (sku != null) {
            sku.setStock(5);
            pmsSkuMapper.updateById(sku);
        }

        Coupon coupon = couponMapper.selectById(testCouponId);
        if (coupon != null) {
            coupon.setStatus(1);
            coupon.setOrderNo(null);
            coupon.setUsedTime(null);
            couponMapper.updateById(coupon);
        }

        orderInfoMapper.delete(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getUserId, 999L));
    }

    @Test
    public void testAntiOverstockWithConcurrency() throws InterruptedException {
        PmsSku sku = pmsSkuMapper.selectById(testSkuId);
        assertNotNull(sku, "测试SKU应存在");
        int initialStock = 5;
        sku.setStock(initialStock);
        pmsSkuMapper.updateById(sku);

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.execute(() -> {
                try {
                    CreateOrderDTO dto = new CreateOrderDTO();
                    dto.setTenantId(1L);
                    dto.setUserId(999L);
                    dto.setUserName("并发测试用户");

                    CreateOrderDTO.OrderItemDTO item = new CreateOrderDTO.OrderItemDTO();
                    item.setSkuId(testSkuId);
                    item.setQuantity(1);
                    dto.setItems(Arrays.asList(item));

                    OrderInfo order = orderInfoService.createOrder(dto);
                    if (order != null) {
                        successCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    failCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        PmsSku skuAfter = pmsSkuMapper.selectById(testSkuId);
        assertEquals(0, skuAfter.getStock(), "库存应清零");

        List<OrderInfo> orders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getUserId, 999L));
        assertEquals(initialStock, orders.size(), "成功订单数应等于初始库存");

        assertEquals(initialStock, successCount.get(), "成功次数应等于初始库存");
        assertEquals(threadCount - initialStock, failCount.get(), "失败次数应等于线程数减库存");
    }

    @Test
    public void testAntiDuplicateCouponRedeem() throws InterruptedException {
        Coupon coupon = couponMapper.selectById(testCouponId);
        assertNotNull(coupon, "测试卡券应存在");
        coupon.setStatus(1);
        couponMapper.updateById(coupon);

        int threadCount = 5;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.execute(() -> {
                try {
                    CreateOrderDTO dto = new CreateOrderDTO();
                    dto.setTenantId(1L);
                    dto.setUserId(999L);
                    dto.setUserName("并发测试用户");
                    dto.setCouponId(testCouponId);

                    CreateOrderDTO.OrderItemDTO item = new CreateOrderDTO.OrderItemDTO();
                    item.setSkuId(testSkuId);
                    item.setQuantity(1);
                    dto.setItems(Arrays.asList(item));

                    OrderInfo order = orderInfoService.createOrder(dto);
                    if (order != null) {
                        successCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    failCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        Coupon couponAfter = couponMapper.selectById(testCouponId);
        assertEquals(2, couponAfter.getStatus(), "卡券应被核销");

        assertEquals(1, successCount.get(), "只能有一个线程成功核销卡券");
        assertEquals(threadCount - 1, failCount.get(), "其他线程应核销失败");
    }

    @Test
    public void testHighConcurrencyOrderCreation() throws InterruptedException {
        PmsSku sku = pmsSkuMapper.selectById(testSkuId);
        assertNotNull(sku, "测试SKU应存在");
        int initialStock = 50;
        sku.setStock(initialStock);
        pmsSkuMapper.updateById(sku);

        int threadCount = 50;
        ExecutorService executor = Executors.newFixedThreadPool(10);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final int userId = 1000 + i;
            executor.execute(() -> {
                try {
                    CreateOrderDTO dto = new CreateOrderDTO();
                    dto.setUserId((long) userId);
                    dto.setUserName("高并发用户" + userId);

                    CreateOrderDTO.OrderItemDTO item = new CreateOrderDTO.OrderItemDTO();
                    item.setSkuId(testSkuId);
                    item.setQuantity(1);
                    dto.setItems(Arrays.asList(item));

                    OrderInfo order = orderInfoService.createOrder(dto);
                    if (order != null) {
                        successCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    failCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        PmsSku skuAfter = pmsSkuMapper.selectById(testSkuId);
        assertEquals(0, skuAfter.getStock(), "库存应清零");

        assertEquals(initialStock, successCount.get(), "成功次数应等于初始库存");
        assertEquals(threadCount - initialStock, failCount.get(), "失败次数应正确");
    }

    @Test
    public void testConcurrentOrderWithDifferentTenants() throws InterruptedException {
        int threadCount = 6;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger tenant1Success = new AtomicInteger(0);
        AtomicInteger tenant2Success = new AtomicInteger(0);
        AtomicInteger tenant3Success = new AtomicInteger(0);

        long[] tenantSkuIds = {1L, 7L, 10L};
        long[] tenantUserIds = {2L, 7L, 12L};

        for (int i = 0; i < threadCount; i++) {
            final int tenantIndex = i % 3;
            executor.execute(() -> {
                try {
                    CreateOrderDTO dto = new CreateOrderDTO();
                    dto.setUserId(tenantUserIds[tenantIndex]);
                    dto.setUserName("租户" + (tenantIndex + 1) + "用户");

                    CreateOrderDTO.OrderItemDTO item = new CreateOrderDTO.OrderItemDTO();
                    item.setSkuId(tenantSkuIds[tenantIndex]);
                    item.setQuantity(1);
                    dto.setItems(Arrays.asList(item));

                    OrderInfo order = orderInfoService.createOrder(dto);
                    if (order != null) {
                        if (tenantIndex == 0) tenant1Success.incrementAndGet();
                        else if (tenantIndex == 1) tenant2Success.incrementAndGet();
                        else tenant3Success.incrementAndGet();
                    }
                } catch (Exception e) {
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        assertTrue(tenant1Success.get() > 0, "租户1应有成功订单");
        assertTrue(tenant2Success.get() > 0, "租户2应有成功订单");
        assertTrue(tenant3Success.get() > 0, "租户3应有成功订单");

        List<OrderInfo> tenant1Orders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getTenantId, 1));
        List<OrderInfo> tenant2Orders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getTenantId, 2));
        List<OrderInfo> tenant3Orders = orderInfoMapper.selectList(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getTenantId, 3));

        assertTrue(tenant1Orders.size() >= tenant1Success.get(), "租户1订单数验证");
        assertTrue(tenant2Orders.size() >= tenant2Success.get(), "租户2订单数验证");
        assertTrue(tenant3Orders.size() >= tenant3Success.get(), "租户3订单数验证");
    }
}

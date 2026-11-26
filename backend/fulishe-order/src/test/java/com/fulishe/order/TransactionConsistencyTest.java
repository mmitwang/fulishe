package com.fulishe.order;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fulishe.common.core.result.R;
import com.fulishe.order.dto.CreateOrderDTO;
import com.fulishe.order.entity.OrderInfo;
import com.fulishe.order.entity.OrderItem;
import com.fulishe.order.feign.CouponFeignClient;
import com.fulishe.order.feign.ProductFeignClient;
import com.fulishe.order.mapper.OrderInfoMapper;
import com.fulishe.order.mapper.OrderItemMapper;
import com.fulishe.order.service.OrderInfoService;
import com.fulishe.product.entity.PmsSku;
import com.fulishe.coupon.entity.Coupon;
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
import java.util.concurrent.atomic.AtomicInteger;

import com.fulishe.common.core.utils.TenantContext;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@org.springframework.transaction.annotation.Transactional
public class TransactionConsistencyTest {

    @Resource
    private OrderInfoService orderInfoService;

    @Resource
    private OrderInfoMapper orderInfoMapper;

    @Resource
    private OrderItemMapper orderItemMapper;

    @MockBean
    private ProductFeignClient productFeignClient;

    @MockBean
    private CouponFeignClient couponFeignClient;

    private AtomicInteger stockCounter = new AtomicInteger(100);

    @BeforeEach
    public void setUp() {
        stockCounter.set(100);
        TenantContext.setTenantId(1L);

        Mockito.when(productFeignClient.getSkuById(Mockito.anyLong()))
                .thenAnswer(invocation -> {
                    Long id = invocation.getArgument(0);
                    PmsSku sku = new PmsSku();
                    sku.setId(id);
                    sku.setStock(stockCounter.get());
                    sku.setPrice(BigDecimal.valueOf(100));
                    sku.setTenantId(1L);
                    sku.setSkuCode("SKU" + id);
                    sku.setSkuName("测试商品" + id);
                    return R.ok(sku);
                });

        Mockito.when(productFeignClient.deductStock(Mockito.anyLong(), Mockito.anyInt()))
                .thenAnswer(invocation -> {
                    Integer quantity = invocation.getArgument(1);
                    if (stockCounter.get() >= quantity) {
                        stockCounter.addAndGet(-quantity);
                        return R.ok();
                    }
                    return R.fail();
                });

        Mockito.when(couponFeignClient.getCouponById(Mockito.anyLong()))
                .thenAnswer(invocation -> {
                    Long id = invocation.getArgument(0);
                    Coupon coupon = new Coupon();
                    coupon.setId(id);
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
    public void testOrderCreationSuccess() {
        CreateOrderDTO dto = new CreateOrderDTO();
        dto.setTenantId(1L);
        dto.setUserId(2L);
        dto.setUserName("测试用户");
        dto.setMobile("13800138000");
        dto.setAddress("测试地址");

        CreateOrderDTO.OrderItemDTO item = new CreateOrderDTO.OrderItemDTO();
        item.setSkuId(1L);
        item.setQuantity(2);
        dto.setItems(Arrays.asList(item));

        OrderInfo order = orderInfoService.createOrder(dto);
        assertNotNull(order, "订单创建应成功");
        assertNotNull(order.getOrderNo(), "订单号应生成");
        assertEquals(0, order.getOrderStatus(), "订单状态应为待支付");
        assertEquals(0, order.getPayStatus(), "支付状态应为待支付");

        assertEquals(BigDecimal.valueOf(200), order.getTotalAmount(), "订单总金额计算应正确");
        assertEquals(BigDecimal.ZERO, order.getDiscountAmount(), "折扣金额应为0");
        assertEquals(BigDecimal.valueOf(200), order.getPayAmount(), "实付金额应等于总金额");
        assertEquals(1L, order.getTenantId(), "订单租户ID应匹配");
    }

    @Test
    public void testOrderCreationWithCoupon() {
        CreateOrderDTO dto = new CreateOrderDTO();
        dto.setTenantId(1L);
        dto.setUserId(2L);
        dto.setUserName("测试用户");
        dto.setMobile("13800138000");
        dto.setAddress("测试地址");
        dto.setCouponId(1L);

        CreateOrderDTO.OrderItemDTO item = new CreateOrderDTO.OrderItemDTO();
        item.setSkuId(1L);
        item.setQuantity(2);
        dto.setItems(Arrays.asList(item));

        OrderInfo order = orderInfoService.createOrder(dto);
        assertNotNull(order, "订单创建应成功");

        assertEquals(BigDecimal.valueOf(200), order.getTotalAmount(), "订单总金额计算应正确");
        assertEquals(BigDecimal.valueOf(20), order.getDiscountAmount(), "折扣金额应等于卡券面值");
        assertEquals(BigDecimal.valueOf(180), order.getPayAmount(), "实付金额计算应正确");
    }

    @Test
    public void testTransactionRollbackOnStockInsufficient() {
        stockCounter.set(1);

        CreateOrderDTO dto = new CreateOrderDTO();
        dto.setTenantId(1L);
        dto.setUserId(2L);
        dto.setUserName("测试用户");

        CreateOrderDTO.OrderItemDTO item = new CreateOrderDTO.OrderItemDTO();
        item.setSkuId(1L);
        item.setQuantity(10);
        dto.setItems(Arrays.asList(item));

        assertThrows(Exception.class, () -> orderInfoService.createOrder(dto),
                "库存不足时应抛出异常");
    }

    @Test
    public void testMultiItemOrder() {
        CreateOrderDTO dto = new CreateOrderDTO();
        dto.setTenantId(1L);
        dto.setUserId(2L);
        dto.setUserName("测试用户");

        CreateOrderDTO.OrderItemDTO item1 = new CreateOrderDTO.OrderItemDTO();
        item1.setSkuId(1L);
        item1.setQuantity(1);

        CreateOrderDTO.OrderItemDTO item2 = new CreateOrderDTO.OrderItemDTO();
        item2.setSkuId(2L);
        item2.setQuantity(2);

        dto.setItems(Arrays.asList(item1, item2));

        OrderInfo order = orderInfoService.createOrder(dto);
        assertNotNull(order, "多商品订单创建应成功");

        assertEquals(BigDecimal.valueOf(300), order.getTotalAmount(), "多商品订单总金额计算应正确");
        assertEquals(1L, order.getTenantId(), "订单租户ID应匹配");
    }

    @Test
    public void testOrderTenantConsistency() {
        TenantContext.setTenantId(2L);

        CreateOrderDTO dto = new CreateOrderDTO();
        dto.setTenantId(2L);
        dto.setUserId(4L);
        dto.setUserName("租户2用户");

        CreateOrderDTO.OrderItemDTO item = new CreateOrderDTO.OrderItemDTO();
        item.setSkuId(1L);
        item.setQuantity(1);
        dto.setItems(Arrays.asList(item));

        OrderInfo order = orderInfoService.createOrder(dto);
        assertNotNull(order, "订单创建应成功");
        assertEquals(2L, order.getTenantId(), "订单租户ID应匹配");
    }

    @org.junit.jupiter.api.AfterEach
    public void tearDown() {
        TenantContext.clear();
    }
}

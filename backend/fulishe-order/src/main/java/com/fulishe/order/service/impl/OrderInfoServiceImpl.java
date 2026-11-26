package com.fulishe.order.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.exception.BusinessException;
import com.fulishe.common.core.result.ResultCode;
import com.fulishe.common.security.utils.SecurityUtils;
import com.fulishe.coupon.entity.Coupon;
import com.fulishe.order.dto.CreateOrderDTO;
import com.fulishe.order.entity.OrderInfo;
import com.fulishe.order.entity.OrderItem;
import com.fulishe.order.feign.CouponFeignClient;
import com.fulishe.order.feign.ProductFeignClient;
import com.fulishe.order.mapper.OrderInfoMapper;
import com.fulishe.order.mapper.OrderItemMapper;
import com.fulishe.order.service.OrderInfoService;
import com.fulishe.product.entity.PmsSku;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderInfoServiceImpl extends ServiceImpl<OrderInfoMapper, OrderInfo> implements OrderInfoService {

    private final OrderItemMapper orderItemMapper;
    private final ProductFeignClient productFeignClient;
    private final CouponFeignClient couponFeignClient;

    @Override
    public IPage<OrderInfo> page(PageQuery query, Long userId, Integer orderStatus) {
        LambdaQueryWrapper<OrderInfo> wrapper = new LambdaQueryWrapper<OrderInfo>()
                .eq(userId != null, OrderInfo::getUserId, userId)
                .eq(orderStatus != null, OrderInfo::getOrderStatus, orderStatus)
                .orderByDesc(OrderInfo::getId);
        IPage<OrderInfo> page = baseMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), wrapper);
        List<Long> orderIds = page.getRecords().stream().map(OrderInfo::getId).collect(Collectors.toList());
        if (orderIds.isEmpty()) {
            return page;
        }
        List<OrderItem> items = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                .in(OrderItem::getOrderId, orderIds)
                .orderByAsc(OrderItem::getId));
        Map<Long, List<OrderItem>> itemsByOrderId = items.stream().collect(Collectors.groupingBy(OrderItem::getOrderId));
        page.getRecords().forEach(order -> order.setItems(itemsByOrderId.getOrDefault(order.getId(), Collections.emptyList())));
        return page;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderInfo createOrder(CreateOrderDTO dto) {
        Long tenantId;
        try {
            tenantId = SecurityUtils.getTenantId();
        } catch (Exception e) {
            tenantId = dto.getTenantId();
        }
        Long userId = dto.getUserId() != null ? dto.getUserId() : SecurityUtils.getUserId();

        String orderNo = generateOrderNo();
        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal discountAmount = BigDecimal.ZERO;

        List<OrderItem> orderItems = new ArrayList<>();

        for (CreateOrderDTO.OrderItemDTO itemDto : dto.getItems()) {
            var skuResult = productFeignClient.getSkuById(itemDto.getSkuId());
            if (skuResult == null || skuResult.getData() == null) {
                throw new BusinessException(ResultCode.PRODUCT_NOT_FOUND);
            }

            PmsSku sku = skuResult.getData();
            if (sku.getStock() < itemDto.getQuantity()) {
                throw new BusinessException(ResultCode.STOCK_INSUFFICIENT);
            }

            BigDecimal itemTotal = sku.getPrice().multiply(BigDecimal.valueOf(itemDto.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);

            OrderItem orderItem = new OrderItem();
            orderItem.setTenantId(tenantId);
            orderItem.setSkuId(sku.getId());
            orderItem.setSpuId(sku.getSpuId());
            orderItem.setSkuCode(sku.getSkuCode());
            orderItem.setSkuName(sku.getSkuName());
            orderItem.setQuantity(itemDto.getQuantity());
            orderItem.setUnitPrice(sku.getPrice());
            orderItem.setTotalPrice(itemTotal);
            orderItem.setDiscountAmount(BigDecimal.ZERO);
            orderItems.add(orderItem);

            var deductResult = productFeignClient.deductStock(sku.getId(), itemDto.getQuantity());
            if (!deductResult.isSuccess()) {
                throw new BusinessException(ResultCode.STOCK_DEDUCT_FAILED);
            }
        }

        BigDecimal couponAmount = BigDecimal.ZERO;
        if (dto.getCouponId() != null) {
            var couponResult = couponFeignClient.getCouponById(dto.getCouponId());
            if (couponResult == null || couponResult.getData() == null) {
                throw new BusinessException(ResultCode.COUPON_NOT_FOUND);
            }

            Coupon coupon = couponResult.getData();
            if (coupon.getStatus() != 1) {
                throw new BusinessException(ResultCode.COUPON_INVALID);
            }

            if (totalAmount.compareTo(coupon.getMinAmount()) < 0) {
                throw new BusinessException(ResultCode.COUPON_NOT_AVAILABLE);
            }

            couponAmount = coupon.getFaceValue();
            if (couponAmount.compareTo(totalAmount) > 0) {
                couponAmount = totalAmount;
            }

            discountAmount = discountAmount.add(couponAmount);

            var useResult = couponFeignClient.useCoupon(coupon.getId(), orderNo);
            if (!useResult.isSuccess()) {
                throw new BusinessException(ResultCode.COUPON_USE_FAILED);
            }
        }

        BigDecimal payAmount = totalAmount.subtract(discountAmount);

        OrderInfo order = new OrderInfo();
        order.setTenantId(tenantId);
        order.setOrderNo(orderNo);
        order.setUserId(userId);
        order.setUserName(dto.getUserName());
        order.setMobile(dto.getMobile());
        order.setAddress(dto.getAddress());
        order.setOrderType(1);
        order.setOrderStatus(0);
        order.setPayStatus(0);
        order.setTotalAmount(totalAmount);
        order.setDiscountAmount(discountAmount);
        order.setPayAmount(payAmount);
        order.setCreateTime(LocalDateTime.now());
        order.setUpdateTime(LocalDateTime.now());

        baseMapper.insert(order);

        for (OrderItem item : orderItems) {
            item.setOrderId(order.getId());
            item.setOrderNo(orderNo);
            orderItemMapper.insert(item);
        }

        log.info("Order created successfully: {}", orderNo);
        return order;
    }

    private String generateOrderNo() {
        return "FLS" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void paySuccess(String orderNo, String payNo, Integer payMethod) {
        log.info("订单支付成功: orderNo={}, payNo={}, payMethod={}", orderNo, payNo, payMethod);

        OrderInfo order = baseMapper.selectOne(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getOrderNo, orderNo)
                .eq(OrderInfo::getDeleted, 0));

        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_FOUND);
        }

        if (order.getPayStatus() == 1) {
            log.info("订单已支付，忽略重复通知: orderNo={}", orderNo);
            return;
        }

        order.setPayStatus(1);
        order.setPayMethod(String.valueOf(payMethod));
        order.setPayNo(payNo);
        order.setPayTime(LocalDateTime.now());
        order.setOrderStatus(1);
        order.setUpdateTime(LocalDateTime.now());

        baseMapper.updateById(order);
        log.info("订单状态已更新为已支付: orderNo={}", orderNo);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void payFail(String orderNo, String payNo) {
        log.info("订单支付失败: orderNo={}, payNo={}", orderNo, payNo);

        OrderInfo order = baseMapper.selectOne(new LambdaQueryWrapper<OrderInfo>()
                .eq(OrderInfo::getOrderNo, orderNo)
                .eq(OrderInfo::getDeleted, 0));

        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_FOUND);
        }

        if (order.getPayStatus() == 0) {
            order.setPayStatus(2);
            order.setUpdateTime(LocalDateTime.now());
            baseMapper.updateById(order);
            log.info("订单状态已更新为支付失败: orderNo={}", orderNo);
        }
    }
}

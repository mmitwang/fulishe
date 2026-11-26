package com.fulishe.order.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateOrderDTO {

    private Long tenantId;

    private Long userId;

    private String userName;

    private String mobile;

    private String address;

    private Long couponId;

    private List<OrderItemDTO> items;

    @Data
    public static class OrderItemDTO {
        private Long skuId;
        private Integer quantity;
        private BigDecimal unitPrice;
    }
}

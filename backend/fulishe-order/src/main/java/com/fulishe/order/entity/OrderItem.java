package com.fulishe.order.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@Accessors(chain = true)
@TableName("order_item")
public class OrderItem extends BaseEntity<OrderItem> {

    private Long orderId;

    private String orderNo;

    private Long spuId;

    private String spuName;

    private String spuImage;

    private Long skuId;

    private String skuCode;

    private String skuName;

    private Integer quantity;

    private BigDecimal unitPrice;

    private BigDecimal totalPrice;

    private BigDecimal discountAmount;
}

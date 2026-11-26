package com.fulishe.order.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Accessors(chain = true)
@TableName("order_info")
public class OrderInfo extends BaseEntity<OrderInfo> {

    private String orderNo;

    private Long userId;

    private String userName;

    private String mobile;

    private String address;

    private Integer orderType;

    private Integer orderStatus;

    private Integer payStatus;

    private BigDecimal totalAmount;

    private BigDecimal discountAmount;

    private BigDecimal payAmount;

    private String payMethod;

    private String payNo;

    private LocalDateTime payTime;

    private LocalDateTime shipTime;

    private LocalDateTime completeTime;

    private String remark;

    private String cancelReason;

    @TableField(exist = false)
    private List<OrderItem> items;
}

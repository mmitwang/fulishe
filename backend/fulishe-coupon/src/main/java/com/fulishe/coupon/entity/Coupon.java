package com.fulishe.coupon.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@Accessors(chain = true)
@TableName("coupon")
public class Coupon extends BaseEntity<Coupon> {

    private String couponCode;

    private Long templateId;

    private Long batchId;

    private Long userId;

    private Integer status;

    private BigDecimal faceValue;

    private BigDecimal minAmount;

    private BigDecimal discount;

    private String orderNo;

    private LocalDateTime receivedTime;

    private LocalDateTime usedTime;

    private LocalDateTime expireTime;
}

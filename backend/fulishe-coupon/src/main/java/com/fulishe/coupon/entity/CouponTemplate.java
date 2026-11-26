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
@TableName("coupon_template")
public class CouponTemplate extends BaseEntity<CouponTemplate> {

    private String templateCode;

    private String templateName;

    private String description;

    private Integer couponType;

    private BigDecimal faceValue;

    private BigDecimal minAmount;

    private BigDecimal discount;

    private Integer totalCount;

    private Integer perUserLimit;

    private Integer status;

    private Integer sort;

    private LocalDateTime validStartTime;

    private LocalDateTime validEndTime;

    private String applicableScope;

    private String applicableProductIds;

    private String image;
}

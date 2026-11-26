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
@TableName("coupon_batch")
public class CouponBatch extends BaseEntity<CouponBatch> {

    private String batchCode;

    private Long templateId;

    private String templateName;

    private Integer releaseCount;

    private Integer receivedCount;

    private Integer usedCount;

    private Integer status;

    private LocalDateTime releaseTime;

    private LocalDateTime validStartTime;

    private LocalDateTime validEndTime;

    private String remark;
}

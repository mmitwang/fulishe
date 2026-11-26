package com.fulishe.pay.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("refund_record")
public class RefundRecord extends BaseEntity<RefundRecord> {

    private String refundNo;

    private String payNo;

    private String orderNo;

    private Long tenantId;

    private BigDecimal refundAmount;

    private Integer refundStatus;

    private String thirdRefundNo;

    private LocalDateTime refundTime;

    private String refundReason;

    private String remark;
}

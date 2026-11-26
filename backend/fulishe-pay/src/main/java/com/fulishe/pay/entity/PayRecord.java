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
@TableName("pay_record")
public class PayRecord extends BaseEntity<PayRecord> {

    private String payNo;

    private String orderNo;

    private Long userId;

    private Integer payMethod;

    private BigDecimal payAmount;

    private Integer payStatus;

    private String thirdPayNo;

    private LocalDateTime payTime;

    private String notifyData;

    private Integer notifyCount;

    private LocalDateTime notifyTime;

    private String remark;
}

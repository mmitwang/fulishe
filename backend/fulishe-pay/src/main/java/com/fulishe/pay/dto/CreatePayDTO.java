package com.fulishe.pay.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreatePayDTO {

    private String orderNo;

    private Long tenantId;

    private Long userId;

    private Integer payMethod;

    private BigDecimal payAmount;

    private String notifyUrl;

    private String remark;
}

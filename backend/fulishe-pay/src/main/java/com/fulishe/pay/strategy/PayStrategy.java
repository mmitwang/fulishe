package com.fulishe.pay.strategy;

import com.fulishe.pay.dto.CreatePayDTO;
import com.fulishe.pay.entity.PayRecord;

import java.util.Map;

public interface PayStrategy {

    Integer getPayMethod();

    Map<String, Object> createPayment(CreatePayDTO dto, PayRecord payRecord);

    void handleNotify(Map<String, Object> notifyData);

    Map<String, Object> queryPayment(String payNo);

    Map<String, Object> createRefund(String payNo, String refundReason);
}

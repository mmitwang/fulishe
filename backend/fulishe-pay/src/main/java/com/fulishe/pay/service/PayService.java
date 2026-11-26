package com.fulishe.pay.service;

import com.fulishe.pay.dto.CreatePayDTO;
import com.fulishe.pay.entity.PayRecord;

import java.util.Map;

public interface PayService {

    Map<String, Object> createPayment(CreatePayDTO dto);

    void handleNotify(Integer payMethod, Map<String, Object> notifyData);

    Map<String, Object> queryPayment(String payNo);

    Map<String, Object> createRefund(String payNo, String refundReason);

    PayRecord getPayRecordByOrderNo(String orderNo);
}

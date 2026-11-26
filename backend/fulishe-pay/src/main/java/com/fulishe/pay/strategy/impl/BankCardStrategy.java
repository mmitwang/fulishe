package com.fulishe.pay.strategy.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fulishe.pay.dto.CreatePayDTO;
import com.fulishe.pay.entity.PayRecord;
import com.fulishe.pay.enums.PayMethod;
import com.fulishe.pay.enums.PayStatus;
import com.fulishe.pay.feign.OrderFeignClient;
import com.fulishe.pay.mapper.PayRecordMapper;
import com.fulishe.pay.strategy.PayStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class BankCardStrategy implements PayStrategy {

    private final PayRecordMapper payRecordMapper;
    private final OrderFeignClient orderFeignClient;

    @Override
    public Integer getPayMethod() {
        return PayMethod.BANK_CARD.getCode();
    }

    @Override
    public Map<String, Object> createPayment(CreatePayDTO dto, PayRecord payRecord) {
        log.info("银行卡支付下单: orderNo={}, payAmount={}", dto.getOrderNo(), dto.getPayAmount());

        Map<String, Object> result = new HashMap<>();
        result.put("payNo", payRecord.getPayNo());
        result.put("orderNo", dto.getOrderNo());
        result.put("payMethod", PayMethod.BANK_CARD.getCode());
        result.put("bankFormUrl", "https://api.fulishe.com/pay/bank/form/" + payRecord.getPayNo());
        result.put("message", "银行卡支付下单成功");

        return result;
    }

    @Override
    public void handleNotify(Map<String, Object> notifyData) {
        log.info("银行卡支付回调处理: {}", notifyData);

        String payNo = (String) notifyData.get("payNo");
        String payResult = (String) notifyData.get("payResult");

        PayRecord payRecord = payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getPayNo, payNo)
                .eq(PayRecord::getDeleted, 0));
        if (payRecord == null) {
            log.error("支付记录不存在: {}", payNo);
            return;
        }

        if ("SUCCESS".equals(payResult)) {
            if (payRecord.getPayStatus() == PayStatus.SUCCESS.getCode()) {
                log.info("支付记录已处理成功，忽略重复回调: payNo={}", payNo);
                return;
            }

            payRecord.setPayStatus(PayStatus.SUCCESS.getCode());
            payRecord.setPayTime(LocalDateTime.now());
            payRecord.setThirdPayNo((String) notifyData.get("bankTransactionId"));
            payRecord.setNotifyTime(LocalDateTime.now());
            payRecord.setNotifyCount(payRecord.getNotifyCount() + 1);
            payRecordMapper.updateById(payRecord);
            log.info("银行卡支付成功: payNo={}", payNo);

            try {
                orderFeignClient.paySuccess(payRecord.getOrderNo(), payNo, PayMethod.BANK_CARD.getCode());
                log.info("通知订单服务支付成功: orderNo={}", payRecord.getOrderNo());
            } catch (Exception e) {
                log.error("通知订单服务支付成功失败: orderNo={}, error={}", payRecord.getOrderNo(), e.getMessage());
            }
        } else {
            if (payRecord.getPayStatus() == PayStatus.FAILED.getCode()) {
                log.info("支付记录已处理失败，忽略重复回调: payNo={}", payNo);
                return;
            }

            payRecord.setPayStatus(PayStatus.FAILED.getCode());
            payRecord.setNotifyCount(payRecord.getNotifyCount() + 1);
            payRecordMapper.updateById(payRecord);
            log.info("银行卡支付失败: payNo={}, payResult={}", payNo, payResult);

            try {
                orderFeignClient.payFail(payRecord.getOrderNo(), payNo);
                log.info("通知订单服务支付失败: orderNo={}", payRecord.getOrderNo());
            } catch (Exception e) {
                log.error("通知订单服务支付失败失败: orderNo={}, error={}", payRecord.getOrderNo(), e.getMessage());
            }
        }
    }

    @Override
    public Map<String, Object> queryPayment(String payNo) {
        log.info("查询银行卡支付状态: {}", payNo);

        Map<String, Object> result = new HashMap<>();
        PayRecord payRecord = payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getPayNo, payNo)
                .eq(PayRecord::getDeleted, 0));

        if (payRecord != null) {
            result.put("payNo", payNo);
            result.put("payStatus", payRecord.getPayStatus());
            result.put("payStatusDesc", PayStatus.fromCode(payRecord.getPayStatus()).getDescription());
            result.put("payAmount", payRecord.getPayAmount());
            result.put("payTime", payRecord.getPayTime());
        }

        return result;
    }

    @Override
    public Map<String, Object> createRefund(String payNo, String refundReason) {
        log.info("银行卡退款: payNo={}, reason={}", payNo, refundReason);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "银行卡退款申请已提交");
        result.put("refundNo", "REF" + System.currentTimeMillis());

        return result;
    }
}

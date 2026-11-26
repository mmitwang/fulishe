package com.fulishe.pay.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fulishe.common.core.exception.BusinessException;
import com.fulishe.common.core.result.ResultCode;
import com.fulishe.pay.dto.CreatePayDTO;
import com.fulishe.pay.entity.PayRecord;
import com.fulishe.pay.enums.PayStatus;
import com.fulishe.pay.mapper.PayRecordMapper;
import com.fulishe.pay.service.PayService;
import com.fulishe.pay.strategy.PayStrategy;
import com.fulishe.pay.strategy.PayStrategyFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayServiceImpl implements PayService {

    private final PayRecordMapper payRecordMapper;
    private final PayStrategyFactory strategyFactory;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createPayment(CreatePayDTO dto) {
        String payNo = generatePayNo();

        PayRecord existingRecord = getPayRecordByOrderNo(dto.getOrderNo());
        if (existingRecord != null && existingRecord.getPayStatus() == PayStatus.PENDING.getCode()) {
            payNo = existingRecord.getPayNo();
            log.info("订单已存在待支付记录，复用支付单号: {}", payNo);
        } else if (existingRecord != null && existingRecord.getPayStatus() == PayStatus.SUCCESS.getCode()) {
            throw new BusinessException(ResultCode.ORDER_PAY_ERROR.getCode(), "订单已支付");
        }

        PayRecord payRecord = new PayRecord();
        payRecord.setPayNo(payNo);
        payRecord.setOrderNo(dto.getOrderNo());
        payRecord.setTenantId(dto.getTenantId());
        payRecord.setUserId(dto.getUserId());
        payRecord.setPayMethod(dto.getPayMethod());
        payRecord.setPayAmount(dto.getPayAmount());
        payRecord.setPayStatus(PayStatus.PENDING.getCode());
        payRecord.setNotifyCount(0);
        payRecord.setCreateTime(LocalDateTime.now());
        payRecord.setUpdateTime(LocalDateTime.now());

        payRecordMapper.insert(payRecord);
        log.info("创建支付记录: payNo={}, orderNo={}", payNo, dto.getOrderNo());

        PayStrategy strategy = strategyFactory.getStrategy(dto.getPayMethod());
        return strategy.createPayment(dto, payRecord);
    }

    @Override
    public void handleNotify(Integer payMethod, Map<String, Object> notifyData) {
        PayStrategy strategy = strategyFactory.getStrategy(payMethod);
        strategy.handleNotify(notifyData);
    }

    @Override
    public Map<String, Object> queryPayment(String payNo) {
        PayRecord payRecord = payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getPayNo, payNo)
                .eq(PayRecord::getDeleted, 0));
        if (payRecord == null) {
            throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "支付记录不存在");
        }

        PayStrategy strategy = strategyFactory.getStrategy(payRecord.getPayMethod());
        return strategy.queryPayment(payNo);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createRefund(String payNo, String refundReason) {
        PayRecord payRecord = payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getPayNo, payNo)
                .eq(PayRecord::getDeleted, 0));
        if (payRecord == null) {
            throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "支付记录不存在");
        }

        if (payRecord.getPayStatus() != PayStatus.SUCCESS.getCode()) {
            throw new BusinessException(ResultCode.ORDER_PAY_ERROR.getCode(), "订单未支付成功，无法退款");
        }

        PayStrategy strategy = strategyFactory.getStrategy(payRecord.getPayMethod());
        Map<String, Object> result = strategy.createRefund(payNo, refundReason);

        payRecord.setPayStatus(PayStatus.REFUNDED.getCode());
        payRecordMapper.updateById(payRecord);
        log.info("支付记录已更新为已退款: payNo={}", payNo);

        return result;
    }

    @Override
    public PayRecord getPayRecordByOrderNo(String orderNo) {
        return payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getOrderNo, orderNo)
                .eq(PayRecord::getDeleted, 0)
                .orderByDesc(PayRecord::getCreateTime)
                .last("LIMIT 1"));
    }

    private String generatePayNo() {
        return "PAY" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }
}

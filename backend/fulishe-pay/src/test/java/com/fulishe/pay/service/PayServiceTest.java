package com.fulishe.pay.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fulishe.common.core.result.ResultCode;
import com.fulishe.common.core.result.R;
import com.fulishe.common.core.utils.TenantContext;
import com.fulishe.pay.PayApplication;
import com.fulishe.pay.dto.CreatePayDTO;
import com.fulishe.pay.entity.PayRecord;
import com.fulishe.pay.enums.PayMethod;
import com.fulishe.pay.enums.PayStatus;
import com.fulishe.pay.feign.OrderFeignClient;
import com.fulishe.pay.mapper.PayRecordMapper;
import com.fulishe.pay.strategy.impl.WechatPayStrategy;
import com.fulishe.pay.strategy.impl.AlipayStrategy;
import com.fulishe.pay.strategy.impl.BankCardStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

@SpringBootTest(classes = PayApplication.class)
@ActiveProfiles("test")
class PayServiceTest {

    @Autowired
    private PayService payService;

    @Autowired
    private PayRecordMapper payRecordMapper;

    @Autowired
    private WechatPayStrategy wechatPayStrategy;

    @Autowired
    private AlipayStrategy alipayStrategy;

    @Autowired
    private BankCardStrategy bankCardStrategy;

    @MockBean
    private OrderFeignClient orderFeignClient;

    private CreatePayDTO createPayDTO;

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(1L);
        createPayDTO = new CreatePayDTO();
        createPayDTO.setOrderNo("TEST" + System.currentTimeMillis());
        createPayDTO.setTenantId(1L);
        createPayDTO.setUserId(1L);
        createPayDTO.setPayAmount(new BigDecimal("100.00"));

        when(orderFeignClient.paySuccess(any(), any(), anyInt())).thenReturn(R.ok());
        when(orderFeignClient.payFail(any(), any())).thenReturn(R.ok());
    }

    @Test
    @DisplayName("微信支付创建测试")
    void testCreateWechatPayment() {
        createPayDTO.setPayMethod(PayMethod.WECHAT.getCode());

        Map<String, Object> result = payService.createPayment(createPayDTO);

        assertNotNull(result);
        assertEquals(createPayDTO.getOrderNo(), result.get("orderNo"));
        assertEquals(PayMethod.WECHAT.getCode(), result.get("payMethod"));
        assertNotNull(result.get("payNo"));

        PayRecord payRecord = payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getOrderNo, createPayDTO.getOrderNo())
                .eq(PayRecord::getDeleted, 0));
        assertNotNull(payRecord);
        assertEquals(PayStatus.PENDING.getCode(), payRecord.getPayStatus());
        assertEquals(PayMethod.WECHAT.getCode(), payRecord.getPayMethod());
    }

    @Test
    @DisplayName("支付宝支付创建测试")
    void testCreateAlipayPayment() {
        createPayDTO.setPayMethod(PayMethod.ALIPAY.getCode());

        Map<String, Object> result = payService.createPayment(createPayDTO);

        assertNotNull(result);
        assertEquals(createPayDTO.getOrderNo(), result.get("orderNo"));
        assertEquals(PayMethod.ALIPAY.getCode(), result.get("payMethod"));
        assertNotNull(result.get("payNo"));
    }

    @Test
    @DisplayName("银行卡支付创建测试")
    void testCreateBankCardPayment() {
        createPayDTO.setPayMethod(PayMethod.BANK_CARD.getCode());

        Map<String, Object> result = payService.createPayment(createPayDTO);

        assertNotNull(result);
        assertEquals(createPayDTO.getOrderNo(), result.get("orderNo"));
        assertEquals(PayMethod.BANK_CARD.getCode(), result.get("payMethod"));
        assertNotNull(result.get("payNo"));
    }

    @Test
    @DisplayName("微信支付成功回调测试")
    void testWechatPaySuccessNotify() {
        createPayDTO.setPayMethod(PayMethod.WECHAT.getCode());
        Map<String, Object> payResult = payService.createPayment(createPayDTO);
        String payNo = (String) payResult.get("payNo");

        Map<String, Object> notifyData = new HashMap<>();
        notifyData.put("payNo", payNo);
        notifyData.put("tradeState", "SUCCESS");
        notifyData.put("transactionId", "TRANS" + System.currentTimeMillis());

        wechatPayStrategy.handleNotify(notifyData);

        PayRecord payRecord = payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getPayNo, payNo)
                .eq(PayRecord::getDeleted, 0));
        assertNotNull(payRecord);
        assertEquals(PayStatus.SUCCESS.getCode(), payRecord.getPayStatus());
        assertEquals(1, payRecord.getNotifyCount());
        assertNotNull(payRecord.getPayTime());
    }

    @Test
    @DisplayName("微信支付成功回调幂等性测试")
    void testWechatPaySuccessNotifyIdempotent() {
        createPayDTO.setPayMethod(PayMethod.WECHAT.getCode());
        Map<String, Object> payResult = payService.createPayment(createPayDTO);
        String payNo = (String) payResult.get("payNo");

        Map<String, Object> notifyData = new HashMap<>();
        notifyData.put("payNo", payNo);
        notifyData.put("tradeState", "SUCCESS");
        notifyData.put("transactionId", "TRANS" + System.currentTimeMillis());

        wechatPayStrategy.handleNotify(notifyData);
        wechatPayStrategy.handleNotify(notifyData);

        PayRecord payRecord = payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getPayNo, payNo)
                .eq(PayRecord::getDeleted, 0));
        assertEquals(1, payRecord.getNotifyCount());
    }

    @Test
    @DisplayName("微信支付失败回调测试")
    void testWechatPayFailNotify() {
        createPayDTO.setPayMethod(PayMethod.WECHAT.getCode());
        Map<String, Object> payResult = payService.createPayment(createPayDTO);
        String payNo = (String) payResult.get("payNo");

        Map<String, Object> notifyData = new HashMap<>();
        notifyData.put("payNo", payNo);
        notifyData.put("tradeState", "FAIL");

        wechatPayStrategy.handleNotify(notifyData);

        PayRecord payRecord = payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getPayNo, payNo)
                .eq(PayRecord::getDeleted, 0));
        assertEquals(PayStatus.FAILED.getCode(), payRecord.getPayStatus());
    }

    @Test
    @DisplayName("支付宝支付成功回调测试")
    void testAlipayPaySuccessNotify() {
        createPayDTO.setPayMethod(PayMethod.ALIPAY.getCode());
        Map<String, Object> payResult = payService.createPayment(createPayDTO);
        String payNo = (String) payResult.get("payNo");

        Map<String, Object> notifyData = new HashMap<>();
        notifyData.put("out_trade_no", payNo);
        notifyData.put("trade_status", "TRADE_SUCCESS");
        notifyData.put("trade_no", "ALIPAY" + System.currentTimeMillis());

        alipayStrategy.handleNotify(notifyData);

        PayRecord payRecord = payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getPayNo, payNo)
                .eq(PayRecord::getDeleted, 0));
        assertEquals(PayStatus.SUCCESS.getCode(), payRecord.getPayStatus());
    }

    @Test
    @DisplayName("银行卡支付成功回调测试")
    void testBankCardPaySuccessNotify() {
        createPayDTO.setPayMethod(PayMethod.BANK_CARD.getCode());
        Map<String, Object> payResult = payService.createPayment(createPayDTO);
        String payNo = (String) payResult.get("payNo");

        Map<String, Object> notifyData = new HashMap<>();
        notifyData.put("payNo", payNo);
        notifyData.put("payResult", "SUCCESS");
        notifyData.put("bankTransactionId", "BANK" + System.currentTimeMillis());

        bankCardStrategy.handleNotify(notifyData);

        PayRecord payRecord = payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getPayNo, payNo)
                .eq(PayRecord::getDeleted, 0));
        assertEquals(PayStatus.SUCCESS.getCode(), payRecord.getPayStatus());
    }

    @Test
    @DisplayName("查询支付状态测试")
    void testQueryPayment() {
        createPayDTO.setPayMethod(PayMethod.WECHAT.getCode());
        Map<String, Object> payResult = payService.createPayment(createPayDTO);
        String payNo = (String) payResult.get("payNo");

        Map<String, Object> queryResult = payService.queryPayment(payNo);

        assertNotNull(queryResult);
        assertEquals(payNo, queryResult.get("payNo"));
        assertEquals(PayStatus.PENDING.getCode(), queryResult.get("payStatus"));
    }

    @Test
    @DisplayName("退款测试")
    void testCreateRefund() {
        createPayDTO.setPayMethod(PayMethod.WECHAT.getCode());
        Map<String, Object> payResult = payService.createPayment(createPayDTO);
        String payNo = (String) payResult.get("payNo");

        Map<String, Object> notifyData = new HashMap<>();
        notifyData.put("payNo", payNo);
        notifyData.put("tradeState", "SUCCESS");
        notifyData.put("transactionId", "TRANS" + System.currentTimeMillis());
        wechatPayStrategy.handleNotify(notifyData);

        Map<String, Object> refundResult = payService.createRefund(payNo, "用户申请退款");

        assertNotNull(refundResult);
        assertTrue((Boolean) refundResult.get("success"));
        assertNotNull(refundResult.get("refundNo"));

        PayRecord payRecord = payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getPayNo, payNo)
                .eq(PayRecord::getDeleted, 0));
        assertEquals(PayStatus.REFUNDED.getCode(), payRecord.getPayStatus());
    }

    @Test
    @DisplayName("重复支付测试")
    void testDuplicatePayment() {
        createPayDTO.setPayMethod(PayMethod.WECHAT.getCode());
        String orderNo = createPayDTO.getOrderNo();

        payService.createPayment(createPayDTO);

        PayRecord firstRecord = payRecordMapper.selectOne(new LambdaQueryWrapper<PayRecord>()
                .eq(PayRecord::getOrderNo, orderNo)
                .eq(PayRecord::getDeleted, 0));
        assertNotNull(firstRecord);

        Map<String, Object> secondResult = payService.createPayment(createPayDTO);
        assertEquals(firstRecord.getPayNo(), secondResult.get("payNo"));
    }
}
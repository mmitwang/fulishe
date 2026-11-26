package com.fulishe.pay.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.pay.dto.CreatePayDTO;
import com.fulishe.pay.entity.PayRecord;
import com.fulishe.pay.enums.PayMethod;
import com.fulishe.pay.mapper.PayRecordMapper;
import com.fulishe.pay.service.PayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/pay")
@RequiredArgsConstructor
public class PayController {

    private final PayService payService;
    private final PayRecordMapper payRecordMapper;

    @GetMapping("/record/page")
    public R<PageResult<PayRecord>> recordPage(PageQuery query) {
        IPage<PayRecord> page = payRecordMapper.selectPage(
                new Page<>(query.getPageNum(), query.getPageSize()),
                new LambdaQueryWrapper<PayRecord>().orderByDesc(PayRecord::getCreateTime));
        return R.ok(PageResult.of(page));
    }

    @PostMapping("/create")
    public R<Map<String, Object>> createPayment(@RequestBody CreatePayDTO dto) {
        log.info("创建支付请求: orderNo={}, payMethod={}, payAmount={}", 
                dto.getOrderNo(), dto.getPayMethod(), dto.getPayAmount());
        
        Map<String, Object> result = payService.createPayment(dto);
        return R.ok(result);
    }

    @GetMapping("/query")
    public R<Map<String, Object>> queryPayment(@RequestParam String payNo) {
        log.info("查询支付状态: payNo={}", payNo);
        
        Map<String, Object> result = payService.queryPayment(payNo);
        return R.ok(result);
    }

    @PostMapping("/refund")
    public R<Map<String, Object>> createRefund(@RequestParam String payNo, 
                                               @RequestParam(required = false) String refundReason) {
        log.info("退款请求: payNo={}, reason={}", payNo, refundReason);
        
        Map<String, Object> result = payService.createRefund(payNo, refundReason);
        return R.ok(result);
    }

    @PostMapping("/wechat/notify")
    public String wechatNotify(@RequestBody Map<String, Object> notifyData) {
        log.info("微信支付回调: {}", notifyData);
        
        payService.handleNotify(PayMethod.WECHAT.getCode(), notifyData);
        
        Map<String, Object> response = new HashMap<>();
        response.put("return_code", "SUCCESS");
        response.put("return_msg", "OK");
        return "<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>";
    }

    @PostMapping("/alipay/notify")
    public String alipayNotify(@RequestParam Map<String, String> notifyData) {
        log.info("支付宝回调: {}", notifyData);
        
        Map<String, Object> data = new HashMap<>(notifyData);
        payService.handleNotify(PayMethod.ALIPAY.getCode(), data);
        
        return "success";
    }

    @PostMapping("/bank/notify")
    public R<Void> bankNotify(@RequestBody Map<String, Object> notifyData) {
        log.info("银行卡支付回调: {}", notifyData);
        
        payService.handleNotify(PayMethod.BANK_CARD.getCode(), notifyData);
        
        return R.ok();
    }
}

package com.fulishe.pay.feign;

import com.fulishe.common.core.result.R;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "fulishe-order", url = "${fulishe.services.order-url:}")
public interface OrderFeignClient {

    @PostMapping("/order/info/pay-success")
    R<Void> paySuccess(@RequestParam("orderNo") String orderNo,
                       @RequestParam("payNo") String payNo,
                       @RequestParam("payMethod") Integer payMethod);

    @PostMapping("/order/info/pay-fail")
    R<Void> payFail(@RequestParam("orderNo") String orderNo,
                    @RequestParam("payNo") String payNo);
}

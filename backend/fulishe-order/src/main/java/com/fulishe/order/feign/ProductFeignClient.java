package com.fulishe.order.feign;

import com.fulishe.common.core.result.R;
import com.fulishe.product.entity.PmsSku;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "fulishe-product", url = "${fulishe.services.product-url:}")
public interface ProductFeignClient {

    @GetMapping("/product/sku/{id}")
    R<PmsSku> getSkuById(@PathVariable("id") Long id);

    @PostMapping("/product/sku/deduct-stock")
    R<Void> deductStock(@RequestParam("skuId") Long skuId, @RequestParam("quantity") Integer quantity);

    @PostMapping("/product/sku/restore-stock")
    R<Void> restoreStock(@RequestParam("skuId") Long skuId, @RequestParam("quantity") Integer quantity);
}

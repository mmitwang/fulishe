package com.fulishe.order.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.common.core.result.PageResult;
import com.fulishe.common.core.result.R;
import com.fulishe.order.dto.CreateOrderDTO;
import com.fulishe.order.entity.OrderInfo;
import com.fulishe.order.service.OrderInfoService;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

@RestController
@RequestMapping("/order/info")
public class OrderInfoController {

    @Resource
    private OrderInfoService orderInfoService;

    @GetMapping("/page")
    public R<PageResult<OrderInfo>> page(PageQuery query,
                                         @RequestParam(required = false) Long userId,
                                         @RequestParam(required = false) Integer orderStatus) {
        IPage<OrderInfo> page = orderInfoService.page(query, userId, orderStatus);
        return R.ok(PageResult.of(page));
    }

    @GetMapping("/{id}")
    public R<OrderInfo> getById(@PathVariable Long id) {
        return R.ok(orderInfoService.getById(id));
    }

    @PostMapping
    public R<Void> save(@RequestBody OrderInfo order) {
        orderInfoService.save(order);
        return R.ok();
    }

    @PostMapping("/create")
    public R<OrderInfo> createOrder(@RequestBody CreateOrderDTO dto) {
        OrderInfo order = orderInfoService.createOrder(dto);
        return R.ok(order);
    }

    @PutMapping
    public R<Void> update(@RequestBody OrderInfo order) {
        orderInfoService.updateById(order);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        orderInfoService.removeById(id);
        return R.ok();
    }

    @PostMapping("/pay-success")
    public R<Void> paySuccess(@RequestParam String orderNo,
                              @RequestParam String payNo,
                              @RequestParam Integer payMethod) {
        orderInfoService.paySuccess(orderNo, payNo, payMethod);
        return R.ok();
    }

    @PostMapping("/pay-fail")
    public R<Void> payFail(@RequestParam String orderNo,
                           @RequestParam String payNo) {
        orderInfoService.payFail(orderNo, payNo);
        return R.ok();
    }
}

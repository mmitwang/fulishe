package com.fulishe.order.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.order.dto.CreateOrderDTO;
import com.fulishe.order.entity.OrderInfo;

public interface OrderInfoService extends IService<OrderInfo> {

    IPage<OrderInfo> page(PageQuery query, Long userId, Integer orderStatus);

    OrderInfo createOrder(CreateOrderDTO dto);

    void paySuccess(String orderNo, String payNo, Integer payMethod);

    void payFail(String orderNo, String payNo);
}

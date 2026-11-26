package com.fulishe.common.core.result;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ResultCode {

    SUCCESS(200, "操作成功"),
    FAIL(500, "操作失败"),
    PARAM_ERROR(400, "参数错误"),
    UNAUTHORIZED(401, "未登录或token过期"),
    FORBIDDEN(403, "没有相关权限"),
    NOT_FOUND(404, "数据不存在"),

    USER_NOT_FOUND(1001, "用户不存在"),
    USER_PASSWORD_ERROR(1002, "密码错误"),
    USER_DISABLED(1003, "用户已被禁用"),
    USER_EXIST(1004, "用户已存在"),

    TOKEN_INVALID(1101, "token无效"),
    TOKEN_EXPIRED(1102, "token已过期"),

    COUPON_NOT_FOUND(2001, "卡券不存在"),
    COUPON_INVALID(2002, "卡券无效"),
    COUPON_USED(2003, "卡券已使用"),
    COUPON_EXPIRED(2004, "卡券已过期"),
    COUPON_NOT_AVAILABLE(2005, "卡券不可用"),
    COUPON_USE_FAILED(2006, "卡券核销失败"),
    COUPON_INSUFFICIENT_BALANCE(2007, "卡券余额不足"),

    PRODUCT_NOT_FOUND(3001, "商品不存在"),
    PRODUCT_OFF_SHELF(3002, "商品已下架"),
    STOCK_INSUFFICIENT(3003, "库存不足"),
    STOCK_DEDUCT_FAILED(3004, "库存扣减失败"),

    ORDER_NOT_FOUND(4001, "订单不存在"),
    ORDER_STATUS_ERROR(4002, "订单状态错误"),
    ORDER_PAY_ERROR(4003, "订单支付失败"),

    ACCOUNT_BALANCE_INSUFFICIENT(5001, "账户余额不足"),
    ACCOUNT_FROZEN(5002, "账户已冻结");

    private final int code;
    private final String msg;
}

package com.fulishe.pay.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum PayMethod {

    WECHAT(1, "微信支付"),
    ALIPAY(2, "支付宝"),
    BANK_CARD(3, "银行卡");

    private final Integer code;
    private final String description;

    public static PayMethod fromCode(Integer code) {
        for (PayMethod method : values()) {
            if (method.getCode().equals(code)) {
                return method;
            }
        }
        throw new IllegalArgumentException("未知支付方式: " + code);
    }
}

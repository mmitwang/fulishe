package com.fulishe.pay.strategy;

import com.fulishe.common.core.exception.BusinessException;
import com.fulishe.common.core.result.ResultCode;
import com.fulishe.pay.enums.PayMethod;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class PayStrategyFactory {

    private final List<PayStrategy> strategies;
    private final Map<Integer, PayStrategy> strategyMap = new HashMap<>();

    public PayStrategyFactory(List<PayStrategy> strategies) {
        this.strategies = strategies;
    }

    @PostConstruct
    public void init() {
        for (PayStrategy strategy : strategies) {
            strategyMap.put(strategy.getPayMethod(), strategy);
            log.info("注册支付策略: {}", PayMethod.fromCode(strategy.getPayMethod()).getDescription());
        }
    }

    public PayStrategy getStrategy(Integer payMethod) {
        PayStrategy strategy = strategyMap.get(payMethod);
        if (strategy == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), "不支持的支付方式: " + payMethod);
        }
        return strategy;
    }
}

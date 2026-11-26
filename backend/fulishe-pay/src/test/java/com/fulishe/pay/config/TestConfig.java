package com.fulishe.pay.config;

import com.fulishe.pay.feign.OrderFeignClient;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;

@TestConfiguration
public class TestConfig {

    @MockBean
    private OrderFeignClient orderFeignClient;
}
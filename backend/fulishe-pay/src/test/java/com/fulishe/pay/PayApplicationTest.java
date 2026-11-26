package com.fulishe.pay;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;

@SpringBootApplication(exclude = {RedisAutoConfiguration.class})
@Import(PayApplication.class)
public class PayApplicationTest {

    public static void main(String[] args) {
        SpringApplication.run(PayApplicationTest.class, args);
    }
}
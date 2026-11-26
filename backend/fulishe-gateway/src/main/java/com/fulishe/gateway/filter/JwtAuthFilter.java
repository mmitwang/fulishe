package com.fulishe.gateway.filter;

import com.alibaba.fastjson.JSON;
import com.fulishe.common.core.result.R;
import com.fulishe.common.core.result.ResultCode;
import com.fulishe.common.security.service.TokenService;
import com.fulishe.common.security.utils.JwtUtils;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter implements GlobalFilter, Ordered {

    private final JwtUtils jwtUtils;
    private final TokenService tokenService;

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String TENANT_ID_HEADER = "X-Tenant-Id";
    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String USERNAME_HEADER = "X-Username";

    private static final List<String> WHITE_LIST = List.of(
            "/api/user/auth/login",
            "/api/user/auth/register",
            "/api/user/auth/captcha",
            "/api/pay/notify/**",
            "/actuator/**",
            "/swagger-ui/**",
            "/v3/api-docs/**",
            "/doc.html"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();

        if (isWhiteList(path)) {
            return chain.filter(exchange);
        }

        String token = extractToken(request);
        if (!StringUtils.hasText(token)) {
            return handleUnauthorized(exchange);
        }

        try {
            Claims claims = jwtUtils.parseToken(token);
            
            if (tokenService.isTokenInvalidated(token)) {
                log.warn("Token has been invalidated");
                return handleUnauthorized(exchange);
            }

            Long userId = claims.get("userId", Long.class);
            Long tenantId = claims.get("tenantId", Long.class);
            String username = claims.getSubject();

            ServerHttpRequest modifiedRequest = request.mutate()
                    .header(USER_ID_HEADER, String.valueOf(userId))
                    .header(TENANT_ID_HEADER, String.valueOf(tenantId))
                    .header(USERNAME_HEADER, username)
                    .build();

            return chain.filter(exchange.mutate().request(modifiedRequest).build());
        } catch (Exception e) {
            log.error("JWT token validation failed: {}", e.getMessage());
            return handleUnauthorized(exchange);
        }
    }

    private boolean isWhiteList(String path) {
        return WHITE_LIST.stream().anyMatch(path::startsWith);
    }

    private String extractToken(ServerHttpRequest request) {
        String authHeader = request.getHeaders().getFirst(AUTHORIZATION_HEADER);
        if (StringUtils.hasText(authHeader) && authHeader.startsWith(BEARER_PREFIX)) {
            return authHeader.substring(BEARER_PREFIX.length());
        }
        return null;
    }

    private Mono<Void> handleUnauthorized(ServerWebExchange exchange) {
        R<Void> response = R.fail(ResultCode.UNAUTHORIZED);
        byte[] responseBytes = JSON.toJSONString(response).getBytes(StandardCharsets.UTF_8);

        return exchange.getResponse().writeWith(
                Mono.just(exchange.getResponse().bufferFactory().wrap(responseBytes))
        ).doOnSubscribe(subscription -> {
            exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        });
    }

    @Override
    public int getOrder() {
        return -100;
    }
}

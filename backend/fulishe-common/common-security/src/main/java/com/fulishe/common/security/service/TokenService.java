package com.fulishe.common.security.service;

import com.fulishe.common.security.utils.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "fulishe.token-store", havingValue = "redis", matchIfMissing = true)
public class TokenService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final JwtUtils jwtUtils;

    private static final String LOGIN_TOKEN_KEY = "fulishe:login:token:";
    private static final String LOGOUT_TOKEN_KEY = "fulishe:logout:token:";

    public void saveToken(String token, Long userId, Long tenantId, String username) {
        String key = LOGIN_TOKEN_KEY + userId;
        redisTemplate.opsForValue().set(key, token, jwtUtils.getExpireTime(), TimeUnit.SECONDS);
        log.info("Token saved for user: {}", userId);
    }

    public String getToken(Long userId) {
        String key = LOGIN_TOKEN_KEY + userId;
        return (String) redisTemplate.opsForValue().get(key);
    }

    public void removeToken(Long userId) {
        String key = LOGIN_TOKEN_KEY + userId;
        redisTemplate.delete(key);
        log.info("Token removed for user: {}", userId);
    }

    public void invalidateToken(String token) {
        String key = LOGOUT_TOKEN_KEY + token;
        redisTemplate.opsForValue().set(key, "1", jwtUtils.getExpireTime(), TimeUnit.SECONDS);
        log.info("Token invalidated");
    }

    public boolean isTokenInvalidated(String token) {
        String key = LOGOUT_TOKEN_KEY + token;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    public boolean isTokenExist(Long userId) {
        String key = LOGIN_TOKEN_KEY + userId;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    public long getTokenRemainingTime(Long userId) {
        String key = LOGIN_TOKEN_KEY + userId;
        return redisTemplate.getExpire(key, TimeUnit.SECONDS);
    }
}

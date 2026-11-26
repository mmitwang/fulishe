package com.fulishe.common.security.service;

import com.fulishe.common.security.utils.JwtUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 无 Redis 环境下的进程内 Token 存储（本地最小可运行方案）。
 * 通过 fulishe.token-store=local 启用，默认仍走 Redis。
 * 取舍：多实例部署时 token 无法共享，仅用于本地联调。
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "fulishe.token-store", havingValue = "local")
public class LocalTokenService extends TokenService {

    private static final String LOGIN_TOKEN_KEY = "fulishe:login:token:";
    private static final String LOGOUT_TOKEN_KEY = "fulishe:logout:token:";

    private final Map<String, String> store = new ConcurrentHashMap<>();
    private final Map<String, Long> expireAt = new ConcurrentHashMap<>();
    private final JwtUtils jwtUtils;

    public LocalTokenService(ObjectProvider<RedisTemplate<String, Object>> redisTemplateProvider, JwtUtils jwtUtils) {
        super(redisTemplateProvider.getIfAvailable(), jwtUtils);
        this.jwtUtils = jwtUtils;
        log.warn("TokenService 使用进程内存储（fulishe.token-store=local），仅适用于本地联调");
    }

    @Override
    public void saveToken(String token, Long userId, Long tenantId, String username) {
        put(LOGIN_TOKEN_KEY + userId, token, jwtUtils.getExpireTime());
    }

    @Override
    public String getToken(Long userId) {
        return get(LOGIN_TOKEN_KEY + userId);
    }

    @Override
    public void removeToken(Long userId) {
        store.remove(LOGIN_TOKEN_KEY + userId);
        expireAt.remove(LOGIN_TOKEN_KEY + userId);
    }

    @Override
    public void invalidateToken(String token) {
        put(LOGOUT_TOKEN_KEY + token, "1", jwtUtils.getExpireTime());
    }

    @Override
    public boolean isTokenInvalidated(String token) {
        return store.containsKey(LOGOUT_TOKEN_KEY + token);
    }

    @Override
    public boolean isTokenExist(Long userId) {
        return get(LOGIN_TOKEN_KEY + userId) != null;
    }

    @Override
    public long getTokenRemainingTime(Long userId) {
        Long expire = expireAt.get(LOGIN_TOKEN_KEY + userId);
        return expire == null ? -1 : Math.max(0, (expire - System.currentTimeMillis()) / 1000);
    }

    private void put(String key, String value, long ttlSeconds) {
        store.put(key, value);
        expireAt.put(key, System.currentTimeMillis() + ttlSeconds * 1000);
    }

    private String get(String key) {
        Long expire = expireAt.get(key);
        if (expire != null && expire < System.currentTimeMillis()) {
            store.remove(key);
            expireAt.remove(key);
            return null;
        }
        return store.get(key);
    }
}

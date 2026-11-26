package com.fulishe.common.security.utils;

import com.fulishe.common.core.exception.BusinessException;
import com.fulishe.common.core.result.ResultCode;
import com.fulishe.common.security.model.LoginUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public class SecurityUtils {

    public static final String TENANT_ID_HEADER = "X-Tenant-Id";
    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String USERNAME_HEADER = "X-Username";

    public static LoginUser getLoginUser() {
        HttpServletRequest request = getRequest();
        if (request == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }

        LoginUser loginUser = new LoginUser();
        loginUser.setUserId(getUserId());
        loginUser.setTenantId(getTenantId());
        loginUser.setUsername(getUsername());

        return loginUser;
    }

    public static Long getUserId() {
        String userId = getHeader(USER_ID_HEADER);
        return userId != null ? Long.parseLong(userId) : null;
    }

    public static Long getTenantId() {
        String tenantId = getHeader(TENANT_ID_HEADER);
        return tenantId != null ? Long.parseLong(tenantId) : null;
    }

    public static String getUsername() {
        return getHeader(USERNAME_HEADER);
    }

    private static String getHeader(String headerName) {
        HttpServletRequest request = getRequest();
        if (request == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        String header = request.getHeader(headerName);
        if (header == null || header.trim().isEmpty()) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return header;
    }

    private static HttpServletRequest getRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getRequest() : null;
    }
}

package com.fulishe.common.mybatis.config;

import com.baomidou.mybatisplus.extension.plugins.handler.TenantLineHandler;
import com.fulishe.common.core.utils.TenantContext;
import com.fulishe.common.security.utils.SecurityUtils;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.expression.LongValue;

public class TenantLineHandlerImpl implements TenantLineHandler {

    private static final String TENANT_ID_COLUMN = "tenant_id";

    @Override
    public Expression getTenantId() {
        try {
            Long tenantId = TenantContext.getTenantId();
            if (tenantId != null) {
                return new LongValue(tenantId);
            }
            tenantId = SecurityUtils.getTenantId();
            return new LongValue(tenantId != null ? tenantId : 0L);
        } catch (Exception e) {
            return new LongValue(0L);
        }
    }

    @Override
    public String getTenantIdColumn() {
        return TENANT_ID_COLUMN;
    }

    @Override
    public boolean ignoreTable(String tableName) {
        return false;
    }
}

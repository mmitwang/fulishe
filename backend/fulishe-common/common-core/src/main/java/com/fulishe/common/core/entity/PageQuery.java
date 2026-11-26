package com.fulishe.common.core.entity;

import lombok.Data;

@Data
public class PageQuery {

    private Long current = 1L;

    private Long size = 10L;

    public Long getPageNum() {
        return current;
    }

    public Long getPageSize() {
        return size;
    }
}

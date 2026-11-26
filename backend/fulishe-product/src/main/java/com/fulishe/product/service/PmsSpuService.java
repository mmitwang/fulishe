package com.fulishe.product.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.product.entity.PmsSpu;

public interface PmsSpuService extends IService<PmsSpu> {

    IPage<PmsSpu> page(PageQuery query, Long categoryId, String spuName);
}

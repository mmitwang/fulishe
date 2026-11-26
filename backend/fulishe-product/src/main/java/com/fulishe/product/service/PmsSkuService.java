package com.fulishe.product.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.product.entity.PmsSku;

import java.util.List;

public interface PmsSkuService extends IService<PmsSku> {

    IPage<PmsSku> page(PageQuery query);

    List<PmsSku> listBySpuId(Long spuId);

    boolean deductStock(Long skuId, Integer quantity);

    boolean restoreStock(Long skuId, Integer quantity);
}

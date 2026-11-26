package com.fulishe.product.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.product.entity.PmsBrand;

public interface PmsBrandService extends IService<PmsBrand> {

    IPage<PmsBrand> page(PageQuery query);
}

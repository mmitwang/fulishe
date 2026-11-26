package com.fulishe.product.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.product.entity.PmsCategory;

import java.util.List;

public interface PmsCategoryService extends IService<PmsCategory> {

    IPage<PmsCategory> page(PageQuery query);

    List<PmsCategory> tree();
}

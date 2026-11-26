package com.fulishe.coupon.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.coupon.entity.CouponBatch;
import com.fulishe.coupon.mapper.CouponBatchMapper;
import com.fulishe.coupon.service.CouponBatchService;
import org.springframework.stereotype.Service;

@Service
public class CouponBatchServiceImpl extends ServiceImpl<CouponBatchMapper, CouponBatch> implements CouponBatchService {

    @Override
    public IPage<CouponBatch> page(PageQuery query) {
        return baseMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), null);
    }
}

package com.fulishe.product.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.product.entity.PmsSku;
import com.fulishe.product.mapper.PmsSkuMapper;
import com.fulishe.product.service.PmsSkuService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
public class PmsSkuServiceImpl extends ServiceImpl<PmsSkuMapper, PmsSku> implements PmsSkuService {

    @Override
    public IPage<PmsSku> page(PageQuery query) {
        return baseMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), null);
    }

    @Override
    public List<PmsSku> listBySpuId(Long spuId) {
        return baseMapper.selectList(new LambdaQueryWrapper<PmsSku>()
                .eq(PmsSku::getSpuId, spuId)
                .orderByAsc(PmsSku::getId));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deductStock(Long skuId, Integer quantity) {
        PmsSku sku = getById(skuId);
        if (sku == null || sku.getStock() < quantity) {
            return false;
        }

        int rows = baseMapper.update(null, new LambdaUpdateWrapper<PmsSku>()
                .eq(PmsSku::getId, skuId)
                .ge(PmsSku::getStock, quantity)
                .set(PmsSku::getStock, sku.getStock() - quantity));

        if (rows > 0) {
            log.info("Stock deducted: skuId={}, quantity={}, remaining={}", skuId, quantity, sku.getStock() - quantity);
        }
        return rows > 0;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean restoreStock(Long skuId, Integer quantity) {
        PmsSku sku = getById(skuId);
        if (sku == null) {
            return false;
        }

        int rows = baseMapper.update(null, new LambdaUpdateWrapper<PmsSku>()
                .eq(PmsSku::getId, skuId)
                .set(PmsSku::getStock, sku.getStock() + quantity));

        if (rows > 0) {
            log.info("Stock restored: skuId={}, quantity={}, newStock={}", skuId, quantity, sku.getStock() + quantity);
        }
        return rows > 0;
    }
}

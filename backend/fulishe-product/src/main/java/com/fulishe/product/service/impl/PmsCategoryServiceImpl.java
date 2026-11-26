package com.fulishe.product.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fulishe.common.core.entity.PageQuery;
import com.fulishe.product.entity.PmsCategory;
import com.fulishe.product.mapper.PmsCategoryMapper;
import com.fulishe.product.service.PmsCategoryService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PmsCategoryServiceImpl extends ServiceImpl<PmsCategoryMapper, PmsCategory> implements PmsCategoryService {

    @Override
    public IPage<PmsCategory> page(PageQuery query) {
        return baseMapper.selectPage(new Page<>(query.getPageNum(), query.getPageSize()), null);
    }

    @Override
    public List<PmsCategory> tree() {
        List<PmsCategory> all = baseMapper.selectList(null);
        Map<Long, List<PmsCategory>> childrenMap = all.stream()
                .filter(c -> c.getParentId() != null && c.getParentId() != 0)
                .collect(Collectors.groupingBy(PmsCategory::getParentId));

        List<PmsCategory> result = new ArrayList<>();
        for (PmsCategory category : all) {
            if (category.getParentId() == null || category.getParentId() == 0) {
                buildTree(category, childrenMap);
                result.add(category);
            }
        }
        return result;
    }

    private void buildTree(PmsCategory parent, Map<Long, List<PmsCategory>> childrenMap) {
        List<PmsCategory> children = childrenMap.get(parent.getId());
        if (children != null && !children.isEmpty()) {
            parent.setChildren(children);
            for (PmsCategory child : children) {
                buildTree(child, childrenMap);
            }
        }
    }
}

package com.fulishe.product.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

@Data
@EqualsAndHashCode(callSuper = true)
@Accessors(chain = true)
@TableName("pms_category")
public class PmsCategory extends BaseEntity<PmsCategory> {

    private String categoryCode;

    private String categoryName;

    private Long parentId;

    private Integer level;

    private Integer sort;

    private Integer status;

    private String icon;
}

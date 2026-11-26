package com.fulishe.product.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@Accessors(chain = true)
@TableName("pms_sku")
public class PmsSku extends BaseEntity<PmsSku> {

    private Long spuId;

    private String skuCode;

    private String skuName;

    private String specifications;

    private BigDecimal price;

    private Integer stock;

    private String image;
}

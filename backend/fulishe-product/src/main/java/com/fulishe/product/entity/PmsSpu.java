package com.fulishe.product.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.math.BigDecimal;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Accessors(chain = true)
@TableName("pms_spu")
public class PmsSpu extends BaseEntity<PmsSpu> {

    private String spuCode;

    private String spuName;

    private String description;

    private String detail;

    private Long categoryId;

    private Long brandId;

    private String categoryName;

    private String brandName;

    private BigDecimal originalPrice;

    private BigDecimal sellPrice;

    private BigDecimal costPrice;

    private Integer stock;

    private Integer minStock;

    private Integer status;

    private Integer sort;

    private String coverImage;

    @TableField(exist = false)
    private List<PmsSku> skuList;

    @TableField(exist = false)
    private List<String> imageList;
}

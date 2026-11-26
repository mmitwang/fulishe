package com.fulishe.product.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fulishe.common.core.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

@Data
@EqualsAndHashCode(callSuper = true)
@Accessors(chain = true)
@TableName("pms_brand")
public class PmsBrand extends BaseEntity<PmsBrand> {

    private String brandCode;

    private String brandName;

    private String logo;

    private String description;

    private String website;

    private Integer sort;

    private Integer status;
}

package com.fulishe.common.security.model;

import lombok.Data;

import java.io.Serializable;
import java.util.List;

@Data
public class LoginUser implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long userId;

    private Long tenantId;

    private String username;

    private String nickname;

    private String realName;

    private String avatar;

    private Integer userType;

    private String token;

    private List<String> permissions;

    private List<String> roles;
}

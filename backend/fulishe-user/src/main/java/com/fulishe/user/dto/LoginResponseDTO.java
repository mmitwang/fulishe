package com.fulishe.user.dto;

import lombok.Data;

@Data
public class LoginResponseDTO {

    private String token;

    private String refreshToken;

    private Long expireTime;

    private SysUserInfo userInfo;

    @Data
    public static class SysUserInfo {
        private Long id;
        private Long tenantId;
        private String username;
        private String nickname;
        private String realName;
        private String avatar;
        private String mobile;
        private Integer userType;
        private String deptName;
    }
}

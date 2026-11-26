package com.fulishe.common.core.result;

import lombok.Data;

import java.io.Serializable;

@Data
public class R<T> implements Serializable {

    private static final long serialVersionUID = 1L;

    private int code;

    private String msg;

    private T data;

    public boolean isSuccess() {
        return ResultCode.SUCCESS.getCode() == this.code;
    }

    public static <T> R<T> ok() {
        return restResult(null, ResultCode.SUCCESS.getCode(), ResultCode.SUCCESS.getMsg());
    }

    public static <T> R<T> ok(T data) {
        return restResult(data, ResultCode.SUCCESS.getCode(), ResultCode.SUCCESS.getMsg());
    }

    public static <T> R<T> ok(String msg, T data) {
        return restResult(data, ResultCode.SUCCESS.getCode(), msg);
    }

    public static <T> R<T> fail() {
        return restResult(null, ResultCode.FAIL.getCode(), ResultCode.FAIL.getMsg());
    }

    public static <T> R<T> fail(String msg) {
        return restResult(null, ResultCode.FAIL.getCode(), msg);
    }

    public static <T> R<T> fail(int code, String msg) {
        return restResult(null, code, msg);
    }

    public static <T> R<T> fail(ResultCode resultCode) {
        return restResult(null, resultCode.getCode(), resultCode.getMsg());
    }

    private static <T> R<T> restResult(T data, int code, String msg) {
        R<T> apiResult = new R<>();
        apiResult.setCode(code);
        apiResult.setData(data);
        apiResult.setMsg(msg);
        return apiResult;
    }
}

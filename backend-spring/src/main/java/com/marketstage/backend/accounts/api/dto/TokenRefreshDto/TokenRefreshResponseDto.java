// src/main/java/com/marketstage/backend/accounts/api/dto/TokenRefreshDto/TokenRefreshResponseDto.java
package com.marketstage.backend.accounts.api.dto.TokenRefreshDto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TokenRefreshResponseDto(

        // 200 OK 성공 시에만 포함되는 필드 (새로운 액세스 토큰)
        @JsonProperty("access")
        String access,

        // 401/403 등 에러일 때만 의미 있는 필드 (에러 메시지)
        @JsonProperty("message")
        String message
) {

    public static TokenRefreshResponseDto success(String newAccessToken) {
        return new TokenRefreshResponseDto(
                newAccessToken,
                null   // 성공 시 message는 굳이 보낼 필요 없음
        );
    }

    public static TokenRefreshResponseDto failure(String message) {
        return new TokenRefreshResponseDto(
                null,
                message
        );
    }
}

// src/main/java/com/marketstage/backend/accounts/api/dto/LogoutDto/LogoutResponseDto.java
package com.marketstage.backend.accounts.api.dto.LogoutDto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record LogoutResponseDto(

        @JsonProperty("message")
        String message
) {
    public static LogoutResponseDto success(String message) {
        return new LogoutResponseDto(message);
    }

    public static LogoutResponseDto defaultSuccess() {
        return new LogoutResponseDto("로그아웃되었습니다.");
    }
}

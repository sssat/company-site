// src/main/java/com/marketstage/backend/accounts/api/dto/LoginDto/LoginResponseDto.java
package com.marketstage.backend.accounts.api.dto.LoginDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

public record LoginResponseDto(

        @JsonProperty("user_seq")
        Integer userSeq,

        @JsonProperty("user_id")
        String userId,

        @JsonProperty("email")
        String email,

        @JsonProperty("role")
        String role,   // "USER" | "ADMIN" | "SUPER_ADMIN"

        @JsonProperty("user_name")
        String userName,

        @JsonProperty("access_token")
        String accessToken,

        @JsonProperty("refresh_token")
        String refreshToken
) {
    // 서비스가 돌려준 LoginResult를 응답 DTO로 변환하는 함수
    // refreshToken은 JSON 바디에서 숨김
    public static LoginResponseDto withoutRefreshToken(AccountsUseCase.LoginResult result) {
        return new LoginResponseDto(
                result.userSeq(),
                result.userId(),
                result.email(),
                result.role(),
                result.userName(),
                result.accessToken(),
                null // JSON에서는 refresh_token을 숨김
        );
    }
}

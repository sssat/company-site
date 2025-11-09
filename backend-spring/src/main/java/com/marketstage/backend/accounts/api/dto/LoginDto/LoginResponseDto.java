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
    public static LoginResponseDto from(AccountsUseCase.LoginResult result) {
        return new LoginResponseDto(
                result.userSeq(),
                result.userId(),
                result.email(),
                result.role(),
                result.userName(),
                result.accessToken(),
                result.refreshToken()
        );
    }
    
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

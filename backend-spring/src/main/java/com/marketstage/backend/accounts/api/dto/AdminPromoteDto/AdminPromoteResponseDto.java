// src/main/java/com/marketstage/backend/accounts/api/dto/AdminPromoteDto/AdminPromoteResponseDto.java
package com.marketstage.backend.accounts.api.dto.AdminPromoteDto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

import java.time.LocalDateTime;

public record AdminPromoteResponseDto(

        @JsonProperty("user_seq")
        Integer userSeq,

        @JsonProperty("admin_level")
        String adminLevel,   // 항상 "ADMIN"

        @JsonProperty("granted_at")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime grantedAt,

        @JsonProperty("acted_seq")
        Integer actedSeq,

        @JsonProperty("message")
        String message
) {
    public static AdminPromoteResponseDto success(
            AccountsUseCase.PromoteResult result,
            String message
    ) {
        return new AdminPromoteResponseDto(
                result.userSeq(),
                result.adminLevel(),   // 보통 "ADMIN"
                result.grantedAt(),
                result.actedSeq(),
                message
        );
    }

    public static AdminPromoteResponseDto failure(String message) {
        return new AdminPromoteResponseDto(
                null,
                null,
                null,
                null,
                message
        );
    }
}

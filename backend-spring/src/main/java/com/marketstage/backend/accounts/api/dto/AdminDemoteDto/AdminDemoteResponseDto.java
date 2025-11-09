// src/main/java/com/marketstage/backend/accounts/api/dto/AdminDemoteDto/AdminDemoteResponseDto.java
package com.marketstage.backend.accounts.api.dto.AdminDemoteDto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

import java.time.LocalDateTime;

public record AdminDemoteResponseDto(

        @JsonProperty("user_seq")
        Integer userSeq,

        @JsonProperty("demoted_at")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime demotedAt,

        @JsonProperty("acted_seq")
        Integer actedSeq,

        @JsonProperty("message")
        String message
) {
    public static AdminDemoteResponseDto success(
            AccountsUseCase.DemoteResult result,
            String message
    ) {
        return new AdminDemoteResponseDto(
                result.userSeq(),
                result.demotedAt(),
                result.actedSeq(),
                message
        );
    }
    
    public static AdminDemoteResponseDto failure(String message) {
        return new AdminDemoteResponseDto(
                null,
                null,
                null,
                message
        );
    }
}

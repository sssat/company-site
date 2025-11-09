// src/main/java/com/marketstage/backend/accounts/api/dto/FindPasswordDto/FindPasswordResponseDto.java
package com.marketstage.backend.accounts.api.dto.FindPasswordDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

public record FindPasswordResponseDto(

        @JsonProperty("message")
        String message,

        @JsonProperty("temp_password")
        String tempPassword
) {
    public static FindPasswordResponseDto success(
            AccountsUseCase.FindPasswordResult useCaseResult,
            String message
    ) {
        return new FindPasswordResponseDto(
                message,
                useCaseResult.tempPassword()
        );
    }

    public static FindPasswordResponseDto successWithoutTempPassword(String message) {
        return new FindPasswordResponseDto(
                message,
                null
        );
    }

    public static FindPasswordResponseDto failure(String message) {
        return new FindPasswordResponseDto(
                message,
                null
        );
    }
}

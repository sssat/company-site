// src/main/java/com/marketstage/backend/accounts/api/dto/FindIdDto/FindIdResponseDto.java
package com.marketstage.backend.accounts.api.dto.FindIdDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

public record FindIdResponseDto(

        @JsonProperty("user_id")
        String userId,

        @JsonProperty("message")
        String message
) {

    public static FindIdResponseDto success(AccountsUseCase.FindIdResult result) {
        return new FindIdResponseDto(
                result.userId(),
                null   // 성공 시 message는 비움
        );
    }
    
    public static FindIdResponseDto failure(String message) {
        return new FindIdResponseDto(
                null,
                message
        );
    }
}

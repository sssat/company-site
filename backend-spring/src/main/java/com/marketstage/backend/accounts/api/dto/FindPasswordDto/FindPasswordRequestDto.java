// src/main/java/com/marketstage/backend/accounts/api/dto/FindPasswordDto/FindPasswordRequestDto.java
package com.marketstage.backend.accounts.api.dto.FindPasswordDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

public record FindPasswordRequestDto(

        @JsonProperty("user_id")
        String userId,

        @JsonProperty("name")
        String name,

        @JsonProperty("email")
        String email
) {
    public AccountsUseCase.FindPasswordCommand toCommand() {
        return new AccountsUseCase.FindPasswordCommand(
                userId,
                name,   // userName으로 들어감
                email
        );
    }
}

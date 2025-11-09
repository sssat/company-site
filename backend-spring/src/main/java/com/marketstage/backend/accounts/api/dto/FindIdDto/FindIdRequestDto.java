// src/main/java/com/marketstage/backend/accounts/api/dto/FindIdDto/FindIdRequestDto.java
package com.marketstage.backend.accounts.api.dto.FindIdDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

public record FindIdRequestDto(

        @JsonProperty("email")
        String email,

        @JsonProperty("name")
        String name
) {
    public AccountsUseCase.FindIdCommand toCommand() {
        return new AccountsUseCase.FindIdCommand(
                email,
                name  // userName으로 들어감
        );
    }
}

// src/main/java/com/marketstage/backend/accounts/api/dto/ChangePasswordDto/ChangePasswordRequestDto.java
package com.marketstage.backend.accounts.api.dto.ChangePasswordDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

public record ChangePasswordRequestDto(

        @JsonProperty("current_password")
        String currentPassword,

        @JsonProperty("new_password")
        String newPassword,

        @JsonProperty("new_password_confirm")
        String newPasswordConfirm
) {
    public AccountsUseCase.ChangePasswordCommand toCommand(Integer actorUserSeq) {
        return new AccountsUseCase.ChangePasswordCommand(
                actorUserSeq,
                currentPassword,
                newPassword,
                newPasswordConfirm
        );
    }
}

// src/main/java/com/marketstage/backend/accounts/api/dto/SignUpDto/SignUpRequestDto.java
package com.marketstage.backend.accounts.api.dto.SignUpDto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

import java.time.LocalDate;

public record SignUpRequestDto(

        @JsonProperty("user_id")
        String userId,

        @JsonProperty("email")
        String email,

        @JsonProperty("password")
        String password,

        @JsonProperty("password2")
        String passwordConfirm,

        @JsonProperty("username")
        String username,

        @JsonProperty("birth_date")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
        LocalDate birthDate,

        @JsonProperty("gender")
        String gender,

        @JsonProperty("agree_whether")
        Boolean agreeWhether,

        @JsonProperty("id_check_token")
        String idCheckToken,

        @JsonProperty("email_check_token")
        String emailCheckToken
) {
    public AccountsUseCase.SignUpCommand toCommand() {
        return new AccountsUseCase.SignUpCommand(
                userId,
                email,
                password,          // rawPassword
                passwordConfirm,   // passwordConfirm
                username,
                birthDate,
                gender,
                Boolean.TRUE.equals(agreeWhether),
                idCheckToken,
                emailCheckToken
        );
    }
}

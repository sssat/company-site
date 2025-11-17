// src/main/java/com/marketstage/backend/accounts/api/dto/SignUpDto/SignUpRequestDto.java
package com.marketstage.backend.accounts.api.dto.SignUpDto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase.SignUpCommand;

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
    // 받아온 회원가입 입력값(request body JSON)을 AccountsUseCase.SignUpCommand로 변환하는 함수
    // Jackson이 JSON을 DTO로 역직렬화하고, toCommand()가 DTO를 AccountsUseCase.SignUpCommand로 변환한다.
    public SignUpCommand toCommand() {
        return new SignUpCommand(
            userId,         
            email,           
            password,         
            passwordConfirm,  
            username,          
            birthDate,         
            gender,           
            Boolean.TRUE.equals(agreeWhether), 
            idCheckToken,      
            emailCheckToken    
        );
    }
}

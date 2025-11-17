// src/main/java/com/marketstage/backend/accounts/api/dto/SignUpDto/SignUpResponseDto.java
package com.marketstage.backend.accounts.api.dto.SignUpDto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

public record SignUpResponseDto(

        @JsonProperty("user_seq")
        Integer userSeq,

        @JsonProperty("joined_at")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime joinedAt
) {
    // 가입 결과 값 두 개를 담아서 응답 DTO를 만드는 함수
    public static SignUpResponseDto of(Integer userSeq, LocalDateTime joinedAt) {
        return new SignUpResponseDto(userSeq, joinedAt);
    }
}

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
    public static SignUpResponseDto from(Integer userSeq) {
        return new SignUpResponseDto(userSeq, null);
    }

    public static SignUpResponseDto of(Integer userSeq, LocalDateTime joinedAt) {
        return new SignUpResponseDto(userSeq, joinedAt);
    }
}

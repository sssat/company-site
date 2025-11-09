// src/main/java/com/marketstage/backend/accounts/api/dto/LoginDto/LoginRequestDto.java
package com.marketstage.backend.accounts.api.dto.LoginDto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record LoginRequestDto(
        @JsonProperty("user_id")
        String userId,

        @JsonProperty("password")
        String password
) {
    // 별도 로직 없음. 서비스에서 userId(), password()로 그대로 사용.
}

// src/main/java/com/marketstage/backend/accounts/api/dto/EmailPrecheckDto/EmailPrecheckRequestDto.java
package com.marketstage.backend.accounts.api.dto.EmailPrecheckDto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record EmailPrecheckRequestDto(

        @JsonProperty("email")
        String email
) {
}

// src/main/java/com/marketstage/backend/accounts/api/dto/AdminPromoteDto/AdminPromoteRequestDto.java

package com.marketstage.backend.accounts.api.dto.AdminPromoteDto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AdminPromoteRequestDto(

        @JsonProperty("user_seq")
        Integer userSeq
) {
}

// src/main/java/com/marketstage/backend/accounts/api/dto/AdminDemoteDto/AdminDemoteRequestDto.java
package com.marketstage.backend.accounts.api.dto.AdminDemoteDto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AdminDemoteRequestDto(

        @JsonProperty("user_seq")
        Integer userSeq
) {
}

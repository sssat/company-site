// src/main/java/com/marketstage/backend/accounts/api/dto/UserListDto/UserListResponseDto.java
package com.marketstage.backend.accounts.api.dto.UserListDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

import java.util.List;

public record UserListResponseDto(

        @JsonProperty("items")
        List<UserListItemDto> items,

        @JsonProperty("page")
        int page,

        @JsonProperty("size")
        int size,

        @JsonProperty("total_count")
        long totalCount,

        @JsonProperty("total_pages")
        int totalPages,

        @JsonProperty("message")
        String message
) {
    public static UserListResponseDto success(
            AccountsUseCase.UserListResult result,
            String message
    ) {
        List<UserListItemDto> dtoItems = result.items().stream()
                .map(UserListItemDto::from)
                .toList();

        return new UserListResponseDto(
                dtoItems,
                result.page(),
                result.size(),
                result.totalCount(),
                result.totalPages(),
                message
        );
    }

    public static UserListResponseDto failure(String message) {
        return new UserListResponseDto(
                List.of(),
                0,
                0,
                0L,
                0,
                message
        );
    }

    public record UserListItemDto(

            @JsonProperty("user_seq")
            Integer userSeq,

            @JsonProperty("user_id")
            String userId,

            @JsonProperty("user_name")
            String userName,

            @JsonProperty("grade_code")
            int gradeCode,          // 0 / 1 / 2

            @JsonProperty("grade_name")
            String gradeName        // "일반" / "관리자" / "슈퍼관리자"
    ) {
        public static UserListItemDto from(AccountsUseCase.UserListItem item) {
            return new UserListItemDto(
                    item.userSeq(),
                    item.userId(),
                    item.userName(),
                    item.gradeCode(),
                    item.gradeName()
            );
        }
    }
}

// src/main/java/com/marketstage/backend/news/api/dto/NewsDeleteDto/NewsDeleteResponseDto.java

package com.marketstage.backend.news.api.dto.NewsDeleteDto;

public record NewsDeleteResponseDto(
        String message
) {
    public static NewsDeleteResponseDto success(String message) {
        return new NewsDeleteResponseDto(message);
    }

    public static NewsDeleteResponseDto failure(String message) {
        return new NewsDeleteResponseDto(message);
    }
}

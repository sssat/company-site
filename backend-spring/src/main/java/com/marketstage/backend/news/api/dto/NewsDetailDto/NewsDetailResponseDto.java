// src/main/java/com/marketstage/backend/news/api/dto/NewsDetailDto/NewsDetailResponseDto.java

package com.marketstage.backend.news.api.dto.NewsDetailDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.news.application.port.in.NewsUseCase;

import java.time.LocalDateTime;
import java.util.List;

public record NewsDetailResponseDto(

        @JsonProperty("news_seq")
        Integer newsSeq,

        String slug,
        String title,
        String badge,
        String category,

        @JsonProperty("image_url")
        String imageUrl,

        @JsonProperty("thumbnail_url")
        String thumbnailUrl,

        @JsonProperty("published_at")
        LocalDateTime publishedAt,

        @JsonProperty("updated_at")
        LocalDateTime updatedAt,

        String excerpt,
        List<String> body,
        String message
) {
    // 유즈케이스 결과 → 응답 DTO 변환 헬퍼
    public static NewsDetailResponseDto from(NewsUseCase.NewsDetailResult result) {
        return new NewsDetailResponseDto(
                result.newsSeq(),
                result.slug(),
                result.title(),
                result.badge(),
                result.category(),
                result.imageUrl(),
                result.thumbnailUrl(),
                result.publishedAt(),
                result.updatedAt(),
                result.excerpt(),
                result.body(),
                result.message()
        );
    }
}

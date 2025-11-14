// src/main/java/com/marketstage/backend/news/api/dto/NewsListDto/NewsListResponseDto.java

package com.marketstage.backend.news.api.dto.NewsListDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.news.application.port.in.NewsUseCase.NewsListResult;
import com.marketstage.backend.news.application.port.in.NewsUseCase.NewsSummary;

import java.time.LocalDateTime;
import java.util.List;

public record NewsListResponseDto(

        List<NewsSummaryDto> items,

        int page,
        int size,

        @JsonProperty("total_count")
        long totalCount,

        @JsonProperty("total_pages")
        int totalPages,

        String message
) {

    // 유즈케이스 결과(NewsListResult) -> 응답 DTO 로 변환하는 헬퍼
    public static NewsListResponseDto from(NewsListResult result) {
        List<NewsSummaryDto> dtoItems = result.items().stream()
                .map(NewsSummaryDto::from)
                .toList();

        return new NewsListResponseDto(
                dtoItems,
                result.page(),
                result.size(),
                result.totalCount(),
                result.totalPages(),
                result.message()
        );
    }
    public record NewsSummaryDto(

            @JsonProperty("news_seq")
            Integer newsSeq,

            String title,
            String excerpt,
            String badge,

            @JsonProperty("thumbnail_url")
            String thumbnailUrl,

            // "INTERNAL" | "EXTERNAL" | "ALL"
            String category,

            @JsonProperty("published_at")
            LocalDateTime publishedAt
    ) {
        // 유즈케이스 DTO(NewsSummary) -> 응답 DTO 로 변환
        public static NewsSummaryDto from(NewsSummary summary) {
            return new NewsSummaryDto(
                    summary.newsSeq(),
                    summary.title(),
                    summary.excerpt(),
                    summary.badge(),
                    summary.thumbnailUrl(),
                    summary.category(),
                    summary.publishedAt()
            );
        }
    }
}

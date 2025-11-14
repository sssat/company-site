// src/main/java/com/marketstage/backend/news/api/dto/NewsCreateDto/NewsCreateResponseDto.java

package com.marketstage.backend.news.api.dto.NewsCreateDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.news.application.port.in.NewsUseCase;

import java.time.LocalDateTime;

public record NewsCreateResponseDto(

        @JsonProperty("news_seq")
        Integer newsSeq,

        @JsonProperty("published_at")
        LocalDateTime publishedAt,

        String message
) {
    public static NewsCreateResponseDto from(NewsUseCase.NewsCreateResult result) {
        return new NewsCreateResponseDto(
                result.newsSeq(),
                result.publishedAt(),
                result.message()
        );
    }
}

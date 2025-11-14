// src/main/java/com/marketstage/backend/news/api/dto/NewsUpdateDto/NewsUpdateResponseDto.java

package com.marketstage.backend.news.api.dto.NewsUpdateDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.news.application.port.in.NewsUseCase;

import java.time.LocalDateTime;

public record NewsUpdateResponseDto(

        @JsonProperty("news_seq")
        Integer newsSeq,

        @JsonProperty("updated_at")
        LocalDateTime updatedAt,

        String message
) {
    public static NewsUpdateResponseDto from(NewsUseCase.NewsUpdateResult result) {
        return new NewsUpdateResponseDto(
                result.newsSeq(),
                result.updatedAt(),
                result.message()
        );
    }
}

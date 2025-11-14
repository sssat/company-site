// src/main/java/com/marketstage/backend/news/api/dto/NewsCreateDto/NewsCreateRequestDto.java

package com.marketstage.backend.news.api.dto.NewsCreateDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.news.application.port.in.NewsUseCase;

public record NewsCreateRequestDto(

        String title,
        String excerpt,
        String content,
        String category,
        String badge,

        @JsonProperty("thumbnail_url")
        String thumbnailUrl,

        @JsonProperty("image_url")
        String imageUrl,

        @JsonProperty("image_key")
        String imageKey
) {
    public NewsUseCase.NewsCreateCommand toCommand(Integer actorUserSeq) {
        return new NewsUseCase.NewsCreateCommand(
                actorUserSeq,
                title,
                excerpt,
                content,
                category,
                badge,
                thumbnailUrl,
                imageUrl,
                imageKey
        );
    }
}

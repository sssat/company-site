// src/main/java/com/marketstage/backend/news/api/dto/NewsUpdateDto/NewsUpdateRequestDto.java

package com.marketstage.backend.news.api.dto.NewsUpdateDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.news.application.port.in.NewsUseCase;

public record NewsUpdateRequestDto(

        String title,
        String excerpt,
        String content,
        String category,
        String badge,

        @JsonProperty("thumbnail_url")
        String thumbnailUrl,

        @JsonProperty("remove_thumbnail")
        Boolean removeThumbnail,

        @JsonProperty("image_url")
        String imageUrl,

        @JsonProperty("remove_image")
        Boolean removeImage,

        @JsonProperty("image_key")
        String imageKey
) {
    public NewsUseCase.NewsUpdateCommand toCommand(Integer actorUserSeq, Integer newsSeq) {
        return new NewsUseCase.NewsUpdateCommand(
                actorUserSeq,
                newsSeq,
                title,
                excerpt,
                content,
                category,
                badge,
                thumbnailUrl,
                imageUrl,
                removeThumbnail,
                removeImage,
                imageKey
        );
    }
}

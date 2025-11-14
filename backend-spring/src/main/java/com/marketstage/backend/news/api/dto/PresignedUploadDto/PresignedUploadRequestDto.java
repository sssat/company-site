// src/main/java/com/marketstage/backend/news/api/dto/PresignedUploadDto/resignedUploadRequestDto.java

package com.marketstage.backend.news.api.dto.PresignedUploadDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.news.application.port.in.NewsUseCase;

public record PresignedUploadRequestDto(

        @JsonProperty("kind")
        String kind,

        @JsonProperty("filename")
        String filename,

        @JsonProperty("content_type")
        String contentType
) {
    public NewsUseCase.CreatePresignedUploadUrlCommand toCommand(Integer actorUserSeq) {
        return new NewsUseCase.CreatePresignedUploadUrlCommand(
                actorUserSeq,
                this.kind,
                this.filename,
                this.contentType
        );
    }
}

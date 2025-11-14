// src/main/java/com/marketstage/backend/news/api/dto/PresignedUploadDto/resignedUploadResponseDto.java

package com.marketstage.backend.news.api.dto.PresignedUploadDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.news.application.port.in.NewsUseCase;

public record PresignedUploadResponseDto(

        @JsonProperty("upload_url")
        String uploadUrl,

        @JsonProperty("key")
        String key,

        @JsonProperty("public_url")
        String publicUrl,

        @JsonProperty("content_type")
        String contentType,

        String message
) {

    // 유즈케이스 결과 → 응답 DTO 변환
    public static PresignedUploadResponseDto from(NewsUseCase.PresignedUploadUrlResult result) {
        return new PresignedUploadResponseDto(
                result.uploadUrl(),
                result.key(),
                result.publicUrl(),
                result.contentType(),
                result.message()
        );
    }

    // 에러 상황용 헬퍼(옵션)
    public static PresignedUploadResponseDto failure(String message) {
        return new PresignedUploadResponseDto(
                null,
                null,
                null,
                null,
                message
        );
    }
}

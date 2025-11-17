// src/main/java/com/marketstage/backend/inquiries/api/dto/InquiryDetailDto/InquiryDetailResponseDto.java

package com.marketstage.backend.inquiries.api.dto.InquiryDetailDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.inquiries.application.port.in.InquiriesUseCase;

import java.time.LocalDateTime;

public record InquiryDetailResponseDto(

        @JsonProperty("inquiry_seq")
        Integer inquirySeq,

        String name,
        String email,

        // Java 필드명은 title, JSON 키는 subject 로 내보냄
        @JsonProperty("subject")
        String title,
        
        String message,

        @JsonProperty("submitted_at")
        LocalDateTime submittedAt,

        @JsonProperty("is_processed")
        boolean processed,

        @JsonProperty("processed_at")
        LocalDateTime processedAt,

        // FK의 PK만 내려주는 형태 
        @JsonProperty("processed_by")
        Integer processedByUserSeq,

        @JsonProperty("status_label")
        String statusLabel   // "처리중" | "처리완료"
) {

    // 유즈케이스 레벨 DTO -> API DTO 변환 헬퍼
    public static InquiryDetailResponseDto from(InquiriesUseCase.InquiryDetailResult result) {
        return new InquiryDetailResponseDto(
                result.inquirySeq(),
                result.name(),
                result.email(),
                result.title(),
                result.message(),
                result.submittedAt(),
                result.processed(),
                result.processedAt(),
                result.processedByUserSeq(),
                result.statusLabel()
        );
    }
}

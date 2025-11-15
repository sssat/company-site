// src/main/java/com/marketstage/backend/inquiries/api/dto/InquiryListDto/InquiryListItemDto.java

package com.marketstage.backend.inquiries.api.dto.InquiryListDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.inquiries.application.port.in.InquiriesUseCase;

import java.time.LocalDateTime;

public record InquiryListItemDto(

        @JsonProperty("inquiry_seq")
        Integer inquirySeq,

        String name,
        String email,
        String subject,
        String excerpt,

        @JsonProperty("submitted_at")
        LocalDateTime submittedAt,

        @JsonProperty("is_processed")
        boolean processed,

        @JsonProperty("processed_at")
        LocalDateTime processedAt,

        @JsonProperty("processed_by")
        Integer processedByUserSeq,

        @JsonProperty("status_label")
        String statusLabel   // "처리중" | "처리완료"
) {

    // 유즈케이스 레벨 DTO -> API DTO 변환 헬퍼
    public static InquiryListItemDto from(InquiriesUseCase.InquiryListItem item) {
        return new InquiryListItemDto(
                item.inquirySeq(),
                item.name(),
                item.email(),
                item.subject(),
                item.excerpt(),
                item.submittedAt(),
                item.processed(),
                item.processedAt(),
                item.processedByUserSeq(),
                item.statusLabel()
        );
    }
}

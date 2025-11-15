// src/main/java/com/marketstage/backend/inquiries/api/dto/InquiryProcessDto/InquiryProcessResponseDto.java

package com.marketstage.backend.inquiries.api.dto.InquiryProcessDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.inquiries.application.port.in.InquiriesUseCase;

import java.time.LocalDateTime;

public record InquiryProcessResponseDto(

        @JsonProperty("inquiry_seq")
        Integer inquirySeq,

        String subject,

        @JsonProperty("is_processed")
        boolean processed,

        @JsonProperty("processed_at")
        LocalDateTime processedAt,

        @JsonProperty("processed_by")
        Integer processedByUserSeq,

        @JsonProperty("status_label")
        String statusLabel
) {
    public static InquiryProcessResponseDto from(InquiriesUseCase.ProcessInquiryResult result) {
        return new InquiryProcessResponseDto(
                result.inquirySeq(),
                result.subject(),
                result.processed(),
                result.processedAt(),
                result.processedByUserSeq(),
                result.statusLabel()
        );
    }
}

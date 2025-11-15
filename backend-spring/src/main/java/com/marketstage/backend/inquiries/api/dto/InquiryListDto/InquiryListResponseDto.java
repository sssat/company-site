// src/main/java/com/marketstage/backend/inquiries/api/dto/InquiryListDto/InquiryListResponseDto.java

package com.marketstage.backend.inquiries.api.dto.InquiryListDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.inquiries.application.port.in.InquiriesUseCase;

import java.util.List;

public record InquiryListResponseDto(

        int page,
        int size,
        long total,

        @JsonProperty("total_pages")
        int totalPages,

        List<InquiryListItemDto> items
) {

    public static InquiryListResponseDto from(InquiriesUseCase.InquiryListResult result) {
        List<InquiryListItemDto> itemDtos = result.items().stream()
                .map(InquiryListItemDto::from)
                .toList();

        return new InquiryListResponseDto(
                result.page(),
                result.size(),
                result.totalCount(),
                result.totalPages(),
                itemDtos
        );
    }
}

// src/main/java/com/marketstage/backend/inquiries/api/dto/InquiryCreateDto/InquiryCreateResponseDto.java

package com.marketstage.backend.inquiries.api.dto.InquiryCreateDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.inquiries.application.port.in.InquiriesUseCase;

public record InquiryCreateResponseDto(

        @JsonProperty("inquiry_seq")
        Integer inquirySeq,

        String message
) {

    // 기존 메서드 그대로 둠
    public static InquiryCreateResponseDto success(
            InquiriesUseCase.CreateInquiryResult result
    ) {
        String msg = (result.message() == null || result.message().isBlank())
                ? "문의가 등록되었습니다."
                : result.message();

        return new InquiryCreateResponseDto(
                result.inquirySeq(),
                msg
        );
    }

    // 컨트롤러에서 쓰기 편하게 alias 메서드 하나 추가
    public static InquiryCreateResponseDto from(
            InquiriesUseCase.CreateInquiryResult result
    ) {
        return success(result);
    }
}

// src/main/java/com/marketstage/backend/inquiries/api/dto/InquiryDeleteDto/InquiryDeleteResponseDto.java

package com.marketstage.backend.inquiries.api.dto.InquiryDeleteDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.inquiries.application.port.in.InquiriesUseCase;

public record InquiryDeleteResponseDto(

        @JsonProperty("inquiry_seq")
        Integer inquirySeq,

        boolean deleted,

        String message
) {

    public static InquiryDeleteResponseDto from(
            InquiriesUseCase.DeleteInquiryResult result
    ) {
        return new InquiryDeleteResponseDto(
                result.inquirySeq(),
                result.deleted(),
                result.message()
        );
    }

    // 필요하면 성공 고정 메시지 버전 헬퍼도 만들 수 있음
    public static InquiryDeleteResponseDto success(Integer inquirySeq) {
        return new InquiryDeleteResponseDto(
                inquirySeq,
                true,
                "영구 삭제되었습니다."
        );
    }
}

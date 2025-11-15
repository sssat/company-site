// src/main/java/com/marketstage/backend/inquiries/api/dto/InquiryProcessDto/InquiryProcessRequestDto.java

package com.marketstage.backend.inquiries.api.dto.InquiryProcessDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.inquiries.application.port.in.InquiriesUseCase;

public record InquiryProcessRequestDto(

        @JsonProperty("is_processed")
        boolean processed
) {
    // 컨트롤러에서 헤더/경로값과 합쳐서 유즈케이스 커맨드로 변환하기 위한 헬퍼
    public InquiriesUseCase.ProcessInquiryCommand toCommand(
            Integer actorUserSeq,
            Integer inquirySeq
    ) {
        return new InquiriesUseCase.ProcessInquiryCommand(
                actorUserSeq,
                inquirySeq,
                this.processed
        );
    }
}

// src/main/java/com/marketstage/backend/inquiries/api/dto/InquiryCreateDto/InquiryCreateRequestDto.java

package com.marketstage.backend.inquiries.api.dto.InquiryCreateDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.inquiries.application.port.in.InquiriesUseCase;

public record InquiryCreateRequestDto(

        // JSON 필드 이름과 동일해서 @JsonProperty는 필수는 아니지만, 명시적으로 적어둠
        @JsonProperty("name")
        String name,

        @JsonProperty("email")
        String email,

        @JsonProperty("title")
        String title,

        @JsonProperty("message")
        String message
) {
    // 컨트롤러에서 바로 유즈케이스 커맨드로 변환해서 넘기기 위한 헬퍼 메서드
    public InquiriesUseCase.CreateInquiryCommand toCommand() {
        return new InquiriesUseCase.CreateInquiryCommand(
                this.name,
                this.email,
                this.title,
                this.message
        );
    }
}

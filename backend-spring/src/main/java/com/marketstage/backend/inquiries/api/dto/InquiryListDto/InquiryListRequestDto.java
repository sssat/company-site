// src/main/java/com/marketstage/backend/inquiries/api/dto/InquiryListDto/InquiryListRequestDto.java

package com.marketstage.backend.inquiries.api.dto.InquiryListDto;

import com.marketstage.backend.inquiries.application.port.in.InquiriesUseCase;

public record InquiryListRequestDto(
        Integer page,
        Integer size,
        String q,
        String status,  // "all" | "pending" | "done"
        String order    // "recent" | "oldest"
) {
    // 컨트롤러에서 유즈케이스 쿼리 객체로 변환하는 헬퍼
    public InquiriesUseCase.InquiryListQuery toQuery(Integer actorUserSeq) {
        int p = (page != null ? page : 1);
        int s = (size != null ? size : 10);

        String qSafe      = (q != null ? q : "");
        String statusSafe = (status != null ? status : "all");
        String orderSafe  = (order != null ? order : "recent");

        return new InquiriesUseCase.InquiryListQuery(
                actorUserSeq,
                p,
                s,
                qSafe,
                statusSafe,
                orderSafe
        );
    }
}

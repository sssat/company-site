// inquiries/application/port/in/InquiriesUseCase.java

package com.marketstage.backend.inquiries.application.port.in;

import java.time.LocalDateTime;
import java.util.List;

public interface InquiriesUseCase {

    // =============== record DTO들 (입출력 모델) ===============

    // 1. 문의 등록 요청 값(request) 묶음
    record CreateInquiryCommand(
            String name,
            String email,
            String subject,   // Django의 title에 매핑될 값
            String message
    ) {}

    // 2. 문의 등록 성공 시 응답 값(response) 묶음
    record CreateInquiryResult(
            Integer inquirySeq,
            String message
    ) {}

    // 3. 문의 목록 조회 request 값들을 담은 클래스
    record InquiryListQuery(
            Integer actorUserSeq, // 요청자 PK (ADMIN/SUPER_ADMIN 권한 확인용)
            int page,
            int size,
            String q,
            String status,
            String order
    ) {}

    // 4. 문의 목록 아이템(요약) 값들을 담은 클래스
    record InquiryListItem(
            Integer inquirySeq,
            String name,
            String email,
            String subject,
            String excerpt,
            LocalDateTime submittedAt,
            boolean processed,
            LocalDateTime processedAt,
            Integer processedByUserSeq, // 처리자 PK (없으면 null)
            String statusLabel          // "처리중" | "처리완료"
    ) {}

    // 5. 문의 목록 조회 결과(response)를 담은 클래스
    record InquiryListResult(
            List<InquiryListItem> items,
            int page,
            int size,
            long totalCount,
            int totalPages
    ) {}

    // 6. 문의 단건 상세 조회 결과(response)를 담은 클래스
    record InquiryDetailResult(
            Integer inquirySeq,
            String name,
            String email,
            String subject,
            String message,           // 문의 내용 전문
            LocalDateTime submittedAt,
            boolean processed,
            LocalDateTime processedAt,
            Integer processedByUserSeq,
            String statusLabel
    ) {}

    // 7. 문의 처리 상태 변경 요청(request)을 담은 클래스
    record ProcessInquiryCommand(
            Integer actorUserSeq,  // 처리자(관리자) PK
            Integer inquirySeq,    // 대상 문의 PK
            boolean processed      // 항상 true만 유효하게 사용할 예정
    ) {}

    // 8. 문의 처리 상태 변경 결과(response)를 담은 클래스
    record ProcessInquiryResult(
            Integer inquirySeq,
            String subject,
            boolean processed,
            LocalDateTime processedAt,
            Integer processedByUserSeq,
            String statusLabel
    ) {}

    // 9. 문의 삭제 요청(request)을 담은 클래스
    record DeleteInquiryCommand(
            Integer actorUserSeq,   // 삭제를 수행하는 관리자 PK
            Integer inquirySeq      // 삭제 대상 문의 PK
    ) {}

    // 10. 문의 삭제 결과(response)를 담은 클래스
    record DeleteInquiryResult(
            Integer inquirySeq,
            boolean deleted,
            String message
    ) {}

    // =============== 유즈케이스 추상(abstract) 메서드 ===============

    // 1. 문의 등록
    CreateInquiryResult createInquiry(CreateInquiryCommand command);

    // 2. 문의 목록 조회
    InquiryListResult listInquiries(InquiryListQuery query);

    // 3. 문의 단건 상세 조회
    InquiryDetailResult getInquiryDetail(Integer actorUserSeq, Integer inquirySeq);

    // 4. 문의 처리 상태 변경 (처리완료 전환 전용)
    ProcessInquiryResult processInquiry(ProcessInquiryCommand command);

    // 5. 문의 삭제 (항상 영구 삭제)
    DeleteInquiryResult deleteInquiry(DeleteInquiryCommand command);
}

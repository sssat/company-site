// inquiries/application/port/out/InquiryRepository.java

package com.marketstage.backend.inquiries.application.port.out;

import com.marketstage.backend.inquiries.domain.model.Inquiry;

import java.util.List;
import java.util.Optional;

public interface InquiryRepository {

    // ─────────────────────────────────────────────
    // 1) 저장/수정
    // ─────────────────────────────────────────────
    Inquiry save(Inquiry inquiry);

    // ─────────────────────────────────────────────
    // 2) PK로 단건 조회
    // ─────────────────────────────────────────────
    Optional<Inquiry> findById(Integer inquirySeq);

    // ─────────────────────────────────────────────
    // 2-1) PK로 단건 조회 + 비관적 락(select_for_update 대응)
    // ─────────────────────────────────────────────
    Optional<Inquiry> findByIdForUpdate(Integer inquirySeq);

    // ─────────────────────────────────────────────
    // 3) 목록 조회용 카운트 쿼리
    // ─────────────────────────────────────────────
    long countByFilter(String q, Boolean processed);

    // ─────────────────────────────────────────────────
    // 4) 목록 조회 (검색 + 상태 필터 + 정렬 + 페이징)
    // ─────────────────────────────────────────────────
    List<Inquiry> findByFilter(
            String q,
            Boolean processed,
            boolean orderAsc,
            int offset,
            int limit
    );

    // ─────────────────────────────────────────────
    // 5) 삭제
    // ─────────────────────────────────────────────
    void delete(Inquiry inquiry);
}

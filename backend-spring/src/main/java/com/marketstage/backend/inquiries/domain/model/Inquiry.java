// src/main/java/com/marketstage/backend/inquiries/domain/model/Inquiry.java    

package com.marketstage.backend.inquiries.domain.model;

import com.marketstage.backend.accounts.domain.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "inquirySeq")
@Entity
@Table(name = "T_INQUIRY")  
public class Inquiry {

    // 문의글 일련번호 (PK) 
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "INQUIRY_SEQ")
    private Integer inquirySeq;

    // 처리자 일련번호: FK 
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(
            name = "PROCESSED_SEQ",
            nullable = true,
            foreignKey = @ForeignKey(ConstraintMode.CONSTRAINT)
    )
    private User processedBy;

    // 문의자 이름 (NAME)
    @Column(name = "NAME", nullable = false, length = 100)
    private String name;

    // 문의자 이메일 (EMAIL)
    @Column(name = "EMAIL", nullable = false, length = 150)
    private String email;

    // 문의글 제목 (TITLE)
    @Column(name = "TITLE", nullable = false, length = 200)
    private String title;

    // 문의글 내용 (MESSAGE)
    @Lob
    @Column(name = "MESSAGE", nullable = false)
    private String message;

    // 문의글 제출 일시
    @Column(name = "SUBMITTED_AT", nullable = false)
    private LocalDateTime submittedAt;

    // 문의글 처리 일시
    @Column(name = "PROCESSED_AT")
    private LocalDateTime processedAt;

    // 처리 상태
    @Column(name = "IS_PROCESSED", nullable = false)
    private boolean processed;

    // ─────────────────────────────────────────────
    // JPA 라이프사이클 콜백 (INSERT/UPDATE 시점 처리)
    // ─────────────────────────────────────────────

    @PrePersist
    protected void onInsert() {
        // submittedAt이 비어 있으면 현재 시각으로 보정
        if (this.submittedAt == null) {
            this.submittedAt = LocalDateTime.now();
        }
        // processed(boolean)은 기본값이 이미 false 이므로 별도 보정 불필요
    }

    @PreUpdate
    protected void onUpdate() {
        // Inquiry는 UPDATED_AT 컬럼이 없으므로 현재는 별도 처리 없음
        // 필요하면 나중에 UPDATED_AT 컬럼 추가 후 여기에서 갱신 로직 구현
    }

    // ─────────────────────────────────────────────
    // 도메인 편의 메서드
    // ─────────────────────────────────────────────

     // 문의를 처리 완료 상태로 변경
     // 처리자(User)와 처리 시각을 함께 기록
    public void markProcessed(User processor, LocalDateTime processedAt) {
        this.processedBy = processor;
        this.processed = true;
        this.processedAt = (processedAt != null) ? processedAt : LocalDateTime.now();
    }

    @Override
    public String toString() {
        // 예) [123] 로그인이 안됩니다.
        return "[" + inquirySeq + "] " + title;
    }
}

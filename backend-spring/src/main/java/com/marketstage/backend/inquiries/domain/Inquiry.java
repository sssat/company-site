// inquiries/domain/Inquiry.java
package com.marketstage.backend.inquiries.domain;

import com.marketstage.backend.accounts.domain.User;
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

    // 1) 문의글 일련번호 (PK)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "INQUIRY_SEQ")
    private Integer inquirySeq;

    // 2) 처리자 일련번호 (FK) — NULL 허용, PROTECT 성격은 DB FK 제약(ON DELETE RESTRICT/NO ACTION)으로 대응
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(
        name = "PROCESSED_SEQ",
        nullable = true,
        foreignKey = @ForeignKey(ConstraintMode.CONSTRAINT)
        // 필요 시 이름 고정: @ForeignKey(name = "FK_T_INQUIRY__PROCESSED_SEQ")
    )
    private User processedBy;

    // 3) 문의자 이름
    @Column(name = "NAME", nullable = false, length = 100)
    private String name;

    // 4) 문의자 이메일
    @Column(name = "EMAIL", nullable = false, length = 150)
    private String email;

    // 5) 문의글 제목
    @Column(name = "TITLE", nullable = false, length = 200)
    private String title;

    // 6) 문의글 내용
    @Column(name = "MESSAGE", nullable = false, columnDefinition = "TEXT")
    private String message;

    // 7) 제출 일시 — 장고 default=timezone.now 대응
    @Column(name = "SUBMITTED_AT", nullable = false)
    private LocalDateTime submittedAt;

    // 8) 처리 일시 — NULL 허용
    @Column(name = "PROCESSED_AT")
    private LocalDateTime processedAt;

    // 9) 처리 상태 — 장고 default=False 대응 (boolean 기본값이 false)
    @Column(name = "IS_PROCESSED", nullable = false)
    private boolean processed;

    // INSERT 직전에 기본값 채우기
    @PrePersist
    void prePersist() {
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
        // processed(boolean)은 디폴트가 false이므로 별도 처리 불필요
    }

    @Override
    public String toString() {
        return "[" + inquirySeq + "] " + title;
    }
}

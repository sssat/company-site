// accounts/domain/LoginLog.java

package com.marketstage.backend.accounts.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "loginLogSeq")
@Entity
@Table(name = "T_LOGIN_LOG")
public class LoginLog {

    // 1) 시도 일련번호 (PK) — AutoField 대응
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "LOGIN_LOG_SEQ")
    private Integer loginLogSeq;

    // 2) 회원 일련번호 (FK) — 실패 시도(미존재 아이디)도 남기기 위해 NULL 허용
    //    Django on_delete=PROTECT → DB FK 제약(ON DELETE RESTRICT/NO ACTION)로 대응
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(
        name = "USER_SEQ",
        nullable = true,
        foreignKey = @ForeignKey(ConstraintMode.CONSTRAINT)
        // 필요 시 이름 고정: foreignKey = @ForeignKey(name = "FK_T_LOGIN_LOG__USER_SEQ")
    )
    private User user;

    // 3) 사용자가 입력한 아이디(성공/실패 공통)
    @Column(name = "INPUT_ID", nullable = false, length = 50)
    private String inputId;

    // 4) 로그인 시도 시각 — Django default=timezone.now 대응
    @Column(name = "ATTEMPTED_AT", nullable = false)
    private LocalDateTime attemptedAt;

    // 5) 성공 여부
    @Column(name = "IS_SUCCESS", nullable = false)
    private boolean success;

    // 6) IP 주소 (IPv4/IPv6 고려: 최대 45자)
    @Column(name = "IP_ADDRESS", nullable = false, length = 45)
    private String ipAddress;

    // 7) 유저 에이전트 — 긴 문자열 허용(TextField 대응)
    @Column(name = "USER_AGENT", columnDefinition = "TEXT")
    private String userAgent;

    // 8) 입력 비밀번호 해시값 — NULL 허용
    @Column(name = "INPUT_PASSWORD_HASH", length = 255)
    private String inputPasswordHash;

    // INSERT 직전: attemptedAt 기본값(now) 채우기
    @PrePersist
    void prePersist() {
        if (attemptedAt == null) {
            attemptedAt = LocalDateTime.now();
        }
    }

    // 사람이 읽기 좋은 로그용 문자열
    private static final DateTimeFormatter ISO_SECS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public String toString() {
        String when = (attemptedAt != null) ? attemptedAt.format(ISO_SECS) : "null";
        return "[" + loginLogSeq + "] " + inputId + " @ " + when + " (" + (success ? "SUCCESS" : "FAIL") + ")";
    }
}

// accounts/domain/model/UserLevel.java

package com.marketstage.backend.accounts.domain.model;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "gradeCode")
@Entity
@Table(name = "T_USER_LEVEL")
public class UserLevel {

    // PK: 회원등급코드 (0:일반, 1:관리자, 2:슈퍼관리자)
    // DB 타입은 환경에 따라 TINYINT/SMALLINT 등으로 매핑됨
    @Id
    @Column(name = "GRADE_CODE")
    private Short gradeCode; // tinyint/smallint에 대응 — 값 범위가 작으므로 Short 사용

    // 등급명 (예: "일반", "관리자", "슈퍼관리자")
    @Column(name = "GRADE_NAME", nullable = false, length = 20)
    private String gradeName;

    @Override
    public String toString() {
        return "[등급 " + gradeCode + "] " + gradeName;
    }
}

// accounts/infra/persistence/UserLevelRepositoryJpaAdapter.java

package com.marketstage.backend.accounts.infra.persistence;

import com.marketstage.backend.accounts.application.port.out.UserLevelRepository;
import com.marketstage.backend.accounts.domain.model.UserLevel;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserLevelRepositoryJpaAdapter implements UserLevelRepository {

    // 이 어댑터가 내부적으로 사용할 Spring Data JPA 레포지토리
    private final SpringDataUserLevelRepository jpa;

    // ─────────────────────────────────────────────────────────
    // 1) 조회
    // ─────────────────────────────────────────────────────────

    /**
     * 등급 코드(0/1/2)로 UserLevel 한 건 조회
     * 포트 시그니처는 byte이므로, 엔티티 필드 타입(Short)로 캐스팅하여 위임한다.
     */
    @Override
    public Optional<UserLevel> findByCode(byte gradeCode) {
        // byte(–128~127) → short 캐스팅, 등급코드는 0/1/2 범위로 사용
        Short code = (short) gradeCode;
        return jpa.findByGradeCode(code);
    }
}

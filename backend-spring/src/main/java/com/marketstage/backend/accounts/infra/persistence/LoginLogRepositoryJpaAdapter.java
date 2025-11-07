// accounts/infra/persistence/LoginLogRepositoryJpaAdapter.java

package com.marketstage.backend.accounts.infra.persistence;

import com.marketstage.backend.accounts.application.port.out.LoginLogRepository;
import com.marketstage.backend.accounts.domain.model.LoginLog;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoginLogRepositoryJpaAdapter implements LoginLogRepository {

    // 이 어댑터가 내부적으로 사용할 Spring Data JPA 레포지토리
    private final SpringDataLoginLogRepository jpa;

    // ─────────────────────────────────────────────────────────
    // 1) 저장 (성공/실패 모든 로그인 시도 로그 기록)
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional // 쓰기 작업이므로 readOnly 해제
    public void append(LoginLog log) {
        // 필요한 최소 정보(사용자, 시각, 성공여부, IP/UA 등)가 채워졌다는 전제하에 저장 위임
        jpa.save(log);
        // 필요 시 즉시 반영 보장을 위해 jpa.flush() 호출 가능
    }
}

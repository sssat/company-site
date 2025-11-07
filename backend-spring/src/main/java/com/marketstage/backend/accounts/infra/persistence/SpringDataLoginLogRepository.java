// accounts/infra/persistence/SpringDataLoginLogRepository.java

package com.marketstage.backend.accounts.infra.persistence;

import com.marketstage.backend.accounts.domain.model.LoginLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SpringDataLoginLogRepository extends JpaRepository<LoginLog, Integer> {
    // 기본적으로는 추가 메서드 필요 없음.
}

// accounts/application/port/out/UserLevelRepository.java

package com.marketstage.backend.accounts.application.port.out;

import com.marketstage.backend.accounts.domain.model.UserLevel;
import java.util.Optional;

public interface UserLevelRepository {

    // 1. 등급 코드(0/1/2)로 UserLevel 한 건을 찾아오는 메서드
    // 회원가입 (USER(0) 로드), 관리자 승격 (ADMIN(1) 로드), 일반 사용자 강등 (USER(0) 로드) 시 사용함
    Optional<UserLevel> findByCode(byte gradeCode);
}

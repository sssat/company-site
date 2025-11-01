// accounts/application/port/out/UserLevelRepository.java
// (아웃바운드) 애플리케이션 포트 — 권한 등급(UserLevel) 조회 전용.
// 승격/강등 유즈케이스에서 grade_code로 등급 엔티티를 로드할 때 사용

package com.marketstage.backend.accounts.application.port.out;

import com.marketstage.backend.accounts.domain.model.UserLevel;
import java.util.List;
import java.util.Optional;

public interface UserLevelRepository {

    /**
     * 등급 코드(0=USER, 1=ADMIN, 2=SUPER_ADMIN 등)로 조회
     */
    Optional<UserLevel> findByCode(byte gradeCode);

    /**
     * 등급 전체 목록 (관리자 UI 셀렉트/표시용)
     */
    List<UserLevel> findAll();

    /**
     * 코드 존재 여부 (시드/검증용 선택 메서드)
     */
    default boolean existsByCode(byte gradeCode) {
        return findByCode(gradeCode).isPresent();
    }
}

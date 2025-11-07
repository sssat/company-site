// accounts/infra/persistence/SpringDataUserLevelRepository.java

package com.marketstage.backend.accounts.infra.persistence;

import com.marketstage.backend.accounts.domain.model.UserLevel;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SpringDataUserLevelRepository extends JpaRepository<UserLevel, Short> {

    // 등급 코드로 한 건 조회
    // 규칙: findBy + 프로퍼티명(PascalCase) => UserLevel.gradeCode 에 매핑됨
    Optional<UserLevel> findByGradeCode(Short gradeCode);

    // 등급 코드 존재 여부 확인
    boolean existsByGradeCode(Short gradeCode);
}

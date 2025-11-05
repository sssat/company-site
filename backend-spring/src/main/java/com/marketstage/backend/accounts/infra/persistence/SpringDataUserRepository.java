// accounts/infra/persistence/SpringDataUserRepository.java
// Spring Data JPA Repository: DB 자동쿼리 인터페이스
// SQL을 직접 안 쓰고, 메서드 이름만 선언해두면 스프링이 적절한 SQL을 자동으로 실행해 주는 인터페이스
// JPA를 편하게 쓰게 해주는 역할
// 따라서 JPA를 쓴다고 해서 꼭 Spring Data JPA Repository를 만들 필요는 없고, JPA 안쓸거면 Spring Data JPA Repository는 생성할 필요가 없다.
// 엔티티 클래스(User.java), 아웃바운드 포트 인터페이스(application/port/out/UserRepository.java)를 토대로 작성
// 한마디로 SpringDataUserRepository.java는 인프라 어댑터(UserRepositoryJpaAdapter.java)가 쓰기위한 DB 자동쿼리 인터페이스이다. 
// 따라서 이곳에서 시그니처로 정의한 메서드들은 인프라 어댑터에서 쓰이고, 메서드의 구현은 개발자가 할 필요 없고 Spring Data JPA가 알아서 구현 해준다.
// 하지만 여기서 모든 DB 쿼리 메서드들을 정의한것은 아닌데, 상대적으로 간단한 메서드들만 이곳에서 선언(시그니처)하고
// 복잡한 DB 동적 쿼리 메서드들은 개발자가 직접 인프라 어댑터(UserRepositoryJpaAdapter)에서 구현해줘야한다.

// UserRepository.java에 선언된 메서드들은 기본적으로 인프라 어댑터(UserRepositoryJpaAdapter.java)가 전부 구현하는 건 맞다.
// 이때 인프라 어댑터(UserRepositoryJpaAdapter.java)는 구현 로직 안에서,
// 비교적 간단한 메서드들(단순 조회/exists/저장/부분 업데이트 등)은 SpringDataUserRepository.java에 위임해서 처리한다.
// SpringDataUserRepository.java 쪽에는 해당 메서드들의 시그니처만 선언해 두면,
// 스프링 데이터 JPA가 런타임에 실제 구현 클래스를 자동 생성해 준다.
// 반면, countBySearch, findBySearch 같은 복잡한 동적 쿼리는
// 인프라 어댑터(UserRepositoryJpaAdapter.java)에서 EntityManager/Criteria API를 사용해 직접 로직을 구현한다.

package com.marketstage.backend.accounts.infra.persistence; 

import com.marketstage.backend.accounts.domain.model.User;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// JpaRepository를 상속하므로 기본 CRUD를 자동으로 제공받는다.
public interface SpringDataUserRepository extends JpaRepository<User, Integer> {

    // ─────────────────────────────────────────────────────────
    // 조회 계열
    // ─────────────────────────────────────────────────────────
    // 메서드 이름을 분석해서 적절한 JPQL/SQL을 자동 생성
    Optional<User> findByUserId(String userId);
    Optional<User> findByEmail(String email);

    boolean existsByUserId(String userId);
    boolean existsByEmail(String email);

    // 권한(UserLevel)까지 한 번에 필요할 때(의도를 드러내는 네이밍)
    @EntityGraph(attributePaths = "level")
    Optional<User> findWithLevelByUserSeq(Integer userSeq);

    // ─────────────────────────────────────────────────────────
    // 부분 업데이트(성능 최적화용)
    // ─────────────────────────────────────────────────────────
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update User u set u.lastLoginAt = :ts where u.userSeq = :userSeq")
    int updateLastLoginAt(@Param("userSeq") Integer userSeq, @Param("ts") LocalDateTime ts);
}
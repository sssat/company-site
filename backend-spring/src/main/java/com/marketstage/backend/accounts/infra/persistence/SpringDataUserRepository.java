// accounts/infra/persistence/SpringDataUserRepository.java
// Spring Data JPA Repository: DB 자동쿼리 인터페이스
// SQL을 직접 안 쓰고, 메서드 이름만 선언해두면 스프링이 적절한 SQL을 자동으로 실행해 주는 인터페이스 
// => JPA(장고로 치면 ORM)를 편하게 쓰게 해주는 역할

// JPA 자체는 Spring Data 없이도 사용할 수 있기 때문에
// "JPA를 쓴다 = 반드시 Spring Data JPA Repository를 만들어야 한다"는 뜻은 아니다.
// 하지만 이 프로젝트처럼 Spring Data JPA를 사용하기로 했다면,
// 이런 Repository 인터페이스는 반드시 하나 정의해야 스프링이 구현 클래스를 자동 생성해 준다.

// 엔티티 클래스(User.java), 아웃바운드 포트 인터페이스(application/port/out/UserRepository.java)를 토대로 작성
// 한마디로 SpringDataUserRepository.java는 인프라 어댑터(UserRepositoryJpaAdapter.java)가 쓰기위한 DB 자동쿼리 인터페이스이다. 
// 따라서 이곳에서 시그니처로 정의한 메서드들은 인프라 어댑터에서 쓰이고, 메서드의 구현은 개발자가 할 필요 없고 Spring Data JPA가 알아서 구현 해준다.
// 하지만 여기서 모든 DB 쿼리 메서드들을 정의한것은 아닌데, 상대적으로 간단한 메서드들만 이곳에서 선언(시그니처)하고
// 복잡한 DB 동적 쿼리 메서드들은 개발자가 직접 인프라 어댑터(UserRepositoryJpaAdapter)에서 구현해줘야한다.

// UserRepository.java에 선언된 메서드들은 기본적으로 인프라 어댑터(UserRepositoryJpaAdapter.java)가 전부 구현하는 건 맞다.
// 이때 인프라 어댑터(UserRepositoryJpaAdapter.java)는 구현 로직 안에서
// 비교적 간단한 메서드들(단순 조회/exists/저장/부분 업데이트 등)은 SpringDataUserRepository.java에 위임해서 처리한다.
// SpringDataUserRepository.java 쪽에는 해당 메서드들의 시그니처만 선언해 두면,
// 스프링 데이터 JPA가 런타임에 실제 구현 클래스를 함수 이름 기반 자동 생성해 준다.
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

// JPA 라이브러리에서 제공하는 JpaRepository 인터페이스(!= UserRepository.java)를 상속하므로 
// 기본 CRUD(findById, save, delete, findAll) 메서드를 자동으로 제공받는다.
// 따라서 findById, save, delete, findAll 등의 함수는 정의하지 않아도된다. 다만, findByUserId, findByEmail, ... 같은건 정의해야 한다.
// 인터페이스가 다른 인터페이스를 상속할땐 implements가 아니라 extends를 쓴다.
public interface SpringDataUserRepository extends JpaRepository<User, Integer> {

    // 1. 각각 userId, email로 한 건 조회 하는 "함수 이름 기반 자동 생성 JPQL/SQL 쿼리"
    // 함수명이 <findBy + 필드명>, <readBy + 필드명>,  <existsBy + 필드명>,  <countBy + 필드명>, .... => 이 규칙을 따르면 스프링이 자동으로 SQL 쿼리를 생성해준다.
    // 스프링은 JpaRepository<User, Integer>에서 제네릭의 첫 번째 타입인 User를 엔티티로 인식한다. 
    // 그리고 User 엔티티의 어느 필드를 기준으로 할지는 매개변수가 아니라 함수 명을 보고 결정한다.
    // 예를들어 User 엔티티의 userId 필드가 있다면, 함수명엔 UserId처럼 첫글자를 대문자로 바꿔야 스플링이 인식한다.
    Optional<User> findByUserId(String userId);
    Optional<User> findByEmail(String email);

    // 2. 각각 userId, email로 존재 여부를 확인하는 "함수 이름 기반 자동 생성 JPQL/SQL 쿼리"
    boolean existsByUserId(String userId);
    boolean existsByEmail(String email);

    // 3. User 한 건을 가져오면서, 그 유저가 참조하는 UserLevel(권한 정보)까지 한 번에 로딩하는 "함수 이름 기반 자동 생성 JPQL/SQL 쿼리"
    // 여기서 함수명이 <findBy + 필드명>은 아니지만, <find + 중간에 설명어 + By + 필드명> 이라도 여전히 UserSeq를 기준으로 하는 "함수 이름 기반 자동 생성 쿼리"이다.
    @EntityGraph(attributePaths = "level")  // 메서드를 실행할 때 User 엔티티의 연관 필드인 level도 즉시 로딩 해달라는 힌트 
    Optional<User> findWithLevelByUserSeq(Integer userSeq);

    // 4. @Query안의 JPQL 쿼리(JPA 전용 SQL 같은 쿼리 언어)를 보고 스프링이 실행해주는 "@Query 기반 수동 쿼리"
    // 특정 userSeq 유저의 lastLoginAt 컬럼을 전달받은 ts 값(timestamp)으로 업데이트하고, 수정된 행 수(int)를 반환
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update User u set u.lastLoginAt = :ts where u.userSeq = :userSeq")
    int updateLastLoginAt(@Param("userSeq") Integer userSeq, @Param("ts") LocalDateTime ts);
}
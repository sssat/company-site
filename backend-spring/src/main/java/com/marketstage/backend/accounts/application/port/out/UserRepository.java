// accounts/application/port/out/UserRepository.java
// 유저에 대한 저장/조회 퍼시스턴스 아웃바운드 포트(계약서)
// 파이썬 장고에 딱히 대응되는 것은 없다.
// 서비스가 User 데이터를 어떻게 조회/저장할지 방법(시그니처)만 정해두고, 
// 실제 세부적인 로직 구현은 인프라 어댑터(infra/persistence/UserRepositoryJpaAdapter)가 구현함
// 따라서 class가 아닌, interface로 구현함

package com.marketstage.backend.accounts.application.port.out;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

import com.marketstage.backend.accounts.domain.model.User;

// User 저장소 포트(도메인 인터페이스): 유즈케이스 중심 메서드만 노출하고, 실제 구현은 infra 어댑터에서 담당
public interface UserRepository {

    // 1. PK로 단건을 조회
    // 리턴: Optional<User> -> User 타입의 반환값이 "있을 수도 있고, 없을수도 있다"는 표현. <>는 제네릭 타입
    // 즉, 조회 했는데 해당 유저가 없을 수도 있기 때문에 Optional
    // 메서드명: findById
    // 파라미터: Integer userSeq -> DB의 USER_SEQ(PK) 값
    Optional<User> findById(Integer userSeq);

    // 2. user_id(로그인 아이디)로 단건 조회 
    // 아이디 찾기/중복확인
    Optional<User> findByUserId(String userId);

    // 3. email로 단건 조회. 이메일 찾기/중복확인/계정 찾기에서 쓰임
    Optional<User> findByEmail(String email);

    // 4. User와 그에 딸린 UserLevel(권한)을 "한 번의 쿼리"로 같이 가져오는 메서드
    // 관리자 페이지에서 권한에 따른 분기 처리
    // 관리자 페이지에서 승격/강등 전 현재 등급 확인
    Optional<User> findByIdWithLevel(Integer userSeq);

    // 5. 회원가입 사전검증(아이디 중복확인)
    // 존재 여부만 0 or 1로 확인하면 되기 때문에 Optional이 아님
    boolean existsByUserId(String userId);

    // 6. 회원가입 사전검증(이메일 중복확인)
    boolean existsByEmail(String email);

    // 7. 엔티티 저장/갱신
    // 저장은 성공하면 반드시 결과가 있기 때문에 Optional이 아님
    // 새 엔티티(PK 없음) -> INSERT
    // 기존 엔티티(PK 있음) -> UPDATE
    User save(User user);

    // 8. 로그인에 성공했을 때, 해당 사용자의 LAST_LOGIN_AT 컬럼만 빠르게 한 줄 UPDATE 하는 전용 메서드
    // 엔티티 전체를 로딩/수정/저장하지 않고, 부분 업데이트(UPDATE 1쿼리)로 끝내 성능을 아끼려는 포트 -> 엔티티를 다시 읽어오지 않고 부분 업데이트만 수행하기 때문에 void
    void updateLastLoginAt(Integer userSeq, LocalDateTime lastLoginAt);

    // 9. 회원 관리 페이지에서 현재 검색 조건으로 총 몇 명이 매치되는지를 반환하는 메서드
    long countBySearch(Integer roleHint, List<String> terms);

    // 10. 회원 관리 페이지에서 현재 검색 조건으로 해당 페이지의 행들만 가져오는 메서드
    List<User> findBySearch(Integer roleHint, List<String> terms, int offset, int limit);
}
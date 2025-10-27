//  
// 파이썬 장고에 딱히 대응되는 것은 없다.
// 유즈케이스(Service)가 사용자(User) 데이터를 어떻게 조회/저장할지 방법(시그니처)만 정해두고, 실제 DB 접근 구현은 infra가 맡도록 분리한 계약서 -> 따라서 class가 아닌, interface로 구현함
// 쉽게말해 해야 할 일의 목록(시그니처)만 정의한 도메인 계약서 -> 실제 구현은 infra/UserRepositoryJpaAdapter.java에서 구현함 -> Service(유즈케이스)는 infra의 구현을 호출해서 비즈니스 절차를 진행할 뿐, DB 접근을 구현하지 않는다.

package com.marketstage.backend.accounts.domain;

import java.time.LocalDateTime;
import java.util.Optional;

    // User 저장소 포트(도메인 인터페이스): 유즈케이스 중심 메서드만 노출하고, 실제 구현은 infra 어댑터에서 담당
    public interface UserRepository {

        // 1. PK로 단건을 조회
        // 리턴: Optional<User> -> User 타입의 반환값이 "있을 수도 있고, 없을수도 있다"는 표현. <>는 제네릭 타입
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
        boolean existsByUserId(String userId);

        // 6. 회원가입 사전검증(이메일 중복확인)
        boolean existsByEmail(String email);

        // 7. 엔티티 저장/갱신
        // 새 엔티티(PK 없음) -> INSERT
        // 기존 엔티티(PK 있음) -> UPDATE
        User save(User user);

        // 8. 로그인에 성공했을 때, 해당 사용자의 LAST_LOGIN_AT 컬럼만 빠르게 한 줄 UPDATE 하는 전용 메서드
        // 엔티티 전체를 로딩/수정/저장하지 않고, 부분 업데이트(UPDATE 1쿼리)로 끝내 성능을 아끼려는 포트
        void updateLastLoginAt(Integer userSeq, LocalDateTime lastLoginAt);
    }


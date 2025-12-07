// accounts/domain/model/User.java
// 1. User 도메인 모델
// => 사용자(회원) 정보를 담는 도메인 엔티티(@Entity)
// 참고로 accounts, news, inquiries는 도메인이고, accounts 안의 User, UserLevel, LoginLog 등이 엔티티이다.
// 파이썬 장고 models.py의 class User(models.Model) 클래스가 대응됨
// 파이썬은 하나의 .py 파일 안에 여러 클래스를 자유롭게 정의하지만,
// 자바의 public 클래스는 .java 파일당 하나만 허용되고, 파일명과 public 클래스명이 일치해야 한다.
// 그 외에는 클래스 앞에 public을 붙일 수 없다.
// 따라서 관례상 User.java 파일에는 public class User 엔티티 하나만 정의한다.

// 2. 포트(Port)
// => 바깥세계(웹/UI/DB/외부 시스템 등)와 "어떻게 통신할지"를 정의한 인터페이스(계약서)

// 3. 인바운드 포트(Inbound Port) 
// 바깥(웹/UI/컨트롤러) -> 애플리케이션 내부로 들어오는 요청 통로
// 컨트롤러(또는 다른 어댑터)가 호출하는 유즈케이스 인터페이스

// 4. 아웃바운드 포트(Outbound Port)
// 애플리케이션 내부(서비스) -> 바깥 자원(DB, JWT, 메일, S3 등)으로 나가는 의존 통로.
// 서비스가 호출하고, 실제 구현은 인프라 어댑터(JPA, 외부 API 클라이언트 등)가 담당한다.

// 5. 퍼시스턴스 아웃바운드 포트
// => 서비스가 DB/스토리지에 "무엇을" 요청할 수 있는지 정의한 인터페이스(계약)
// 저장/조회/검색 등의 기능 시그니처만 선언하고, 구현 방식(JPA, MyBatis, 직접 JDBC 등)은 모른다.

// 6. 어댑터(Adapter)
// => 포트(인터페이스)의 구현체. 기술 구체화

// [작성 순서 (레이어드 + 헥사고날 아키텍처)]
// 1. 도메인 모델: domain/model/User.java, UserLevel.java, LoginLog.java
// 2. 애플리케이션 포트
//    (1) 인바운드 포트 (=유즈케이스): application/port/in/AccountsUseCase.java
//    (2) 아웃바운드 포트 (아웃바운드 포트는 유즈케이스 아님)
//      1) application/port/out/UserRepository.java (유저에 대한 저장/조회 퍼시스턴스 아웃바운드 포트)
//      2) application/port/out/UserLevelRepository.java (권한 등급 조회 퍼시스턴스 아웃바운드 포트)
//      3) application/port/out/LoginLogRepository.java (로그/감사 퍼시스턴스 아웃바운드 포트)
//      4) application/port/out/JwtIssuer.java (토큰 발급을 위한 아웃바운드 포트)
//      5) application/port/out/JwtVerifier.java (엑세스 토큰 갱신을 위한 아웃바운드 포트)
// 3. 공통 예외 처리: common/exception/NotFoundException.java -> 서비스에서 바로 쓸 수 있어야 하므로 초기에 작성하고, 실질적 로직은 없음 (빈 껍데기만 제작)
// 4. 서비스 (=유즈케이스의 구현): application/service/AccountsService.java
// 5. 인프라 
//   (0) 공통 인프라 유틸
//     1) 공통 JPA 컨버터: common/jpa/LocalDateStringAttributeConverter.java -> JPA가 DB와 값을 변환할 때 쓰는 로우레벨 기술 유틸이라 포트 대상 자체가 아니라서 포트 안 만듦
//     2) 메일 어댑터: common/mail/MailService.java -> 메일 발송은 현재 common/mail/MailService로 바로 구현했음 (아웃바운드 포트는 따로 두지 않음). 하지만 추후 MailPort 인터페이스를 분리해서 헥사고날 구조로 확장해도 무방하다.
//     => 둘 다 실제로는 infra 폴더가 아니라 common 폴더에 위치하지만,
//        로그인/뉴스/문의 등 여러 모듈에서 공통으로 사용하는 인프라 유틸/어댑터이기 때문에
//        common 패키지에 두었음. 아키텍처 관점에서는 인프라 계층에 속하지만,
//        물리적인 파일 위치만 infra가 아니라 common 아래로 두었다.
//   (1) Persistence(퍼시스턴스)
//     1) Spring Data JPA Repository: infra/persistence/SpringDataUserRepository.java, SpringDataUserLevelRepository.java, SpringDataLoginLogRepository.java
//     2) 아웃바운드 포트 구현체(Adapter): infra/persistence/UserRepositoryJpaAdapter.java, UserLevelRepositoryJpaAdapter.java, LoginLogRepositoryJpaAdapter.java 
//   (2) JWT 어댑터: infra/security/JwtIssuerImpl.java, infra/security/JwtVerifierImpl.java
// 6. 설정 클래스/빈 정의: common/AppConfig.java
// 7. API 계층 
//   (1) 요청/응답 DTO: src/main/java/com/marketstage/backend/accounts/api/dto/* 
//   (2) 컨트롤러: src/main/java/com/marketstage/backend/accounts/api/AccountsController.java
//   (3) 전역 예외 처리: src/main/java/com/marketstage/backend/common/GlobalExceptionHandler.java -> HTTP 상태/에러 바디 포맷을 컨트롤러/명세에 맞춰 매핑해야 해서 실질적 로직이 존재하고, 맨 나중에 작성

// [작성 순서 (순수 레이어드 아키텍처 버전)]
// 1. 도메인 계층 (Domain Layer)
//   - 엔티티 및 도메인 모델
//   - src/main/java/com/marketstage/backend/accounts/domain/model/
//     1) User.java
//     2) UserLevel.java
//     3) LoginLog.java

// 2. 인프라/퍼시스턴스 계층 (Infrastructure / Persistence Layer)
//   (1) JPA 관련 공통 유틸
//     - common/jpa/LocalDateStringAttributeConverter.java
//   (2) Spring Data JPA Repository
//     - infra/persistence/SpringDataUserRepository.java
//     - infra/persistence/SpringDataUserLevelRepository.java
//     - infra/persistence/SpringDataLoginLogRepository.java
//     => 헥사고날의 "퍼시스턴스 아웃바운드 포트 + 어댑터"를 쓰지 않고,
//        서비스가 바로 Spring Data Repository 인터페이스를 주입받아 사용.
//   (3) JWT / 메일 등 인프라 서비스
//     - infra/security/JwtService.java (예: JwtIssuer + JwtVerifier 역할 통합 가능)
//     - common/mail/MailService.java
//     => 이들도 별도의 포트 인터페이스 없이, 서비스에서 직접 의존.

// 3. 공통 예외 / 설정
//   - common/exception/NotFoundException.java
//   - common/AppConfig.java

// 4. 서비스 계층 (Service / Application Layer)
//   - 비즈니스 로직 구현체 (포트 인터페이스 없이 바로 서비스 클래스로 사용)
//   - src/main/java/com/marketstage/backend/accounts/application/service/
//     1) AccountsService.java
//   - 의존성:
//     - SpringDataUserRepository, SpringDataUserLevelRepository, SpringDataLoginLogRepository
//     - JwtService, MailService 등 인프라 빈을 바로 주입받아 사용.

// 5. API / 프레젠테이션 계층 (Presentation / Web Layer)
//   (1) 요청/응답 DTO
//     - src/main/java/com/marketstage/backend/accounts/api/dto/*
//   (2) 컨트롤러
//     - src/main/java/com/marketstage/backend/accounts/api/AccountsController.java
//   (3) 전역 예외 처리
//     - src/main/java/com/marketstage/backend/common/GlobalExceptionHandler.java
//     => HTTP 상태 코드 & 에러 바디 포맷을 컨트롤러/명세에 맞춰 매핑.

// [코드 작성 후 해야할 것]
// 1. 전체 빌드 & 런타임 검증 (backend-spring 폴더 안에서 실행)
// (1) 전체 빌드 실행: 
// (2) 애플리케이션 실행
//   1) 개발모드 서버실행: .\gradlew bootRun => 얘는 빌드 + 서버실행 동시에 진행
//   2) 브라우저로 헬스체크: http://localhost:8080/actuator/health/로 들어가서 {"status":"UP"} 뜨나 확인
//   3) Postman으로 api 테스트
// 2. 권한/보안 체크(일단 "로컬 운영모드" 버전으로)
//   1) 권한/보안 관련 파일들 "로컬 운영모드"에 맞게 수정
//   2) 전체 빌드 실행: .\gradlew clean build
//   3) 운영모드 서버실행: java -jar .\build\libs\backend-spring-0.0.1-SNAPSHOT.jar => 얘는 빌드 없이 서버만 실행
//   4) 브라우저로 헬스체크: http://localhost:8080/actuator/health/로 들어가서 {"status":"UP"} 뜨나 확인
//   5) Postman으로 api 테스트
// 3. 프론트엔드 연동 (frontend-spring)


// User 클래스가 위치한 패키지 경로
package com.marketstage.backend.accounts.domain.model;

// JPA 표준 매핑에 필요한 어노테이션/타입들을 불러옴 -> *는 와일드카드로 같은 패키지의 여러 타입을 한꺼번에 import
import jakarta.persistence.*; 

// 보일러플레이트(의미는 뻔한데 매번 길게 써야 하는 반복 코드 -> 게터/세터, 생성자, toString, equals/hashCode, 빌더)를 컴파일 시 자동 생성해 코드량을 줄인다.
// Lombok은 이런 반복 코드를 어노테이션 한 줄로 자동 생성해준다.
import lombok.*;    

import java.time.LocalDate;      // LocalDate : 날짜(연-월-일)만 표현
import java.time.LocalDateTime;  // LocalDateTime : 날짜+시각(초까지) 표현

// 모든 필드에 대한 getter/setter 메서드를 컴파일 시 자동 생성해 보일러플레이트 코드를 줄여줌 (Lombok 라이브러리에서 가져옴)
@Getter @Setter

// 기본 생성자와 모든 필드 인자를 받는 생성자를 자동 생성 (Lombok)
@NoArgsConstructor @AllArgsConstructor

// User.builder().userId("id").email("e@x.com").build() 형태의 빌더 패턴 메서드를 만들어 가독성/안전성을 높임 (Lombok)
@Builder

// 롬복(Lombok)이 equals()와 hashCode() 메서드를 직접 생성해주는데, 두 메서드의 비교/해시 기준을 오직 userSeq(PK) 하나로만 삼게함
@EqualsAndHashCode(of = "userSeq")

// 이 클래스가 JPA 엔티티임을 표시 -> 영속성 컨텍스트(JPA의 1차 캐시이자 엔티티 관리 공간)에서 관리되고 DB 테이블과 매핑된다 (JPA)
@Entity

// @이름(속성=값, 속성=값, ...) => 자바의 메타데이터(클래스/메서드/필드가 "무엇인지, 어떻게 다뤄야 하는지"와 같은 설명 정보) 문법
// 위에서 @Entity는 속성 없는 어노테이션. @Table(name = "T_USER")은 속성 있는 어노테이션
// 이처럼 어노테이션에 속성 값을 지정해주면 프레임워크/컴파일러가 읽어 다른 행동을 한다.
@Table(
    name = "T_USER",  // 매핑 대상 테이블명 지정
    uniqueConstraints = {
        @UniqueConstraint(name = "UK_T_USER_EMAIL",   columnNames = {"EMAIL"}),   // EMAIL 컬럼 값이 중복될 수 없도록 DB에 유니크 제약을 둔다.
        @UniqueConstraint(name = "UK_T_USER_USER_ID", columnNames = {"USER_ID"})  // USER_ID 컬럼에도 고유 값(유니크) 보장
    }
)
public class User {

    // 1. 회원일련번호
    @Id                                                 // 이 필드가 엔티티의 기본키(PK)임을 JPA에 선언하는 어노테이션
    @GeneratedValue(strategy = GenerationType.IDENTITY) // PK 값을 DB의 IDENTITY(=AUTO_INCREMENT) 기능으로 생성
    @Column(name = "USER_SEQ")                          // 만약 이미 DB가 존재한다면 자바 필드 userSeq를 DB 컬럼 USER_SEQ에 매핑하고, DB가 아직 없다면 실제 DB에 컬럼명이 USER_SEQ로 생성되게 한다.
    private Integer userSeq;

    // 2. 회원등급번호 FK
    // @ManyToOne: 이 필드(level)가 다른 엔티티(UserLevel) 를 참조한다는 의미. N(User) : 1(UserLevel) 관계
    // LAZY: 실제 접근 시 쿼리로 로딩(지연 로딩)
    // optional=false: NULL 불가
    @ManyToOne(fetch = FetchType.LAZY, optional = false) 
    
    // @JoinColumn: User 테이블 안에 GRADE_CODE라는 컬럼을 만들고, 그 값으로 UserLevel의 PK를 참조하라는 뜻
    @JoinColumn(
        name = "GRADE_CODE", 
        nullable = false,
        foreignKey = @ForeignKey(ConstraintMode.CONSTRAINT)  // 이 조인 컬럼에 대해 실제 DB에 외래키 제약(FK CONSTRAINT)을 만들라는 뜻
    )    
    private UserLevel level;                              

    // 3. 이메일
    @Column(name = "EMAIL", nullable = false, length = 150) // NOT NULL, 최대 150자 (유니크 제약은 클래스 상단 @Table에서 설정됨)
    private String email;

    // 4. 아이디
    @Column(name = "USER_ID", nullable = false, length = 50) // NOT NULL, 최대 50자. (유니크 제약은 상단 @Table)
    private String userId;

    // 5. 이름
    @Column(name = "USER_NAME", nullable = false, length = 100)
    private String userName;

    // 6. 비밀번호 해시
    @Column(name = "PASSWORD_HASH", nullable = false, length = 255)
    private String passwordHash;

    // 7. 비밀번호 변경 시각 — NULL 허용
    @Column(name = "PASSWORD_CHANGED_AT")
    private LocalDateTime passwordChangedAt;

    // 8. 성별: 'M' 또는 'F'
    public enum Gender { M, F }

    @Enumerated(EnumType.STRING)                                             // Enum을 문자열(예: "M", "F")로 DB에 저장
    @Column(name = "GENDER", columnDefinition = "CHAR(1)", nullable = false) // DB 컬럼 GENDER, 타입 의도를 CHAR(1) 로 명시, NOT NULL
    private Gender gender;

    // 9. 생년월일
    @Convert(converter = com.marketstage.backend.common.jpa.LocalDateStringAttributeConverter.class)
    @Column(name = "BIRTH_DATE", nullable = false)
    private LocalDate birthDate;
    
    // 10. 가입일 — 장고 default=timezone.now 대응
    @Column(name = "JOINED_AT", nullable = false)
    private LocalDateTime joinedAt;

    // 10-1. 레코드 생성 시각 — 장고 BaseModel.created_at 대응(도메인에선 거의 사용 X)
    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // DB에 처음 저장되기 직전에 이 함수를 자동으로 한 번 호출해달라는 어노테이션
    @PrePersist

    // prePersist(): 그때 실행될 준비 작업 함수
    void prePersist() {
        if (joinedAt == null) {              // 가입시간이 아직 안 채워져 있다면
            joinedAt = LocalDateTime.now();  // 기본 가입 시각을 현재 시각으로 채움
        }

        // CREATED_AT은 DB NOT NULL 제약 때문에 반드시 값이 있어야 함
        // 비즈니스 의미는 거의 없으니까 joinedAt과 같은 값으로 맞춰줌
        if (createdAt == null) {
            createdAt = joinedAt;   // 또는 createdAt = now; 둘 다 무방
        }
    }

    // 11. 마지막 로그인 시각 — NULL 허용
    @Column(name = "LAST_LOGIN_AT")
    private LocalDateTime lastLoginAt;

    // 12. 관리자 권한 부여 일시 — NULL 허용ㄴ(강등 시 null)
    @Column(name = "GRANTED_AT")
    private LocalDateTime grantedAt;

    // 디버깅 할때 사용하기 위한 함수
    @Override
    public String toString() {
        return "[" + userSeq + "] " + userId + " (" + userName + ")";  // 예: [12] testuser (홍길동) 
    }
}

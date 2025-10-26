// accounts/domain/User.java
// 사용자(회원) 정보를 담는 도메인 엔티티(@Entity)
// 파이썬 장고 models.py의 class User(models.Model) 클래스가 대응됨
// 파일 안에 클래스 몇개든 자유롭게 선언가능한 파이썬과 다르게 
// 자바는 메인이 되는 public 클래스가 .java 파일 당 하나만 지정할 수 있기 때문에 User.java에는 User 클래스(테이블) 하나만 정의되어있다.
// User.java 안에 클래스를 정의하면 스프링이 알아서 DB 테이블로 바꿔준다.
// 작성 순서: (1) domain/User.java (2) domain/UserRepository.java (3) infra/JpaUserSpringData.java (4) infra/UserRepositoryJpaAdapter.java (5) api/dto/UserDto.java

// User 클래스가 위치한 패키지 경로
package com.marketstage.backend.accounts.domain;

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
    @Column(name = "BIRTH_DATE", nullable = false)
    private LocalDate birthDate;

    // 10. 가입일 — 장고 default=timezone.now 대응
    @Column(name = "JOINED_AT", nullable = false)
    private LocalDateTime joinedAt;

    // DB에 처음 저장되기 직전에 이 함수를 자동으로 한 번 호출해달라는 어노테이션
    @PrePersist

    // prePersist(): 그때 실행될 준비 작업 함수
    void prePersist() {
        if (joinedAt == null) {              // 가입시간이 아직 안 채워져 있다면
            joinedAt = LocalDateTime.now();  // 기본 가입 시각을 현재 시각으로 채움
        }
    }

    // 11. 마지막 로그인 시각 — NULL 허용
    @Column(name = "LAST_LOGIN_AT")
    private LocalDateTime lastLoginAt;

    // 12. 관리자 권한 부여 일시 — NULL 허용(강등 시 null)
    @Column(name = "GRANTED_AT")
    private LocalDateTime grantedAt;

    // 디버깅 할때 사용하기 위한 함수
    @Override
    public String toString() {
        return "[" + userSeq + "] " + userId + " (" + userName + ")";  // 예: [12] testuser (홍길동) 
    }
}

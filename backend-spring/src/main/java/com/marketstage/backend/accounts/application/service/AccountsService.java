// accounts/application/service/AccountsService.java
// 나는 따로 분리하지않고 views.py안에 비즈니스 로직(서비스 코드)들을 전부 작성했지만, 파이썬 장고로 치면 services.py에 가장 가깝다. 
// 서비스(AccountsService.java)는 인바운드 포트(AccountsUseCase.java)에서 시그니처로 정의만 해놓은 애들의 세부 로직을 실제 구현해서 직접 사용하고, 
// 아웃바운드 포트(UserRepository.java, ...)에서 시그니처로 정의해놓은 애들을 구현은 하지 않고 가져다 쓰기만 한다.
// 그리고 인터페이스에서 정의하고 클래스에서 구현한 메서드들은 클래스를 통해 호출하는 것이 아닌, 인터페이스를 통해 호출하는것이 좋다.
// 예를들어 JwtIssuer.java, JwtVerifier.java 인터페이스에서 선언하고, JwtIssuerImpl.java, JwtVerifierImpl.java 클래스에서 구현한 함수들은
// JwtIssuer, JwtVerifier 인터페이스를 통해 호출한다. 
// 그래서 AccountsService.java에선 JwtIssuer, JwtVerifier 이 둘을 통해 jwt 함수들을 호출하므로, 
// JwtIssuerImpl.java, JwtVerifierImpl.java는 임포트 하지 않았다.
// 마찬가지로 컨트롤러에서 서비스 코드를 호출할때도, AccountsService.java를 통해 호출하는것이 아닌 AccountsUseCase.java 인터페이스를 통해 호출한다.

package com.marketstage.backend.accounts.application.service;

import com.marketstage.backend.common.exception.NotFoundException;

// 도메인 엔티티 임포트
import com.marketstage.backend.accounts.domain.model.User;
import com.marketstage.backend.accounts.domain.model.UserLevel;
import com.marketstage.backend.accounts.domain.model.LoginLog;
import com.marketstage.backend.accounts.domain.model.User.Gender; // User 클래스 안에 선언된 enum Gender를 의미하고, 이걸 임포트하면 코드에서 User.Gender 대신 그냥 Gender로 쓸 수 있다.

// 애플리케이션 포트 임포트
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;
import com.marketstage.backend.accounts.application.port.out.JwtIssuer;
import com.marketstage.backend.accounts.application.port.out.JwtVerifier;
import com.marketstage.backend.accounts.application.port.out.UserRepository;
import com.marketstage.backend.accounts.application.port.out.UserLevelRepository; 
import com.marketstage.backend.accounts.application.port.out.LoginLogRepository;  // 로그인 로그 부분은 스프링이 기본 어드민 페이지를 제공하지 않아 UI가 없지만, DB에는 기록들이 찍히게 하기 위해 사용함

// 설정값 주입과 초기화 시점용 어노테이션
import org.springframework.beans.factory.annotation.Value;
import jakarta.annotation.PostConstruct;   

// HMAC/인코딩(토큰 서명/파싱)
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

// 장고와 동일한 sha256 hexdigest 포맷
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;

import lombok.RequiredArgsConstructor;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Objects;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.Set;
import java.util.List;


// 이 클래스는 서비스(비즈니스 로직) 역할이니까 스프링이 빈으로 등록해서 DI 하도록 하라는 표시
// 이걸 씀으로써 스프링이 빈으로 등록된 클래스 인스턴스를 알아서 만들고, 재사용(싱글톤), 주입, 트랜잭션 프록시까지 전부 스스로 관리해준다.
// 클래스 어노테이션인 @Component, @Service, @Repository, @Controller 들과, 
// 메서드 어노테이션인 @Bean으로 등록된 것들은 스프링 컨테이너가 생성/보관/주입(DI)까지 관리해준다.
// 스프링 입장에서 @Component, @Service, @Repository, @Controller 들은 다 "스캔해서 빈으로 등록" 하라는 의미고, 기본 동작은 거의 똑같다.

// @Component: 가장 기본/원시적인 스테레오타입. "이 클래스는 스프링이 관리하는 빈입니다" 정도만 표현
// => 그냥 스프링 빈

// @Service: "이건 비즈니스 로직을 담는 서비스 계층 클래스입니다" 라는 의미적인 라벨. 스프링이 특별한 기능을 더해주는 건 거의 없음 
// => 비즈니스 로직용 스프링 빈

// @Repository: "이건 데이터 접근(퍼시스턴스) 계층입니다" 라는 의미. 예외 변환 같은 부가 기능이 붙을 수 있음
// => DB/퍼시스턴스용 스프링 빈

// @Controller: 웹 MVC 진입점(컨트롤러)임을 나타내는 어노테이션. @Component 기반이며, URL 매핑(@GetMapping 등)이 붙은 메서드를 요청 핸들러로 등록해준다.
// => 웹 요청 처리용 스프링 빈

// @RestController: REST API 전용 컨트롤러 어노테이션. 내부적으로 @Controller + @ResponseBody 조합이라, 메서드 반환값을 바로 HTTP 응답 바디(JSON 등)로 직렬화해준다.
// => JSON REST API용 스프링 빈

// 즉, @Component를 써도 동작은 같지만, 이 클래스는 비즈니스 로직(유즈케이스)을 담당하므로 
// 레이어드 아키텍처 관점에서 "서비스 계층"임을 드러내기 위해 @Service를 사용한 것이다.
@Service

// 이 클래스의 모든 public 메서드가 기본적으로 트랜잭션 안에서 실행된다는 어노테이션
// 여기처럼 @Transactional만 단독으로 있다면 기본값: 쓰기 기능
// 밑의 메서드 위의 @Transactional(readOnly = true) 처럼 속성을 추가하면 읽기 전용 최적화로 실행
@Transactional

// 롬복(Lombok) 라이브러리에서 제공하는 어노테이션
// final로 선언된 변수(한 번 값을 넣으면 다시 바꿀 수 없는 변수)들을 자동으로 받는 생성자를 만들어줘서, 스프링이 그 생성자를 보고 자동 주입(DI) 하게 해주는 기능
@RequiredArgsConstructor
public class AccountsService implements AccountsUseCase {

    // 1. 유저 아웃바운드 포트 인스턴스 변수
    // 타입이 UserRepository 인터페이스인 인스턴스 변수 '정의' 
    // 최종 저장되는 값: userRepository = UserRepositoryJpaAdapter 객체 
    private final UserRepository userRepository;   
    
    // 2. 유저 레벨 아웃바운드 포트 인스턴스 변수
    // UserLevelRepository: 인터페이스 
    // 최종 저장되는 값: userLevelRepository = UserLevelRepositoryJpaAdapter 객체
    private final UserLevelRepository userLevelRepository;

    // 3. 로그인 로그 아웃바운드 포트 인스턴스 변수
    // LoginLogRepository: 인터페이스
    // 최종 저장되는 값: loginLogRepository = LoginLogRepositoryJpaAdapter 객체
    private final LoginLogRepository loginLogRepository;
    
    // 4. 토큰 발급을 위한 아웃바운드 포트 인스턴스 변수
    // JwtIssuer: 인터페이스
    // 최종 저장되는 값: jwtIssuer = JwtIssuerImpl 객체
    private final JwtIssuer jwtIssuer;  

    // 5. 비밀번호 해시 생성과 검증 담당 인스턴스 변수
    // PasswordEncoder: 인터페이스
    // BCryptPasswordEncoder: 스프링 시큐리티(외부 라이브러리)에서 제공하는 클래스
    // 최종 저장되는 값: passwordEncoder = BCryptPasswordEncoder 객체
    private final PasswordEncoder passwordEncoder; 

    // 6. 현재 시각을 외부에서 넣어주는 역할의 인스턴스 변수
    // Clock: 추상 클래스 -> "구현된 클래스"가 아니라서 구현되지 않은 메서드들을 갖고있는 "추상 클래스" 또한 new 키워드로 인스턴스 생성 불가
    // SystemClock: JDK 표준 라이브러리에서 제공하는 클래스
    // 최종 저장되는 값: clock = SystemClock 객체
    private final Clock clock;    

    // 7. 리프레시 토큰이 진짜인지, 만료 안 됐는지 검사해주는 역할의 인스턴스 변수
    private final JwtVerifier jwtVerifier;
    
    // <인스턴스 != 인스턴스 변수>
    // 1. 클래스: 물건의 설계도
    // 2. 인스턴스(객체): 그 설계도를 토대로 new 해서 만들어진 물건
    // 3. 인스턴스 변수(객체 변수): 그 물건 안에 들어있는 개별 속성들 -> 인스턴스의 소유
    // 4. 클래스 변수(정적 변수): 클래스당 1개, 모든 인스턴스가 공유 -> 클래스의 소유

    // A a = new A() 
    // new A(): 인스턴스
    // a: 그 인스턴스를 가리키는 변수 != 인스턴스 변수
    // 다만, a가 클래스 안에서 선언되면 인스턴스 변수이고, 메서드 안에서 선언되면 지역변수이다.
    // public class Test {
    //    A a = new A();     <- 여기서 a는 "인스턴스 변수"
    //    int b;             <- 여기서 b 또한 "인스턴스 변수"
    //
    //    void method() {
    //        int y = 10;         <- y는 "지역 변수"
    //        A a = new A();      <- a는 "지역 변수"이고, new A()가 "인스턴스"
    // }
    // 따라서 Test라는 클래스 안에 a라는 인스턴스 변수(필드)가 존재하고, 
    // 그 a는 A라는 인스턴스를 가리키며, A 인스턴스 안에 또 여러 인스턴스 변수(필드)들이 존재한다.

    // 쉽게 설명하면, 클래스: 설계도, 인스턴스: 설계도로 만든 완성품, 인스턴스 변수: 완성품 속의 각각의 속성들
    // 즉, 인스턴스 변수는 인스턴스 안에 있는 필드 하나를 뜻한다.
    // 따라서 인스턴스를 생성하면 인스턴스의 소유인 인스턴스 변수들은 인스턴스를 생성할때마다 만들어지지만, 
    // 클래스 변수는 클래스의 소유이기 때문에 인스턴스를 생성해도 새롭게 만들어지지 않고 오직 맨처음 클래스가 초기화될때 딱 한번만 만들어진다.
    // 인스턴스 상수, 클래스 상수 또한 클래스 안에서 '정의'하고 소유는 각각 인스턴스, 클래스의 소유이다.
    // AccountsService라는 설계도(클래스) 안에 userRepository, userLevelRepository, loginLogRepository ...등의 속성들(인스턴스 변수)이 '정의'되어 있다.
    // 그리고 AccountsService 클래스에는 @Service를 붙였기때문에, AccountsService 인스턴스를 new로 생성하는 행위는 스프링이 대신 해준다.
    // AccountsService.java는 클래스(설계도)를 정의한 파일일뿐, 여기서 직접 뭔가를 실행하진 않는다.

    // 만약 위에서 @RequiredArgsConstructor 어노테이션을 쓰지 않았더라면, 이처럼 생성자를 직접 생성해줬어야 했다. 
    // new 키워드는 "클래스의 인스턴스(또는 배열)"를 만드는 키워드 이므로, 인터페이스를 대상으로는 new를 쓰지 못한다.
    // 인스턴스를 생성할 수 있는건 오직 구현(완성) 클래스뿐이다.
    // public AccountsService(UserRepository userRepository, UserLevelRepository userLevelRepository, ...) { 
    //    this.userRepository = userRepository; 
    //    this.userLevelRepository = userLevelRepository; 
    //    this.loginLogRepository = loginLogRepository; 
    //    this.jwtIssuer = jwtIssuer; 
    //    this.passwordEncoder = passwordEncoder; 
    //    this.clock = clock; 
    // }

    // 8. 사전중복검사(precheck) 토큰 서명용 비밀키 인스턴스 변수
    // @Value: 값 주입 어노테이션 -> 생성자로 안 받아도, 세터 안 만들어도, 어노테이션만 붙이면 컨테이너가 알아서 넣어줌
    // ${ ... }: 프로퍼티(placeholders) 읽기 문법 -> 스프링이 알아서 application.yml에서 app.precheck.secret에 해당하는 환경변수 값을 찾아서 필드에 넣어줌
    // 최종 저장되는 값: precheckSecret = "s3cr3t_precheck_key_abc123"
    @Value("${app.precheck.secret}")
    private String precheckSecret;

    // 9. 프리체크 토큰 TTL(초) 인스턴스 변수
    // 설정 소스는 application.yml의 app.precheck.ttl-seconds이고, 값이 없으면 콜론 뒤 기본값 600을 사용
    // 최종 저장되는 값: precheckTtlSec = 600
    @Value("${app.precheck.ttl-seconds:600}")
    private int precheckTtlSec;

    // 10. 아이디 정규식 클래스 상수
    // Pattern: JDK 표준 라이브러리 클래스
    // 최종 저장되는 값: USER_ID_PATTERN = Pattern 객체
    // Pattern 객체는 pattern, flags, compiled, normalizedPattern, ... 와 같은 인스턴스 변수들로 구성되어 있다.
    private static final Pattern USER_ID_PATTERN = Pattern.compile("^[a-z0-9]{5,20}$");

    // 11. "gmail.com,naver.com,kakao.com" 문자열을 담는 인스턴스 변수
    // 설정 소스는 application.yml의 app.allowed-email-domains이고, 없으면 콜론 뒤 기본값(gmail.com,naver.com,kakao.com)을 사용
    // 최종 저장되는 값: allowedEmailDomainsProp = "gmail.com,naver.com,kakao.com" -> 확정적으로 이 문자열이 변수에 담김
    @Value("${app.allowed-email-domains:gmail.com,naver.com,kakao.com}")
    private String allowedEmailDomainsProp;  

    // 12. 위 문자열을 파싱해서 만든 허용 도메인 집합을 담는 인스턴스 변수
    // Set<String>: Set 자료형에 반드시 String만 담으라는 표시
    // 제네릭: 타입(자료형)을 강제하기 위한 장치
    // 최종적으로 {"gmail.com", "naver.com", "kakao.com"} 이런식으로 저장됨. Set이므로 순서는 의미 없음
    // 파이썬에서의 set 자료형과 유사
    // 최종 저장되는 값: allowedEmailDomains = {"gmail.com", "naver.com", "kakao.com"}
    private Set<String> allowedEmailDomains;

    // @PostConstruct : 스프링이 @Service 빈을 생성하고 @Value 주입까지 끝낸 직후 밑의 ensureSecrets() 함수가 한 번만 호출되도록 하는 어노테이션
    @PostConstruct

    // 13. 앱 시작 직후 필수 설정이 제대로 들어왔는지 점검하고(없으면 바로 부팅 실패),
    // 허용 이메일 도메인 문자열을 파싱해 Set 자료형으로 저장해 두는 함수
    void ensureSecrets() {

        // 필수 비밀키(precheckSecret)가 비었는지 확인 -> 비면 바로 부팅 실패시켜 문제 조기 발견
        if (precheckSecret == null || precheckSecret.isBlank()) {
            throw new IllegalStateException("app.precheck.secret 설정이 필요합니다.");
        }

        // 허용 이메일 도메인 목록을 Set으로 변환해서 allowedEmailDomains에 저장
        // 1. allowedEmailDomainsProp.split(","): 콤마로 나눠 문자열 배열을 만든다. 
        // 예: "gmail.com, naver.com ,KAKAO.COM" -> ["gmail.com", " naver.com ", "KAKAO.COM"]
        // 2. Arrays.stream(... ): 그 배열을 Stream으로 바꿔서, map -> filter -> collect 같은 연산을 줄줄이(파이프라인) 연결해 처리
        // 3. .map(String::trim): 각 항목 앞뒤 공백 제거
        // 예: ["gmail.com", " naver.com ", "KAKAO.COM", " ", "gmail.com"] -> ["gmail.com", "naver.com", "KAKAO.COM", "", "gmail.com"]
        // 4. .filter(s -> !s.isEmpty()): 빈 문자열 제거
        // 예: ["gmail.com", "naver.com", "KAKAO.COM", "", "gmail.com"] -> ["gmail.com", "naver.com", "KAKAO.COM", "gmail.com"]
        // 5. .map(String::toLowerCase): 소문자로 통일해서 비교 시 대소문자 영향 제거.
        // 예: ["gmail.com", "naver.com", "KAKAO.COM", "gmail.com"] -> ["gmail.com", "naver.com", "kakao.com", "gmail.com"]
        // 6. .collect(Collectors.toUnmodifiableSet()): 결과를 Set으로 모음 -> 중복 자동 제거/불변
        // 예: ["gmail.com", "naver.com", "kakao.com", "gmail.com"] -> Set {"gmail.com", "naver.com", "kakao.com"}
        allowedEmailDomains = Arrays.stream(allowedEmailDomainsProp.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toLowerCase)
                .collect(Collectors.toUnmodifiableSet());
    }

    // 여기서부턴 AccountsUseCase 인터페이스에서 시그니처로 선언한 함수들의 로직을 실제로 구현하는 부분이다.
    // ─────────────────────────────────────────────────────────
    // 1) precheckUserId: 회원가입 - 아이디 사전 중복검사 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────

    // AccountsUseCase 인터페이스에서 시그니처로 선언된 함수 오버라이딩
    @Override

    // 조회만 하므로 DB에 쓰기는 없다고 알리는 읽기 전용 어노테이션 (성능 최적화 용도)
    @Transactional(readOnly = true) 
    public IdPrecheckResult precheckUserId(String userId) {

        // java.util.Objects의 메서드로 null이면 즉시 NullPointerException을 던진다.
        Objects.requireNonNull(userId, "userId");

        // 아이디의 앞뒤 공백을 제거
        userId = userId.trim();

        // 헬퍼함수: 필수 입력값(아이디/이메일/비번 등)이 null이거나 공백만 있으면 즉시 예외 던짐
        ensureNotBlank(userId, "userId");

        // 아이디가 소문자+숫자 5~20자 형식인지 검사하고, 아니면 예외 던진다.
        // 서비스 코드에 존재하는 메시지들은 백엔드 개발/디버깅(ex: Postman)할때 더 용이하게 개발하기위한 목적으로 작성한 것이고,
        // 실제 사용자에게 보여주기 위한 메시지는 프론트에서 작성한다.
        if (!USER_ID_PATTERN.matcher(userId).matches()) {
            throw new IllegalArgumentException("아이디는 영문 소문자와 숫자만 사용 가능하며 5~20자여야 합니다.");
        }

        // userRepository.existsByUserId(userId): 인스턴스 메서드 호출 
        // UserRepository 아웃바운드 포트(인터페이스)에서 시그니처로 선언한 함수 갖다 씀 -> 여기선 구현 안하고 구현은 인프라 어댑터에서 진행됨 
        // 중복 체크: 레포지토리로 DB 조회 -> 이미 존재하면 예외를 던져 사전검증 실패 처리
        if (userRepository.existsByUserId(userId)) {
            throw new IllegalStateException("이미 사용 중인 아이디입니다.");
        }
        
        // 장고처럼 "서명된" 프리체크 토큰 발급 (JWT 아님)
        String token = signPrecheckToken("user_id", userId);

        // 유즈케이스 인터페이스 안에서 구현해둔 IdPrecheckResult record 클래스의 인스턴스를 생성해서 리턴 
        // 클라이언트는 idCheckToken과 expiresInSeconds를 받아 "사전검증을 통과한 상태"를 잠시(600초) 증명할 수 있음.
        return new IdPrecheckResult(token, precheckTtlSec);
    }

    // ─────────────────────────────────────────────────────────
    // 2) precheckEmail: 회원가입 - 이메일 사전 중복검사 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public EmailPrecheckResult precheckEmail(String email) {
        Objects.requireNonNull(email, "email");
        email = email.trim(); 
        ensureNotBlank(email, "email");

        // 이메일 형식 검사
        int at = email.indexOf('@');
        if (at <= 0 || at == email.length() - 1) {
            throw new IllegalArgumentException("이메일 형식이 올바르지 않습니다.");
        }

        // 허용 도메인 검사
        String domain = email.substring(at + 1).toLowerCase();
        if (!allowedEmailDomains.contains(domain)) {
            String joined = String.join(", ", allowedEmailDomains);
            throw new IllegalArgumentException("허용되지 않은 도메인입니다. (" + joined + " 만 사용가능합니다.)");
        }

        // 중복 이메일 검사
        if (userRepository.existsByEmail(email)) {
            throw new IllegalStateException("이미 사용 중인 이메일입니다.");
        }

        String token = signPrecheckToken("email", email);

        return new EmailPrecheckResult(token, precheckTtlSec); 
    }

    // ─────────────────────────────────────────────────────────
    // 3) signUp: 회원가입 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    public SignUpResult signUp(SignUpCommand cmd) {

        // 0) 회원가입 시 입력하는 사용자 정보들에 대한 null, 공백 기본 검증

        // cmd 객체 자체가 null이면 즉시 NullPointerException을 던진다.
        Objects.requireNonNull(cmd, "cmd");

        // 여기서 cmd.userId(), cmd.email(), ... 등은 record 클래스를 정의함으로써 자동으로 생성된 접근자 메서드를 사용한 것이다.
        // 이러한 접근자 메서드를 통해 예를들어 cmd.userId()에서 userId의 값만 안전하게 읽는다.
        ensureNotBlank(cmd.userId(), "userId");
        ensureNotBlank(cmd.email(), "email");
        ensureNotBlank(cmd.rawPassword(), "rawPassword");
        ensureNotBlank(cmd.passwordConfirm(), "passwordConfirm");
        ensureNotBlank(cmd.gender(), "gender");
        ensureNotBlank(cmd.username(), "username");

        // birth는 검증된 값을 밑에서 계속 사용하기 위해 별도의 변수로 생성함
        LocalDate birth = Objects.requireNonNull(cmd.birthDate(), "birthDate");

        // 1) 약관 동의
        if (!cmd.agreeWhether()) {
            throw new IllegalArgumentException("약관/정책 동의가 필요합니다.");
        }

        // 2) 생년월일 정책 (헬퍼 함수)
        validateBirthDatePolicy(birth);

        // 3) 입력 정규화(전처리) -> 공백제거
        // 공백 제거 후 별도의 변수에 저장
        final String userIdRaw = cmd.userId();
        final String emailRaw = cmd.email();
        final String usernameRaw = cmd.username();

        final String userId = userIdRaw.trim();
        final String email  = emailRaw.trim();
        final String username = usernameRaw.trim();

        // 4) 아이디 형식 검사 (소문자+숫자 5~20자) 
        if (!USER_ID_PATTERN.matcher(userId).matches()) {
            throw new IllegalArgumentException("아이디는 영문 소문자와 숫자만 사용 가능하며 5~20자여야 합니다.");
        }

        // 5) 이름 형식 검사(한글/영문 + 공백 허용, 2~20자)
        final java.util.regex.Pattern USERNAME_PATTERN =
                java.util.regex.Pattern.compile("^(?=.{2,20}$)[가-힣a-zA-Z]+(?: [가-힣a-zA-Z]+)*$");
        if (!USERNAME_PATTERN.matcher(username).matches()) {
            throw new IllegalArgumentException("이름은 2~20자 한글/영문과 공백만 사용할 수 있습니다.");
        }

        // 6) 아이디/이메일 중복 체크
        if (userRepository.existsByUserId(userId)) {
            throw new IllegalStateException("이미 사용 중인 아이디입니다.");
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalStateException("이미 사용 중인 이메일입니다.");
        }

        // 7) 중복체크 토큰 검증 (정규화 값으로 우선 검증, 실패 시 raw로 한 번 더 시도)
        String idToken = Objects.requireNonNull(cmd.idCheckToken(), "idCheckToken");
        String emailToken = Objects.requireNonNull(cmd.emailCheckToken(), "emailCheckToken");

        // 헬퍼함수 사용
        boolean idOk = verifyPrecheckToken(idToken, "user_id", userId, precheckTtlSec)
                    || verifyPrecheckToken(idToken, "user_id", userIdRaw, precheckTtlSec);
        if (!idOk) {
            throw new IllegalArgumentException("아이디 중복검사 토큰이 유효하지 않거나 만료되었습니다.");
        }

        boolean emailOk = verifyPrecheckToken(emailToken, "email", email, precheckTtlSec)
                        || verifyPrecheckToken(emailToken, "email", emailRaw, precheckTtlSec);
        if (!emailOk) {
            throw new IllegalArgumentException("이메일 중복검사 토큰이 유효하지 않거나 만료되었습니다.");
        }

        // 8) 비밀번호 정책 -> 헬퍼함수 사용
        // cmd.rawPassword(): 접근자 함수
        String pwError = passwordPolicyError(cmd.rawPassword(), userId);
        if (pwError != null) {
            throw new IllegalArgumentException(pwError);
        }

        // 9) 비밀번호 확인 검증
        // cmd.passwordConfirm(): 접근자 함수
        if (!cmd.rawPassword().equals(cmd.passwordConfirm())) {
            throw new IllegalArgumentException("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        // 10) 회원가입 시 기본 권한(등급)인 USER(0)을 DB에서 가져오는 코드
        UserLevel levelUser = userLevelRepository.findByCode((byte) 0)
                .orElseThrow(() -> new IllegalStateException("USER(0) 등급이 없습니다."));

        // 11) 회원 가입 시 사용자가 입력한 정보를 바탕으로 User 엔티티 생성
        var now = LocalDateTime.now(clock);

        User user = User.builder()
                .level(levelUser)
                .email(email)
                .userId(userId)
                .userName(username)
                .passwordHash(passwordEncoder.encode(cmd.rawPassword()))
                .gender(parseGender(cmd.gender()))
                .birthDate(birth)
                .joinedAt(now)
                .build();    // Lombok @Builder로 최종 User 인스턴스 생성

        // 12) 저장 (경쟁 상황 방어)
        try {
            User saved = userRepository.save(user);   // User 객체 한 줄이 DB에 저장된다.
            return new SignUpResult(saved.getUserSeq(), now);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new IllegalStateException("중복 데이터로 인해 생성에 실패했습니다. 다시 시도해주세요.", e);
        }
    }

    // ─────────────────────────────────────────────────────────
    // 4) login: 로그인 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────

    // 컨트롤러에서 IP/UA를 전달하고 싶을 때 사용할 오버로드(선택)
    @Override
    public LoginResult login(String userId, String rawPassword, String ipAddress, String userAgent) {
        // 1) 입력 정규화(trim) + 필수값 검증
        String uid = (userId == null) ? null : userId.trim();
        String pw  = (rawPassword == null) ? null : rawPassword.trim();
        ensureNotBlank(uid, "userId");
        ensureNotBlank(pw, "rawPassword");

        LocalDateTime now = LocalDateTime.now(clock);
        String ip = (ipAddress == null) ? "" : ipAddress;
        String ua = (userAgent == null) ? "" : userAgent;

        // 2) 사용자 조회 (아이디 존재 노출 방지: 동일 메시지 사용)
        var userOpt = userRepository.findByUserId(uid);
        if (userOpt.isEmpty()) {
            loginLogRepository.append(LoginLog.builder()
                    .user(null)
                    .inputId(uid)
                    .attemptedAt(now)
                    .success(false)
                    .ipAddress(ip)
                    .userAgent(ua)
                    .inputPasswordHash(hashForLog(pw))
                    .build());
            throw new BadCredentialsException("아이디 또는 비밀번호가 일치하지 않습니다.");
        }

        User user = userOpt.get();

        // 3) 비밀번호 검증 (불일치 시 동일 메시지)
        if (!passwordEncoder.matches(pw, user.getPasswordHash())) {
            loginLogRepository.append(LoginLog.builder()
                    .user(user)
                    .inputId(uid)
                    .attemptedAt(now)
                    .success(false)
                    .ipAddress(ip)
                    .userAgent(ua)
                    .inputPasswordHash(hashForLog(pw))
                    .build());
            throw new BadCredentialsException("아이디 또는 비밀번호가 일치하지 않습니다.");
        }

        // 4) 마지막 로그인 시각 갱신(부분 업데이트)
        userRepository.updateLastLoginAt(user.getUserSeq(), now);

        // 5) 성공 로그
        loginLogRepository.append(LoginLog.builder()
                .user(user)
                .inputId(uid)
                .attemptedAt(now)
                .success(true)
                .ipAddress(ip)
                .userAgent(ua)
                .inputPasswordHash("")   // 성공 시 평문 비번 해시 저장 불필요
                .build());

        // 6) 역할 매핑 및 토큰 발급
        String role = mapRole(user);
        String access  = jwtIssuer.issueAccessToken(user);
        String refresh = jwtIssuer.issueRefreshToken(user);

        return new LoginResult(
                user.getUserSeq(),
                user.getUserId(),
                user.getEmail(),
                role,
                user.getUserName(),
                access,
                refresh
        );
    }
    
    // ─────────────────────────────────────────────────────────
    // 5) findUserId: 아이디 찾기 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public FindIdResult findUserId(FindIdCommand cmd) {
        Objects.requireNonNull(cmd, "cmd");
        ensureNotBlank(cmd.email(), "email");
        ensureNotBlank(cmd.userName(), "userName");

        // 입력 정규화(앞뒤 공백 제거)
        String email = cmd.email().trim();
        String name  = cmd.userName().trim();

        // 1) email로 사용자 조회 (장고: filter(email=..., user_name=...)와 동일 목적)
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("가입되지 않은 사용자입니다."));

        // 2) 이름 일치 검증 (대/소문자 구분 동일 비교)
        if (!name.equals(user.getUserName())) {
            throw new NotFoundException("가입되지 않은 사용자입니다.");
        }

        // 3) 성공 시 user_id 반환
        return new FindIdResult(user.getUserId());
    }

    // ─────────────────────────────────────────────────────────
    // 6) findPassword: 비밀번호 찾기 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional
    public FindPasswordResult findPassword(FindPasswordCommand cmd) {
        Objects.requireNonNull(cmd, "cmd");
        ensureNotBlank(cmd.userId(), "userId");
        ensureNotBlank(cmd.userName(), "userName");
        ensureNotBlank(cmd.email(), "email");

        // DRF와 동일하게 앞뒤 공백 제거
        String userId = cmd.userId().trim();
        String name   = cmd.userName().trim();
        String email  = cmd.email().trim();

        // 1) user_id로 우선 조회 (user_id는 유니크라는 전제)
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("이름/아이디/이메일이 일치하는 사용자가 없습니다."));

        // 2) 이메일/이름 대소문자 무시 일치 검사 (DRF의 __iexact 동작)
        if (isBlank(user.getEmail()) || !user.getEmail().equalsIgnoreCase(email)
                || isBlank(user.getUserName()) || !user.getUserName().equalsIgnoreCase(name)) {
            throw new NotFoundException("이름/아이디/이메일이 일치하는 사용자가 없습니다.");
        }

        // 3) 임시 비밀번호 생성 + 해시 저장 + 변경시각 업데이트
        String tempPassword = generateTempPassword(10);
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setPasswordChangedAt(LocalDateTime.now(clock));
        userRepository.save(user);

        // 4) 서비스는 tempPassword만 리턴 (컨트롤러에서 DEBUG 여부에 따라 노출/비노출 결정)
        return new FindPasswordResult(tempPassword);
    }

    // 헬퍼
    private static boolean isBlank(String s) { return s == null || s.trim().isEmpty(); }

    private static String generateTempPassword(int length) {
        final String alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        SecureRandom rnd = new SecureRandom();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) sb.append(alphabet.charAt(rnd.nextInt(alphabet.length())));
        return sb.toString();
    }

    // ─────────────────────────────────────────────────────────
    // 7) changePassword: 비밀번호 변경 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional
    public void changePassword(ChangePasswordCommand cmd) {
        // 1) 입력값 검증
        Objects.requireNonNull(cmd, "cmd");
        Objects.requireNonNull(cmd.actorUserSeq(), "actorUserSeq");
        ensureNotBlank(cmd.currentPassword(), "currentPassword");
        ensureNotBlank(cmd.newPassword(), "newPassword");
        ensureNotBlank(cmd.newPasswordConfirm(), "newPasswordConfirm");

        // 2) 사용자 조회(인증된 사용자)
        User user = userRepository.findById(cmd.actorUserSeq())
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("로그인이 필요합니다."));

        // 3) 현재 비밀번호 확인
        if (!passwordEncoder.matches(cmd.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }

        // 4) 새 비밀번호 확인 일치
        if (!cmd.newPassword().equals(cmd.newPasswordConfirm())) {
            throw new IllegalArgumentException("새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.");
        }

        // 5) 새 비밀번호가 현재와 동일 금지
        if (cmd.currentPassword().equals(cmd.newPassword())) {
            throw new IllegalArgumentException("새 비밀번호가 현재 비밀번호와 동일할 수 없습니다.");
        }

        // 6) 회원가입과 동일한 보안 규칙 적용
        String pwError = passwordPolicyError(cmd.newPassword(), user.getUserId());
        if (pwError != null) {
            // 회원가입과 동일 포맷 메시지 사용
            throw new IllegalArgumentException(pwError);
        }

        // 7) 해시 저장 + 변경시각 갱신
        user.setPasswordHash(passwordEncoder.encode(cmd.newPassword()));
        // 엔티티에 필드가 있다면 갱신
        user.setPasswordChangedAt(LocalDateTime.now(clock));

        userRepository.save(user);

        // 쿠키 삭제(리프레시 무효화) 등은 컨트롤러 레이어에서 처리
    }

    // ─────────────────────────────────────────────────────────
    // 8) getUserBySeq: userSeq로 사용자 단건 조회 (리프레시 토큰 용)
    // 리프레시 토큰 -> userSeq -> User -> 새 access 토큰
    // 여기서 userSeq에 해당하는 User를 조회하기 위해 사용
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public User getUserBySeq(Integer userSeq) {
        return userRepository.findById(userSeq)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
    }

    // ─────────────────────────────────────────────────────────
    // 9) refreshAccessToken: 액세스 토큰 갱신 메서드
    // 리프레시 토큰 하나 받아서 -> 검증하고 -> 유저 찾고 -> 새 액세스 토큰만 문자열로 돌려줌
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public String refreshAccessToken(String refreshToken) {
        Objects.requireNonNull(refreshToken, "refreshToken");

        try {
            // 1) 리프레시 토큰 검증 + userSeq 추출
            Integer userSeq = jwtVerifier.verifyRefreshAndGetUserSeq(refreshToken);

            // 2) userSeq로 유저 조회
            User user = userRepository.findById(userSeq)
                    .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));

            // 3) 새 액세스 토큰 발급
            return jwtIssuer.issueAccessToken(user);

        } catch (NotFoundException e) {
            // 유저가 없을 때도 컨트롤러에서 401로 처리할 수 있게 IllegalArgumentException으로 래핑
            throw new IllegalArgumentException("user not found for this refresh token", e);
        }
    }

    // ─────────────────────────────────────────────────────────
    // 10) listUsers: 회원 관리 페이지에서 회원 목록을 조회하는 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public UserListResult listUsers(UserListQuery query) {
        Objects.requireNonNull(query, "query");

        // (A) 권한 체크: ADMIN(1)+
        User actor = userRepository.findByIdWithLevel(query.actorUserSeq())
            .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("로그인이 필요합니다."));
        if (levelCode(actor) < 1) throw new SecurityException("관리자만 접근할 수 있습니다.");

        // (B) 페이지 파라미터
        int page = Math.max(1, query.page());
        int size = Math.max(1, Math.min(100, query.size()));
        int offset = (page - 1) * size;

        // (C) 검색어 파싱
        String q = safe(query.q());
        List<String> terms = splitTerms(q);
        Integer roleHint = extractRoleHint(terms);
        List<String> filteredTerms = terms.stream()
                .filter(t -> !isRoleWord(t) && !isPureRoleCode(t))
                .toList();

        // (D) 총계/행 조회
        long total = userRepository.countBySearch(roleHint, filteredTerms);
        List<User> rows = userRepository.findBySearch(roleHint, filteredTerms, offset, size);
        int totalPages = (total == 0) ? 0 : (int) Math.ceil((double) total / size);

        // (E) DTO 매핑
        List<UserListItem> items = new java.util.ArrayList<>(rows.size());
        for (User u : rows) {
            int code = (u.getLevel() != null && u.getLevel().getGradeCode() != null)
                    ? u.getLevel().getGradeCode()   // Short -> int 자동 승격
                    : 0;

            String name = (u.getLevel() != null && u.getLevel().getGradeName() != null)
                    ? u.getLevel().getGradeName()
                    : defaultGradeName(code);

            items.add(new UserListItem(
                    u.getUserSeq(),
                    safe(u.getUserId()),
                    safe(u.getUserName()),
                    code,
                    name
            ));
        }

        return new UserListResult(items, page, size, total, totalPages);
    }
    

    // ─────────────────────────────────────────────────────────
    // 11) promoteToAdmin: 관리자 승격 (USER->ADMIN) 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    public void promoteToAdmin(Integer targetUserSeq, Integer operatorUserSeq) {
        // 기존 void 시그니처는 내부의 결과 반환형 메서드로 위임
        promoteToAdminReturningResult(targetUserSeq, operatorUserSeq);
    }

    @Override
    @Transactional
    public PromoteResult promoteToAdminReturningResult(Integer targetUserSeq, Integer operatorUserSeq) {
        // 1) 파라미터 검증
        Objects.requireNonNull(targetUserSeq, "targetUserSeq");
        Objects.requireNonNull(operatorUserSeq, "operatorUserSeq");

        // 2) 요청자 조회 + SUPER_ADMIN(2) 권한 확인
        User operator = userRepository.findByIdWithLevel(operatorUserSeq)
            .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("로그인이 필요합니다."));
        int operatorCode = levelCode(operator);
        if (operatorCode != 2) {
            // 컨트롤러/Advice에서 403으로 매핑
            throw new SecurityException("권한이 없습니다.");
        }

        // (선택) 자기 자신 승격 금지
        if (operator.getUserSeq().equals(targetUserSeq)) {
            throw new IllegalArgumentException("자기 자신에게는 권한을 부여할 수 없습니다.");
        }

        // 3) 대상 조회 + 현재 등급 확인 (USER=0만 승격)
        User target = userRepository.findByIdWithLevel(targetUserSeq)
                .orElseThrow(() -> new IllegalArgumentException("대상 사용자를 찾을 수 없습니다."));
        int targetCode = levelCode(target);
        if (targetCode != 0) {
            throw new IllegalArgumentException("일반 등급(USER)만 승격할 수 있습니다."); // 400
        }

        // 4) ADMIN(1) 등급 로드
        UserLevel admin = userLevelRepository.findByCode((byte) 1)
                .orElseThrow(() -> new IllegalStateException("ADMIN(1) 등급이 없습니다."));

        // 5) 승격 + 시각 설정 + 저장
        LocalDateTime grantedAt = LocalDateTime.now(clock);
        target.setLevel(admin);
        target.setGrantedAt(grantedAt);
        userRepository.save(target);

        // 6) UseCase에 정의된 record로 결과 반환
        return new PromoteResult(
                target.getUserSeq(),
                operator.getUserSeq(),
                "ADMIN",
                grantedAt
        );
    }

    // ─────────────────────────────────────────────────────────
    // 12) demoteToUser: 일반 사용자 강등 (ADMIN->USER) 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    public void demoteToUser(Integer targetUserSeq, Integer operatorUserSeq) {
        demoteToUserReturningResult(targetUserSeq, operatorUserSeq);
    }

    @Override
    @Transactional // 강등은 쓰기 작업이므로 명시
    public DemoteResult demoteToUserReturningResult(Integer targetUserSeq, Integer operatorUserSeq) {
        Objects.requireNonNull(targetUserSeq, "targetUserSeq");
        Objects.requireNonNull(operatorUserSeq, "operatorUserSeq");

        // 1) 요청자 조회 + 인증 필요(401)
        User operator = userRepository.findByIdWithLevel(operatorUserSeq)
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("로그인이 필요합니다."));

        // 2) SUPER_ADMIN(2) 권한 확인(403)
        if (levelCode(operator) != 2) {
            throw new SecurityException("권한이 없습니다.");
        }

        // 3) 대상 조회(없거나 잘못된 값 -> 400로 맞추려면 IllegalArgumentException 유지)
        User target = userRepository.findByIdWithLevel(targetUserSeq)
                .orElseThrow(() -> new IllegalArgumentException("잘못된 요청입니다."));

        // 4) ADMIN(1)만 강등 가능(400)
        if (levelCode(target) != 1) {
            throw new IllegalArgumentException("관리자 등급(ADMIN)만 강등할 수 있습니다.");
        }

        // 5) USER(0) 등급 로드(없으면 서버 설정 오류 -> 500)
        UserLevel userLevel = userLevelRepository.findByCode((byte) 0)
                .orElseThrow(() -> new RuntimeException("USER(0) 등급이 없습니다."));

        // 6) 강등 처리
        LocalDateTime demotedAt = LocalDateTime.now(clock);
        target.setLevel(userLevel);
        target.setGrantedAt(null); // 관리자 부여시각 초기화(정책 일치)
        userRepository.save(target);

        // 7) 결과 반환
        return new DemoteResult(
                target.getUserSeq(),
                operator.getUserSeq(),
                demotedAt
        );
    }

    // ─────────────────────────────────────────────────────────
    // 헬퍼함수
    // ─────────────────────────────────────────────────────────

    // 1. 필수 입력값(아이디/이메일/비번 등)이 null이거나 공백만 있으면 즉시 예외 던짐
    private static void ensureNotBlank(String s, String field) {
        if (s == null || s.trim().isEmpty()) {
            throw new IllegalArgumentException("필수값 누락: " + field);
        }
    }

    // 2. 생년월일 검증
    private void validateBirthDatePolicy(LocalDate birth) {
        LocalDate today = LocalDate.now(clock);
        if (birth.isAfter(today)) {
            throw new IllegalArgumentException("생년월일은 오늘 이후일 수 없습니다.");
        }
        int age = today.getYear() - birth.getYear()
                - ((today.getMonthValue() * 100 + today.getDayOfMonth()) < (birth.getMonthValue() * 100 + birth.getDayOfMonth()) ? 1 : 0);
        if (age < 14 && age >= 0) {
            throw new IllegalArgumentException("만 14세 이상만 가입할 수 있습니다.");
        } else if (age < 0 || age >= 120) {
            throw new IllegalArgumentException("생년월일이 올바르지 않습니다.");
        }
    }

    // 3. 프리체크(precheck) 토큰이 "내가 만든 것"이고 "만료되지 않았고" "의도한 대상(kind/subject)용"인지 검증하는 헬퍼 함수
    private boolean verifyPrecheckToken(String token, String kind, String subject, int maxAgeSec) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 4) return false;

            String kindPart = new String(urlDecoder(parts[0]), StandardCharsets.UTF_8);
            String subjectPart = new String(urlDecoder(parts[1]), StandardCharsets.UTF_8);
            long ts = Long.parseLong(parts[2]);
            byte[] sigBytes = urlDecoder(parts[3]); // FIX: 시그니처 바이트

            if (!kind.equals(kindPart)) return false;
            if (!subject.equalsIgnoreCase(subjectPart)) return false;

            long nowSec = LocalDateTime.now(clock).atZone(ZoneId.systemDefault()).toEpochSecond();
            if (nowSec - ts > maxAgeSec) return false; // 만료

            String header = parts[0] + "." + parts[1] + "." + parts[2];
            byte[] expect = hmacSha256Raw(header, "precheck:" + kind + ":" + precheckSecret);

            return MessageDigest.isEqual(sigBytes, expect);
        } catch (Exception e) {
            return false;
        }
    }

    // 4. 비밀번호 정책을 한 번에 검사하는 헬퍼함수
    private String passwordPolicyError(String pw, String userId) {
        if (pw == null) return "비밀번호를 입력해주세요.";
        int len = pw.length();
        if (len < 8 || len > 16) return "비밀번호는 8~16자여야 합니다.";
        int cats = 0;
        if (pw.chars().anyMatch(c -> Character.isUpperCase(c))) cats++;
        if (pw.chars().anyMatch(c -> Character.isLowerCase(c))) cats++;
        if (pw.chars().anyMatch(c -> Character.isDigit(c))) cats++;
        if (pw.chars().anyMatch(c -> !Character.isLetterOrDigit(c))) cats++;
        if (cats < 3) return "대문자/소문자/숫자/특수문자 중 3종 이상을 포함해야 합니다.";

        // 연속 숫자 4자 (오름/내림)
        int run = 0, prev = -1000, diff = 0, trend = 0; // trend: +1(오름)/-1(내림)/0(미정)
        for (char ch : pw.toCharArray()) {
            if (Character.isDigit(ch)) {
                int d = ch - '0';
                if (run == 0) {
                    run = 1; prev = d; trend = 0; diff = 0;
                } else {
                    int curDiff = d - prev;
                    if (trend == 0 && (curDiff == 1 || curDiff == -1)) {
                        trend = Integer.signum(curDiff); run++; diff = curDiff; prev = d;
                    } else if (curDiff == diff && trend != 0) {
                        run++; prev = d;
                    } else {
                        run = 1; prev = d; trend = 0; diff = 0;
                    }
                }
                if (run >= 4 && trend != 0) return "연속된 숫자 4자를 사용할 수 없습니다(예: 1234, 4321).";
            } else {
                run = 0; prev = -1000; trend = 0; diff = 0;
            }
        }

        // 동일문자 4회 연속
        int same = 1;
        for (int i = 1; i < pw.length(); i++) {
            same = (pw.charAt(i) == pw.charAt(i - 1)) ? same + 1 : 1;
            if (same >= 4) return "동일 문자를 4회 연속 사용할 수 없습니다.";
        }

        // 아이디 3자 이상 연속 포함 금지(대소문자 무시)
        if (userId != null && !userId.isBlank()) {
            String a = pw.toLowerCase();
            String b = userId.toLowerCase();
            for (int L = 3; L <= b.length(); L++) {
                for (int i = 0; i + L <= b.length(); i++) {
                    String sub = b.substring(i, i + L);
                    if (!sub.isEmpty() && a.contains(sub)) {
                        return "비밀번호에 아이디의 3글자 이상 연속 문자열을 포함할 수 없습니다.";
                    }
                }
            }
        }
        return null;
    }

    // 5. 사용자가 보낸 문자열을 도메인 enum(User.Gender.M/F)으로 변환. null이거나 M/F 외 값이면 예외.
    private Gender parseGender(String gender) {
        if (gender == null) throw new IllegalArgumentException("gender");
        String g = gender.trim().toUpperCase();
        if ("M".equals(g)) return Gender.M;
        if ("F".equals(g)) return Gender.F;
        throw new IllegalArgumentException("성별은 M 또는 F 이어야 합니다.");
    }   

    // 6. UserLevel.gradeCode(0/1/2)를 권한 문자열 "USER" | "ADMIN" | "SUPER_ADMIN"로 매핑.
    private String mapRole(User user) {
        int code = levelCode(user);
        return switch (code) {
            case 2 -> "SUPER_ADMIN";
            case 1 -> "ADMIN";
            default -> "USER";
        };
    }

    // 7. user.getLevel()?.getGradeCode()를 꺼내 NPE 없이 int로 안전하게 변환(없으면 기본 0).
    private int levelCode(User user) {
        UserLevel lvl = user.getLevel();
        Short code = (lvl != null ? lvl.getGradeCode() : null);
        return (code != null) ? code.intValue() : 0;
    }

    // 8. 장고 signing과 동등한 "프리체크 토큰" 발급/검증 로직 (JWT 아님)
    // 토큰 포맷: base64url(kind) + "." + base64url(subject) + "." + epochSec + "." + base64url(HMAC_SHA256(kind+"."+subject+"."+epochSec, secret="precheck:"+kind+":"+precheckSecret))
    private String signPrecheckToken(String kind, String subject) {
        long nowSec = LocalDateTime.now(clock).atZone(ZoneId.systemDefault()).toEpochSecond();
        String salt = "precheck:" + kind; // 장고 salt 컨벤션과 동일
        String header = b64(kind) + "." + b64(subject) + "." + nowSec;
        String sigB64 = hmacSha256B64Url(header, salt + ":" + precheckSecret); // FIX: base64url 문자열 그대로 사용
        return header + "." + sigB64;
    }

    // 9. data에 대해 secret 키로 HMAC-SHA256 서명 바이트를 계산
    private static byte[] hmacSha256Raw(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("토큰 서명 오류", e);
        }
    }
    // 10. 위의 HMAC-SHA256 결과를 URL-safe Base64(무패딩) 문자열로 변환해 반환
    private static String hmacSha256B64Url(String data, String secret) {
        return b64(hmacSha256Raw(data, secret)); // FIX: new String(...) 불필요
    }

    // 11. 평문 문자열 s를 URL-safe Base64(무패딩) 문자열로 인코딩
    private static String b64(String s) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(s.getBytes(StandardCharsets.UTF_8));
    }

    // 12. 바이트 배열을 URL-safe Base64(무패딩) 문자열로 인코딩
    private static String b64(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // 13. URL-safe Base64 문자열을 원래 바이트 배열로 디코딩
    private static byte[] urlDecoder(String s) {
        return Base64.getUrlDecoder().decode(s);
    }

    // 14. 로그인 로그용 입력 비밀번호 해시(원문 저장 금지) — 장고의 sha256 hexdigest와 동일 포맷
    private String hashForLog(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String seed = (precheckSecret == null ? "secret" : precheckSecret) + raw;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(seed.getBytes(StandardCharsets.UTF_8));
            // "sha256:" + 64자 소문자 hex
            return "sha256:" + HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            return "";
        }
    }

    // 15. 공백/Null 안전 문자열
    private static String safe(String s) { return (s == null) ? "" : s.trim(); }

    // 16. 공백 기준 AND 토큰화
    private static List<String> splitTerms(String q) {
        if (q == null || q.isBlank()) return java.util.List.of();
        String[] parts = q.trim().split("\\s+");
        java.util.List<String> out = new java.util.ArrayList<>(parts.length);
        for (String p : parts) {
            String t = p.trim();
            if (!t.isEmpty()) out.add(t);
        }
        return out;
    }

    // 17. 역할 단어인지(ADMIN/SUPER/USER 한/영) 판별
    private static boolean isRoleWord(String term) {
        String t = term.toLowerCase();
        return switch (t) {
            case "admin", "administrator", "관리자",
                "super", "superadmin", "super-admin", "super_admin", "슈퍼", "슈퍼관리자",
                "user", "일반", "사용자" -> true;
            default -> false;
        };
    }

    // 18. 순수 숫자 코드(0/1/2)인지
    private static boolean isPureRoleCode(String term) {
        return "0".equals(term) || "1".equals(term) || "2".equals(term);
    }

    // 19. 전체 토큰에서 역할 힌트(0/1/2) 추출: 역할 단어/숫자 우선 매칭
    private static Integer extractRoleHint(List<String> terms) {
        Integer hint = null;
        for (String raw : terms) {
            String t = raw.toLowerCase();

            // 숫자 코드 우선 처리
            if (isPureRoleCode(t)) {
                int v = Integer.parseInt(t);
                if (v >= 0 && v <= 2) return v;
            }

            // 역할 키워드 매칭
            switch (t) {
                case "super", "superadmin", "super-admin", "super_admin", "슈퍼", "슈퍼관리자":
                    return 2;
                case "admin", "administrator", "관리자":
                    hint = (hint == null) ? 1 : hint;
                    break;
                case "user", "일반", "사용자":
                    hint = (hint == null) ? 0 : hint;
                    break;
                default:
                    // ignore
            }
        }
        return hint;
    }

    // 20. 등급 기본 라벨
    private static String defaultGradeName(int code) {
        return switch (code) {
            case 2 -> "슈퍼관리자";
            case 1 -> "관리자";
            default -> "일반";
        };
    }
}



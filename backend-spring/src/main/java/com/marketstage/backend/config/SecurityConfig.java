// config/SecurityConfig.java
// 스프링 시큐리티 전역 설정 + CORS 설정을 Bean으로 등록
// 장고의 config/settings.py의 MIDDLEWARE + 보안 설정(Security, CORS, CSRF 등) 부분에 해당하는 일부 설정

// SecurityConfig 클래스가 위치한 패키지 경로 
// 1. 하나의 .java 파일에는 public 클래스는 최대 1개만 가능
// 2. 그 public 클래스 이름은 반드시 파일명과 같아야 함
package com.marketstage.backend.config;

// 1. 자바 표준 라이브러리
import java.time.Duration; // 시간 길이를 표현하는 클래스
import java.util.List;     // 여러 값을 순서대로 저장하는 인터페이스

// 2. 스프링 기본 라이브러리(빈/설정)

// Bean(빈): 개발자가 직접 new 하지 않고, 스프링이 대신 생성하고 관리하는 객체(인스턴스)
// 스프링이 알아서 만들어서 모든 빈을 컨테이너(ApplicationContext) 안에 등록해두고 필요할 때 꺼내서 자동으로 주입(의존성 주입, DI: Dependency Injection)해준다.
// 따라서 메서드가 @Bean으로 어노테이션 표시 되어있으면 이 메서드의 반환값이 빈으로 등록되어 컨테이너(ApplicationContext)에 들어간다 -> 그 후 필요한 곳에 자동으로 주입되어 사용된다
import org.springframework.context.annotation.Bean;  

import org.springframework.context.annotation.Configuration; // 이 클래스가 스프링 설정 클래스임을 표시하는 어노테이션

// 3. 스프링 시큐리티 라이브러리(보안)
import org.springframework.security.config.Customizer; // 간단한 기본설정을 적용할 때 쓰는 함수형 인터페이스
import org.springframework.security.config.annotation.web.builders.HttpSecurity; // 시큐리티 규칙을 체이닝으로 구성하는 클래스
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity; // 스프링 시큐리티 기능을 켜는 어노테이션
import org.springframework.security.config.http.SessionCreationPolicy; // 세션 관리 방식을 지정하는 열거형(enum)
import org.springframework.security.web.SecurityFilterChain; // 보안 필터 체인을 정의하는 인터페이스

// 4. CORS 라이브러리 (교차 출처 요청 허용 관련)
import org.springframework.web.cors.CorsConfiguration;                // CORS 정책(허용 오리진, 메서드 등)을 담는 클래스
import org.springframework.web.cors.CorsConfigurationSource;          // CORS 정책을 제공하는 인터페이스
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;  // URL 패턴별로 CORS 정책을 등록하는 클래스


// @Configuration : 이 클래스를 스프링 설정 파일처럼 인식하게 한다 -> 내부의 @Bean 메서드들을 찾아서 실행하고, 그 리턴값을 빈(Bean) 으로 컨테이너에 등록한다
// 원래 XML에 <bean> 태그로 적던 설정을, 자바 코드 안에서 @Configuration + @Bean으로 적음
@Configuration

// @EnableWebSecurity : 스프링 시큐리티의 웹 보안 기능을 활성화(보안 시스템 전원 ON 스위치) -> 이 어노테이션이 있어야 HttpSecurity 설정(http.cors(), .csrf() 등)이 적용된다.
@EnableWebSecurity

// SecurityConfig: 이 보안 시스템의 전역 규칙(정책)을 설정하는 클래스
public class SecurityConfig {
  @Bean

  // [접근제한자] [반환타입] [메서드이름]([매개변수]) [throws 예외] { 본문 }
  // 보안 필터 체인을 만드는 메서드

  // http: HttpSecurity 인스턴스(객체)
  // 보통은 HttpSecurity http = new HttpSecurity(); 이렇게 직접 new 해서 객체를 만들어야한다.
  // 하지만 스프링 부트에선 IoC(제어의 역전)라는 방법을 써서 객체를 개발자가 직접 new 하지 않고, 스프링이 대신 만들어서 필요한 곳에 넣어준다.
  // 그래서 filterChain(HttpSecurity http) 이라고 쓰면, 안보이는 곳에서 HttpSecurity http = new HttpSecurity(); 을 스프링이 대신 해준다.
  // 따라서 http.cors()와 같이 인스턴스 메서드를 호출 할 수 있는것이다.

  // 메서드 체이닝(Method Chaining)
  // 메서드가 자기 자신(또는 같은 타입의 객체)을 반환해서, 여러 메서드를 점(.)으로 이어서 연속 호출하는 방식
  // 이게 가능한 이유는, 각 메서드가 void가 아니라 return this;로 HttpSecurity 자신을 반환하기 때문
  // 그래서 http.cors().csrf().sessionManagement().authorizeHttpRequests() ... 가 가능하다.
  // 쉽게말해 이런식으로 하나하나 순서대로 호출한 것을 메서드가 HttpSecurity를 다시 반환하도록 설계해 체이닝으로 이어 붙인 것이다.
  // http.cors(...);
  // http.csrf(...);
  // http.sessionManagement(...);
  // http.authorizeHttpRequests(...);

  //   public class HttpSecurity {
  //     public HttpSecurity cors() {
  //         ... 설정 로직 ...
  //         return this; // 자기 자신을 다시 리턴
  //     }
  // 
  //     public HttpSecurity csrf() {
  //         ... 설정 로직 ...
  //         return this; // 또 자기 자신을 리턴
  //     }
  // }
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      .cors(Customizer.withDefaults())   // CORS 필터 킴
      .csrf(csrf -> csrf.disable())      // CSRF 보호 비활성화
      .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))  // 세션을 만들지 않도록 지정
      .authorizeHttpRequests(auth -> auth   // URL 접근 권한(인가) 규칙 시작
        .requestMatchers("/actuator/**").permitAll() // /actuator/는 인증 없이 접근 허용
        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll() // 모든 경로의 OPTIONS 요청(프리플라이트) 허용
        .anyRequest().permitAll() // 위에서 매칭되지 않은 모든 요청을 임시로 공개. JWT 적용 시 변경
      );

    return http.build();  // 지금까지 쌓은 보안 설정을 실행 가능한 SecurityFilterChain으로 확정해서 반환
  }

  // 이 메서드는 CORS 정책을 담은 빈을 하나 만들어서 스프링 컨테이너에 등록하는 코드
  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration cfg = new CorsConfiguration();  // 빈 CORS 정책 객체 생성(여기에 허용 오리진/메서드/헤더 등을 채움)

    // 허용 오리진(출처) 패턴
    cfg.setAllowedOriginPatterns(List.of(
      "http://localhost:5173",
      "https://*.trycloudflare.com"
    ));
    cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));  // 허용 HTTP 메서드. 브라우저의 프리플라이트(OPTIONS) 단계에서 검증됨
    cfg.setAllowedHeaders(List.of("*"));  // 요청 헤더 허용 목록. *로 전부 허용(예: Authorization, Content-Type, X-Requested-With 등)
    cfg.setAllowCredentials(true);  // 자격증명(쿠키/Authorization 헤더 등) 포함 요청 허용
    cfg.setExposedHeaders(List.of("Location", "Content-Disposition")); // 브라우저 JS에서 응답 헤더를 읽을 수 있게 노출
    cfg.setMaxAge(Duration.ofHours(1)); // 프리플라이트 결과 캐시 시간 (브라우저가 같은 요청에 대해 1시간 동안 OPTIONS 재요청 안 함) -> 성능/지연 개선

    // URL 패턴별로 CORS 정책을 매핑하는 소스
    UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
    src.registerCorsConfiguration("/**", cfg);  // "/**"로 모든 엔드포인트에 동일 정책 적용
    return src;  // 최종 CorsConfigurationSource를 반환 -> 컨테이너에 빈으로 등록 -> http.cors(...)가 자동 적용
  }
}

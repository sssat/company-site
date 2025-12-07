// config/SecurityConfig.java
// 스프링 시큐리티 전역 설정 + CORS + JWT 검증 같은 보안 규칙을 전부 총괄해서 설정하는 파일


// SecurityConfig 클래스가 위치한 패키지 경로
// 1. 하나의 .java 파일에는 public 클래스는 최대 1개만 가능
// 2. 그 public 클래스 이름은 반드시 파일명과 같아야 함
package com.marketstage.backend.config;

// 1. 자바 표준 라이브러리
import java.time.Duration;                // '30분', '1시간' 같은 시간 길이를 표현하는 클래스 
import java.util.List;                    // 여러 값을 순서대로 저장하는 인터페이스
import java.nio.charset.StandardCharsets; // UTF-8 같은 표준 문자 인코딩 상수를 제공 
import javax.crypto.SecretKey;            // 대칭키(HMAC 등)를 표현하는 인터페이스
import javax.crypto.spec.SecretKeySpec;   // 바이트 배열을 기반으로 SecretKey 객체를 만드는 구현체

// 2. 스프링 기본 라이브러리(빈/설정)
// Bean(빈): 개발자가 직접 new 하지 않고, 스프링이 대신 생성하고 관리하는 객체(인스턴스)
// 스프링이 알아서 만들어서 모든 빈을 컨테이너(ApplicationContext) 안에 등록해두고 필요할 때 꺼내서 자동으로 주입(의존성 주입, DI: Dependency Injection)해준다.
// 따라서 메서드가 @Bean으로 어노테이션 표시 되어있으면 이 메서드의 반환값이 빈으로 등록되어 컨테이너(ApplicationContext)에 들어간다 -> 그 후 필요한 곳에 자동으로 주입되어 사용된다
import org.springframework.context.annotation.Bean;           // 메서드의 반환값을 스프링 빈으로 등록할 때 사용하는 어노테이션
import org.springframework.context.annotation.Configuration;  // 이 클래스가 스프링 설정 클래스임을 표시하는 어노테이션
import org.springframework.beans.factory.annotation.Value;    // application.yml 등의 설정값을 필드/파라미터에 주입할 때 사용하는 어노테이션

// 3. 스프링 시큐리티 라이브러리(보안)
import org.springframework.security.config.Customizer; // 간단한 기본설정을 적용할 때 쓰는 함수형 인터페이스
import org.springframework.security.config.annotation.web.builders.HttpSecurity; // 시큐리티 규칙을 체이닝으로 구성하는 설정 빌더
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer; // CSRF 등 개별 보안 설정 모듈의 공통 부모(여기서는 csrf().disable() 등에 사용)
import org.springframework.security.config.http.SessionCreationPolicy; // 세션을 어떻게 관리할지(STATELESS, IF_REQUIRED 등) 정하는 enum
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;      // JWT 서명에 사용할 MAC 알고리즘 지정(여기선 HS256 등)
import org.springframework.security.web.SecurityFilterChain;          // 보안 필터 체인을 정의하는 인터페이스 (스프링 시큐리티의 최종 룰 집합)
import org.springframework.security.oauth2.jwt.JwtDecoder;           // JWT를 파싱하고 서명을 검증하는 컴포넌트의 인터페이스
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;     // JwtDecoder의 구현체. Nimbus 라이브러리를 사용해 실제 JWT 검증을 수행

// 4. CORS 관련 라이브러리
import org.springframework.web.cors.CorsConfiguration;              // 허용 origin, 메서드, 헤더 등 CORS 정책 한 세트를 표현하는 클래스
import org.springframework.web.cors.CorsConfigurationSource;        // 요청 정보에 따라 어떤 CORS 설정을 쓸지 제공하는 인터페이스
import org.springframework.web.cors.UrlBasedCorsConfigurationSource; // URL 패턴별로 CorsConfiguration을 매핑해서 관리하는 기본 구현체

// @Configuration : 이 클래스를 스프링 설정 파일처럼 인식하게 한다
// 내부의 @Bean 메서드들을 찾아서 실행하고, 그 리턴값을 빈(Bean) 으로 컨테이너에 등록한다
// 원래 XML에 <bean> 태그로 적던 설정을, 자바 코드 안에서 @Configuration + @Bean으로 적음
@Configuration

// SecurityConfig: 이 보안 시스템의 전역 규칙(정책)을 설정하는 클래스
public class SecurityConfig {

    @Value("${app.cors.allow-credentials:true}")
    private boolean allowCredentials;

    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") List<String> origins,
            @Value("${app.cors.allowed-origin-patterns}") List<String> originPatterns
    ) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(origins);                 // 정확 매칭
        cfg.setAllowedOriginPatterns(originPatterns);   // 패턴(trycloudflare)
        cfg.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(allowCredentials);
        cfg.setMaxAge(Duration.ofHours(1));
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }

    // 리소스 서버가 사용할 JwtDecoder Bean
    // JwtIssuerImpl / JwtVerifierImpl 과 동일한 시크릿(app.jwt.secret / JWT_SECRET)을 사용해서
    // Authorization: Bearer <access-token> 을 검증하게 만든다.
    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${app.jwt.secret:${JWT_SECRET:change-me}}") String jwtSecret
    ) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("app.jwt.secret 설정이 필요합니다.");
        }

        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) { // HS256 최소 256bit = 32byte
            throw new IllegalStateException("app.jwt.secret must be >= 32 bytes for HS256");
        }

        SecretKey key = new SecretKeySpec(keyBytes, "HmacSHA256");

        return NimbusJwtDecoder
                .withSecretKey(key)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
    }

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
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 1) CSRF 끄기 (API 서버 스타일)
            .csrf(AbstractHttpConfigurer::disable)

            // 2) CORS 설정 (위에서 만든 Bean 사용)
            .cors(Customizer.withDefaults())

            // 3) 세션을 STATELESS로 운영 (JWT만으로 인증)
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // 4) 리소스 서버: Authorization: Bearer <access-token> 검증
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))

            // 5) 보안 헤더 (지금 있는 그대로 유지)
            .headers(h -> h
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .preload(true)
                    .maxAgeInSeconds(31536000)
                )
                .frameOptions(frame -> frame.deny())
                .referrerPolicy(r -> r.policy(
                    org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN
                ))
            )

            // 6) URL별 인가 규칙
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**").permitAll()

                // 공개 auth 엔드포인트
                .requestMatchers(
                        "/api/auth/register/**",
                        "/api/auth/login/**",
                        "/api/auth/refresh/**",
                        "/api/auth/logout/**",
                        "/api/auth/find-id/**",
                        "/api/auth/find-password/**"
                ).permitAll()

                // 비번 변경은 "로그인한 사용자"만
                .requestMatchers("/api/auth/change-password/**").authenticated()

                // 문의 등록(공개)
                .requestMatchers("/api/inquiries/").permitAll()

                // 뉴스 공개는 모두 허용
                .requestMatchers("/api/news/**").permitAll()

                // 관리자 전용(뉴스/문의/계정) -> 일단 authenticated()만, 권한은 서비스에서 체크
                .requestMatchers("/api/admins/**").authenticated()

                // 나머지도 기본적으로 로그인 필요
                .anyRequest().authenticated()
            );

        return http.build();
    }
}
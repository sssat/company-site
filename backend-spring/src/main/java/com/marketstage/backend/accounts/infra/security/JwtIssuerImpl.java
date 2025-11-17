// accounts/infra/security/JwtIssuerImpl.java
// 로그인 및 리프레시 처리 시 요청받은 유저에 대해 액세스/리프레시 토큰을 발급해주는 역할
// 리프레시 토큰 검증은 JwtVerifier쪽에서 하고, 이 클래스는 "주어진 User로 토큰을 만들어주는 발급기" 역할만 한다
// accounts/application/port/out/JwtIssuer.java의 구현체(어댑터)
// JwtIssuer.java, AccountsService.java, SecurityConfig.java, application.yml, 도메인 모델(User, UserLevel)을 토대로 작성

package com.marketstage.backend.accounts.infra.security;

import com.marketstage.backend.accounts.application.port.out.JwtIssuer;
import com.marketstage.backend.accounts.domain.model.User;
import io.jsonwebtoken.Jwts;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class JwtIssuerImpl implements JwtIssuer {
    private final Clock clock;

    // ─────────────────────── 설정값 주입: application.yml 키와 일치 ───────────────────────

    // 1. 우선순위: app.jwt.secret -> 없으면 환경변수 JWT_SECRET -> 그것도 없으면 "change-me".
    // 이 값으로 HMAC 키를 만든다.
    // HMAC: 비밀 문자열(또는 바이트 배열). JWT에서 HS256/HS512 같은 알고리즘 쓸 때 사용하는 공동 비밀(Secret)
    @Value("${app.jwt.secret:${JWT_SECRET:change-me}}")
    private String jwtSecret;
    
    // 2. Access/Refresh 토큰 TTL(분 단위)
    // application.yml에서 app.jwt.access-minutes와 매칭
    @Value("${app.jwt.access-minutes:30}")
    private long accessMinutes;

    // application.yml에서 app.jwt.refresh-minutes와 매칭
    @Value("${app.jwt.refresh-minutes:60}")
    private long refreshMinutes;

    // 3. JWT의 iss, aud 표준 클레임 값(key:value 중 value). 검증 시에도 동일해야 한다.
    // 클레임: JWT 안에 들어가는 "key: value" 한 쌍
    // iss (issuer): 누가 이 토큰을 발급했는가?
    // issuer = "marketstage" => 이 토큰은 marketstage 서버가 발급했다
    @Value("${app.jwt.issuer:marketstage}")
    private String issuer;

    // aud (audience): 이 토큰은 무엇을 위한 것인가?
    // audience = "marketstage" => 이 토큰은 marketstage 서비스용이다
    @Value("${app.jwt.audience:marketstage}")
    private String audience;

    // 4. 토큰에 담길 사용자 식별자 클레임 키(key:value 중 key): 발급한 토큰이 나중에 서버로 돌아왔을 때, 이 토큰이 어떤 유저의 것인지 알아내는 용도
    // JWT에 들어갈 유저 식별자 클레임 이름을 설정에서 받아서 userIdClaim 변수에 넣음
    // 설정이 없으면 기본값은 user_seq
    @Value("${app.jwt.user-id-claim:user_seq}")
    private String userIdClaim;

    // ─────────────────── Key 초기화 ───────────────────────

    // 1. HS256 서명에 사용할 HMAC 키 (alg를 HS256으로 강제)
    private SecretKey key;

    // 2. JWT 발급에 필요한 설정값들을 검사하고, 서명 키를 미리 만들어 캐시해두는 초기화 함수
    // 캐시: 자주 쓸 결과를 미리 계산해서 변수에 저장해두고, 나중에 계속 그걸 꺼내 쓰는 것
    @PostConstruct
    void init() {

        // 시크릿 필수 검사: 비어 있으면 서버 부팅 시 바로 예외 -> 오작동 상태로 서비스 시작 방지
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("app.jwt.secret 설정이 필요합니다.");
        }

        // 길이 검사: HS256은 최소 256bit -> 최소 32바이트
        byte[] bytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("app.jwt.secret must be >= 32 bytes for HS256");
        }

        // JJWT 권장 방식: HS256 알고리즘을 명시해서 SecretKey 생성
        this.key = new SecretKeySpec(
                bytes,
                Jwts.SIG.HS256.key().build().getAlgorithm()
        );

        // issuer/audience/userIdClaim 기본값 보정: 만약 설정이 비어 있으면 안전한 기본값으로 세팅
        if (issuer == null || issuer.isBlank()) issuer = "marketstage";
        if (audience == null || audience.isBlank()) audience = "marketstage";
        if (userIdClaim == null || userIdClaim.isBlank()) userIdClaim = "user_seq";
    }

    // ───────────────────────── 실제 JWT 문자열을 만들어내는 부분 ───────────────────────────

    // 1. null -> 빈 문자열로 바꿔주는 작은 헬퍼 함수
    private static String nullSafe(String s) { return (s == null) ? "" : s; }

    // 2. User + TTL + tokenType(access/refresh)를 받아서 실제 JWT 문자열을 만들어내는 헬퍼 함수
    private String buildToken(User user, Duration ttl, String tokenType) {
        Integer userSeq = user.getUserSeq();
        if (userSeq == null) throw new IllegalArgumentException("userSeq is null");

        Instant now = Instant.now(clock);
        Instant exp = now.plus(ttl);

        // 커스텀 클레임
        Map<String, Object> claims = new HashMap<>();
        claims.put(userIdClaim, userSeq);
        claims.put("token_type", tokenType);
        claims.put("userId", nullSafe(user.getUserId()));
        claims.put("email",  nullSafe(user.getEmail()));
        if (user.getLevel() != null && user.getLevel().getGradeCode() != null) {
            claims.put("gradeCode", user.getLevel().getGradeCode());
        }

        // JJWT 0.12.x 권장: 알고리즘 자동 결정 -> signWith(key)만 사용
        // (HMAC 키 길이에 따라 HS256/384/512 자동 선택)
        return Jwts.builder()
                .claims(claims)                         // 커스텀 클레임 먼저
                .issuer(issuer)                         // iss
                .audience().add(audience).and()         // aud
                .subject(String.valueOf(userSeq))       // sub
                .issuedAt(Date.from(now))               // iat
                .expiration(Date.from(exp))             // exp
                .signWith(key, Jwts.SIG.HS256)          // 알고리즘 HS256으로 명시적으로 서명 (alg=HS256)
                .compact();
    }

    // ──────────── JwtIssuer에서 선언한 시그니처 함수 오버라이드 ────────────

    // 1. 엑세스 토큰을 발급해주는 메서드
    @Override
    public String issueAccessToken(User user) {
        return buildToken(user, Duration.ofMinutes(accessMinutes), "access");
    }

    // 2. 리프레시 토큰을 발급해주는 메서드
    @Override
    public String issueRefreshToken(User user) {
        return buildToken(user, Duration.ofMinutes(refreshMinutes), "refresh");
    }
}

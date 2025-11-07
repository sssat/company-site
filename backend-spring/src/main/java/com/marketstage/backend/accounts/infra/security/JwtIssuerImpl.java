// accounts/infra/security/JwtIssuerImpl.java
// 로그인 시 액세스/리프레시 토큰을 생성해주는 어댑터 & 엑세스 토큰 갱신 시 새 액세스 토큰을 발급하는 역할도 맡는다
// accounts/application/port/out/JwtIssuer.java의 구현체(어댑터)
// JwtIssuer.java, AccountsService.java, SecurityConfig.java, application.yml, 도메인 모델(User, UserLevel)을 토대로 작성

package com.marketstage.backend.accounts.infra.security;

import com.marketstage.backend.accounts.application.port.out.JwtIssuer;
import com.marketstage.backend.accounts.domain.model.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class JwtIssuerImpl implements JwtIssuer {

    // ── application.yml 키와 일치 ──
    @Value("${app.jwt.secret:${JWT_SECRET:change-me}}")
    private String jwtSecret;

    @Value("${app.jwt.access-minutes:30}")
    private long accessMinutes;

    @Value("${app.jwt.refresh-minutes:60}")
    private long refreshMinutes;

    @Value("${app.jwt.issuer:marketstage}")
    private String issuer;

    @Value("${app.jwt.audience:marketstage}")
    private String audience;

    // 토큰에 담길 사용자 식별자 클레임 키
    @Value("${app.jwt.user-id-claim:user_seq}")
    private String userIdClaim;

    private final Clock clock;

    private Key key; // HS256 키 캐시

    @PostConstruct
    void init() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("app.jwt.secret 설정이 필요합니다.");
        }
        byte[] bytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) { // HS256 최소 256bit
            throw new IllegalStateException("app.jwt.secret must be >= 32 bytes for HS256");
        }
        this.key = Keys.hmacShaKeyFor(bytes);

        if (issuer == null || issuer.isBlank()) issuer = "marketstage";
        if (audience == null || audience.isBlank()) audience = "marketstage";
        if (userIdClaim == null || userIdClaim.isBlank()) userIdClaim = "user_seq";
    }

    @Override
    public String issueAccessToken(User user) {
        return buildToken(user, Duration.ofMinutes(accessMinutes), "access");
    }

    @Override
    public String issueRefreshToken(User user) {
        return buildToken(user, Duration.ofMinutes(refreshMinutes), "refresh");
    }

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
                .signWith(key)                          // 알고리즘 자동 결정
                .compact();
    }

    private static String nullSafe(String s) { return (s == null) ? "" : s; }
}

// accounts/infra/security/JwtVerifierImpl.java
// 리프레시 토큰을 검증해서 엑세스 토큰 갱신에 사용할 사용자 식별자(userSeq)를 돌려주는 어댑터
// 실제 엑세스 토큰 갱신(새 액세스 토큰 발급)은 JwtIssuerImpl.java가 맡는다.
// accounts/application/port/out/JwtVerifier.java의 구현체(어댑터)
// application.yml, SecurityConfig.java, JwtVerifier.java, JwtIssuerImpl.java를 토대로 작성

package com.marketstage.backend.accounts.infra.security;

import com.marketstage.backend.accounts.application.port.out.JwtVerifier;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.Set;                

@Component
@RequiredArgsConstructor
public class JwtVerifierImpl implements JwtVerifier {

    // ─────────────────────── 설정값 주입: application.yml 키와 일치 ───────────────────────

    @Value("${app.jwt.secret:${JWT_SECRET:change-me}}")
    private String jwtSecret;

    @Value("${app.jwt.issuer:marketstage}")
    private String issuer;

    @Value("${app.jwt.audience:marketstage}")
    private String audience;

    @Value("${app.jwt.user-id-claim:user_seq}")
    private String userIdClaim;

    // ─────────────────────── Key 초기화 ───────────────────────

    // 리프레시 토큰 검증에 사용할 HMAC 비밀키를 한 번 만들어서 여기에 저장해두고, 나중에 토큰 검증할 때 계속 재사용
    private SecretKey key;

    @PostConstruct
    void init() {

        // jwtSecret 유효성 검사 (비어 있으면 예외)
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("app.jwt.secret 설정이 필요합니다.");
        }

        // jwtSecret으로 HMAC 서명/검증용 키를 만들어서 key 변수에 저장
        byte[] bytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("app.jwt.secret must be >= 32 bytes for HS256");
        }
        this.key = Keys.hmacShaKeyFor(bytes);

        // JWT 검증에 쓸 기준 값들(iss, aud, userIdClaim)이 비어 있으면 최소한 안전한 기본값으로 세팅
        if (issuer == null || issuer.isBlank()) issuer = "marketstage";
        if (audience == null || audience.isBlank()) audience = "marketstage";
        if (userIdClaim == null || userIdClaim.isBlank()) userIdClaim = "user_seq";
    }

    // ─────────────────────── JwtVerifier에서 선언한 시그니처 함수 오버라이드 ───────────────────────

    // 리프레시 토큰을 검증해서, 액세스 토큰 갱신에 사용할 사용자 식별자(userSeq)를 돌려주는 함수
    @Override
    public Integer verifyRefreshAndGetUserSeq(String refreshJwt) {

        // 문자열 전처리
        Objects.requireNonNull(refreshJwt, "refreshJwt");

        String jwt = refreshJwt.trim();
        if (jwt.regionMatches(true, 0, "Bearer ", 0, 7)) {
            jwt = jwt.substring(7).trim();
        }
        if (jwt.isEmpty()) throw new IllegalArgumentException("refresh token required");

        // JWT 파싱 + 서명 검증 + iss(발급자) 검증
        try {
            JwtParser parser = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(issuer)
                    .build();

            Jws<Claims> jws = parser.parseSignedClaims(jwt);
            Claims claims = jws.getPayload();

            // audience(aud) 검증
            Set<String> aud = claims.getAudience();
            if (aud == null || !aud.contains(audience)) {
                throw new IllegalArgumentException("invalid audience");
            }

            // token_type이 "refresh"인지 확인
            String type = claims.get("token_type", String.class);
            if (!"refresh".equals(type)) {
                throw new IllegalArgumentException("not a refresh token");
            }

            // userSeq(userIdClaim) 추출 => 이 토큰이 도대체 누구(userSeq)의 토큰인지?
            Number userSeqNum = claims.get(userIdClaim, Number.class);
            if (userSeqNum != null) return userSeqNum.intValue();

            String sub = claims.getSubject();
            if (sub != null && sub.matches("\\d+")) return Integer.parseInt(sub);

            throw new IllegalArgumentException("missing user id claim");
        
        // 예외 매핑
        } catch (ExpiredJwtException e) {
            throw new IllegalArgumentException("token expired", e);
        } catch (JwtException e) {
            throw new IllegalArgumentException("invalid token", e);
        }
    }
}
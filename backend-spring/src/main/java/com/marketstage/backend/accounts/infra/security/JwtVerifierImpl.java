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
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class JwtVerifierImpl implements JwtVerifier {

    @Value("${app.jwt.secret:${JWT_SECRET:change-me}}")
    private String jwtSecret;

    @Value("${app.jwt.issuer:marketstage}")
    private String issuer;

    @Value("${app.jwt.audience:marketstage}")
    private String audience;

    @Value("${app.jwt.user-id-claim:user_seq}")
    private String userIdClaim;

    // HS256용 HMAC 키
    private SecretKey key;

    @PostConstruct
    void init() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("app.jwt.secret 설정이 필요합니다.");
        }

        byte[] bytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("app.jwt.secret must be >= 32 bytes for HS256");
        }

        this.key = new SecretKeySpec(
                bytes,
                Jwts.SIG.HS256.key().build().getAlgorithm()
        );

        if (issuer == null || issuer.isBlank()) issuer = "marketstage";
        if (audience == null || audience.isBlank()) audience = "marketstage";
        if (userIdClaim == null || userIdClaim.isBlank()) userIdClaim = "user_seq";
    }

    @Override
    public Integer verifyRefreshAndGetUserSeq(String refreshJwt) {
        Objects.requireNonNull(refreshJwt, "refreshJwt");

        String jwt = refreshJwt.trim();
        if (jwt.regionMatches(true, 0, "Bearer ", 0, 7)) {
            jwt = jwt.substring(7).trim();
        }
        if (jwt.isEmpty()) {
            throw new IllegalArgumentException("refresh token required");
        }

        try {
            JwtParser parser = Jwts.parser()
                    .verifyWith(key)          // HS256 키
                    .requireIssuer(issuer)
                    .build();

            Jws<Claims> jws = parser.parseSignedClaims(jwt);
            Claims claims = jws.getPayload();

            Set<String> aud = claims.getAudience();
            if (aud == null || !aud.contains(audience)) {
                throw new IllegalArgumentException("invalid audience");
            }

            String type = claims.get("token_type", String.class);
            if (!"refresh".equals(type)) {
                throw new IllegalArgumentException("not a refresh token");
            }

            Number userSeqNum = claims.get(userIdClaim, Number.class);
            if (userSeqNum != null) return userSeqNum.intValue();

            String sub = claims.getSubject();
            if (sub != null && sub.matches("\\d+")) {
                return Integer.parseInt(sub);
            }

            throw new IllegalArgumentException("missing user id claim");

        } catch (ExpiredJwtException e) {
            throw new IllegalArgumentException("token expired", e);
        } catch (JwtException e) {
            throw new IllegalArgumentException("invalid token", e);
        }
    }
}

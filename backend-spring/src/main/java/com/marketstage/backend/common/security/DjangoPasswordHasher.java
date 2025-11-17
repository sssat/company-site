// src/main/java/com/marketstage/backend/common/security/DjangoPasswordHasher.java

package com.marketstage.backend.common.security;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.spec.KeySpec;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/**
 * 장고 스타일 비밀번호 해시("pbkdf2_sha256$...")를 검증하기 위한 유틸 클래스.
 *
 * Django 기본 포맷:
 *   pbkdf2_sha256$iterations$salt$hash
 *
 * - 알고리즘: PBKDF2WithHmacSHA256
 * - hash 부분: 파생 키(바이트)를 Base64로 인코딩한 문자열
 *
 * 이 클래스는 스프링 쪽에서 "로그인 시 기존 장고 해시를 검증"할 때만 사용한다.
 * 새 비밀번호를 생성할 때는 사용하지 않고, 그때는 BCrypt로만 저장하도록 한다.
 */
public final class DjangoPasswordHasher {

    private static final String DJANGO_ALGORITHM = "pbkdf2_sha256";
    private static final String PBKDF2_ALGORITHM_JAVA = "PBKDF2WithHmacSHA256";
    private static final int KEY_LENGTH_BITS = 256; // SHA-256 → 32 bytes → 256 bits

    private DjangoPasswordHasher() {
        // 유틸 클래스이므로 인스턴스 생성 방지
    }

    /**
     * 장고 스타일 해시 문자열과 평문 비밀번호를 비교하여 일치 여부를 반환한다.
     *
     * @param rawPassword   사용자가 입력한 평문 비밀번호
     * @param djangoEncoded DB에 저장된 장고 스타일 해시 (예: pbkdf2_sha256$260000$salt$hash)
     * @return 일치하면 true, 아니면 false
     */
    public static boolean matches(String rawPassword, String djangoEncoded) {
        if (rawPassword == null || djangoEncoded == null) {
            return false;
        }

        // "pbkdf2_sha256$iterations$salt$hash" 포맷을 파싱
        String[] parts = djangoEncoded.split("\\$");
        if (parts.length != 4) {
            // 예상한 포맷이 아니면 장고 해시로 보지 않고 false
            return false;
        }

        String algorithm = parts[0];
        String iterationsStr = parts[1];
        String salt = parts[2];
        String expectedBase64Hash = parts[3];

        if (!DJANGO_ALGORITHM.equals(algorithm)) {
            // 알고리즘 이름이 다르면 장고 기본 해시가 아니라고 판단
            return false;
        }

        int iterations;
        try {
            iterations = Integer.parseInt(iterationsStr);
        } catch (NumberFormatException e) {
            return false;
        }

        try {
            // 평문 비밀번호 + salt + iterations를 사용해서 PBKDF2-SHA256 해시 생성
            byte[] computedHash = pbkdf2(rawPassword, salt, iterations, KEY_LENGTH_BITS);

            // 장고는 파생 키를 Base64로 인코딩해서 저장하므로 동일하게 처리
            String computedBase64 = Base64.getEncoder().encodeToString(computedHash);

            // 시간 상수 비교로 보안 강화
            return constantTimeEquals(
                    expectedBase64Hash.getBytes(StandardCharsets.UTF_8),
                    computedBase64.getBytes(StandardCharsets.UTF_8)
            );
        } catch (GeneralSecurityException e) {
            // 암호화 관련 설정 문제(알고리즘 미지원 등)가 있으면 안전하게 false 반환
            return false;
        }
    }

    /**
     * PBKDF2WithHmacSHA256으로 파생 키를 계산한다.
     */
    private static byte[] pbkdf2(String rawPassword, String salt, int iterations, int keyLengthBits)
            throws GeneralSecurityException {

        char[] passwordChars = rawPassword.toCharArray();
        byte[] saltBytes = salt.getBytes(StandardCharsets.UTF_8);

        KeySpec spec = new PBEKeySpec(passwordChars, saltBytes, iterations, keyLengthBits);
        SecretKeyFactory skf = SecretKeyFactory.getInstance(PBKDF2_ALGORITHM_JAVA);
        return skf.generateSecret(spec).getEncoded();
    }

    /**
     * MessageDigest.isEqual 을 사용한 시간 상수 비교.
     */
    private static boolean constantTimeEquals(byte[] expected, byte[] actual) {
        return MessageDigest.isEqual(expected, actual);
    }
}

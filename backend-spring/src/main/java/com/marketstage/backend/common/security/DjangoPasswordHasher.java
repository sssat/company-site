// src/main/java/com/marketstage/backend/common/security/DjangoPasswordHasher.java

package com.marketstage.backend.common.security;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.spec.KeySpec;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public final class DjangoPasswordHasher {

    private static final String DJANGO_ALGORITHM = "pbkdf2_sha256";
    private static final String PBKDF2_ALGORITHM_JAVA = "PBKDF2WithHmacSHA256";
    private static final int KEY_LENGTH_BITS = 256; // SHA-256 → 32 bytes → 256 bits

    private DjangoPasswordHasher() {
        // 유틸 클래스이므로 인스턴스 생성 방지
    }

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

    private static byte[] pbkdf2(String rawPassword, String salt, int iterations, int keyLengthBits)
            throws GeneralSecurityException {

        char[] passwordChars = rawPassword.toCharArray();
        byte[] saltBytes = salt.getBytes(StandardCharsets.UTF_8);

        KeySpec spec = new PBEKeySpec(passwordChars, saltBytes, iterations, keyLengthBits);
        SecretKeyFactory skf = SecretKeyFactory.getInstance(PBKDF2_ALGORITHM_JAVA);
        return skf.generateSecret(spec).getEncoded();
    }

    private static boolean constantTimeEquals(byte[] expected, byte[] actual) {
        return MessageDigest.isEqual(expected, actual);
    }
}

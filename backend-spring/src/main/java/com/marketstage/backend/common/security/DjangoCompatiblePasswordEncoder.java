// src/main/java/com/marketstage/backend/common/security/DjangoCompatiblePasswordEncoder.java

package com.marketstage.backend.common.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

public class DjangoCompatiblePasswordEncoder implements PasswordEncoder {

    // 스프링 기본 BCrypt 인코더(강도는 기본값 사용)
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    @Override
    public String encode(CharSequence rawPassword) {
        if (rawPassword == null) {
            throw new IllegalArgumentException("rawPassword must not be null");
        }
        return bcrypt.encode(rawPassword);
    }


    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (rawPassword == null || encodedPassword == null) {
            return false;
        }

        // 1) 장고 해시 포맷인 경우: pbkdf2_sha256$iterations$salt$hash
        if (encodedPassword.startsWith("pbkdf2_sha256$")) {
            return DjangoPasswordHasher.matches(rawPassword.toString(), encodedPassword);
        }

        // 2) 그 외(새로 생성된 bcrypt 해시 등)는 BCrypt로 검증
        return bcrypt.matches(rawPassword, encodedPassword);
    }


    @Override
    public boolean upgradeEncoding(String encodedPassword) {
        // pbkdf2_sha256 해시는 bcrypt로 바꾸고 싶은 "구버전"으로 볼 수 있음
        if (encodedPassword != null && encodedPassword.startsWith("pbkdf2_sha256$")) {
            return true;
        }
        // 이미 bcrypt라면 굳이 업그레이드할 필요 없음
        return false;
    }
}

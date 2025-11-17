// src/main/java/com/marketstage/backend/common/security/DjangoCompatiblePasswordEncoder.java
package com.marketstage.backend.common.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Django + Spring BCrypt 양쪽을 모두 지원하는 PasswordEncoder 구현체.
 *
 * 동작 방식:
 *  - encode():
 *      새로 생성하거나 변경하는 비밀번호는 모두 BCrypt로 해시해서 저장한다.
 *  - matches():
 *      1) DB 값이 "pbkdf2_sha256$..." 로 시작하면 → DjangoPasswordHasher 로 검증
 *      2) 그 외의 값은 → BCryptPasswordEncoder 로 검증
 *
 * 이렇게 하면:
 *  - 기존 장고 DB에 남아있는 계정(장고 해시)도 로그인 가능
 *  - 스프링에서 새로 가입/비번변경한 계정은 BCrypt 해시로 동작
 */
public class DjangoCompatiblePasswordEncoder implements PasswordEncoder {

    // 스프링 기본 BCrypt 인코더(강도는 기본값 사용)
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    /**
     * 새 비밀번호를 해시할 때 호출된다.
     * 여기서는 항상 BCrypt로만 인코딩한다.
     */
    @Override
    public String encode(CharSequence rawPassword) {
        if (rawPassword == null) {
            throw new IllegalArgumentException("rawPassword must not be null");
        }
        return bcrypt.encode(rawPassword);
    }

    /**
     * 로그인 시 DB에 저장된 해시와 사용자가 입력한 비밀번호를 비교한다.
     * - "pbkdf2_sha256$" 로 시작하면 장고 해시로 간주하고 DjangoPasswordHasher 로 검증
     * - 그 외에는 BCrypt로 간주하고 BCryptPasswordEncoder 로 검증
     */
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

    /**
     * (선택) Spring Security 5.0+ 에서 사용하는 업그레이드 여부 판단 메서드.
     * 여기서는 단순히 "장고 해시인 경우에는 업그레이드 가능" 정도로 구현할 수 있다.
     * 실제 업그레이드는 비밀번호 변경 시에만 이뤄지도록 서비스 레벨에서 처리하는 것이 일반적이다.
     */
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

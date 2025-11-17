// accounts/application/port/out/JwtIssuer.java
// 토큰 발급을 위한 아웃바운드 포트(계약서)
// 로그인 시 "액세스/리프레시 토큰을 만들어줘"라는 인터페이스(계약)를 정의하고,
// 리프레시 토큰 검증 후, 새 액세스 토큰을 발급할 때도 이 인터페이스를 통해 JwtIssuerImpl을 호출한다.
// 검증 역할은 JwtVerifier가 담당하고, 이 인터페이스는 순수하게 "발급"만 담당
// 이 계약서의 구현은 인프라의 JWT 어댑터(accounts/infra/security/JwtIssuerImpl.java)가 맡는다.
// 장고에서는 JwtIssuer.java, JwtVerifier.java 부분을 views.py에서 처리했지만, 여기선 별도의 인터페이스로 분리함

package com.marketstage.backend.accounts.application.port.out;

import com.marketstage.backend.accounts.domain.model.User;

public interface JwtIssuer {
    // 1. 액세스 토큰을 발급해주는 추상(abstract) 메서드
    String issueAccessToken(User user);

    // 2. 리프레시 토큰을 발급해주는 추상(abstract) 메서드
    String issueRefreshToken(User user);
}

// accounts/application/port/out/JwtIssuer.java
// 토큰 발급을 위한 아웃바운드 포트(계약서)
// "액세스/리프레시 토큰을 만들어줘"라는 인터페이스(계약)
// 이 계약서의 구현은 인프라의 JWT 어댑터(infra/jwt/JwtIssuerJjwtAdapter.java)가 맡고, 서비스에서는 JwtIssuer.java 계약서만 호출한다.

package com.marketstage.backend.accounts.application.port.out;

import com.marketstage.backend.accounts.domain.model.User;

public interface JwtIssuer {
    String issueAccessToken(User user);
    String issueRefreshToken(User user);
}
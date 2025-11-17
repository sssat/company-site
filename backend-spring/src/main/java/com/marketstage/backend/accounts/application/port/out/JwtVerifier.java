// accounts/application/port/out/JwtVerifier.java
// 리프레시 토큰을 검증해서 엑세스 토큰 갱신에 사용할 사용자 식별자(userSeq)를 돌려주는 아웃바운드 포트(인터페이스)

package com.marketstage.backend.accounts.application.port.out;

public interface JwtVerifier {
    // 1. 리프레시 토큰을 검증해서, 액세스 토큰 갱신에 사용할 사용자 식별자(userSeq)를 돌려주는 추상(abstract) 메서드
    Integer verifyRefreshAndGetUserSeq(String refreshJwt);
}

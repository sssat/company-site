// accounts/application/port/out/JwtVerifier.java
// 장고에서는 서비스 코드에서 정의 및 구현했지만 여기선 별도의 인터페이스로 분리함

package com.marketstage.backend.accounts.application.port.out;

public interface JwtVerifier {
    // 1. 액세스 토큰을 갱신해주는 함수 (리프레시 토큰이 유효하다면)
    Integer verifyRefreshAndGetUserSeq(String refreshJwt);
}

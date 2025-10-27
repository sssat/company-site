// accounts/application/AccountsUseCase.java
// 파이썬 장고로 치면 services.py의 함수들의 시그니처들만 모아놓은 파일이다.  
// 컨트롤러가 호출할 기능 목록(login, signUp, precheck, promote/demote, ... 등)을 메서드 시그니처로 정의한다.
// 또한 각 유즈케이스에서 사용하는 요청(*Command)과 응답(*Result) record DTO 타입을 함께 정의한다.
// 따라서 class가 아닌, interface로 선언함 -> 실제 시그니처의 로직 구현은 AccountsService.java가 담당 
// 하지만 record 클래스는 이미 AccountsUseCase 안에서 타입 선언이 끝난 DTO들이기때문에, AccountsService.java에서는 갖다 쓰기만한다.

package com.marketstage.backend.accounts.application;

import java.time.LocalDate;

public interface AccountsUseCase {

    // =============== record DTO들 (입출력 모델) =============== 

    // 1.아이디 중복검사 성공 시 응답으로 들어오는 토큰/만료초 등의 값을 담은 클래스
    // 이름이 IdPrecheckResult인 record 클래스를 선언
    // record => "데이터만 담는 클래스"를 간단히 쓰는 방법 -> record 사용 시 자동으로 아래 생성자/메서드들이 생긴다
    // 생성자: new IdPrecheckResult(String idCheckToken, int expiresInSeconds)
    // 게터: idCheckToken(), expiresInSeconds()
    // 메서드: equals, hashCode, toString
    record IdPrecheckResult(String idCheckToken, int expiresInSeconds) {}

    // 2.이메일 중복검사 성공 시 응답으로 들어오는 토큰/만료초 등의 값을 담은 클래스
    record EmailPrecheckResult(String emailCheckToken, int expiresInSeconds) {}

    // 3.회원가입 입력 시 들어오는 값 묶음을 담은 클래스
    record SignUpCommand(
            String userId,
            String email,
            String rawPassword,
            String username,
            LocalDate birthDate,
            String gender,           
            boolean agreeWhether,
            String idCheckToken,
            String emailCheckToken
    ) {}

    // 4.로그인 성공 시 응답으로 들어오는 값 묶음을 담은 클래스 -> 최소 사용자 정보(userSeq, userId, email, userName, role)와 토큰(accessToken, refreshToken)
    record LoginResult(
            Integer userSeq,
            String userId,
            String email,
            String role,        // "USER" | "ADMIN" | "SUPER_ADMIN"
            String userName,
            String accessToken,
            String refreshToken // 컨트롤러에서 HttpOnly 쿠키로 내려줄 수 있음(정책에 따라 미사용 가능)
    ) {}

    // =============== 유즈케이스 메서드(무엇을 할지) =============== 

    // 1. 아이디 사전 중복검사 메서드 
    IdPrecheckResult precheckUserId(String userId);

    // 2. 이메일 사전 중복검사 메서드 
    EmailPrecheckResult precheckEmail(String email);

    // 3. 회원가입 메서드 
    Integer signUp(SignUpCommand cmd);

    // 4. 로그인 메서드 
    LoginResult login(String userId, String rawPassword);

    // 5. 관리자 승격 메서드 
    void promoteToAdmin(Integer targetUserSeq, Integer operatorUserSeq);

    // 6. 일반 사용자 강등 메서드 
    void demoteToUser(Integer targetUserSeq, Integer operatorUserSeq);
}


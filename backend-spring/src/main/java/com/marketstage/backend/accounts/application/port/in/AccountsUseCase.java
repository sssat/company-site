// accounts/application/port/in/AccountsUseCase.java
// Accounts 인바운드 포트(=유즈케이스)
// 파이썬 장고로 치면 services.py의 함수들의 시그니처들만 모아놓은 파일이다.  
// 컨트롤러(장고의 views.py에 대응)가 호출할 기능들을 메서드 시그니처로 정의만 한다.
// 또한 서비스(AccountsService.java)/컨트롤러에서 가져다 쓸 입출력 record DTO 타입을 함께 정의한다.
// 따라서 class가 아닌, interface로 선언함 -> 실제 시그니처의 로직 구현은 서비스가 담당 
// 하지만 record 클래스는 이미 AccountsUseCase.java 안에서 구현까지 끝난 클래스 이므로, AccountsService.java에서는 갖다 쓰기만한다.

package com.marketstage.backend.accounts.application.port.in;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface AccountsUseCase {

    // =============== record DTO들 (입출력 모델) =============== 

    // 1. 아이디 중복검사 성공 시 응답으로 들어오는 토큰/만료초 등의 값을 담은 클래스
    // 이름이 IdPrecheckResult인 record 클래스를 선언
    // record => "데이터만 담는 클래스"를 간단히 쓰는 방법 -> record 사용 시 자동으로 아래 생성자/메서드들이 생긴다
    // 생성자: new IdPrecheckResult(String idCheckToken, int expiresInSeconds)
    // 게터: idCheckToken(), expiresInSeconds()
    // 메서드: equals, hashCode, toString
    record IdPrecheckResult(String idCheckToken, int expiresInSeconds) {}

    // 2. 이메일 중복검사 성공 시 응답으로 들어오는 토큰/만료초 등의 값을 담은 클래스
    record EmailPrecheckResult(String emailCheckToken, int expiresInSeconds) {}

    // 3. 회원가입 입력 시 들어오는 값 묶음을 담은 클래스
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

    // 4. 로그인 성공 시 응답으로 들어오는 값 묶음을 담은 클래스 -> 최소 사용자 정보(userSeq, userId, email, userName, role)와 토큰(accessToken, refreshToken)
    record LoginResult(
            Integer userSeq,
            String userId,
            String email,
            String role,        // "USER" | "ADMIN" | "SUPER_ADMIN"
            String userName,
            String accessToken,
            String refreshToken // 컨트롤러에서 HttpOnly 쿠키로 내려줄 수 있음(정책에 따라 미사용 가능)
    ) {}

    // 5. 아이디 찾기 (이메일+이름으로 user_id 조회)
    record FindIdCommand(String email, String userName) {}
    record FindIdResult(String userId) {}

    // 6. 비밀번호 찾기(임시 비밀번호 발급) 요청 값 
    record FindPasswordCommand(
            String userId,   // 입력 아이디
            String userName, // 입력 이름
            String email     // 입력 이메일
    ) {}
    // 비밀번호 찾기 결과 값 (임시 비밀번호) 
    record FindPasswordResult(
            String tempPassword
    ) {}

    // 7. 비밀번호 변경 요청 값 
    record ChangePasswordCommand(
            Integer actorUserSeq,          // 현재 로그인 사용자 PK
            String currentPassword,        // 현재 비번
            String newPassword,            // 새 비번
            String newPasswordConfirm      // 새 비번 확인
    ) {}

    // 8. 회원 목록 조회 
    record UserListQuery(
            Integer actorUserSeq, // 요청자 PK(권한 확인용)
            int page,             // 1-based
            int size,             // 1~100
            String q              // 공백 AND 검색어
    ) {}

    // 회원 목록 조회
    record UserListItem(
            Integer userSeq,
            String userId,
            String userName,
            int gradeCode,        // 0/1/2
            String gradeName      // "일반"/"관리자"/"슈퍼관리자"
    ) {}

    // 회원 목록 조회
    record UserListResult(
            List<UserListItem> items,
            int page,
            int size,
            long totalCount,
            int totalPages
    ) {}

    // 9. 승격 결과 DTO
    record PromoteResult(
            Integer userSeq,          // 승격 대상
            Integer actedSeq,         // 처리자(SUPER_ADMIN)
            String adminLevel,        // "ADMIN"
            LocalDateTime grantedAt   // 부여 시각
    ) {}

    // 10. 강등 결과
    record DemoteResult(
            Integer userSeq,        // 강등 대상
            Integer actedSeq,       // 처리자(SUPER_ADMIN)
            LocalDateTime demotedAt // 강등 시각
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

    // 5. 아이디 찾기
    FindIdResult findUserId(FindIdCommand cmd);

    // 6. 비밀번호 찾기(임시 비밀번호 발급) 
    FindPasswordResult findPassword(FindPasswordCommand cmd);

    // 7. 비밀번호 변경 
    void changePassword(ChangePasswordCommand cmd);

    // 8. 회원 목록 조회 메서드 
    UserListResult listUsers(UserListQuery query);

    // 9. 관리자 승격 메서드 
    void promoteToAdmin(Integer targetUserSeq, Integer operatorUserSeq);

    // 10. 결과 DTO를 돌려받고 싶을 때 사용 
    PromoteResult promoteToAdminReturningResult(Integer targetUserSeq, Integer operatorUserSeq);

    // 11. 일반 사용자 강등 메서드 
    void demoteToUser(Integer targetUserSeq, Integer operatorUserSeq);

    // 12. 결과 DTO 반환 버전
    DemoteResult demoteToUserReturningResult(Integer targetUserSeq, Integer operatorUserSeq);

}


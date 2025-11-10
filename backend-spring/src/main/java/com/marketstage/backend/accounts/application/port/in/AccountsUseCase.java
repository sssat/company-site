// accounts/application/port/in/AccountsUseCase.java
// Accounts 인바운드 포트(=유즈케이스)
// 파이썬 장고로 치면 services.py의 함수들의 시그니처들만 모아놓은 파일이다.  
// 컨트롤러(장고의 views.py에 대응)가 호출할 기능들을 메서드 시그니처로 정의만 한다.
// 따라서 class가 아닌, interface로 선언함 -> 실제 함수 시그니처의 로직 구현은 서비스(AccountsService.java)가 담당 
// 이곳에서 정의한 메서드는 서비스에서 구현, 컨트롤러는 호출만 하고, record 클래스들은 서비스/컨트롤러 모두에서 공통 입출력 모델로 갖다 쓴다.
// 하지만 record 클래스는 이미 여기서 구현까지 끝난 클래스 이므로, 갖다 쓰기만한다.

package com.marketstage.backend.accounts.application.port.in;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.marketstage.backend.accounts.domain.model.User;

// 인터페이스도 클래스와 마찬가지로 public 선언은 파일 당 1개밖에 선언하지 못하고, 파일명과 인터페이스 이름이 같아야한다.
public interface AccountsUseCase {

    // =============== record DTO들 (입출력 모델) =============== 

    // 1. 아이디 중복검사 성공 시 응답(response)으로 들어오는 토큰/만료초 등의 값을 담은 클래스
    // 이름이 IdPrecheckResult인 record 클래스를 선언
    // 이 클래스 안에 String idCheckToken, int expiresInSeconds 등의 인스턴스 변수 존재 -> record 클래스에선 이 인스턴스 변수들을 레코드 컴포넌트라고 부름

    // record: "데이터만 담는 클래스"를 간단히 쓰는 방법 => record 사용 시 자동으로 아래 생성자/메서드들이 생긴다
    // 생성자: new IdPrecheckResult(String idCheckToken, int expiresInSeconds)
    // 게터 메서드: idCheckToken(), expiresInSeconds() -> 인스턴스 변수 이름으로 접근자 함수를 생성해준다.
    // 메서드: equals, hashCode, toString
    
    // 일반 클래스 vs record 클래스
    // class IdPrecheckResult{ } vs record IdPrecheckResult(...) { } 
    // 일반 클래스(class)는 { } 안에서 필드 목록, 생성자, 메서드(equals, hashCode, toString 포함)를 개발자가 직접 작성해야 함
    // record는 (...) 에 "필드 목록(레코드 컴포넌트)"만 적어주면, 해당 필드들에 대한 필드, 생성자, getter, equals, hashCode, toString을 컴파일러가 자동으로 만들어줌.
    // 필요하면 { } 안에 추가 메서드, 클래스, record, ... 등을 정의할 수 있음.

    // record가 사실은 아래 코드를 축약한 문법이다.
    /* 
    public final class IdPrecheckResult {

        // 1. 필드 (불변)
        private final String idCheckToken;
        private final int expiresInSeconds;

        // 2. 생성자 (canonical constructor)
        public IdPrecheckResult(String idCheckToken, int expiresInSeconds) {
                this.idCheckToken = idCheckToken;
                this.expiresInSeconds = expiresInSeconds;
        }

        // 3. 게터 (record에서는 필드 이름이 곧 메서드 이름)
        public String idCheckToken() {
                return idCheckToken;
        }

        public int expiresInSeconds() {
                return expiresInSeconds;
        }

        // 4. equals() 오버라이드
        @Override
        public boolean equals(Object o) {
                if (this == o) return true;
                if (!(o instanceof IdPrecheckResult that)) return false;
                if (!idCheckToken.equals(that.idCheckToken)) return false;
                return expiresInSeconds == that.expiresInSeconds;
        }

        // 5. hashCode() 오버라이드
        @Override
        public int hashCode() {
                int result = idCheckToken.hashCode();
                result = 31 * result + Integer.hashCode(expiresInSeconds);
                return result;
        }

        // 6. toString() 오버라이드
        @Override
        public String toString() {
                return "IdPrecheckResult[" +
                        "idCheckToken=" + idCheckToken +
                        ", expiresInSeconds=" + expiresInSeconds +
                        ']';
        }
    }
    */

    record IdPrecheckResult(
        String idCheckToken, 
        int expiresInSeconds
    ) {}

    // 2. 이메일 중복검사 성공 시 응답(response)으로 들어오는 토큰/만료초 등의 값을 담은 클래스
    record EmailPrecheckResult(
        String emailCheckToken, 
        int expiresInSeconds
    ) {}

    // 3. 회원가입 입력 시 보내주는 값(request) 묶음을 담은 클래스
    record SignUpCommand(
            String userId,
            String email,
            String rawPassword,
            String passwordConfirm,
            String username,
            LocalDate birthDate,
            String gender,           
            boolean agreeWhether,
            String idCheckToken,
            String emailCheckToken
    ) {}

    // 4. 로그인 성공 시 응답(response)으로 들어오는 값 묶음을 담은 클래스 -> 최소 사용자 정보(userSeq, userId, email, userName, role)와 토큰(accessToken, refreshToken)
    record LoginResult(
            Integer userSeq,
            String userId,
            String email,
            String role,        // "USER" | "ADMIN" | "SUPER_ADMIN"
            String userName,
            String accessToken,
            String refreshToken // 컨트롤러에서 HttpOnly 쿠키로 내려줄 수 있음(정책에 따라 미사용 가능)
    ) {}

    // 5. 아이디 찾기 조회 값(request)들을 담은 클래스
    record FindIdCommand(String email, String userName) {}

    // 6. 아이디 찾기 결과 값(response)을 담은 클래스
    record FindIdResult(String userId) {}

    // 7. 비밀번호 찾기 request 값을 담은 클래스
    record FindPasswordCommand(
            String userId,   // 입력 아이디
            String userName, // 입력 이름
            String email     // 입력 이메일
    ) {}

    // 8. 비밀번호 찾기 response 값을 담은 클래스
    record FindPasswordResult(
            String tempPassword  // 임시 비밀번호
    ) {}

    // 9. 비밀번호 변경 request 값을 담은 클래스
    record ChangePasswordCommand(
            Integer actorUserSeq,          // 현재 로그인 사용자 PK
            String currentPassword,        // 현재 비번
            String newPassword,            // 새 비번
            String newPasswordConfirm      // 새 비번 확인
    ) {}

    // 10. 회원 목록 조회 시 보낼 request 값들을 담은 클래스
    record UserListQuery(
            Integer actorUserSeq, // 요청자 PK(권한 확인용)
            int page,             // 페이지 번호 (현재 몇 페이지인지)
            int size,             // 페이지 크기 (최소 1, 최대 100)
            String q              // 검색어
    ) {}

    // 11. UserListResult에서 사용할 UserListItem 클래스 정의
    record UserListItem(
            Integer userSeq,
            String userId,
            String userName,
            int gradeCode,        // 0/1/2 중 하나
            String gradeName      // 일반/관리자/슈퍼관리자 중 하나
    ) {}

    // 12. 회원 목록 조회 시 받을 response 값들을 담은 클래스
    record UserListResult(
            List<UserListItem> items,
            int page,
            int size,
            long totalCount,
            int totalPages
    ) {}

    // 13. 승격 시 보내줄 response 값들을 담은 클래스
    record PromoteResult(
            Integer userSeq,          // 승격 대상 PK
            Integer actedSeq,         // 처리자(SUPER_ADMIN) PK
            String adminLevel,        // 항상 "ADMIN"
            LocalDateTime grantedAt   // 부여 시각
    ) {}

    // 14. 강등 시 보내줄 response 값들을 담은 클래스
    record DemoteResult(
            Integer userSeq,        // 강등 대상 PK
            Integer actedSeq,       // 처리자(SUPER_ADMIN) PK
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

    // 5. 아이디 찾기 메서드
    FindIdResult findUserId(FindIdCommand cmd);

    // 6. 비밀번호 찾기 메서드 (임시 비밀번호 발급) 
    FindPasswordResult findPassword(FindPasswordCommand cmd);

    // 7. 비밀번호 변경 메서드
    void changePassword(ChangePasswordCommand cmd);

    // 8. userSeq로 User 단건 조회 (리프레시 토큰 용)
    User getUserBySeq(Integer userSeq);

    // 9. 액세스 토큰 갱신 메서드
    String refreshAccessToken(String refreshToken);

    // 10. 회원 목록 조회 메서드 
    UserListResult listUsers(UserListQuery query);

    // 11. 관리자 승격 메서드 
    void promoteToAdmin(Integer targetUserSeq, Integer operatorUserSeq);

    // 12. 관리자 승격 결과를 알려주는 메서드
    PromoteResult promoteToAdminReturningResult(Integer targetUserSeq, Integer operatorUserSeq);

    // 13. 일반 사용자 강등 메서드 
    void demoteToUser(Integer targetUserSeq, Integer operatorUserSeq);

    // 14. 일반 사용자 강등 결과를 알려주는 메서드
    DemoteResult demoteToUserReturningResult(Integer targetUserSeq, Integer operatorUserSeq);
}
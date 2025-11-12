// src/main/java/com/marketstage/backend/accounts/api/AccountsController.java
// 컨트롤러: HTTP 요청을 받아서, 서비스에 일을 시키고, HTTP 응답으로 포장해서 돌려보내는 역할
// 컨트롤러에는 입출력 변환과 전달 역할만 맡기고, 비즈니스 로직 구현은 서비스에 위임
// [프론트] --- (HTTP 요청) ---> [AccountsController] --- (HTTP 요청을 DTO로 파싱 + 서비스 호출) ---> [AccountsService] --- (아웃바운드 포트 호출) ---> [Repository / 인프라 어댑터] --- (DB 조회 등 외부 작업 처리) ---> [AccountsService] ---> 다시 반대로 돌아오는 구조
// [프론트] -> [컨트롤러] -> [서비스] -> [레포지토리/인프라] -> [서비스] -> [컨트롤러] -> [프론트]
// 컨트롤러 안의 함수들은 자바 파일에서 직접 호출되는 게 아니라, HTTP 요청이 들어올 때 스프링이 자동으로 호출해준다.
// 파이썬 장고로 치면 views.py의 역할
// API 명세서, AccountsUseCase.java, accounts/api/dto/*를 토대로 작성

package com.marketstage.backend.accounts.api;

// 컨트롤러에서 쓰는 요청/응답 DTO들
import com.marketstage.backend.accounts.api.dto.AdminDemoteDto.AdminDemoteRequestDto;
import com.marketstage.backend.accounts.api.dto.AdminDemoteDto.AdminDemoteResponseDto;
import com.marketstage.backend.accounts.api.dto.AdminPromoteDto.AdminPromoteRequestDto;
import com.marketstage.backend.accounts.api.dto.AdminPromoteDto.AdminPromoteResponseDto;
import com.marketstage.backend.accounts.api.dto.ChangePasswordDto.ChangePasswordRequestDto;
import com.marketstage.backend.accounts.api.dto.EmailPrecheckDto.EmailPrecheckRequestDto;
import com.marketstage.backend.accounts.api.dto.EmailPrecheckDto.EmailPrecheckResponseDto;
import com.marketstage.backend.accounts.api.dto.FindIdDto.FindIdRequestDto;
import com.marketstage.backend.accounts.api.dto.FindIdDto.FindIdResponseDto;
import com.marketstage.backend.accounts.api.dto.FindPasswordDto.FindPasswordRequestDto;
import com.marketstage.backend.accounts.api.dto.FindPasswordDto.FindPasswordResponseDto;
import com.marketstage.backend.accounts.api.dto.IdPrecheckDto.IdPrecheckRequestDto;
import com.marketstage.backend.accounts.api.dto.IdPrecheckDto.IdPrecheckResponseDto;
import com.marketstage.backend.accounts.api.dto.LoginDto.LoginRequestDto;
import com.marketstage.backend.accounts.api.dto.LoginDto.LoginResponseDto;
import com.marketstage.backend.accounts.api.dto.LogoutDto.LogoutResponseDto;
import com.marketstage.backend.accounts.api.dto.SignUpDto.SignUpRequestDto;
import com.marketstage.backend.accounts.api.dto.SignUpDto.SignUpResponseDto;
import com.marketstage.backend.accounts.api.dto.TokenRefreshDto.TokenRefreshResponseDto;
import com.marketstage.backend.accounts.api.dto.UserListDto.UserListResponseDto;

// 애플리케이션 계층 (유즈케이스)
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

// 공통 예외 (프로젝트 내부 공용)
import com.marketstage.backend.common.exception.NotFoundException;

// HTTP 요청/쿠키
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

// 롬복
import lombok.RequiredArgsConstructor;

// 스프링 관련 (설정값, HTTP 응답, REST 컨트롤러)
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// 자바 표준 라이브러리
import java.util.Map;

// 이 클래스를 REST API 컨트롤러로 쓰겠다는 뜻. 내부적으로 @Controller + @ResponseBody 조합
// 클래스 안에 있는 각 메서드들이 리턴하는 객체들을 자동으로 JSON으로 직렬화해서 HTTP 응답 바디로 보내줌
// 역직렬화 해주는 어노테이션은 각 함수의 파라미터 @RequestBody를 붙여서, HTTP 요청 바디(JSON)를 DTO로 변환함
// 화면(HTML) 렌더링이 아니라 JSON REST API만 만들 거라서, @Controller가 아니라 @RestController를 사용함
@RestController

// 이 컨트롤러의 공통 URL prefix(접두어)
// 여기 있는 모든 메서드의 경로 앞에 /api가 붙음
@RequestMapping("/api")

@RequiredArgsConstructor
public class AccountsController {

    // 리프레시 토큰 쿠키 이름을 상수로 정의해둔 것
    // 곳곳에서 "refresh"라고 문자열 하드코딩 안 하고, 이 상수로 통일해서 사용
    private static final String REFRESH_COOKIE_NAME = "refresh";

    // /api/auth 경로 이하에서만 브라우저가 이 쿠키를 자동으로 붙여 보냄
    private static final String REFRESH_COOKIE_PATH = "/api/auth";

    // request header에 실려오는 현재 로그인 유저의 PK 번호를 담는 헤더 이름
    private static final String ACTOR_USER_SEQ_HEADER = "X-USER-SEQ";
    
    // 비즈니스 로직을 호출하기 위한 인스턴스 변수
    // 실제 구현 클래스는 AccountsService지만, 컨트롤러에서는 구현체가 아니라 AccountsUseCase 인터페이스 타입으로 호출한다.
    private final AccountsUseCase accountsUseCase;
    
    // 임시 비번을 response body에 노출해도 되는 개발 모드인지, 절대 안 되는 운영 모드인지를 구분해주는 플래그
    // true면(개발 모드) 비밀번호 찾기 시 response JSON에 임시 비밀번호를 포함하고,
    // false면(운영 모드) response body에는 임시 비밀번호를 포함하지 않는다. (기본값 false)
    @Value("${app.auth.debug-expose-temp-password:false}")
    private boolean debugExposeTempPassword;

    // ─────────────────────────────────────────
    // 1. precheckUserId: 아이디 사전 중복검사 컨트롤러 함수 구현
    // POST /api/auth/register/precheck/user-id
    // ─────────────────────────────────────────

    // 클라이언트가 POST 방식으로 /api/auth/register/precheck/user-id 주소로 요청을 보내면,
    // 이 아래에 있는 precheckUserId() 메서드가 그 요청을 처리하라는 뜻
    @PostMapping("/auth/register/precheck/user-id")

    // 함수명: precheckUserId
    // 반환 타입: ResponseEntity<IdPrecheckResponseDto> => IdPrecheckResponseDto 형태의 JSON을 담은 HTTP 응답(ResponseEntity)로 돌려준다
    
    // 파라미터: @RequestBody IdPrecheckRequestDto request
    // @RequestBody(파라미터 어노테이션): request body(JSON)를 이 파라미터에 매핑해달라는 뜻
    // 예를들어 프론트에서 { "user_id": "test123" } 이런 request body를 보내면 스프링이 이 JSON을 보고 IdPrecheckRequestDto의 필드에 맞춰서
    // user_id -> userId 같은 식으로 자동으로 값 채워서(DTO에 @JsonProperty("user_id")가 있다면) 
    // new IdPrecheckRequestDto(...) 객체를 만들어서 request 파라미터에 넣어줌
    public ResponseEntity<IdPrecheckResponseDto> precheckUserId(@RequestBody IdPrecheckRequestDto request) {
        // 1. 성공 시 -> 200 + available
        try {
            // 서비스 코드의 precheckUserId를 호출해 아이디 형식/중복을 검사하고, 통과 시 서명된 프리체크 토큰과 TTL을 담은 IdPrecheckResult를 준다.
            AccountsUseCase.IdPrecheckResult result =
                    accountsUseCase.precheckUserId(request.userId());

            IdPrecheckResponseDto dto =
                    IdPrecheckResponseDto.success(result, "사용 가능한 아이디입니다.");
            return ResponseEntity.ok(dto);
        
        // 2. 형식 오류 -> 200 + invalid
        } catch (IllegalArgumentException e) {
            IdPrecheckResponseDto dto =
                    IdPrecheckResponseDto.failure(
                            IdPrecheckResponseDto.UserIdInfo.invalid(),
                            e.getMessage()
                    );
            return ResponseEntity.ok(dto);
        
        // 3. 중복 -> 200 + taken
        } catch (IllegalStateException e) {
            IdPrecheckResponseDto dto =
                    IdPrecheckResponseDto.failure(
                            IdPrecheckResponseDto.UserIdInfo.taken(),
                            e.getMessage()
                    );
            return ResponseEntity.ok(dto);
        }
    }

    // ─────────────────────────────────────────
    // 2. precheckEmail: 이메일 사전 중복검사 컨트롤러 함수 구현
    // POST /api/auth/register/precheck/email
    // ─────────────────────────────────────────
    @PostMapping("/auth/register/precheck/email")
    public ResponseEntity<EmailPrecheckResponseDto> precheckEmail(@RequestBody EmailPrecheckRequestDto request) {
        // 1. 성공 시 -> 200 + available
        try {
            AccountsUseCase.EmailPrecheckResult result =
                    accountsUseCase.precheckEmail(request.email());

            EmailPrecheckResponseDto dto =
                    EmailPrecheckResponseDto.success(result, "사용 가능한 이메일입니다.");
            return ResponseEntity.ok(dto);
        
        // 2. 형식 오류 -> 200 + invalid
        } catch (IllegalArgumentException e) {
            EmailPrecheckResponseDto dto =
                    EmailPrecheckResponseDto.failure(
                            EmailPrecheckResponseDto.EmailInfo.invalid(),
                            e.getMessage()
                    );
            return ResponseEntity.ok(dto);

        // 3. 중복 -> 200 + taken
        } catch (IllegalStateException e) {
            EmailPrecheckResponseDto dto =
                    EmailPrecheckResponseDto.failure(
                            EmailPrecheckResponseDto.EmailInfo.taken(),
                            e.getMessage()
                    );
            return ResponseEntity.ok(dto);
        }
    }

    // ─────────────────────────────────────────
    // 3. signUp: 회원가입 컨트롤러 함수 구현
    // POST /api/auth/register
    // ─────────────────────────────────────────
    @PostMapping("/auth/register")
    public ResponseEntity<SignUpResponseDto> signUp(@RequestBody SignUpRequestDto request) {

        // var: 메서드 내부에서만 쓰이는 지역변수 선언 문법 (가독성을 위해 사용)
        // 원하면 var 안쓰고 AccountsUseCase.SignUpCommand cmd = request.toCommand(); 처럼 명시형으로 써도된다.
        // Jackson이 JSON을 DTO로 역직렬화한 것을 -> 서비스 입력 모델(SignUpCommand)로 변환 
        var cmd = request.toCommand();

        // 서비스 코드의 signUp 함수 호출 후 반환값(userSeq, joinedAt) result 객체에 저장
        var result = accountsUseCase.signUp(cmd);

        // result를 응답 DTO로 변환
        var dto = SignUpResponseDto.of(result.userSeq(), result.joinedAt());

        // 201 Created 상태로 응답
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    // ─────────────────────────────────────────
    // 4. login: 로그인 컨트롤러 함수 구현
    // POST /api/auth/login
    // - access_token 은 JSON 바디
    // - refresh_token 은 HttpOnly 쿠키에만 저장 (보안 고려)
    // ─────────────────────────────────────────
    @PostMapping("/auth/login")
    public ResponseEntity<LoginResponseDto> login(@RequestBody LoginRequestDto request, HttpServletRequest httpRequest) {
        
        // DTO에서 아이디/비번 꺼냄
        String userId = request.userId();
        String password = request.password();

        // 헬퍼 함수를 사용해서 IP, User-Agent를 뽑아서 저장
        String ip = clientIp(httpRequest);
        String ua = userAgent(httpRequest);

        // 서비스 login() 함수 호출해서 반환값(LoginResult)을 result에 저장
        AccountsUseCase.LoginResult result =
                accountsUseCase.login(userId, password, ip, ua);

        // 응답 DTO를 response body(JSON)로 변환
        // refresh_token은 보안상 response body JSON에 포함하지 않음
        LoginResponseDto body = LoginResponseDto.withoutRefreshToken(result);

        // 헬퍼함수를 사용해서 HttpOnly 쿠키에 refresh 저장
        ResponseCookie refreshCookie = buildRefreshCookie(result.refreshToken());

        // 200 OK로 응답
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(body);
    }

    // ─────────────────────────────────────────
    // 5. refreshAccessToken: 액세스 토큰 갱신 컨트롤러 함수 구현
    // POST /api/auth/refresh
    // - refresh 쿠키 기반
    // - 성공 시 새 access 토큰 JSON 반환
    // ─────────────────────────────────────────
    @PostMapping("/auth/refresh")
    public ResponseEntity<TokenRefreshResponseDto> refreshAccessToken(HttpServletRequest request) {
        
        // 헬퍼함수를 사용하여 request header의 쿠키에서 리프레시 토큰 추출
        String rawRefresh = getRefreshTokenFromCookie(request);

        // 없거나 공백이면 인증 시도 자체가 불가능하므로 401 UNAUTHORIZED로 즉시 종료
        if (rawRefresh == null || rawRefresh.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(TokenRefreshResponseDto.failure("리프레시 토큰을 전달하세요."));
        }
        
        // 아무 이상 없다면
        try {
            // 서비스가 새 access 토큰 발급
            String newAccessToken = accountsUseCase.refreshAccessToken(rawRefresh);

            // 200으로 응답
            return ResponseEntity.ok(TokenRefreshResponseDto.success(newAccessToken));
        
        // 예외 발생 시 
        } catch (IllegalArgumentException ex) {

            // 일반 메시지 + 401로 응답
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(TokenRefreshResponseDto.failure("리프레시 토큰이 유효하지 않거나 만료되었습니다."));
        }
    }

    // ─────────────────────────────────────────
    // 6. logout: 로그아웃 컨트롤러 함수 구현
    // POST /api/auth/logout
    // - refresh 쿠키 삭제
    // ─────────────────────────────────────────
    @PostMapping("/auth/logout")
    public ResponseEntity<LogoutResponseDto> logout() {

        // 헬퍼함수를 사용해 refresh 쿠키 삭제용 쿠키 생성
        ResponseCookie deleteCookie = buildDeleteRefreshCookie();

        // 삭제 후 200 응답
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
                .body(LogoutResponseDto.defaultSuccess());
    }

    // ─────────────────────────────────────────
    // 7. findUserId: 아이디 찾기 컨트롤러 함수 구현
    // POST /api/auth/find-id
    // ─────────────────────────────────────────
    @PostMapping("/auth/find-id")
    public ResponseEntity<FindIdResponseDto> findUserId(@RequestBody FindIdRequestDto request) {
        try {
            // 1) 요청 JSON -> DTO(자동) -> 서비스 입력 모델(FindIdCommand)로 변환
            AccountsUseCase.FindIdCommand cmd = request.toCommand();

            // 2) 비즈니스 로직 호출 (서비스/유즈케이스)
            AccountsUseCase.FindIdResult result = accountsUseCase.findUserId(cmd);

            // 3) 성공 응답(200) + 결과 DTO
            return ResponseEntity.ok(FindIdResponseDto.success(result));

        } catch (NotFoundException e) {
            // 4) 대상 미존재/불일치 -> 404 + 실패 DTO
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(FindIdResponseDto.failure(e.getMessage()));
        }
    }

    // ─────────────────────────────────────────
    // 8. findPassword: 비밀번호 찾기 (임시 비밀번호 발급) 컨트롤러 함수 구현
    // POST /api/auth/find-password
    // ─────────────────────────────────────────
    @PostMapping("/auth/find-password")
    public ResponseEntity<FindPasswordResponseDto> findPassword(@RequestBody FindPasswordRequestDto request) {
        try {

            // 요청 JSON -> DTO(자동 역직렬화) -> 서비스 입력 모델(FindPasswordCommand) 로 변환
            AccountsUseCase.FindPasswordCommand cmd = request.toCommand();

            // 서비스 findPassword 함수 호출
            AccountsUseCase.FindPasswordResult result = accountsUseCase.findPassword(cmd);

            String message = "임시 비밀번호가 발급되었습니다.";
            
            // app.auth.debug-expose-temp-password=true(개발/디버그)면 임시 비번을 JSON에 포함
            if (debugExposeTempPassword) {
                return ResponseEntity.ok(
                        FindPasswordResponseDto.success(result, message)
                );
            } 
            
            // 기본값 false(운영)면 임시 비번은 response body에 미포함하고 안내 메시지만 반환 -> 비밀번호는 이메일 등으로만 전달
            else {
                return ResponseEntity.ok(
                        FindPasswordResponseDto.successWithoutTempPassword(message)
                );
            }

        } 
        
        // 사용자 정보가 불일치/미존재면 서비스가 NotFoundException을 던지고, 컨트롤러는 404로 매핑
        catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(FindPasswordResponseDto.failure(e.getMessage()));
        }
    }

    // ─────────────────────────────────────────
    // 9. changePassword: 비밀번호 변경 컨트롤러 함수 구현
    // POST /api/auth/change-password
    //
    // 지금은 로그인된 사용자 번호를 헤더 X-USER-SEQ에서 받도록 구현.
    // 나중에 Spring Security로 JWT 인증 붙이면
    // @AuthenticationPrincipal 등으로 교체하면 된다.
    // ─────────────────────────────────────────
    @PostMapping("/auth/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
        @RequestHeader(ACTOR_USER_SEQ_HEADER) Integer actorUserSeq,
        @RequestBody ChangePasswordRequestDto request
    ) {
        // 1) DTO -> 서비스 커맨드로 변환(사용자 PK 주입)
        AccountsUseCase.ChangePasswordCommand cmd = request.toCommand(actorUserSeq);

        // 2) 비즈니스 로직 실행(현재 비번 검증, 정책 검증, 저장)
        accountsUseCase.changePassword(cmd);

        // 3) 리프레시 토큰 무효화: 삭제 쿠키 내려보내기 (헬퍼함수 사용)
        ResponseCookie deleteCookie = buildDeleteRefreshCookie();

        // 4) 200 OK + 메시지
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
            .body(Map.of("message", "비밀번호가 변경되었습니다. 다시 로그인하세요."));
    }

    // ─────────────────────────────────────────
    // 10. promoteToAdmin: 관리자 승격 (USER -> ADMIN) 컨트롤러 함수 구현
    // POST /api/admins/promote
    // ─────────────────────────────────────────
    @PostMapping("/admins/promote")

    // @RequestHeader(ACTOR_USER_SEQ_HEADER) Integer operatorUserSeq: 파라미터
    // @RequestHeader: request header에서 값을 읽어오는 어노테이션
    // ACTOR_USER_SEQ_HEADER : 헤더 이름 상수 (코드에선 "X-USER-SEQ"로 정의됨)
    // Integer operatorUserSeq : 읽어온 값을 정수로 받아 저장할 변수
    // 예를들어 클라이언트가 X-USER-SEQ: 123 이렇게 보내면, 컨트롤러가 자동으로 operatorUserSeq에 123을 넣어준다.
    public ResponseEntity<AdminPromoteResponseDto> promoteToAdmin(
            @RequestHeader(ACTOR_USER_SEQ_HEADER) Integer operatorUserSeq, 
            @RequestBody AdminPromoteRequestDto request
    ) {
        // 서비스 호출 + 승격 실행
        AccountsUseCase.PromoteResult result =
                accountsUseCase.promoteToAdminReturningResult(
                        request.userSeq(),
                        operatorUserSeq
                );

        // 응답 DTO로 변환
        AdminPromoteResponseDto dto =
                AdminPromoteResponseDto.success(
                        result,
                        "관리자 권한이 부여되었습니다."
                );

        // HTTP 200 OK로 반환
        return ResponseEntity.ok(dto);
    }

    // ─────────────────────────────────────────
    // 11. demoteToUser: 관리자 강등 (ADMIN -> USER) 컨트롤러 함수 구현
    // POST /api/admins/demote
    // ─────────────────────────────────────────
    @PostMapping("/admins/demote")
    public ResponseEntity<AdminDemoteResponseDto> demoteToUser(
            @RequestHeader(ACTOR_USER_SEQ_HEADER) Integer operatorUserSeq, 
            @RequestBody AdminDemoteRequestDto request
    ) {
        AccountsUseCase.DemoteResult result =
                accountsUseCase.demoteToUserReturningResult(
                        request.userSeq(),
                        operatorUserSeq
                );

        AdminDemoteResponseDto dto =
                AdminDemoteResponseDto.success(
                        result,
                        "관리자 권한이 해제되었습니다."
                );
        return ResponseEntity.ok(dto);
    }

    // ─────────────────────────────────────────
    // 12. listUsers: 회원 목록 조회 (관리자 전용) 컨트롤러 함수 구현
    // GET /api/admins/users?page=1&size=10&q=검색어
    // ─────────────────────────────────────────
    @GetMapping("/admins/users")
    public ResponseEntity<UserListResponseDto> listUsers(
            @RequestHeader(ACTOR_USER_SEQ_HEADER) Integer actorUserSeq,

            // 쿼리스트링 파라미터 page를 정수로 받는다. 안 보내면 기본값 1
            @RequestParam(name = "page", defaultValue = "1") int page,

            // 쿼리스트링 파라미터 size(페이지당 개수). 안 보내면 기본값 10
            @RequestParam(name = "size", defaultValue = "10") int size,

            // 쿼리스트링 파라미터 q(검색어). 옵션이므로 없어도 된다(required=false). 없으면 q=null
            @RequestParam(name = "q", required = false) String q
    ) {
        // 요청 파라미터를 하나로 묶는 입력 모델을 만든다
        AccountsUseCase.UserListQuery query =
                new AccountsUseCase.UserListQuery(actorUserSeq, page, size, q);

        // 서비스(유즈케이스)에 실제 작업을 맡김
        AccountsUseCase.UserListResult result =
                accountsUseCase.listUsers(query);

        // 서비스 결과(result)를 API 응답용 DTO로 변환
        UserListResponseDto dto =
                UserListResponseDto.success(result, "");

        // HTTP 200 OK 상태로, 방금 만든 DTO를 JSON 바디로 반환
        return ResponseEntity.ok(dto);
    }

    // ─────────────────────────────────────────
    // 내부 헬퍼 메서드들
    // 얘네들은 비즈니스 로직이 아니라서 서비스에서 구현 안하고 컨트롤러에서 구현함
    // ─────────────────────────────────────────

    // 1. 클라이언트 IP 주소를 뽑아오는 메서드
    private String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String remote = request.getRemoteAddr();
        return remote != null ? remote : "";
    }

    // 2. User-Agent 문자열을 가져오는 메서드
    private String userAgent(HttpServletRequest request) {
        String ua = request.getHeader("User-Agent");
        if (ua == null) return "";
        return (ua.length() > 500) ? ua.substring(0, 500) : ua;
    }

    // 3. request header의 쿠키에서 refresh 토큰 값을 꺼내는 메서드
    private String getRefreshTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (REFRESH_COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    // 4. 서버가 내려줄 refresh 토큰 쿠키 생성하는 메서드
    private ResponseCookie buildRefreshCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path(REFRESH_COOKIE_PATH)
                // maxAge 는 JwtIssuer 의 refresh 토큰 만료와 맞춰서 설정해도 됨
                .build();
    }

    // 5. refresh 쿠키 삭제용 쿠키를 만들어서 클라이언트에 지워달라고 지시하는 메서드
    private ResponseCookie buildDeleteRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(0)
                .build();
    }
}

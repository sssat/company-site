// src/main/java/com/marketstage/backend/common/GlobalExceptionHandler.java

// 예외 처리 우선순위
// 1순위: 컨트롤러 메서드 내부의 try-catch
// 2순위: GlobalExceptionHandler
// 3순위: 그래도 아무도 안잡으면 스프링 기본 에러 (아무 예외 처리도 안 했을 때 스프링이 알아서 내보내주는 기본 에러 응답) -> 1,2순위 까지 예외 처리하면 거의 안쓰임

// 예를들어 precheckUserId에서 try-catch문을 써서 컨트롤러에서 예외를 직접 잡는 이유는
// precheckUserId만의 고유한 예외 처리를 위해서이다.
// 또한 precheckUserId와 같이 try-catch문이 존재하는 메서드들은 이미 try-catch에서 처리한 예외들에 한해서는 GlobalExceptionHandler가 안 쓰이지만,
// 그 밖의 예외(try-catch에서 안 잡는 타입)는 여전히 GlobalExceptionHandler로 간다.

// 그리고 GlobalExceptionHandler는 컨트롤러에서 임포트 하지않아도 자동으로 쓰이는데, GlobalExceptionHandler 클래스 위에
// @RestControllerAdvice / @ControllerAdvice 등의 어노테이션을 붙이면 스프링이 내부적으로 "예외 처리기 목록"에 등록해둬서 자동으로 쓰이는 구조다.

package com.marketstage.backend.common;

import com.marketstage.backend.common.exception.NotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity; 
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 1) 400: 잘못된 요청(입력값/정책 위반 등)
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest request
    ) {
        log.debug("IllegalArgumentException at {}: {}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(errorBody(HttpStatus.BAD_REQUEST, ex.getMessage(), request.getRequestURI()));
    }

    // 2) 401: 인증 안 된 상태 (로그인 필요)
    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleAuthRequired(
            AuthenticationCredentialsNotFoundException ex,
            HttpServletRequest request
    ) {
        log.debug("Authentication required at {}: {}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(errorBody(HttpStatus.UNAUTHORIZED, ex.getMessage(), request.getRequestURI()));
    }

    // 3) 401: 로그인 시 아이디/비밀번호 불일치
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleBadCredentials(
            BadCredentialsException ex,
            HttpServletRequest request
    ) {
        log.debug("Bad credentials at {}: {}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(errorBody(HttpStatus.UNAUTHORIZED, ex.getMessage(), request.getRequestURI()));
    }

    // 4) 403: 권한 없음 (ADMIN/SUPER_ADMIN 필요 등)
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, String>> handleSecurity(
            SecurityException ex,
            HttpServletRequest request
    ) {
        log.debug("Forbidden at {}: {}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(errorBody(HttpStatus.FORBIDDEN, ex.getMessage(), request.getRequestURI()));
    }

    // 7) 5) 404: 리소스를 찾지 못함
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(
            NotFoundException ex,
            HttpServletRequest request
    ) {
        log.debug("NotFound at {}: {}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(errorBody(HttpStatus.NOT_FOUND, ex.getMessage(), request.getRequestURI()));
    }

    // 6) 409: 상태 충돌 / 중복 등 (IllegalStateException 사용처 기준)
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalState(
            IllegalStateException ex,
            HttpServletRequest request
    ) {
        log.warn("Conflict(IllegalState) at {}: {}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(errorBody(HttpStatus.CONFLICT, ex.getMessage(), request.getRequestURI()));
    }

    // 7) 500: 그 밖의 처리되지 않은 모든 예외
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnknown(
            Exception ex,
            HttpServletRequest request
    ) {
        log.error("Unexpected error at {}: {}", request.getRequestURI(), ex.getMessage(), ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorBody(HttpStatus.INTERNAL_SERVER_ERROR,
                        "알 수 없는 오류가 발생했습니다.",
                        request.getRequestURI()));
    }

    // 예외가 났을 때, 에러 응답 JSON의 공통 형태를 만들어주는 헬퍼 함수
    /* 예시
       {
         "status": "400",
         "error": "Bad Request",
         "message": "필수값 누락: userId",
         "path": "/api/auth/register"
        }
    */
    private Map<String, String> errorBody(HttpStatus status, String message, String path) {
        return Map.of(
                "status", String.valueOf(status.value()),
                "error", status.getReasonPhrase(),
                "message", message != null ? message : "",
                "path", path != null ? path : ""
        );
    }
}

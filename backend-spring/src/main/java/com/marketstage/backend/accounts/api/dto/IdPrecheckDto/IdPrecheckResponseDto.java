// src/main/java/com/marketstage/backend/accounts/api/dto/IdPrecheckDto/IdPrecheckResponseDto.java
// ResponseDto
// 자바 객체를 HTTP 응답 Body(JSON)로 "내보내기 위한" DTO
// 자바 객체 -> JSON으로 변환되기 전에 데이터(자바 객체)를 담아두는 그릇(DTO 또한 데이터를 담아두는 객체)
// 실제 직렬화 작업은 Jackson(ObjectMapper)이 수행
// 즉, 우리가 ResponseDto 인스턴스를 만들고, Jackson(ObjectMapper)이 그 객체를 JSON으로 직렬화해서 response body에 실어 보낸다.
// ResponseDto 객체 생성 ----> (Jackson이 직렬화) ---- JSON ----> [클라이언트]

package com.marketstage.backend.accounts.api.dto.IdPrecheckDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

public record IdPrecheckResponseDto(

        // userId 필드 -> "user_id": { "valid": true, "status": "available" }
        @JsonProperty("user_id")
        UserIdInfo userId,

        @JsonProperty("id_check_token")
        String idCheckToken,

        @JsonProperty("expires_in")
        int expiresIn,

        // 자바 IdPrecheckResponseDto의 필드 이름이랑 명세서의 JSON 필드 이름이 같아서 굳이 @JsonProperty를 안 씀
        String message
) {

    // ─────────────────────────────────────────
    // 1. user_id 안쪽에 들어가는 작은 DTO
    // => { "user_id": { "valid": true, "status": "available" }, ... }
    // 에서 { "valid": true, "status": "available" }를 표현한 부분
    // ─────────────────────────────────────────
    public record UserIdInfo(
            boolean valid,
            String status   // "available" | "invalid" | "taken" 중 하나
    ) { 
        // (1) 사용 가능할 때
        public static UserIdInfo available() {
            return new UserIdInfo(true, "available");
        }

        // (2) 형식 자체가 잘못됐을 때
        public static UserIdInfo invalid() {
            return new UserIdInfo(false, "invalid");
        }

        // (3) 중복된 아이디일 때
        public static UserIdInfo taken() {
            return new UserIdInfo(false, "taken");
        }
    }

    // 2. 성공(available)일 때 응답 DTO를 만드는 메서드
    public static IdPrecheckResponseDto success(
            AccountsUseCase.IdPrecheckResult useCaseResult,
            String message
    ) {
        return new IdPrecheckResponseDto(
                UserIdInfo.available(),              // user_id: { valid: true, status: "available" }
                useCaseResult.idCheckToken(),        // 토큰
                useCaseResult.expiresInSeconds(),    // 만료 초
                message                              // 메시지
        );
    }

    // 3. 실패(invalid/taken)일 때 응답 DTO를 만드는 메서드
    public static IdPrecheckResponseDto failure(
            UserIdInfo userIdInfo,
            String message
    ) {
        return new IdPrecheckResponseDto(
                userIdInfo,           // invalid() 또는 taken()
                null,    // 실패이므로 토큰 없음
                0,          // 만료 시간 의미 없음 -> 0
                message
        );
    }
}

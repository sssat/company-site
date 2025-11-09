// src/main/java/com/marketstage/backend/accounts/api/dto/EmailPrecheckDto/EmailPrecheckResponseDto.java
package com.marketstage.backend.accounts.api.dto.EmailPrecheckDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.accounts.application.port.in.AccountsUseCase;

public record EmailPrecheckResponseDto(

        @JsonProperty("email")
        EmailInfo email,

        @JsonProperty("email_check_token")
        String emailCheckToken,

        @JsonProperty("expires_in")
        int expiresIn,

        String message
) {
    public record EmailInfo(
            boolean valid,
            String status // "available" | "invalid" | "taken"
    ) {
        /** 사용 가능한 경우 */
        public static EmailInfo available() {
            return new EmailInfo(true, "available");
        }

        /** 형식 오류인 경우 */
        public static EmailInfo invalid() {
            return new EmailInfo(false, "invalid");
        }

        /** 중복(taken)인 경우 */
        public static EmailInfo taken() {
            return new EmailInfo(false, "taken");
        }
    }

    // 1. 성공 케이스용 팩토리 메서드
    public static EmailPrecheckResponseDto success(
            AccountsUseCase.EmailPrecheckResult useCaseResult,
            String message
    ) {
        return new EmailPrecheckResponseDto(
                EmailInfo.available(),                 // email: { valid: true, status: "available" }
                useCaseResult.emailCheckToken(),       // 토큰
                useCaseResult.expiresInSeconds(),      // 만료 초
                message                                // "사용 가능한 이메일입니다." 등
        );
    }

    // 2. 실패(형식 오류/중복) 케이스용 팩토리 메서드
    public static EmailPrecheckResponseDto failure(
            EmailInfo emailInfo,
            String message
    ) {
        return new EmailPrecheckResponseDto(
                emailInfo,  // invalid() 또는 taken()
                null,       // 실패 시 토큰 없음
                0,          // 만료 시간 없음
                message
        );
    }
}

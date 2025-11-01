// accounts/application/port/out/LoginLogRepository.java
// (아웃바운드) 애플리케이션 포트 — 로그인 시도 이력 저장/집계 전용(관리 UI 없음)
// 서비스(유즈케이스)가 성공/실패 시도를 기록하고, 최근 실패 횟수로 보안 정책(잠금/캡차 등)을 적용할 때 사용

package com.marketstage.backend.accounts.application.port.out;

import com.marketstage.backend.accounts.domain.model.LoginLog;
import java.time.LocalDateTime;

public interface LoginLogRepository {

    /**
     * 로그인 시도 1건을 저장 (성공/실패 모두 기록)
     * - LoginLog 엔티티에는 userSeq(옵션), inputId, attemptedAt, ip, userAgent, success 등이 포함된다고 가정
     */
    void append(LoginLog log);

    /**
     * 특정 사용자에 대해, 기준 시각(since) 이후의 "실패" 횟수를 반환
     * - 락/알림/캡차 같은 보안 정책 판단에 사용
     * - 구현체에서는 success = false 조건만 카운트하도록 해야함
     */
    long countFailuresSince(Integer userSeq, LocalDateTime since);
}

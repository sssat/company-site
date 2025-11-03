// accounts/application/port/out/LoginLogRepository.java

package com.marketstage.backend.accounts.application.port.out;

import com.marketstage.backend.accounts.domain.model.LoginLog;

public interface LoginLogRepository {

    // 1. 로그인 시 로그인 로그를 기록하기 위한 함수 (성공/실패 모두 기록)
    void append(LoginLog log);
}

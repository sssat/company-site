// common/AppConfig.java
// @Component, @Service, ... 와 같이 자동으로 빈으로 등록되는 애들 말고, 따로 @Bean으로 만들어야 하는 "공용 객체들"을 모아두는 곳
// 왜냐하면 @Component, @Service, ... 와 같은 것들을 붙일 수 없는 클래스들(라이브러리/표준 클래스들)에 대한 빈 정의를 해야하기 때문.
// 예를 들어 PasswordEncoder, Clock 같은 표준/외부 라이브러리 클래스들은 @Component 같은 클래스 어노테이션을 달 수 없으니까,
// AppConfig.java에서 이들을 리턴하는 메서드에 @Bean과 같은 메서드 어노테이션을 붙여서 스프링 빈으로 등록해준다.
// AccountsService는 @Service가 붙어있고, JwtIssuerImpl, JwtVerifierImpl는 @Component가 붙어있다보니 여기서 스프링 빈으로 등록할 필요가없다.
// 그리고 전체 파일의 모든 외부 라이브러리 클래스를 AppConfig에서 전부 빈으로 만드는것이 아니라, 
// 스프링이 주입해주길 원하는 타입인데 자동으로 빈이 안 만들어지는 것만 AppConfig에서 @Bean으로 등록한다.

package com.marketstage.backend.common;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/* 
그냥 이렇게 @Bean만 붙여도 되지만, 테스트랑 설정 편의를 위해 yml 값을 읽어서 동작을 바꾸는 로직을 추가
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}

@Bean
public Clock clock() {
    return Clock.systemDefaultZone();
}
*/
@Configuration
public class AppConfig {

    @Bean
    public PasswordEncoder passwordEncoder(
            @Value("${app.security.password.bcrypt-strength:12}") int strength
    ) {
        return new BCryptPasswordEncoder(strength);
    }

    @Bean
    public Clock clock(
            @Value("${app.clock.fixed:false}") boolean fixed,
            @Value("${app.clock.zone:Asia/Seoul}") String zoneId,
            @Value("${app.clock.fixed-instant:}") String fixedInstant
    ) {
        ZoneId zone = ZoneId.of(zoneId);
        if (fixed) {
            if (fixedInstant == null || fixedInstant.isBlank()) {
                throw new IllegalStateException("app.clock.fixed=true 인 경우 app.clock.fixed-instant 값이 필요합니다. 예: 2025-11-01T00:00:00Z");
            }
            return Clock.fixed(Instant.parse(fixedInstant), zone);
        }
        return Clock.system(zone);
    }
}


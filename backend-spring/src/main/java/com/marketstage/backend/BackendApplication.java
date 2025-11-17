// BackendApplication.java
// 스프링 부트 앱의 진입점(Entry Point)
// 프로젝트를 실행할 때 가장 먼저 실행되는 클래스로, 스프링 컨테이너와 내장 서버를 띄우고 컴포넌트 스캔/자동설정을 트리거하는 핵심 스타트업 코드

// BackendApplication 클래스가 위치한 패키지 경로
package com.marketstage.backend; 

// 스프링 부트를 구동하는 헬퍼 클래스(SpringApplication)
import org.springframework.boot.SpringApplication; 

// @SpringBootApplication (메타-어노테이션, 인터페이스 타입의 어노테이션)
import org.springframework.boot.autoconfigure.SpringBootApplication; 

// 합성 어노테이션: @Configuration + @EnableAutoConfiguration + @ComponentScan
// 의존성 기반 자동설정 적용, 현재 패키지(com.marketstage.backend) 이하에서 컴포넌트 스캔
@SpringBootApplication
public class BackendApplication {
  public static void main(String[] args) {

    // 스프링 부트 구동: ApplicationContext 생성, 자동설정 로딩, 빈 등록, 내장 톰캣(웹서버) 시작
    SpringApplication.run(BackendApplication.class, args); 
  } 
} 
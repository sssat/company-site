// BackendApplication.java
// 스프링 부트 앱의 진입점(Entry Point)
// 프로젝트를 실행할 때 가장 먼저 실행되는 클래스로, 한마디로 스프링 부트 서버 전원을 켜는 메인 스위치 파일

package com.marketstage.backend; 

import org.springframework.boot.SpringApplication; 
import org.springframework.boot.autoconfigure.SpringBootApplication; 

@SpringBootApplication
public class BackendApplication {
  public static void main(String[] args) {

    // 스프링 부트 구동: ApplicationContext 생성, 자동설정 로딩, 빈 등록, 내장 톰캣(웹서버) 시작
    SpringApplication.run(BackendApplication.class, args);
  }
}
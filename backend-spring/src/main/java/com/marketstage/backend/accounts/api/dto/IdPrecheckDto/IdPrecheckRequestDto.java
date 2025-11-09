// src/main/java/com/marketstage/backend/accounts/api/dto/IdPrecheckDto/IdPrecheckRequestDto.java
// DTO = Data Transfer Object(데이터 전송 객체): 레이어끼리 데이터만 깔끔하게 주고받으려고 만든 전용 객체
// 그리고 DTO를 구현하는 방법 중 하나로 record 클래스를 사용함
// 파이썬 장고로 치면 serializers.py 안의 시리얼라이저들과 가장 유사하다.
// 그리고 장고에서의 serializers.py와는 달리 스프링에서 DTO는 정말 데이터를 담는 그릇 역할만 맡기고, 
// 형식/정책/중복/토큰 검증은 전부 AccountsService.java에서 수행하도록 역할을 분리했다. (장고에선 필드가 직접 최소한의 검증까지 수행했음)
// API 명세서, AccountsUseCase.java (record DTO들)을 토대로 작성

// RequestDto
// HTTP 요청의 Body(JSON)를 자바 객체로 "받기 위한" DTO
// JSON -> 자바 객체 결과가 담기는 그릇 => 즉, 역직렬화 결과가 담기는 그릇
// 실제 역직렬화 작업은 Jackson(ObjectMapper)이 수행 
// 따라서 Jackson(ObjectMapper)이 JSON을 받아서 자바 객체로 역직렬화 수행해서 RequestDto 이라는 그릇(객체)에 결과를 담는다.
// [클라이언트] ---- JSON ----> (Jackson이 역직렬화) ----> RequestDto 객체 생성

package com.marketstage.backend.accounts.api.dto.IdPrecheckDto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record IdPrecheckRequestDto(

        // 명세서의 JSON 필드 이름(user_id) <-> 자바 IdPrecheckRequestDto의 필드 이름(userId) 매핑을 해주는 Jackson 어노테이션
        @JsonProperty("user_id")
        String userId
) {
}
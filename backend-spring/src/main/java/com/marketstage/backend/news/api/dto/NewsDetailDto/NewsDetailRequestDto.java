// src/main/java/com/marketstage/backend/news/api/dto/NewsDetailDto/NewsDetailRequestDto.java

package com.marketstage.backend.news.api.dto.NewsDetailDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketstage.backend.news.application.port.in.NewsUseCase;

public record NewsDetailRequestDto(

        // JSON/쿼리/경로상의 이름 "news_seq" <-> 자바 필드 이름 newsSeq 매핑
        @JsonProperty("news_seq")
        Integer newsSeq
) {
    // 컨트롤러에서 유즈케이스 호출 시 사용할 변환 헬퍼
    public NewsUseCase.NewsDetailQuery toQuery() {
        return new NewsUseCase.NewsDetailQuery(newsSeq);
    }
}

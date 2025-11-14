// src/main/java/com/marketstage/backend/news/api/dto/NewsListDto/NewsListRequestDto.java

package com.marketstage.backend.news.api.dto.NewsListDto;

import com.marketstage.backend.news.application.port.in.NewsUseCase.NewsListQuery;

public record NewsListRequestDto(
        // 제목/요약 검색어 (?q=...)
        String q,

        // "INTERNAL" | "EXTERNAL" | "ALL" 중 하나 (없으면 null)
        String category,

        // 페이지 번호 (?page=1) — null 이면 서비스에서 기본값 처리
        Integer page,

        // 페이지 크기 (?size=6) — null 이면 서비스에서 기본값 처리
        Integer size,

        // 정렬 문자열 (?sort=published_at(desc) 등)
        String sort
) {
    public NewsListQuery toQuery() {
        int p = (page == null) ? 0 : page;
        int s = (size == null) ? 0 : size;

        return new NewsListQuery(
                q,         // null -> 서비스에서 safe()로 빈 문자열 처리
                category,  // null 또는 "INTERNAL"/"EXTERNAL"/"ALL"
                p,
                s,
                sort
        );
    }
}

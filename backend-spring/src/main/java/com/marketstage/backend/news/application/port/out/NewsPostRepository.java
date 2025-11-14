// news/application/port/out/NewsPostRepository.java
// 뉴스글(NewsPost)에 대한 저장/조회 퍼시스턴스 아웃바운드 포트(계약서)
// 파이썬 장고에서는 NewsPost.objects.filter(...), .get(...), .create(...) 등이 하던 일을
// 스프링에선 도메인 포트(인터페이스) + 인프라 어댑터(UserRepositoryJpaAdapter 역할의 클래스)가 나눠서 담당한다.
// 이 인터페이스는 "유즈케이스(서비스)가 NewsPost를 어떻게 조회/저장할 수 있는지"만 시그니처로 정의하고,
// 실제 구현은 infra/persistence/NewsPostRepositoryJpaAdapter 에서 담당한다.
// 따라서 class가 아닌 interface로 선언한다.

package com.marketstage.backend.news.application.port.out;

import java.util.List;
import java.util.Optional;

import com.marketstage.backend.news.domain.model.NewsPost;

public interface NewsPostRepository {

    // 1. PK(newsSeq)로 단건 조회
    Optional<NewsPost> findById(Integer newsSeq);

    // 2. 새 엔티티 저장 또는 기존 엔티티 갱신
    NewsPost save(NewsPost newsPost);

    // 3. 뉴스 삭제
    void delete(NewsPost newsPost);

    // 4. 목록 조회 시, 현재 검색 조건(q, category)에 매칭되는 전체 개수를 반환
    long countByFilter(String q, Integer categoryInt);

    // 5. 목록 조회 시, 현재 검색 조건(q, category, sort)에 대해 특정 페이지 범위(offset, limit)에 해당하는 행들만 가져오는 메서드
    List<NewsPost> findByFilter(
            String q,
            Integer categoryInt,
            String sortProperty,
            boolean sortDesc,
            int offset,
            int limit
    );
}

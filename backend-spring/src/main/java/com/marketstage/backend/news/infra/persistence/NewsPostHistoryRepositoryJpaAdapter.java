// news/infra/persistence/NewsPostHistoryRepositoryJpaAdapter.java

package com.marketstage.backend.news.infra.persistence;

import com.marketstage.backend.news.application.port.out.NewsPostHistoryRepository;
import com.marketstage.backend.news.domain.model.NewsPostHistory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(readOnly = true)  
public class NewsPostHistoryRepositoryJpaAdapter implements NewsPostHistoryRepository {

    private final SpringDataNewsPostHistoryRepository jpa;

    // ─────────────────────────────────────────────────────────
    // 1) 삭제 이력 저장
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional 
    public NewsPostHistory save(NewsPostHistory history) {
        // 여기서 별도의 비즈니스 로직은 없고,
        // 도메인 엔티티를 그대로 Spring Data JPA 에게 전달해서 INSERT 하도록 위임한다.
        return jpa.save(history);
    }
}

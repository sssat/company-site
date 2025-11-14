// news/infra/persistence/SpringDataNewsPostHistoryRepository.java


package com.marketstage.backend.news.infra.persistence;

import com.marketstage.backend.news.domain.model.NewsPostHistory;
import org.springframework.data.jpa.repository.JpaRepository;

// JpaRepository<엔티티 타입, PK 타입> 을 상속하면
// 기본 CRUD 메서드(findById, save, delete, findAll, count, …)를 전부 자동으로 사용할 수 있다.
// 여기서는 NewsPostHistory 엔티티의 PK 타입이 Integer(=historySeq) 이므로 <NewsPostHistory, Integer> 를 사용한다.
public interface SpringDataNewsPostHistoryRepository extends JpaRepository<NewsPostHistory, Integer> {

}

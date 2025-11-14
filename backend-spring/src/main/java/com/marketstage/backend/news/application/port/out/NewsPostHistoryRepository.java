// news/application/port/out/NewsPostHistoryRepository.java

package com.marketstage.backend.news.application.port.out;

import com.marketstage.backend.news.domain.model.NewsPostHistory;

public interface NewsPostHistoryRepository {

    // 1. 삭제 이력 저장
    NewsPostHistory save(NewsPostHistory history);
}

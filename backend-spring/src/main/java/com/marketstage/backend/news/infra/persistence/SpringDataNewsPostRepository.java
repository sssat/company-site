// news/infra/persistence/SpringDataNewsPostRepository.java

package com.marketstage.backend.news.infra.persistence;

import com.marketstage.backend.news.domain.model.NewsPost;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataNewsPostRepository extends JpaRepository<NewsPost, Integer> {

    // 현재는 findById, save, delete 정도만 Spring Data JPA로 처리하면 되는데, 
    // 얘네들은 JpaRepository 라이브러리에서 자동으로 제공하기 때문에 
    // 여기선 추가 메서드를 선언하지 않아도 된다.
    // 따라서 SpringDataNewsPostRepository.java 파일은 없어도 될 것 같아 보이지만,
    // Spring Data JPA의 기본 CRUD 기능을 사용하기 위한 "연결 지점" 역할을 하므로
    // 코드 내용은 거의 없지만, Spring Data JPA를 사용할 거라면 필요한 파일이다.
}

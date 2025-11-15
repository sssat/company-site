// inquiries/infra/persistence/SpringDataInquiryRepository.java

package com.marketstage.backend.inquiries.infra.persistence;

import com.marketstage.backend.inquiries.domain.model.Inquiry;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataInquiryRepository extends JpaRepository<Inquiry, Integer> {

    // 현재는 기본 CRUD만으로 충분하므로 추가 메서드 없음
}

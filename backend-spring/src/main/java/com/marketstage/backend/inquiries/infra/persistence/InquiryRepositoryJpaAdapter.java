// inquiries/infra/persistence/InquiryRepositoryJpaAdapter.java

package com.marketstage.backend.inquiries.infra.persistence;

import com.marketstage.backend.inquiries.application.port.out.InquiryRepository;
import com.marketstage.backend.inquiries.domain.model.Inquiry;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InquiryRepositoryJpaAdapter implements InquiryRepository {
    private final SpringDataInquiryRepository jpa;

    @PersistenceContext
    private EntityManager em;

    // ─────────────────────────────────────────────────────────
    // (1) 단건 조회/저장/삭제 — Spring Data JPA 에 위임
    // ─────────────────────────────────────────────────────────

    // 1. PK로 단건 조회 (일반 조회)
    @Override
    public Optional<Inquiry> findById(Integer inquirySeq) {
        return jpa.findById(inquirySeq);
    }

    // 1-1. PK로 단건 조회 + 비관적 락 (select_for_update 대응)
    @Override
    public Optional<Inquiry> findByIdForUpdate(Integer inquirySeq) {
        Inquiry inquiry = em.find(Inquiry.class, inquirySeq, LockModeType.PESSIMISTIC_WRITE);
        return Optional.ofNullable(inquiry);
    }

    // 2. 엔티티 저장/갱신
    @Override
    @Transactional
    public Inquiry save(Inquiry inquiry) {
        return jpa.save(inquiry);
    }

    // 3. 엔티티 삭제
    @Override
    @Transactional
    public void delete(Inquiry inquiry) {
        jpa.delete(inquiry);
    }

    // ─────────────────────────────────────────────────────────
    // (2) 목록 검색용 동적 쿼리 구현
    // ─────────────────────────────────────────────────────────

    // 4. 현재 검색 조건으로 총 몇 건이 있는지 카운트
    @Override
    public long countByFilter(String q, Boolean processed) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<Inquiry> root = cq.from(Inquiry.class);

        List<Predicate> predicates = buildPredicates(cb, root, q, processed);
        cq.select(cb.count(root)).where(predicates.toArray(new Predicate[0]));

        return em.createQuery(cq).getSingleResult();
    }

    // 5. 현재 검색 조건 + 정렬 + 페이징으로 실제 목록 조회
    @Override
    public List<Inquiry> findByFilter(
            String q,
            Boolean processed,
            boolean orderAsc,
            int offset,
            int limit
    ) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Inquiry> cq = cb.createQuery(Inquiry.class);
        Root<Inquiry> root = cq.from(Inquiry.class);

        List<Predicate> predicates = buildPredicates(cb, root, q, processed);
        cq.select(root).where(predicates.toArray(new Predicate[0]));

        // 정렬: submittedAt 기준
        if (orderAsc) {
            cq.orderBy(cb.asc(root.get("submittedAt")));
        } else {
            cq.orderBy(cb.desc(root.get("submittedAt")));
        }

        TypedQuery<Inquiry> query = em.createQuery(cq);
        if (offset > 0) {
            query.setFirstResult(offset);
        }
        if (limit > 0) {
            query.setMaxResults(limit);
        }
        return query.getResultList();
    }

    // ─────────────────────────────────────────────────────────
    // (3) 공통 WHERE 조건(필터) 조립 헬퍼
    // ─────────────────────────────────────────────────────────
    private List<Predicate> buildPredicates(
            CriteriaBuilder cb,
            Root<Inquiry> root,
            String q,
            Boolean processed
    ) {
        List<Predicate> list = new ArrayList<>();

        if (processed != null) {
            list.add(cb.equal(root.get("processed"), processed));
        }

        // (B) 검색어(q) 처리
        if (q != null && !q.isBlank()) {
            String[] parts = q.trim().split("\\s+");
            for (String raw : parts) {
                String term = raw.trim();
                if (term.isEmpty()) {
                    continue;
                }

                String like = "%" + term.toLowerCase() + "%";

                Expression<String> nameExpr    = cb.lower(root.get("name"));
                Expression<String> emailExpr   = cb.lower(root.get("email"));
                Expression<String> titleExpr   = cb.lower(root.get("title"));
                Expression<String> messageExpr = cb.lower(root.get("message"));

                Predicate or = cb.or(
                        cb.like(nameExpr, like),
                        cb.like(emailExpr, like),
                        cb.like(titleExpr, like),
                        cb.like(messageExpr, like)
                );
                list.add(or); // 여러 토큰이면 나중에 AND 로 모두 결합됨
            }
        }

        return list;
    }
}

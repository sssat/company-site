// news/infra/persistence/NewsPostRepositoryJpaAdapter.java

package com.marketstage.backend.news.infra.persistence;

import com.marketstage.backend.news.application.port.out.NewsPostRepository;
import com.marketstage.backend.news.domain.model.NewsPost;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NewsPostRepositoryJpaAdapter implements NewsPostRepository {

    // 이 어댑터 내부에서 사용할 Spring Data JPA 레포지토리
    // 단순 쿼리(findById, save, delete 등)는 여기로 위임해서 jpa.메서드() 형태로 호출
    private final SpringDataNewsPostRepository jpa;

    // JPA의 핵심 DB 접근 객체(EntityManager)를 주입받아서
    // Criteria API 로 동적 쿼리를 구성할 때 사용
    @PersistenceContext
    private EntityManager em;

    // ─────────────────────────────────────────────────────────
    // (1) 단순 조회/저장/삭제 메서드 — SpringDataNewsPostRepository 에 위임
    // ─────────────────────────────────────────────────────────

    // 1. PK(NEWS_SEQ)로 단건 조회
    @Override
    public Optional<NewsPost> findById(Integer newsSeq) {
        return jpa.findById(newsSeq);
    }

    // 2. 저장/갱신
    @Override
    @Transactional
    public NewsPost save(NewsPost newsPost) {
        return jpa.save(newsPost);
    }

    // 3. 삭제
    @Override
    @Transactional
    public void delete(NewsPost newsPost) {
        jpa.delete(newsPost);
    }

    // ─────────────────────────────────────────────────────────
    // (2) 목록 검색용 동적 쿼리 (countByFilter / findByFilter)
    // ─────────────────────────────────────────────────────────

    // 4. 현재 검색 조건에 매칭되는 전체 개수
    @Override
    public long countByFilter(String q, Integer categoryInt) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<NewsPost> root = cq.from(NewsPost.class);

        List<Predicate> predicates = buildFilterPredicates(cb, root, q, categoryInt);

        cq.select(cb.count(root));
        if (!predicates.isEmpty()) {
            cq.where(predicates.toArray(new Predicate[0]));
        }

        return em.createQuery(cq).getSingleResult();
    }

    // 5. 현재 검색 조건 + 정렬 + 페이징에 해당하는 행들만 조회
    @Override
    public List<NewsPost> findByFilter(
            String q,
            Integer categoryInt,
            String sortProperty,
            boolean sortDesc,
            int offset,
            int limit
    ) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<NewsPost> cq = cb.createQuery(NewsPost.class);
        Root<NewsPost> root = cq.from(NewsPost.class);

        List<Predicate> predicates = buildFilterPredicates(cb, root, q, categoryInt);

        if (!predicates.isEmpty()) {
            cq.where(predicates.toArray(new Predicate[0]));
        }

        // 정렬 기준 필드명 정규화 (엔티티 필드 이름 기준)
        String sortField = normalizeSortProperty(sortProperty);
        Path<?> sortPath = root.get(sortField);
        cq.orderBy(sortDesc ? cb.desc(sortPath) : cb.asc(sortPath));

        TypedQuery<NewsPost> query = em.createQuery(cq);

        if (offset > 0) {
            query.setFirstResult(offset);
        }
        if (limit > 0) {
            query.setMaxResults(limit);
        }

        return query.getResultList();
    }

    // ─────────────────────────────────────────────────────────
    // (3) 공통 WHERE 조건 빌더 — 목록/카운트 공용
    // ─────────────────────────────────────────────────────────
    private List<Predicate> buildFilterPredicates(
            CriteriaBuilder cb,
            Root<NewsPost> root,
            String q,
            Integer categoryInt
    ) {
        List<Predicate> list = new ArrayList<>();

        // 1) 카테고리 필터 (0 또는 null이면 전체)
        if (categoryInt != null && categoryInt != 0) {
            Path<Short> categoryPath = root.get("category");
            list.add(cb.equal(categoryPath, categoryInt.shortValue()));
        }

        // 2) 검색어(q) 필터 — title / excerpt 에 대해 LIKE 검색
        String keyword = safe(q).toLowerCase(Locale.ROOT);
        if (!keyword.isEmpty()) {
            String like = "%" + keyword + "%";
            Expression<String> title = cb.lower(root.get("title"));
            Expression<String> excerpt = cb.lower(root.get("excerpt"));

            Predicate or = cb.or(
                    cb.like(title, like),
                    cb.like(excerpt, like)
            );
            list.add(or);
        }

        return list;
    }

    // ─────────────────────────────────────────────────────────
    // (4) 헬퍼 메서드들
    // ─────────────────────────────────────────────────────────

    // null -> "" 로 바꾸고 trim 까지 수행
    private static String safe(String s) {
        return (s == null) ? "" : s.trim();
    }

    // 정렬 기준 프로퍼티명 정규화
    private static String normalizeSortProperty(String sortProperty) {
        String s = safe(sortProperty);
        if (s.isEmpty()) {
            return "publishedAt";      // 기본 정렬: 등록일시
        }

        String lower = s.toLowerCase(Locale.ROOT);
        if (lower.equals("published_at")) {
            return "publishedAt";
        }
        if (lower.equals("updated_at")) {
            return "updatedAt";
        }

        // 그 외에는 그대로 사용 (엔티티 필드명과 맞지 않으면 런타임에 오류 발생)
        return s;
    }
}

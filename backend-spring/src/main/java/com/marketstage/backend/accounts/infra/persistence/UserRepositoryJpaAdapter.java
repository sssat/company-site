// accounts/infra/persistence/UserRepositoryJpaAdapter.java
// 아웃바운드 포트(UserRepository.java)의 구현체 -> UserRepository.java의 시그니처들을 여기서 직접 세부 로직 구현함
// UserRepository.java의 간단한 쿼리들은 SpringDataUserRepository.java에 위임해서 구현했기 때문에 여기선 복잡한 애들만 구현하면됨
// 다만, 간단한 메서드들도 @Override로 형식적으로 구현하긴 해야한다.
// 엔티티(User.java), 아웃바운드 포트 인터페이스(UserRepository.java), SpringDataUserRepository.java를 토대로 작성

package com.marketstage.backend.accounts.infra.persistence;

import com.marketstage.backend.accounts.application.port.out.UserRepository;
import com.marketstage.backend.accounts.domain.model.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;  
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Path;   
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

// 이 클래스는 DB에 접근하는 영속성 계층(Repository) 역할을 하는 컴포넌트임을 나타내는 어노테이션
// 영속성 계층(Repository): 데이터를 DB에 영구적으로(프로그램이 꺼져도 남게) 저장하고, 다시 읽어오는 역할을 담당하는 레이어
@Repository

@RequiredArgsConstructor
@Transactional(readOnly = true)

// UserRepository 인터페이스 구현해서 UserRepositoryJpaAdapter 클래스 생성
public class UserRepositoryJpaAdapter implements UserRepository {

    // 이 클래스가 내부에서 사용할 Spring Data JPA 레포지토리 인스턴스 변수
    // 단순한 쿼리(findById, findByUserId, existsByEmail, .... 등)는 전부 여기로 위임해서
    // jpa.메서드() 형태로 호출할 예정
    private final SpringDataUserRepository jpa;

    // JPA가 관리하는 EntityManager(JPA에서 DB 작업을 실제로 수행하는 핵심 객체)를 이 필드에 주입해달라고 표시하는 어노테이션
    // 주입된 EntityManager를 사용해서 Criteria API로 복잡한 동적 쿼리들을 수행함
    // Criteria API: JPQL/SQL을 문자열("select ... from ... where")로 쓰지 않고, 자바 코드로 조립해서 쿼리를 만드는 방식
    @PersistenceContext

    // JPA의 핵심 DB 접근 객체
    private EntityManager em;

    // ─────────────────────────────────────────────────────────
    // (1) 조회 계열 메서드 구현
    // 이곳의 함수는 이미 SpringDataUserRepository.java에 위임해서 처리했기 때문에 여기선 jpa.메서드() 형태로 호출만 한다.
    // ─────────────────────────────────────────────────────────
    
    // 1. PK로 단건을 조회
    @Override
    public Optional<User> findById(Integer userSeq) {
        return jpa.findById(userSeq);
    }

    // 2. user_id(로그인 아이디)로 단건 조회 
    @Override
    public Optional<User> findByUserId(String userId) {
        return jpa.findByUserId(userId);
    }

    // 3. email로 단건 조회. 이메일 찾기/중복확인/계정 찾기에서 쓰임
    @Override
    public Optional<User> findByEmail(String email) {
        return jpa.findByEmail(email);
    }

    // 4. User와 그에 딸린 UserLevel(권한)을 "한 번의 쿼리"로 같이 가져오는 메서드
    // UserRepository.java(포트)에서는 메서드 이름이 findByIdWithLevel 이고,
    // SpringDataUserRepository.java(Spring Data JPA)는 findWithLevelByUserSeq 라는 이름으로 정의되어 있다.
    // 그러나 UserRepositoryJpaAdapter.java는 UserRepository 포트를 구현하는 어댑터이므로 findByIdWithLevel를 오버라이드하고,
    // 그 내부 구현에서 실제로는 jpa.findWithLevelByUserSeq(userSeq)를 호출해 위임한다.
    @Override
    public Optional<User> findByIdWithLevel(Integer userSeq) {
        return jpa.findWithLevelByUserSeq(userSeq);
    }

    // 5. 회원가입 사전검증(아이디 중복확인)
    @Override
    public boolean existsByUserId(String userId) {
        return jpa.existsByUserId(userId);
    }
    
    // 6. 회원가입 사전검증(이메일 중복확인)
    @Override
    public boolean existsByEmail(String email) {
        return jpa.existsByEmail(email);
    }

    // ─────────────────────────────────────────────────────────
    // (2) 저장/부분 업데이트 메서드 구현
    // 여기도 마찬가지로 SpringDataUserRepository.java에 위임해서 처리했기 때문에 여기선 jpa.메서드() 형태로 호출만 한다.
    // ─────────────────────────────────────────────────────────

    // 7. 엔티티 저장/갱신
    @Override
    @Transactional
    public User save(User user) {
        return jpa.save(user);
    }

    // 8. 로그인에 성공했을 때, 해당 사용자의 LAST_LOGIN_AT 컬럼만 빠르게 한 줄 UPDATE 하는 전용 메서드
    @Override
    @Transactional
    public void updateLastLoginAt(Integer userSeq, LocalDateTime lastLoginAt) {
        // 영향 행 수 검사 필요 시 int rows = jpa.updateLastLoginAt(...); 로 체크 가능
        jpa.updateLastLoginAt(userSeq, lastLoginAt);
    }

    // ─────────────────────────────────────────────────────────
    // (3) 관리자 검색(동적 조건 + 페이징)
    // 이 메서드들은 SpringDataUserRepository.java에 위임하지 않았기 때문에 여기서 직접 구현해줘야 한다.
    // ─────────────────────────────────────────────────────────
    
    // 9. 회원 관리 페이지에서 현재 검색 조건으로 총 몇 명이 매치되는지를 반환하는 메서드
    @Override
    public long countBySearch(Integer roleHint, List<String> terms) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<User> root = cq.from(User.class);

        List<Predicate> predicates = buildPredicates(cb, root, roleHint, terms);
        cq.select(cb.count(root)).where(predicates.toArray(new Predicate[0]));

        return em.createQuery(cq).getSingleResult();
    }

    // 10. 회원 관리 페이지에서 현재 검색 조건으로 해당 페이지의 행들만 가져오는 메서드
    @Override
    public List<User> findBySearch(Integer roleHint, List<String> terms, int offset, int limit) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<User> cq = cb.createQuery(User.class);
        Root<User> root = cq.from(User.class);

        // N+1 회피: User.level 을 즉시 로딩
        root.fetch("level", JoinType.LEFT);

        List<Predicate> predicates = buildPredicates(cb, root, roleHint, terms);
        cq.select(root).distinct(true).where(predicates.toArray(new Predicate[0]));
        // 정렬 기준은 필요에 따라 변경 가능 (예: joinedAt desc 등)
        cq.orderBy(cb.desc(root.get("userSeq"))); 

        TypedQuery<User> query = em.createQuery(cq);
        if (offset > 0) query.setFirstResult(offset);
        if (limit > 0) query.setMaxResults(limit);
        return query.getResultList();
    }

    // ─────────────────────────────────────────────────────────
    // (4) 관리자 회원 검색에서 쓸 WHERE 조건들(필터)을 한 번에 만들어 주는 공통 헬퍼 함수
    // 위의 countBySearch, findBySearch 함수에서 쓰인다.
    // 이건 UserRepository.java에 선언하지 않은 함수이다.
    // ─────────────────────────────────────────────────────────
    private List<Predicate> buildPredicates(
            CriteriaBuilder cb,
            Root<User> root,
            Integer roleHint,
            List<String> terms
    ) {
        List<Predicate> list = new ArrayList<>();

        // 1) 역할 힌트(USER/ADMIN/SUPER_ADMIN) -> grade_code 필터
        if (roleHint != null) {
            Path<Byte> grade = root.get("level").get("gradeCode");
            list.add(cb.equal(grade, roleHint.byteValue()));
        }

        // 2) 일반 검색어: 이름 / 아이디만 매칭 (이메일 제외)
        if (terms != null) {
            for (String t : terms) {
                if (t == null) continue;
                String term = t.trim().toLowerCase();
                if (term.isEmpty()) continue;

                Expression<String> userId   = cb.lower(root.get("userId"));
                Expression<String> userName = cb.lower(root.get("userName"));
                // Expression<String> email = cb.lower(root.get("email")); // 제거

                String like = "%" + term + "%";

                // 이름 / 아이디만 LIKE 검색
                Predicate or = cb.or(
                        cb.like(userId, like),
                        cb.like(userName, like)
                        // , cb.like(email, like)  // 주석 처리
                );
                list.add(or);
            }
        }

        return list;
    }
}

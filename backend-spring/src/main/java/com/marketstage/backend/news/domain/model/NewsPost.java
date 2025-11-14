// news/domain/model/NewsPost.java

// 작성 순서 (news 도메인 기준)
// 1. 도메인 모델: news/domain/model/NewsPost.java, NewsPostHistory.java
// 2. 애플리케이션 포트
//    (1) 인바운드 포트 (=유즈케이스): news/application/port/in/NewsUseCase.java
//    (2) 아웃바운드 포트 (아웃바운드 포트는 유즈케이스 아님)
//      1) news/application/port/out/NewsPostRepository.java (뉴스글 저장/조회 퍼시스턴스 아웃바운드 포트)
//      2) news/application/port/out/NewsPostHistoryRepository.java (뉴스 삭제 이력 저장 퍼시스턴스 아웃바운드 포트)
//      3) news/application/port/out/PresignedUploadUrlPort.java (S3 프리사인드 업로드 URL 발급용 인프라 아웃바운드 포트)
// 3. 공통 예외 처리: common/exception/NotFoundException.java 
//    -> Accounts/News/Inquiries 서비스에서 공통으로 바로 쓸 수 있어야 하므로 초기에 작성하고, 
//       실질적 HTTP 매핑 로직은 없음(빈 껍데기 역할만 수행).
// 4. 서비스 (=유즈케이스의 구현): news/application/service/NewsService.java
// 5. 인프라 
//   (1) Persistence(퍼시스턴스)
//     1) Spring Data JPA Repository: 
//        news/infra/persistence/SpringDataNewsPostRepository.java, SpringDataNewsPostHistoryRepository.java
//     2) 아웃바운드 포트 구현체(Adapter): 
//        news/infra/persistence/NewsPostRepositoryJpaAdapter.java, NewsPostHistoryRepositoryJpaAdapter.java
//   (2) S3/스토리지 어댑터: 
//        news/infra/storage/** (PresignedUploadUrlPort 를 구현해서 S3 프리사인드 업로드 URL을 발급하는 어댑터)
// 6. 설정 클래스/빈 정의: common/AppConfig.java 
//    + application.yml 의 aws/s3/cloudfront 설정 (NewsService 에서 @Value 로 주입 받아 사용)
// 7. API 계층
//   (1) 요청/응답 DTO: src/main/java/com/marketstage/backend/news/api/dto/* 
//   (2) 컨트롤러: src/main/java/com/marketstage/backend/news/api/NewsController.java
//   (3) 전역 예외 처리: src/main/java/com/marketstage/backend/common/GlobalExceptionHandler.java 
//       -> Accounts/News/Inquiries 컨트롤러에서 던지는 예외를 HTTP 상태/에러 바디 포맷으로 매핑해야 해서 
//          실질적 로직이 존재하고, 모든 도메인의 흐름을 본 뒤 맨 나중에 작성


package com.marketstage.backend.news.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

import com.marketstage.backend.accounts.domain.model.User;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "newsSeq")
@Entity
@Table(name = "T_NEWS_POST")
public class NewsPost {

    // 1) 뉴스글 일련번호 (PK)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "NEWS_SEQ")
    private Integer newsSeq;

    // 2) 작성자 (FK, PROTECT 성격 -> DB FK ON DELETE RESTRICT/NO ACTION으로 대응)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "PUBLISHED_SEQ",
        nullable = false,
        foreignKey = @ForeignKey(ConstraintMode.CONSTRAINT)
    )
    private User publishedBy;

    // 3) 수정자 (FK, SET_NULL 성격 -> DB FK ON DELETE SET NULL로 마이그레이션에서 지정)
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(
        name = "UPDATED_SEQ",
        nullable = true,
        foreignKey = @ForeignKey(ConstraintMode.CONSTRAINT)
    )
    private User updatedBy;

    // 4) 제목
    @Column(name = "TITLE", nullable = false, length = 200)
    private String title;

    // 5) 내용
    @Column(name = "CONTENT", nullable = false, columnDefinition = "TEXT")
    private String content;

    // 6) 썸네일 이미지 경로 (NULL 허용)
    @Column(name = "THUMBNAIL_URL", length = 255)
    private String thumbnailUrl;

    // 7) 등록 일시 — Django default=timezone.now 대응
    @Column(name = "PUBLISHED_AT", nullable = false)
    private LocalDateTime publishedAt;

    // 8) 카테고리 (0=전체, 1=내부발표, 2=외부발표) — Django default=0 대응
    @Column(name = "CATEGORY", nullable = false)
    private Short category;

    // 9) 기사 내부 이미지 경로 (NULL 허용)
    @Column(name = "IMAGE_URL", length = 255)
    private String imageUrl;

    // 10) 수정 일시 (NULL 허용)
    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;

    // 11) 기사 요약
    @Column(name = "EXCERPT", nullable = false, length = 500)
    private String excerpt;

    // 12) 기사 배지 (예: "RELEASE")
    @Column(name = "BADGE", nullable = false, length = 50)
    private String badge;

    // INSERT 직전 기본값 세팅
    @PrePersist
    void prePersist() {
        if (publishedAt == null) publishedAt = LocalDateTime.now();
        if (category == null)    category = 0;
    }

    @Override
    public String toString() {
        return "[" + newsSeq + "] " + title;
    }

    // 카테고리 상수
    public static final short CATEGORY_ALL = 0;
    public static final short CATEGORY_INTERNAL = 1;
    public static final short CATEGORY_EXTERNAL = 2;
}

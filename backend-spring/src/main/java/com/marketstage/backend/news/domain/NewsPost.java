// news/domain/NewsPost.java
package com.marketstage.backend.news.domain;

import com.marketstage.backend.accounts.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

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

    // 2) 작성자 (FK, PROTECT 성격 → DB FK ON DELETE RESTRICT/NO ACTION으로 대응)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "PUBLISHED_SEQ",
        nullable = false,
        foreignKey = @ForeignKey(ConstraintMode.CONSTRAINT)
    )
    private User publishedBy;

    // 3) 수정자 (FK, SET_NULL 성격 → DB FK ON DELETE SET NULL로 마이그레이션에서 지정)
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

    // 12) 기사 배지 (예: "PRESS RELEASE")
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

    // 선택) 카테고리 상수
    public static final short CATEGORY_ALL = 0;
    public static final short CATEGORY_INTERNAL = 1;
    public static final short CATEGORY_EXTERNAL = 2;
}

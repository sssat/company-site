// news/domain/model/NewsPostHistory.java

package com.marketstage.backend.news.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import com.marketstage.backend.accounts.domain.model.User;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "historySeq")
@Entity
@Table(name = "T_NEWS_POST_HISTORY")
public class NewsPostHistory {

    // 1) 이력 일련번호 (PK)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "HISTORY_SEQ")
    private Integer historySeq;

    // 2) 뉴스글 (FK, ON DELETE SET NULL 성격 — DB 마이그레이션에서 지정)
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(
        name = "NEWS_SEQ",
        nullable = true,
        foreignKey = @ForeignKey(ConstraintMode.CONSTRAINT)
        // 필요 시 이름 고정: @ForeignKey(name = "FK_T_NEWS_POST_HISTORY__NEWS_SEQ")
    )
    private NewsPost news;

    // 3) 스냅샷: 삭제 직전의 뉴스글 일련번호/제목
    @Column(name = "NEWS_SEQ_SNAPSHOT")
    private Integer newsSeqSnapshot;

    @Column(name = "TITLE_SNAPSHOT", length = 200)
    private String titleSnapshot;

    // 4) 삭제자 (FK, PROTECT 성격 — DB FK ON DELETE RESTRICT/NO ACTION)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "DELETED_SEQ",
        nullable = false,
        foreignKey = @ForeignKey(ConstraintMode.CONSTRAINT)
    )
    private User deletedBy;

    // 5) 삭제 시각
    @Column(name = "DELETED_AT", nullable = false)
    private LocalDateTime deletedAt;

    // 보기 좋게 출력
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public String toString() {
        String title = (news != null)
            ? news.getTitle()                             
            : (titleSnapshot != null ? titleSnapshot : "-");

        String when = (deletedAt != null) ? deletedAt.format(FMT) : "null";
        return "[" + historySeq + "] news=" + title + " deleted_at=" + when;
    }
}

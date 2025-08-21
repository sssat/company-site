import { Link, useParams } from "react-router-dom";
import styles from "./NewsDetail.module.css";
import { NEWS } from "./newsData";

export default function NewsDetail() {
  const { slug } = useParams<{ slug?: string }>();
  const item = NEWS.find((n) => n.slug === slug);

  if (!item) {
    return (
      <div className={styles.fallback}>
        <p>해당 기사를 찾을 수 없습니다.</p>
        <Link to="/media" className={styles.backBtn}>목록으로</Link>
      </div>
    );
  }

  /**
   * hero 표시 규칙
   * - hero === null       → 상세 상단 이미지를 숨김
   * - hero === undefined  → 썸네일(image)로 대체
   * - hero === string     → 해당 이미지를 사용
   */
  const heroSrc = item.hero === null ? null : (item.hero ?? item.image);

  return (
    <section className={styles.section}>
      <div className={`${styles.wrap} ${styles.show}`}>
        {/* 상단 굵은 라인 */}
        <div className={styles.topRule} />

        {/* 제목/등록일 */}
        <div className={styles.headerRow}>
          <h1 className={styles.title}>{item.title}</h1>
          <time
            className={styles.regDate}
            dateTime={item.date.replace(/\./g, "-")}
          >
            등록일: {item.date}
          </time>
        </div>

        {/* 제목 아래 얇은 구분선 */}
        <hr className={styles.hr} />

        {/* 제목 얇은선 아래 이미지 (규칙에 따라 표시/숨김) */}
        {heroSrc && (
          <figure className={styles.hero}>
            <img
              src={heroSrc}
              alt={`${item.title} 대표 이미지`}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </figure>
        )}

        {/* 본문 */}
        <article className={styles.article}>
          {item.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>

        <hr className={styles.hrBottom} />

        {/* 목록 버튼 */}
        <div className={styles.actions}>
          <Link to="/media" className={styles.listBtn}>목록</Link>
        </div>
      </div>
    </section>
  );
}

// src/components/MediaOnly/NewsDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import styles from "./NewsDetail.module.css";
import { getNewsDetail, type NewsDetailResponse } from "../../api/newsApi";

function formatDateYmd(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export default function NewsDetail() {
  const { news_seq } = useParams<{ news_seq?: string }>();
  const location = useLocation();

  const id = useMemo<number | null>(() => {
    const n = Number(news_seq);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [news_seq]);

  const [item, setItem] = useState<NewsDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [id]);

  useEffect(() => {
    if (id == null) return;
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getNewsDetail(id);
        if (!aborted) setItem(data);
      } catch {
        if (!aborted) {
          setError("해당 기사를 찾을 수 없습니다.");
          setItem(null);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [id]);

  useEffect(() => {
    if (!item) return;
    const prev = document.title;
    document.title = `${item.title} | News`;
    return () => { document.title = prev; };
  }, [item]);

  if (id == null) {
    return (
      <div className={styles.fallback}>
        <p>잘못된 접근입니다.</p>
        <Link to={`/media${location.search || ""}`} className={styles.backBtn}>목록으로</Link>
      </div>
    );
  }
  if (loading) {
    return <div className={styles.fallback}><p>불러오는 중…</p></div>;
  }
  if (error || !item) {
    return (
      <div className={styles.fallback}>
        <p>{error || "해당 기사를 찾을 수 없습니다."}</p>
        <Link to={`/media${location.search || ""}`} className={styles.backBtn}>목록으로</Link>
      </div>
    );
  }

  // hero는 image_url이 있을 때만 노출(썸네일로 대체하지 않음)
  const heroSrc: string | null = item.image_url || null;

  return (
    <section className={styles.section}>
      <div className={`${styles.wrap} ${styles.show}`}>
        <div className={styles.topRule} />

        <div className={styles.headerRow}>
          <h1 className={styles.title}>{item.title}</h1>
          <time className={styles.regDate} dateTime={item.published_at}>
            등록일: {formatDateYmd(item.published_at)}
          </time>
        </div>

        <hr className={styles.hr} />

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

        {/* 본문: HTML로 렌더 */}
        <article className={styles.article}>
          {item.body.map((html, i) => (
            <div key={i} className={styles.paragraph} dangerouslySetInnerHTML={{ __html: html }} />
          ))}
        </article>

        <hr className={styles.hrBottom} />

        <div className={styles.actions}>
          <Link to={`/media${location.search || ""}`} className={styles.listBtn}>목록</Link>
        </div>
      </div>
    </section>
  );
}
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styles from "./NewsList.module.css";
import { NEWS } from "./newsData";
import type { NewsCategory } from "./newsData";

type TabKey = "all" | NewsCategory;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "internal", label: "내부발표" },
  { key: "external", label: "외부발표" },
];

const PAGE_SIZE = 6;

export default function NewsList() {
  // URL 쿼리와 동기화 (탭/검색/페이지 유지)
  const [params, setParams] = useSearchParams();
  const initTab = (params.get("tab") as TabKey) || "all";
  const initPage = Number(params.get("page") || "1");
  const initQuery = params.get("q") || "";

  const [tab, setTab] = useState<TabKey>(initTab);
  const [page, setPage] = useState<number>(Math.max(1, initPage));

  // 🔹 검색 입력값과 실제 필터값을 분리
  const [qInput, setQInput] = useState(initQuery);
  const [query, setQuery] = useState(initQuery);

  // 페이드업
  const sectionRef = useRef<HTMLElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e], o) => {
      if (e.isIntersecting) {
        setShow(true);
        o.disconnect();
      }
    }, { threshold: 0.08 });
    if (sectionRef.current) io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  // 필터링/검색 결과
  const filtered = useMemo(() => {
    const byTab = tab === "all" ? NEWS : NEWS.filter((n) => n.category === tab);
    const q = query.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((n) => n.title.toLowerCase().includes(q));
  }, [tab, query]);

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  // totalPages 변화로 page가 초과하면 보정
  useEffect(() => {
    if (page !== clampedPage) setPage(clampedPage);
  }, [clampedPage, page]);

  // URL 동기화
  useEffect(() => {
    const next = new URLSearchParams();
    if (tab !== "all") next.set("tab", tab);
    if (clampedPage !== 1) next.set("page", String(clampedPage));
    if (query.trim()) next.set("q", query.trim());
    setParams(next, { replace: true });
  }, [tab, clampedPage, query, setParams]);

  // 탭 변경 시 첫 페이지로
  const handleTab = (t: TabKey) => {
    setTab(t);
    setPage(1);
  };

  // 검색 제출 시에만 필터 적용
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setQuery(qInput);
    setPage(1);
  };

  // 상세로 이동할 때 스크롤을 맨 위로
  const goTopOnNav = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" }); // 필요하면 "smooth"로 변경
  };

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${show ? styles.show : styles.hidden}`}
    >
      <div className={styles.wrap}>
        <h1 className={styles.title}>뉴스룸</h1>

        {/* 탭 */}
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.active : ""}`}
              onClick={() => handleTab(t.key)}
              type="button"
              aria-pressed={tab === t.key}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 그리드 */}
        <div className={styles.grid}>
          {pageItems.map((n) => (
            <article key={n.id} className={styles.card}>
              <Link
                to={`/media/${n.slug}`}
                className={styles.thumb}
                onClick={goTopOnNav}   // 여기
              >
                <img src={n.image} alt={`${n.title} 썸네일`} />
              </Link>

              <div className={styles.meta}>
                <span className={styles.badge}>{n.badge ?? "NEWS"}</span>
                <time className={styles.date} dateTime={n.date.replace(/\./g, "-")}>
                  {n.date}
                </time>
              </div>

              <h2 className={styles.cardTitle}>
                <Link
                  to={`/media/${n.slug}`}
                  onClick={goTopOnNav}   // 여기도
                >
                  {n.title}
                </Link>
              </h2>

              <p className={styles.excerpt}>{n.excerpt}</p>
            </article>
          ))}
        </div>

        {/* 검색 (제출 시에만 반영) */}
        <form className={styles.search} onSubmit={onSubmit}>
          <input
            className={styles.searchInput}
            placeholder="Search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            aria-label="뉴스 검색"
          />
          <button className={styles.searchBtn} type="submit">검색</button>
        </form>

        {/* 페이지네이션 */}
        <nav className={styles.pager} aria-label="페이지네이션">
          <button
            className={styles.pageBtn}
            onClick={() => setPage(1)}
            disabled={clampedPage === 1}
            aria-label="첫 페이지"
          >
            &laquo;
          </button>

          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={clampedPage === 1}
            aria-label="이전 페이지"
          >
            &lt;
          </button>

          {Array.from({ length: totalPages }).map((_, i) => {
            const num = i + 1;
            return (
              <button
                key={num}
                className={`${styles.pageNum} ${num === clampedPage ? styles.current : ""}`}
                onClick={() => setPage(num)}
                aria-current={num === clampedPage ? "page" : undefined}
              >
                {num}
              </button>
            );
          })}

          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={clampedPage === totalPages}
            aria-label="다음 페이지"
          >
            &gt;
          </button>

          <button
            className={styles.pageBtn}
            onClick={() => setPage(totalPages)}
            disabled={clampedPage === totalPages}
            aria-label="마지막 페이지"
          >
            &raquo;
          </button>
        </nav>
      </div>
    </section>
  );
}

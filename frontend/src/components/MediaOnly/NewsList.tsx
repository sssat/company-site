import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import styles from "./NewsList.module.css";
import { NEWS } from "./newsData";
import type { NewsCategory } from "./newsData";
import { useAuth } from "../../hooks/useAuth"; // 경로 확인

type TabKey = "all" | NewsCategory;
type NewsItem = (typeof NEWS)[number];

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "internal", label: "내부발표" },
  { key: "external", label: "외부발표" },
];

const PAGE_SIZE = 6;

export default function NewsList() {
  const { isAuthenticated, role } = useAuth();
  const isManager = isAuthenticated && (role === "ADMIN" || role === "SUPER_ADMIN");
  const nav = useNavigate();

  // 목록을 로컬 상태로 관리(삭제 시 반영)
  const [items, setItems] = useState<NewsItem[]>(NEWS);

  // URL 쿼리와 동기화 (탭/검색/페이지 유지)
  const [params, setParams] = useSearchParams();
  const initTab = (params.get("tab") as TabKey) || "all";
  const initPage = Number(params.get("page") || "1");
  const initQuery = params.get("q") || "";

  const [tab, setTab] = useState<TabKey>(initTab);
  const [page, setPage] = useState<number>(Math.max(1, initPage));

  // 검색 입력값과 실제 필터값을 분리
  const [qInput, setQInput] = useState(initQuery);
  const [query, setQuery] = useState(initQuery);

  // 선택 모드(관리자 전용) + 선택된 카드 (문자열 ID로 관리)
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set<string>());

  // 페이드업(첫 진입 시 부드럽게 보이기)
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
    const base = tab === "all" ? items : items.filter((n) => n.category === tab);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((n) => n.title.toLowerCase().includes(q));
  }, [items, tab, query]);

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  // totalPages 변화로 page가 초과하면 보정
  useEffect(() => {
    if (page !== clampedPage) setPage(clampedPage);
  }, [clampedPage, page]);

  // URL 쿼리 동기화
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

  // 검색 제출 시에만 반영
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setQuery(qInput);
    setPage(1);
  };

  // 상세 이동 시 최상단으로 스크롤
  const goTopOnNav = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  // 선택/체크박스 핸들러
  const toggleSelectMode = () => {
    if (!selectMode) setSelected(new Set<string>()); // 켜질 때 선택 초기화
    setSelectMode((v) => !v);
  };
  const clearSelection = () => setSelected(new Set<string>());

  const toggleChecked = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 하단 액션: 수정/삭제
  const onEdit = () => {
    if (selected.size !== 1) {
      alert("수정은 하나만 선택하세요.");
      return;
    }
    const id = Array.from(selected)[0];
    const item = items.find((n) => n.id === id);
    if (!item) return;
    nav(`/media/${item.slug}/edit`);
  };

  const onDelete = () => {
    if (selected.size === 0) {
      alert("삭제할 항목을 선택하세요.");
      return;
    }
    if (!confirm(`${selected.size}개 항목을 삭제할까요?`)) return;
    setItems((prev) => prev.filter((n) => !selected.has(n.id)));
    clearSelection();
    setSelectMode(false);
  };

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${show ? styles.show : styles.hidden}`}
    >
      <div className={styles.wrap}>
        {/* 제목 */}
        <div className={styles.headerRow}>
          <h1 className={styles.title}>뉴스룸</h1>
        </div>

        {/* 탭 + (관리자용) 상단 버튼 */}
        <div className={styles.tabsRow}>
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

          {isManager && (
            <div className={styles.topBtns}>
              {selectMode ? (
                // ✅ 선택 모드일 때는 "선택 해제"만 표시 (선택취소 제거)
                <button
                  type="button"
                  className={`${styles.adminBtn} ${styles.primary}`}
                  onClick={toggleSelectMode}
                >
                  선택 해제
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.adminBtn} ${styles.primary}`}
                  onClick={toggleSelectMode}
                >
                  선택
                </button>
              )}
            </div>
          )}
        </div>

        {/* 카드 그리드 */}
        <div className={`${styles.grid} ${selectMode ? styles.selectMode : ""}`}>
          {pageItems.map((n) => {
            const checked = selected.has(n.id);
            return (
              <article key={n.id} className={`${styles.card} ${checked ? styles.checked : ""}`}>
                {/* 선택 모드에선 링크 이동을 막음 */}
                <Link
                  to={`/media/${n.slug}`}
                  className={styles.thumb}
                  onClick={(e) => {
                    if (selectMode) { e.preventDefault(); return; }
                    goTopOnNav();
                  }}
                >
                  <img src={n.image} alt={`${n.title} 썸네일`} />
                </Link>

                {/* 선택 모드에서만 체크박스 노출 */}
                {selectMode && (
                  <label className={styles.checkWrap} aria-label={`${n.title} 선택`}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={checked}
                      onChange={() => toggleChecked(n.id)}
                    />
                  </label>
                )}

                <div className={styles.meta}>
                  <span className={styles.badge}>{n.badge ?? "NEWS"}</span>
                  <time className={styles.date} dateTime={n.date.replace(/\./g, "-")}>
                    {n.date}
                  </time>
                </div>

                <h2 className={styles.cardTitle}>
                  <Link
                    to={`/media/${n.slug}`}
                    onClick={(e) => {
                      if (selectMode) { e.preventDefault(); return; }
                      goTopOnNav();
                    }}
                  >
                    {n.title}
                  </Link>
                </h2>

                <p className={styles.excerpt}>{n.excerpt}</p>
              </article>
            );
          })}
        </div>

        {/* 관리자 액션: 선택 모드면 [수정/삭제], 아니면 [등록] */}
        {isManager && (
          <>
            {selectMode ? (
              <div className={styles.adminActions}>
                {/* ✅ 수정 버튼에 primary 적용(#2563eb) */}
                <button
                  type="button"
                  className={`${styles.adminBtn} ${styles.primary}`}
                  onClick={onEdit}
                  disabled={selected.size !== 1}
                  title={selected.size !== 1 ? "수정은 하나만 선택하세요" : ""}
                >
                  수정
                </button>
                <button
                  type="button"
                  className={`${styles.adminBtn} ${styles.danger}`}
                  onClick={onDelete}
                  disabled={selected.size === 0}
                >
                  삭제
                </button>
              </div>
            ) : (
              <div className={styles.adminAboveSearch}>
                <Link to="/media/new" className={`${styles.adminBtn} ${styles.primary}`}>
                  등록
                </Link>
              </div>
            )}
          </>
        )}

        {/* 검색 */}
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

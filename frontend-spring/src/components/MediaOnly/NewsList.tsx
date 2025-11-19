// src/components/MediaOnly/NewsList.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import styles from "./NewsList.module.css";
import { useAuth } from "../../hooks/useAuth";
import {
  listNews,
  deleteNews,
  type NewsListItem as ApiNewsListItem,
  type NewsListUiResponse,
  type NewsOrder,
  type NewsCategoryFilter,
} from "../../api/newsApi";

// 썸네일 기본 이미지 (Vite 번들에 포함되도록 import 사용)
import defaultThumb from "../../assets/news/empty_thumbnail.jpg";

const DEFAULT_THUMB = defaultThumb;

/* =========================== 타입 =========================== */

// UI 탭 키
type UiTabKey = "all" | "internal" | "external";

// 서버 카테고리(필터 값) — "ALL" | "INTERNAL" | "EXTERNAL"
type ServerCategory = NewsCategoryFilter;

// 목록 아이템은 API 타입을 그대로 사용
type NewsListItem = ApiNewsListItem;

/* =========================== 상수/유틸 =========================== */

const TABS: { key: UiTabKey; label: string; server: ServerCategory }[] = [
  { key: "all", label: "전체", server: "ALL" },
  { key: "internal", label: "내부발표", server: "INTERNAL" },
  { key: "external", label: "외부발표", server: "EXTERNAL" },
];

const PAGE_SIZE = 6;
const DEFAULT_ORDER: NewsOrder = "recent";

/** "2025-09-25T12:34:56Z" -> "2025.09.25" */
function formatDateYmd(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

// 컴포넌트 바깥(파일 상단)에 하나 추가
function getDeleteErrorMessage(err: unknown): string {
  // 1) Axios 에러(response.data.message / detail) 우선
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    (err as { response?: unknown }).response &&
    typeof (err as { response: { data?: unknown } }).response.data === "object" &&
    (err as { response: { data: { message?: unknown; detail?: unknown } } }).response.data !== null
  ) {
    const data = (err as {
      response: { data: { message?: unknown; detail?: unknown } };
    }).response.data;
    if (typeof data.message === "string") return data.message;
    if (typeof data.detail === "string") return data.detail;
  }

  // 2) 일반 Error 객체
  if (err instanceof Error && typeof err.message === "string") {
    return err.message;
  }

  // 3) 문자열로 던진 경우
  if (typeof err === "string") return err;

  // 4) 그 외
  return "삭제 중 오류가 발생했습니다.";
}


/* =========================== 컴포넌트 =========================== */

export default function NewsList() {
  // useAuth 반환값 구조에 맞게 사용
  const { auth } = useAuth();
  const isAuthenticated = auth.isAuthed;
  const role = auth.role;

  const isManager = isAuthenticated && (role === "ADMIN" || role === "SUPER_ADMIN");
  const nav = useNavigate();
  const loc = useLocation();

  // URL 쿼리 동기화 (탭/검색/페이지 유지)
  const [params, setParams] = useSearchParams();
  const initTab = (params.get("tab") as UiTabKey) || "all";
  const initPage = Math.max(1, Number(params.get("page") || "1"));
  const initQuery = params.get("q") || "";

  const [tab, setTab] = useState<UiTabKey>(initTab);
  const [page, setPage] = useState<number>(initPage);

  // 검색 입력값과 실제 필터값 분리
  const [qInput, setQInput] = useState<string>(initQuery);
  const [query, setQuery] = useState<string>(initQuery);

  // 서버 데이터
  const [items, setItems] = useState<NewsListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // “첫 로드 완료” 플래그
  const [ready, setReady] = useState<boolean>(false);

  // 선택 모드(관리자 전용) + 선택된 카드(SEQ로 관리)
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [selected, setSelected] = useState<Set<number>>(new Set<number>());

  // 페이드업(첫 진입 시 부드럽게 보이기)
  const sectionRef = useRef<HTMLElement>(null);
  const [show, setShow] = useState<boolean>(false);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e], o) => {
        if (e.isIntersecting) {
          setShow(true);
          o.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    if (sectionRef.current) io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  // 총 페이지 수
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // 데이터 로드 전에는 사용자가 고른 page를 그대로 두고,
  // 로드 후(ready=true)에는 초과 시에만 보정
  const clampedPage = useMemo(
    () => (ready ? Math.min(page, totalPages) : page),
    [ready, page, totalPages]
  );

  // totalPages 변화로 page가 초과하면 (로드 이후에만) 보정
  useEffect(() => {
    if (ready && page !== clampedPage) setPage(clampedPage);
  }, [ready, clampedPage, page]);

  // URL 쿼리 동기화 (로드 전에는 사용자가 가진 page를, 로드 후에는 보정된 page를 사용)
  useEffect(() => {
    const pageForUrl = ready ? clampedPage : page;
    const next = new URLSearchParams();
    if (tab !== "all") next.set("tab", tab);
    if (pageForUrl !== 1) next.set("page", String(pageForUrl));
    if (query.trim()) next.set("q", query.trim());
    setParams(next, { replace: true });
  }, [tab, query, page, clampedPage, ready, setParams]);

  // 목록 로드
  useEffect(() => {
    let aborted = false;
    async function run() {
      setLoading(true);
      setErrorMsg("");
      try {
        const serverCategory = TABS.find((t) => t.key === tab)?.server ?? "ALL";
        const res: NewsListUiResponse = await listNews({
          page: clampedPage,
          size: PAGE_SIZE,
          q: query.trim() || undefined,
          category: serverCategory,
          order: DEFAULT_ORDER, // "recent" | "oldest"
        });

        if (aborted) return;
        setItems(res.items);
        setTotal(res.total);
        setSelected(new Set<number>()); // 페이지 이동/필터 변경 시 선택 초기화
        setReady(true); // 첫 로드 완료
      } catch {
        if (aborted) return;
        setErrorMsg("목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    run();
    return () => {
      aborted = true;
    };
  }, [tab, clampedPage, query]);

  // 탭 변경 시 첫 페이지로
  const handleTab = (t: UiTabKey) => {
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
    if (!selectMode) setSelected(new Set<number>()); // 켜질 때 선택 초기화
    setSelectMode((v) => !v);
  };
  const clearSelection = () => setSelected(new Set<number>());

  const toggleChecked = (seq: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seq)) next.delete(seq);
      else next.add(seq);
      return next;
    });
  };

  // 하단 액션: 수정/삭제
  const onEdit = () => {
    if (selected.size !== 1) {
      alert("수정은 하나만 선택하세요.");
      return;
    }
    const seq = Array.from(selected)[0];
    const item = items.find((n) => n.news_seq === seq);
    if (!item) return;
    nav(`/media/${item.news_seq}/edit`);
  };

    const onDelete = async () => {
    if (selected.size === 0) {
      alert("삭제할 항목을 선택하세요.");
      return;
    }
    if (!confirm(`${selected.size}개 항목을 삭제할까요?`)) return;

    try {
      const seqs = Array.from(selected);
      await Promise.all(seqs.map((seq) => deleteNews(seq)));

      setItems((prev) => prev.filter((n) => !selected.has(n.news_seq)));
      setTotal((prev) => Math.max(0, prev - seqs.length));
      clearSelection();
      setSelectMode(false);

      if (items.length - seqs.length <= 0 && clampedPage > 1) {
        setPage(clampedPage - 1);
      } else {
        const serverCategory = TABS.find((t) => t.key === tab)?.server ?? "ALL";
        const res: NewsListUiResponse = await listNews({
          page: clampedPage,
          size: PAGE_SIZE,
          q: query.trim() || undefined,
          category: serverCategory,
          order: DEFAULT_ORDER,
        });
        setItems(res.items);
        setTotal(res.total);
      }
    } catch (err: unknown) {
      console.error("delete error", err);
      alert(getDeleteErrorMessage(err));
    }
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

        {/* 상태 표시 */}
        {loading && <div className={styles.loading}>불러오는 중…</div>}
        {!!errorMsg && <div className={styles.error}>{errorMsg}</div>}
        {!loading && items.length === 0 && !errorMsg && (
          <div className={styles.empty}>표시할 뉴스가 없습니다.</div>
        )}

        {/* 카드 그리드 */}
        <div className={`${styles.grid} ${selectMode ? styles.selectMode : ""}`}>
          {items.map((n) => {
            const checked = selected.has(n.news_seq);
            // 썸네일 → 본문 이미지 → 기본 이미지 순으로 선택
            const img = n.thumbnail_url || n.image_url || DEFAULT_THUMB;
            const dateYmd = formatDateYmd(n.published_at);
            return (
              <article
                key={n.news_seq}
                className={`${styles.card} ${checked ? styles.checked : ""}`}
              >
                {/* 선택 모드에선 링크 이동을 막음 */}
                <Link
                  to={{ pathname: `/media/${n.news_seq}`, search: loc.search }}
                  className={styles.thumb}
                  onClick={(e) => {
                    if (selectMode) {
                      e.preventDefault();
                      return;
                    }
                    goTopOnNav();
                  }}
                >
                  {img ? (
                    <img src={img} alt={`${n.title} 썸네일`} />
                  ) : (
                    <div className={styles.noThumb} aria-label="썸네일 없음" />
                  )}
                </Link>

                {/* 선택 모드에서만 체크박스 노출 */}
                {selectMode && (
                  <label className={styles.checkWrap} aria-label={`${n.title} 선택`}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={checked}
                      onChange={() => toggleChecked(n.news_seq)}
                    />
                  </label>
                )}

                <div className={styles.meta}>
                  <span className={styles.badge}>{n.badge ?? "NEWS"}</span>
                  <time className={styles.date} dateTime={n.published_at}>
                    {dateYmd}
                  </time>
                </div>

                <h2 className={styles.cardTitle}>
                  <Link
                    to={{ pathname: `/media/${n.news_seq}`, search: loc.search }}
                    onClick={(e) => {
                      if (selectMode) {
                        e.preventDefault();
                        return;
                      }
                      goTopOnNav();
                    }}
                  >
                    {n.title}
                  </Link>
                </h2>

                {n.excerpt && <p className={styles.excerpt}>{n.excerpt}</p>}
              </article>
            );
          })}
        </div>

        {/* 관리자 액션: 선택 모드면 [수정/삭제], 아니면 [등록] */}
        {isManager && (
          <>
            {selectMode ? (
              <div className={styles.adminActions}>
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
            placeholder="검색 (제목/요약)"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            aria-label="뉴스 검색 (제목/요약)"
          />
          <button className={styles.searchBtn} type="submit">
            검색
          </button>
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

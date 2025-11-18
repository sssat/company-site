// src/pages/AdminPage/ContactBoardPage/ContactBoardPage.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ContactBoardPage.module.css";

import {
  listInquiries,
  type InquiryListItem,
  type InquiryListResponse,
} from "../../../../api/inquiriesApi";

const PAGE_SIZE = 10;

/** API 파라미터 타입 */
type RawParams = Parameters<typeof listInquiries>[0];
type ListParams = NonNullable<RawParams>;

/** 화면에서 쓰는 상태 필터 값 */
type UiStatus = "all" | "pending" | "done";

/** 상태 검색 키워드들 */
const PENDING_WORDS = ["처리중", "진행중", "대기중", "미처리", "pending"];
const DONE_WORDS = ["처리완료", "완료", "done", "complete"];

/** 검색창 문자열을 q/status로 분리 */
function parseSearchInput(raw: string): { keyword: string; uiStatus: UiStatus } {
  const t = raw.trim();
  if (!t) {
    return { keyword: "", uiStatus: "all" };
  }

  const low = t.toLowerCase();

  // "처리중" 류 → 상태 필터 전용
  if (PENDING_WORDS.some((w) => low === w.toLowerCase())) {
    return { keyword: "", uiStatus: "pending" };
  }

  // "처리완료" 류 → 상태 필터 전용
  if (DONE_WORDS.some((w) => low === w.toLowerCase())) {
    return { keyword: "", uiStatus: "done" };
  }

  // 나머지는 전부 제목/작성자 검색용
  return { keyword: t, uiStatus: "all" };
}

export default function ContactBoardPage() {
  const nav = useNavigate();

  /* ─ 페이드업 */
  const sectionRef = useRef<HTMLElement>(null);
  const [show, setShow] = useState(false);
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

    if (sectionRef.current) {
      io.observe(sectionRef.current);
    }
    return () => {
      io.disconnect();
    };
  }, []);

  /* ─ 검색 입력/적용 분리 */
  const [searchInput, setSearchInput] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState<string>("");
  const [appliedUiStatus, setAppliedUiStatus] = useState<UiStatus>("all");

  /* ─ 데이터/페이지네이션 */
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<InquiryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 검색 실행 (버튼/엔터 공통) */
  const runSearch = () => {
    const { keyword, uiStatus } = parseSearchInput(searchInput);
    setAppliedKeyword(keyword);
    setAppliedUiStatus(uiStatus);
    setPage(1);
  };

  /** 목록 로드 */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const base: ListParams = {
          page,
          size: PAGE_SIZE,
          q: appliedKeyword || undefined,
          order: "recent" as ListParams["order"],
        } as ListParams;

        const params: ListParams =
          appliedUiStatus === "all"
            ? base
            : ({
                ...base,
                status: appliedUiStatus as ListParams["status"],
              } as ListParams);

        const data: InquiryListResponse = await listInquiries(params);

        if (!alive) return;

        // 서버에서 이미 q/status 기준으로 필터된 결과 그대로 사용
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(Math.max(1, data.total_pages));
      } catch (err) {
        if (!alive) return;
        console.error("listInquiries 실패:", err);
        setError("목록을 불러오는 중 문제가 발생했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [page, appliedKeyword, appliedUiStatus]);

  const goDetail = (seq: number) => nav(`/contact/board/${seq}`);

  return (
    <section
      className={`${styles.section} ${show ? styles.show : styles.hidden}`}
      ref={sectionRef}
      aria-label="문의하기 관리"
    >
      <div className={styles.wrap}>
        <h1 className={styles.title}>문의하기 관리</h1>

        <div className={styles.metaRow} aria-live="polite">
          <span className={styles.totalCount}>총 {total.toLocaleString()}개</span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thNo}>No</th>
                <th>제목</th>
                <th className={styles.thAuthor}>글쓴이</th>
                <th className={styles.thDate}>날짜</th>
                <th className={styles.thStatus}>처리상태</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    불러오는 중…
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((t, idx) => {
                  const no = total - ((page - 1) * PAGE_SIZE + idx);
                  const date = t.submitted_at?.slice(0, 10) ?? "";
                  const statusPending = !t.is_processed;
                  return (
                    <tr key={t.inquiry_seq}>
                      <td className={styles.tdNo}>{no}</td>
                      <td className={styles.tdTitle}>
                        <button
                          className={styles.titleBtn}
                          onClick={() => goDetail(t.inquiry_seq)}
                          aria-label={`문의 상세 보기: ${t.subject}`}
                        >
                          {t.subject}
                        </button>
                      </td>
                      <td className={styles.tdAuthor}>{t.name}</td>
                      <td className={styles.tdDate}>{date}</td>
                      <td className={styles.tdStatus}>
                        <span
                          className={
                            statusPending
                              ? styles.statusPending
                              : styles.statusDone
                          }
                        >
                          {statusPending ? "처리중" : "처리완료"}
                        </span>
                      </td>
                    </tr>
                  );
                })}

              {!loading && items.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    결과가 없습니다.
                  </td>
                </tr>
              )}

              {error && !loading && (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    {error}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 검색: 엔터/버튼 모두 지원 */}
        <div className={styles.searchRow}>
          <input
            className={styles.search}
            placeholder="검색 (제목/작성자/상태)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
          />
          <button
            type="button"
            className={styles.searchBtn}
            onClick={runSearch}
            aria-label="검색"
          >
            검색
          </button>
        </div>

        {/* 페이지네이션 */}
        <nav className={styles.pager} aria-label="페이지네이션">
          <button
            className={styles.pagerBtn}
            onClick={() => setPage(1)}
            disabled={page === 1}
            aria-label="첫 페이지"
          >
            &laquo;
          </button>
          <button
            className={styles.pagerBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="이전 페이지"
          >
            &lt;
          </button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            return (
              <button
                key={n}
                className={`${styles.pagerNum} ${
                  n === page ? styles.current : ""
                }`}
                onClick={() => setPage(n)}
                aria-current={n === page ? "page" : undefined}
              >
                {n}
              </button>
            );
          })}
          <button
            className={styles.pagerBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            aria-label="다음 페이지"
          >
            &gt;
          </button>
          <button
            className={styles.pagerBtn}
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            aria-label="마지막 페이지"
          >
            &raquo;
          </button>
        </nav>
      </div>
    </section>
  );
}

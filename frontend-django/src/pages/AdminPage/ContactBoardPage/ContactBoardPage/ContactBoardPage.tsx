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

/** API 파라미터 타입 안전 추론 */
type RawParams = Parameters<typeof listInquiries>[0];
type ListParams = NonNullable<RawParams>;
type ApiStatus = ListParams extends { status?: infer S } ? NonNullable<S> : never;

/** 이메일 판별(제목/작성자 검색에는 제외) */
const EMAIL_FULL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const EMAIL_HINT = /@|\.com$|\.net$|\.org$|\.io$|\.co$|\.kr$/i;
const isEmailish = (t: string) => EMAIL_FULL.test(t) || EMAIL_HINT.test(t);

/** 상태 키워드 파싱 + 이메일 토큰 제거 */
type UiStatus = "processing" | "done" | "all";
function parseSearchInput(raw: string): { keyword: string; uiStatus: UiStatus } {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  let uiStatus: UiStatus = "all";
  const rest: string[] = [];

  for (const tok of tokens) {
    const low = tok.toLowerCase();

    if (/(처리중|진행중|processing|inprogress|pending)/.test(low)) {
      uiStatus = "processing";
      continue;
    }
    if (/(처리완료|완료|done|complete|processed|completed)/.test(low)) {
      uiStatus = "done";
      continue;
    }

    // 이메일처럼 보이면 검색 키워드에서 제외(제목/작성자만 검색)
    if (isEmailish(tok)) continue;

    rest.push(tok);
  }

  return { keyword: rest.join(" "), uiStatus };
}

/** 백엔드 status 명세 차이를 흡수하기 위한 후보군 */
function statusCandidates(ui: UiStatus): readonly ApiStatus[] | undefined {
  if (ui === "all") return undefined;
  const cands =
    ui === "processing"
      ? ["processing", "unprocessed", "PENDING", "IN_PROGRESS", "pending"]
      : ["done", "processed", "COMPLETED", "DONE", "complete"];
  return cands.map((v) => v as unknown as ApiStatus);
}

/** listInquiries를 후보 status로 재시도 */
async function fetchWithStatusFallback(
  base: Omit<ListParams, "status">,
  ui: UiStatus
): Promise<InquiryListResponse> {
  const cands = statusCandidates(ui);

  if (cands && cands.length) {
    for (const s of cands) {
      try {
        const res = await listInquiries({ ...(base as ListParams), status: s });
        return res;
      } catch {
        /* 다음 후보 시도 */
      }
    }
  }
  // 후보 전부 실패 -> status 없이(전체) 시도
  return listInquiries(base as ListParams);
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
    setAppliedKeyword(keyword);   // 이메일 토큰 제거된 키워드만 서버로 보냄
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

        const base: Omit<ListParams, "status"> = {
          page,
          size: PAGE_SIZE,
          q: appliedKeyword || (undefined as unknown as ListParams["q"]),
          order: "recent" as ListParams["order"],
        } as Omit<ListParams, "status">;

        const data = await fetchWithStatusFallback(base, appliedUiStatus);

        // 서버가 이메일로 매칭한 항목이 섞여 있을 수 있으므로
        // 화면에는 "제목/작성자"에만 키워드가 포함된 항목만 노출
        let nextItems: InquiryListItem[] = data.items;
        const kw = appliedKeyword.trim().toLowerCase();
        if (kw) {
          const tokens = kw.split(/\s+/).filter(Boolean);
          nextItems = data.items.filter((it) => {
            const subject = (it.subject ?? "").toLowerCase();
            const author = (it.name ?? "").toLowerCase();
            return tokens.some((tk) => subject.includes(tk) || author.includes(tk));
          });
        }

        if (!alive) return;
        setItems(nextItems);
        setTotal(data.total);
        setTotalPages(Math.max(1, data.total_pages));
      } catch {
        if (!alive) return;
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
                            statusPending ? styles.statusPending : styles.statusDone
                          }
                        >
                          {statusPending ? "처리중" : "처리완료"}
                        </span>
                      </td>
                    </tr>
                  );
                })}

              {!loading && items.length === 0 && (
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
                className={`${styles.pagerNum} ${n === page ? styles.current : ""}`}
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

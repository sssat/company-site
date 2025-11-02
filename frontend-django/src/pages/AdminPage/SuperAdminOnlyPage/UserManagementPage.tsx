// src/pages/AdminPage/UserManagementPage/UserManagementPage.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import styles from "./UserManagementPage.module.css";
import { useAuth } from "../../../hooks/useAuth";
import {
  getUsersList,
  promoteToAdmin as apiPromoteToAdmin,
  demoteFromAdmin as apiDemoteFromAdmin,
  type UsersListItem,
  type UsersListResponse,
  type Role,
} from "../../../api/accountsApi";

type Row = {
  userSeq: number;
  name: string;
  username: string;
  role: Role; // "USER" | "ADMIN" | "SUPER_ADMIN"
};

const PAGE_SIZE = 10;

function toRole(grade_code: number): Role {
  if (grade_code === 2) return "SUPER_ADMIN";
  if (grade_code === 1) return "ADMIN";
  return "USER";
}

function RoleBadge({ role }: { role: Role }) {
  if (role === "SUPER_ADMIN")
    return <span className={`${styles.badge} ${styles.super}`}>Super Admin</span>;
  if (role === "ADMIN")
    return <span className={`${styles.badge} ${styles.admin}`}>Admin</span>;
  return <span className={`${styles.badge} ${styles.user}`}>User</span>;
}

export default function UserManagementPage() {
  const { auth } = useAuth();
  const isSuperAdmin = auth.role === "SUPER_ADMIN";

  // 서버 페이지네이션 상태
  const [page, setPage] = useState(1);
  const [server, setServer] = useState<{
    items: Row[];
    page: number;
    size: number;
    total_count: number;
    total_pages: number;
  }>({ items: [], page: 1, size: PAGE_SIZE, total_count: 0, total_pages: 1 });

  // 검색: 입력값(qInput)과 적용값(query) 분리
  const [qInput, setQInput] = useState("");
  const [query, setQuery] = useState("");

  // UI 상태
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // 서버에서 한 페이지 조회
  const fetchPage = useCallback(
    async (p: number, qStr: string) => {
      setLoading(true);
      setErrMsg(null);
      try {
        const res: UsersListResponse = await getUsersList(p, PAGE_SIZE, qStr);

        const rows: Row[] = res.items.map((u: UsersListItem) => ({
          userSeq: u.user_seq,
          name: u.user_name,
          username: u.user_id,
          role: toRole(u.grade_code),
        }));

        setServer({
          items: rows,
          page: res.page,
          size: res.size,
          total_count: res.total_count,
          total_pages: res.total_pages,
        });
      } catch (e) {
        setErrMsg(
          e instanceof Error ? e.message : "회원 목록을 불러오지 못했습니다."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 초기 로딩 + 페이지/쿼리 변경 시 재조회
  useEffect(() => {
    void fetchPage(page, query);
  }, [page, query, fetchPage]);

  // 검색 실행(버튼 클릭/Enter)
  const doSearch = useCallback(() => {
    const next = qInput.trim();
    setPage(1);         // 항상 1페이지부터
    setQuery(next);     // query 변경 → useEffect로 fetch
  }, [qInput]);

  // 액션: 승격/강등 (현재 필터/페이지 유지해서 갱신)
  const promoteToAdmin = useCallback(
    async (userSeq: number) => {
      if (!isSuperAdmin) return;
      setLoading(true);
      try {
        await apiPromoteToAdmin(userSeq);
        await fetchPage(page, query);
      } catch (e) {
        setErrMsg(
          e instanceof Error ? e.message : "승격 처리에 실패했습니다."
        );
      } finally {
        setLoading(false);
      }
    },
    [isSuperAdmin, page, query, fetchPage]
  );

  const demoteToUser = useCallback(
    async (userSeq: number) => {
      if (!isSuperAdmin) return;
      setLoading(true);
      try {
        await apiDemoteFromAdmin(userSeq);
        await fetchPage(page, query);
      } catch (e) {
        setErrMsg(
          e instanceof Error ? e.message : "강등 처리에 실패했습니다."
        );
      } finally {
        setLoading(false);
      }
    },
    [isSuperAdmin, page, query, fetchPage]
  );

  // 페이지네이션 숫자 버튼 계산(서버 total_pages 사용)
  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const total = Math.max(1, server.total_pages);
    const current = Math.min(Math.max(1, page), total);
    const start = Math.max(1, Math.min(current - 2, total - (windowSize - 1)));
    const end = Math.min(total, start + (windowSize - 1));
    const nums: number[] = [];
    for (let n = start; n <= end; n++) nums.push(n);
    return { nums, total, current };
  }, [page, server.total_pages]);

  if (!isSuperAdmin) {
    return (
      <section className={styles.section}>
        <div className={styles.wrap}>
          <h1 className={styles.title}>회원 관리</h1>
          <p className={styles.muted}>접근 권한이 없습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <h1 className={styles.title}>회원 관리</h1>

        <div className={styles.toolbar}>
          <div className={styles.searchGroup}>
            <input
              className={`${styles.search} ${styles.searchInput}`}
              placeholder="이름 / 아이디 / 역할"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doSearch();
              }}
            />
            <button
              className={styles.searchBtn}
              onClick={doSearch}
              disabled={loading}
            >
              검색
            </button>
          </div>
          <div className={styles.resultInfo}>
            총 <b>{server.total_count}</b>명
          </div>
        </div>

        {errMsg && <div className={styles.errorBar}>{errMsg}</div>}
        {loading && <div className={styles.loadingBar}>불러오는 중…</div>}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>NO</th>
                <th>이름</th>
                <th>아이디</th>
                <th>역할</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {server.items.map((u, idx) => {
                // 번호: 최신이 큰 번호, 가장 아래(가장 오래된)가 1번
                const globalIndexFromTop = (server.page - 1) * server.size + idx; // 0부터
                const rowNo = server.total_count - globalIndexFromTop; // 맨 아래(가장 오래된) = 1
                return (
                  <tr key={u.userSeq}>
                    <td>{rowNo}</td>
                    <td>{u.name}</td>
                    <td>{u.username}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td className={styles.actions}>
                      {u.role === "SUPER_ADMIN" ? (
                        <span className={styles.muted}>수정 불가</span>
                      ) : u.role === "USER" ? (
                        <button
                          className={`${styles.btn} ${styles.promote}`}
                          onClick={() => promoteToAdmin(u.userSeq)}
                          disabled={loading}
                        >
                          승격(Admin)
                        </button>
                      ) : (
                        <button
                          className={`${styles.btn} ${styles.demote}`}
                          onClick={() => demoteToUser(u.userSeq)}
                          disabled={loading}
                        >
                          강등(User)
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {server.items.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 (서버 total_pages 기준) */}
        <nav className={styles.pager} aria-label="페이지 탐색">
          <button
            className={`${styles.pagerBtn} ${styles.square}`}
            onClick={() => setPage(1)}
            disabled={pageNumbers.current === 1 || loading}
            aria-label="첫 페이지"
          >
            &laquo;
          </button>
          <button
            className={`${styles.pagerBtn} ${styles.square}`}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageNumbers.current === 1 || loading}
            aria-label="이전 페이지"
          >
            &lsaquo;
          </button>

          {pageNumbers.nums.map((n) => (
            <button
              key={n}
              className={`${styles.pagerBtn} ${styles.num} ${n === pageNumbers.current ? styles.active : ""}`}
              onClick={() => setPage(n)}
              disabled={loading}
              aria-current={n === pageNumbers.current ? "page" : undefined}
            >
              {n}
            </button>
          ))}

          <button
            className={`${styles.pagerBtn} ${styles.square}`}
            onClick={() => setPage((p) => Math.min(pageNumbers.total, p + 1))}
            disabled={pageNumbers.current === pageNumbers.total || loading}
            aria-label="다음 페이지"
          >
            &rsaquo;
          </button>
          <button
            className={`${styles.pagerBtn} ${styles.square}`}
            onClick={() => setPage(pageNumbers.total)}
            disabled={pageNumbers.current === pageNumbers.total || loading}
            aria-label="마지막 페이지"
          >
            &raquo;
          </button>
        </nav>
      </div>
    </section>
  );
}

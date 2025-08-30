// src/pages/AdminPage/UserManagementPage/UserManagementPage.tsx
import { useEffect, useMemo, useState } from "react";
import styles from "./UserManagementPage.module.css";
import type { Role } from "../../contexts/AuthContext";

type User = {
  id: number;
  name: string;
  username: string;
  role: Role;
};

/** 데모용 초기 데이터 */
const baseSeed: User[] = [
  { id: 1, name: "홍길동",   username: "gildong",       role: "USER" },
  { id: 2, name: "김관리",   username: "admin_kim",     role: "ADMIN" },
  { id: 3, name: "최수퍼",   username: "super_admin1",  role: "SUPER_ADMIN" },
  { id: 4, name: "이유저",   username: "normal_user",   role: "USER" },
];

/** 보기 편하게 더미 유저를 많이 생성(페이징 테스트용) */
function makeManyUsers(): User[] {
  const arr: User[] = [...baseSeed];
  const names = ["박현우", "정민서", "오세진", "유소정", "한지민", "문지후", "배가은", "조예린"];
  let id = arr.length + 1;
  for (let i = 0; i < 42; i++) {
    const name = names[i % names.length];
    const uname = `user_${(i + 1).toString().padStart(3, "0")}`;
    arr.push({ id: id++, name, username: uname, role: "USER" });
  }
  return arr;
}

const PAGE_SIZE = 10;

export default function UserManagementPage() {
  // 데모: 로컬 상태에서 목록 관리(실서비스는 서버에서 조회/갱신)
  const [users, setUsers] = useState<User[]>(() => makeManyUsers());
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  /** 검색 결과 */
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(qq) ||
        u.username.toLowerCase().includes(qq) ||
        u.role.toLowerCase().includes(qq)
    );
  }, [q, users]);

  /** 검색어가 바뀌면 1페이지로 */
  useEffect(() => {
    setPage(1);
  }, [q]);

  /** 페이징 계산 */
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(1, page), pageCount);
  const startIdx = (clampedPage - 1) * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, endIdx);

  /** 숫자 버튼: 현재 페이지 기준 최대 5개 윈도우 */
  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, Math.min(clampedPage - 2, pageCount - (windowSize - 1)));
    const end = Math.min(pageCount, start + (windowSize - 1));
    const nums: number[] = [];
    for (let n = start; n <= end; n++) nums.push(n);
    return nums;
  }, [clampedPage, pageCount]);

  /** 액션 */
  const promoteToAdmin = (id: number) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: "ADMIN" } : u)));
  };
  const demoteToUser = (id: number) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: "USER" } : u)));
  };

  /** 페이지 이동 핸들러 */
  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(pageCount, p + 1));
  const goLast  = () => setPage(pageCount);

  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <h1 className={styles.title}>회원 관리</h1>

        <div className={styles.toolbar}>
          <input
            className={styles.search}
            placeholder="이름 / 아이디 / 역할 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className={styles.resultInfo}>
            총 <b>{filtered.length}</b>명
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>이름</th>
                <th>아이디</th>
                <th>역할</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.username}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td className={styles.actions}>
                    {u.role === "SUPER_ADMIN" ? (
                      <span className={styles.muted}>수정 불가</span>
                    ) : u.role === "USER" ? (
                      <button
                        className={`${styles.btn} ${styles.promote}`}
                        onClick={() => promoteToAdmin(u.id)}
                      >
                        승격(Admin)
                      </button>
                    ) : (
                      <button
                        className={`${styles.btn} ${styles.demote}`}
                        onClick={() => demoteToUser(u.id)}
                      >
                        강등(User)
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <nav className={styles.pager} aria-label="페이지 탐색">
          <button
            className={`${styles.pagerBtn} ${styles.square}`}
            onClick={goFirst}
            disabled={clampedPage === 1}
            aria-label="첫 페이지"
          >
            &laquo;
          </button>
          <button
            className={`${styles.pagerBtn} ${styles.square}`}
            onClick={goPrev}
            disabled={clampedPage === 1}
            aria-label="이전 페이지"
          >
            &lsaquo;
          </button>

          {pageNumbers.map((n) => (
            <button
              key={n}
              className={`${styles.pagerBtn} ${styles.num} ${n === clampedPage ? styles.active : ""}`}
              onClick={() => setPage(n)}
              aria-current={n === clampedPage ? "page" : undefined}
            >
              {n}
            </button>
          ))}

          <button
            className={`${styles.pagerBtn} ${styles.square}`}
            onClick={goNext}
            disabled={clampedPage === pageCount}
            aria-label="다음 페이지"
          >
            &rsaquo;
          </button>
          <button
            className={`${styles.pagerBtn} ${styles.square}`}
            onClick={goLast}
            disabled={clampedPage === pageCount}
            aria-label="마지막 페이지"
          >
            &raquo;
          </button>
        </nav>

        {/* 실제 서버 연동시
            - GET /admin/users?page=1&size=10&q=...
            - POST /admin/users/:id/promote  (body: { role: "ADMIN" })
            - POST /admin/users/:id/demote   (body: { role: "USER" })
            - SUPER_ADMIN 권한 체크는 서버에서 */ }
      </div>
    </section>
  );
}

function RoleBadge({ role }: { role: Role }) {
  if (role === "SUPER_ADMIN")
    return <span className={`${styles.badge} ${styles.super}`}>Super Admin</span>;
  if (role === "ADMIN")
    return <span className={`${styles.badge} ${styles.admin}`}>Admin</span>;
  return <span className={`${styles.badge} ${styles.user}`}>User</span>;
}

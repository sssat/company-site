// src/pages/ContactBoardPage/ContactBoardPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ContactBoardPage.module.css";
import { useAuth } from "../../../hooks/useAuth";
import { getTickets } from "./data";

const PAGE_SIZE = 10;

export default function ContactBoardPage() {
  const nav = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const isManager = isAuthenticated && (role === "ADMIN" || role === "SUPER_ADMIN");

  // (보호 라우트 — 컴포넌트 수준에서도 한번 더)
  useEffect(() => {
    if (!isManager) {
      alert("관리자만 접근할 수 있습니다.");
      nav("/contact", { replace: true });
    }
  }, [isManager, nav]);

  // 페이드업
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
    if (sectionRef.current) io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  // 검색 & 페이지네이션
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const TICKETS = getTickets();

  // 현재 화면에 표시될(필터링된) 데이터
  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return TICKETS;
    return TICKETS.filter((t) => {
      const statusKo = t.status === "pending" ? "처리중" : "처리완료";
      return (
        t.title.toLowerCase().includes(keyword) ||
        t.author.toLowerCase().includes(keyword) ||
        statusKo.includes(keyword)
      );
    });
  }, [q, TICKETS]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    if (page !== current) setPage(current);
  }, [current, page]);

  const goDetail = (id: number) => nav(`/contact/board/${id}`);

  return (
    <section
      className={`${styles.section} ${show ? styles.show : styles.hidden}`}
      ref={sectionRef}
      aria-label="문의하기 관리"
    >
      <div className={styles.wrap}>
        <h1 className={styles.title}>문의하기 관리</h1>

        {/* 상단 메타(총 개수 표시) — 필터 적용 결과 개수 */}
        <div className={styles.metaRow} aria-live="polite">
          <span className={styles.totalCount}>총 {filtered.length.toLocaleString()}개</span>
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
              {pageItems.map((t, idx) => {
                const no = filtered.length - (start + idx);
                return (
                  <tr key={t.id}>
                    <td className={styles.tdNo}>{no}</td>
                    <td className={styles.tdTitle}>
                      <button
                        className={styles.titleBtn}
                        onClick={() => goDetail(t.id)}
                        aria-label={`문의 상세 보기: ${t.title}`}
                      >
                        {t.title}
                      </button>
                    </td>
                    <td className={styles.tdAuthor}>{t.author}</td>
                    <td className={styles.tdDate}>{t.date}</td>
                    <td className={styles.tdStatus}>
                      <span
                        className={t.status === "pending" ? styles.statusPending : styles.statusDone}
                      >
                        {t.status === "pending" ? "처리중" : "처리완료"}
                      </span>
                    </td>
                  </tr>
                );
              })}
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

        {/* 검색 */}
        <div className={styles.searchRow}>
          <input
            className={styles.search}
            placeholder="검색 (제목/작성자/상태)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* 페이지네이션 */}
        <nav className={styles.pager} aria-label="페이지네이션">
          <button className={styles.pagerBtn} onClick={() => setPage(1)} disabled={current === 1}>
            &laquo;
          </button>
          <button
            className={styles.pagerBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={current === 1}
          >
            &lt;
          </button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            return (
              <button
                key={n}
                className={`${styles.pagerNum} ${n === current ? styles.current : ""}`}
                onClick={() => setPage(n)}
                aria-current={n === current ? "page" : undefined}
              >
                {n}
              </button>
            );
          })}
          <button
            className={styles.pagerBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={current === totalPages}
          >
            &gt;
          </button>
          <button
            className={styles.pagerBtn}
            onClick={() => setPage(totalPages)}
            disabled={current === totalPages}
          >
            &raquo;
          </button>
        </nav>
      </div>
    </section>
  );
}

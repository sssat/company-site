import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./ContactBoardDetailPage.module.css";
import { useAuth } from "../../../hooks/useAuth";
import { getTicketById, updateTicketStatus, deleteTicket } from "./data";
import type { TicketStatus } from "./data";

export default function ContactBoardDetailPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const ticketId = useMemo(() => Number(id), [id]);

  const { isAuthenticated, role } = useAuth();
  const isManager = isAuthenticated && (role === "ADMIN" || role === "SUPER_ADMIN");

  useEffect(() => {
    if (!isManager) {
      alert("관리자만 접근할 수 있습니다.");
      nav("/contact", { replace: true });
    }
  }, [isManager, nav]);

  const ticket = getTicketById(ticketId || 0);

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

  // 상태 표시용 로컬 상태(텍스트만 표시)
  const [status, setStatus] = useState<TicketStatus>(ticket?.status ?? "pending");
  useEffect(() => {
    setStatus(ticket?.status ?? "pending");
  }, [ticketId]);

  if (!ticket) {
    return (
      <section className={styles.section}>
        <div className={styles.wrap}>
          <h1 className={styles.title}>문의하기 관리</h1>
          <p className={styles.notfound}>존재하지 않거나 삭제된 글입니다.</p>
          <div className={styles.actions}>
            <button className={styles.btn} onClick={() => nav("/contact/board")}>목록으로</button>
          </div>
        </div>
      </section>
    );
  }

  // ✅ 처리완료로 변경해도 페이지 이동하지 않음(현재 화면 유지)
  const markDone = () => {
    if (status === "done") return;
    updateTicketStatus(ticket.id, "done");
    setStatus("done");
    alert("처리완료로 변경되었습니다.");
    // nav("/contact/board");  ← 제거!
  };

  const goList = () => nav("/contact/board");

  const onDelete = () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const ok = deleteTicket(ticket.id);
    if (ok) {
      alert("삭제되었습니다.");
      nav("/contact/board");
    } else {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${show ? styles.show : styles.hidden}`}
      aria-label="문의하기 관리(상세)"
    >
      <div className={styles.wrap}>
        <h1 className={styles.title}>문의하기 관리</h1>

        {/* 메타 영역 */}
        <div className={styles.meta}>
          <div className={styles.row}>
            <div className={styles.head}>제목</div>
            <div className={styles.body}>{ticket.title}</div>
          </div>
          <div className={styles.row}>
            <div className={styles.head}>작성자</div>
            <div className={styles.body}>{ticket.author}</div>
          </div>
          <div className={styles.row}>
            <div className={styles.head}>이메일</div>
            <div className={styles.body}>{ticket.email}</div>
          </div>
          <div className={styles.row}>
            <div className={styles.head}>날짜</div>
            <div className={styles.body}>{ticket.date}</div>
          </div>

          {/* 처리상태: 텍스트 색상 표시 */}
          <div className={styles.row}>
            <div className={styles.head}>처리상태</div>
            <div className={styles.body}>
              <span className={status === "pending" ? styles.statusPending : styles.statusDone}>
                {status === "pending" ? "처리중" : "처리완료"}
              </span>
            </div>
          </div>
        </div>

        {/* 본문(문의 내용) */}
        <div className={styles.messageBox} aria-label="문의 내용">
          {ticket.message}
        </div>

        {/* 액션 버튼: 처리완료 / 목록으로 / 삭제 */}
        <div className={styles.actions}>
          <button
            className={styles.btn}
            onClick={markDone}
            disabled={status === "done"}
            aria-disabled={status === "done" ? true : undefined}
          >
            처리완료
          </button> 
          <button className={styles.btn} onClick={goList}>
            목록으로
          </button>
          <button className={styles.btn} onClick={onDelete}>
            삭제
          </button>
        </div>
      </div>
    </section>
  );
}

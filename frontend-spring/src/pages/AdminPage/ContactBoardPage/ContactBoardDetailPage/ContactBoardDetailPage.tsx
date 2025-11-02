// src/pages/AdminPage/ContactBoardPage/ContactBoardDetailPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./ContactBoardDetailPage.module.css";
import {
  getInquiry,
  completeInquiry,
  deleteInquiry,
  type InquiryDetail,
} from "../../../../api/inquiriesApi";
import axios from "axios";

type TicketStatus = "pending" | "done";
type ApiErrorPayload = { message?: string; detail?: string };

function extractErrorMessage(e: unknown): string {
  if (axios.isAxiosError<ApiErrorPayload>(e)) {
    return e.response?.data?.message ?? e.response?.data?.detail ?? "처리 중 오류가 발생했습니다.";
  }
  if (e instanceof Error) return e.message || "처리 중 오류가 발생했습니다.";
  return "처리 중 오류가 발생했습니다.";
}

export default function ContactBoardDetailPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  // id → number 변환(잘못된 값 방어)
  const inquirySeq = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [id]);

  // 상세 데이터
  const [ticket, setTicket] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 페이드업
  const sectionRef = useRef<HTMLElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry], observer) => {
        if (entry.isIntersecting) {
          setShow(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    const el = sectionRef.current;
    if (el) io.observe(el);
    return () => io.disconnect();
  }, []);

  // 로드
  useEffect(() => {
    if (!inquirySeq) {
      setError("잘못된 요청입니다.");
      return;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getInquiry(inquirySeq);
        if (!alive) return;
        setTicket(data);
      } catch (e) {
        if (!alive) return;
        setError(extractErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [inquirySeq]);

  const status: TicketStatus = ticket?.is_processed ? "done" : "pending";

  // 처리완료로 변경(되돌림 불가)
  const markDone = async () => {
    if (!ticket || ticket.is_processed) return;
    try {
      const updated = await completeInquiry(ticket.inquiry_seq);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              is_processed: updated.is_processed,
              processed_at: updated.processed_at,
              processed_by: updated.processed_by,
            }
          : prev
      );
      alert("처리완료로 변경되었습니다.");
    } catch (e) {
      alert(extractErrorMessage(e));
    }
  };

  const goList = () => nav("/contact/board");

  const onDelete = async () => {
    if (!ticket) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteInquiry(ticket.inquiry_seq);
      alert("삭제되었습니다.");
      nav("/contact/board");
    } catch (e) {
      alert(extractErrorMessage(e));
    }
  };

  // 섹션은 항상 하나만 렌더 + ref 유지
  //    로딩/에러 시에도 보이게 .show를 강제로 포함
  const sectionClass =
    `${styles.section} ` +
    ((loading || error || !ticket || show) ? styles.show : "");

  return (
    <section
      ref={sectionRef}
      className={sectionClass}
      aria-label="문의하기 관리(상세)"
    >
      <div className={styles.wrap}>
        <h1 className={styles.title}>문의하기 관리</h1>

        {/* 상태별 UI */}
        {loading && (
          <>
            <p className={styles.notfound}>불러오는 중…</p>
            <div className={styles.actions}>
              <button className={styles.btn} onClick={goList}>
                목록으로
              </button>
            </div>
          </>
        )}

        {!loading && (error || !ticket) && (
          <>
            <p className={styles.notfound}>
              {error ?? "존재하지 않거나 삭제된 글입니다."}
            </p>
            <div className={styles.actions}>
              <button className={styles.btn} onClick={goList}>
                목록으로
              </button>
            </div>
          </>
        )}

        {!loading && !error && ticket && (
          <>
            {/* 메타 영역 */}
            <div className={styles.meta}>
              <div className={styles.row}>
                <div className={styles.head}>제목</div>
                <div className={styles.body}>{ticket.subject}</div>
              </div>
              <div className={styles.row}>
                <div className={styles.head}>작성자</div>
                <div className={styles.body}>{ticket.name}</div>
              </div>
              <div className={styles.row}>
                <div className={styles.head}>이메일</div>
                <div className={styles.body}>{ticket.email}</div>
              </div>
              <div className={styles.row}>
                <div className={styles.head}>날짜</div>
                <div className={styles.body}>{ticket.submitted_at?.slice(0, 10) ?? ""}</div>
              </div>

              {/* 처리상태: 텍스트 색상 표시 */}
              <div className={styles.row}>
                <div className={styles.head}>처리상태</div>
                <div className={styles.body}>
                  <span
                    className={
                      status === "pending" ? styles.statusPending : styles.statusDone
                    }
                  >
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
                disabled={ticket.is_processed}
                aria-disabled={ticket.is_processed ? true : undefined}
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
          </>
        )}
      </div>
    </section>
  );
}

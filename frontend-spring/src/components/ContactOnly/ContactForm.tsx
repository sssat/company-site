// frontend/src/components/ContactOnly/ContactForm.tsx
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import styles from "./ContactForm.module.css";
import { useAuth } from "../../hooks/useAuth";
import { createInquiry } from "../../api/inquiriesApi";
import axios from "axios";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type Props = {
  /** 관리자/슈퍼관리자에게만 보이는 '문의 게시판' 버튼 표시 여부 (지정 시 이 값이 우선) */
  showAdminLink?: boolean;
  /** '문의 게시판' 버튼 이동 경로 */
  adminLinkTo?: string;
};

type ApiErrorPayload = { message?: string; detail?: string };

const DEFAULT_ERROR = "전송 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";

function extractErrorMessage(e: unknown): string {
  if (axios.isAxiosError<ApiErrorPayload>(e)) {
    return e.response?.data?.message ?? e.response?.data?.detail ?? DEFAULT_ERROR;
  }
  if (e instanceof Error) return e.message || DEFAULT_ERROR;
  return DEFAULT_ERROR;
}

export default function ContactForm({
  showAdminLink,
  adminLinkTo = "/contact/board",
}: Props) {
  const { auth } = useAuth();
  const isManager =
    auth.isAuthed && (auth.role === "ADMIN" || auth.role === "SUPER_ADMIN");

  // 최종 노출 여부: prop가 명시되면 그 값, 아니면 자동 판단
  const showButton = showAdminLink ?? isManager;

  const [values, setValues] = useState<FormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // 페이드업
  const sectionRef = useRef<HTMLElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry], obs) => {
        if (entry.isIntersecting) {
          setShow(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    if (sectionRef.current) io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
    setErrors((err) => ({ ...err, [e.target.name]: undefined }));
    if (generalError) setGeneralError(null);
  };

  const NAME_MIN_LEN = 2;
  const NAME_MAX_LEN = 50;

  const validate = (v: FormState) => {
    const next: Partial<FormState> = {};
    const name = v.name.trim();
    const email = v.email.trim();
    const subject = v.subject.trim();
    const message = v.message.trim();

    // 이름 검증
    if (!name) {
      next.name = "이름을 입력해주세요.";
    } else if (name.length < NAME_MIN_LEN || name.length > NAME_MAX_LEN) {
      next.name = `이름은 ${NAME_MIN_LEN}자 이상 ${NAME_MAX_LEN}자 이하의 한글/영문과 공백만 사용할 수 있습니다.`;
    }

    // 이메일 검증
    if (!email) {
      next.email = "이메일을 입력해주세요."; // 공란일 때
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "이메일 형식을 확인해주세요."; // 값은 있는데 형식 불일치
    }

    // 제목 검증
    if (!subject) {
      next.subject = "제목을 입력해주세요.";
    } else if (subject.length > 50) {
      next.subject = "제목은 최대 50자까지 입력해주세요.";
    }

    // 메시지 검증
    if (message.length < 50) next.message = "메시지는 50자 이상 입력해주세요.";

    return next;
  };


  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      setSubmitting(true);
      setGeneralError(null);

      // 실제 서버 전송 (백엔드: subject -> title 로 매핑됨)
      const payload = {
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
      };
      await createInquiry(payload);

      setDone(true);
      setValues({ name: "", email: "", subject: "", message: "" });
    } catch (err: unknown) {
      setGeneralError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      ref={sectionRef}
      className={`${styles.section} ${show ? styles.show : styles.hidden}`}
    >
      <div className={styles.wrap}>
        <div className={styles.stack}>
          <h1 className={styles.title}>문의하기</h1>

          {/* 관리자/슈퍼관리자 전용 버튼(자동/수동 모두 지원) */}
          {showButton && (
            <div className={styles.adminBar}>
              <Link to={adminLinkTo} className={styles.adminLink}>
                문의 게시판
              </Link>
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>우리 영업팀에 문의하세요</h2>

            <form className={styles.form} onSubmit={onSubmit} noValidate>
              <label className={styles.label} htmlFor="name">성명</label>
              <input
                id="name"
                name="name"
                type="text"
                className={`${styles.input} ${errors.name ? styles.invalid : ""}`}
                placeholder="이름을 입력해주세요"
                value={values.name}
                onChange={onChange}
                autoComplete="name"
              />
              {errors.name && <p className={styles.error}>{errors.name}</p>}

              <label className={styles.label} htmlFor="email">이메일</label>
              <input
                id="email"
                name="email"
                type="email"
                className={`${styles.input} ${errors.email ? styles.invalid : ""}`}
                placeholder="이메일을 입력해주세요"
                value={values.email}
                onChange={onChange}
                autoComplete="email"
              />
              {errors.email && <p className={styles.error}>{errors.email}</p>}

              <label className={styles.label} htmlFor="subject">제목</label>
              <input
                id="subject"
                name="subject"
                type="text"
                className={`${styles.input} ${errors.subject ? styles.invalid : ""}`}
                placeholder="제목을 입력해주세요"
                value={values.subject}
                onChange={onChange}
              />
              {errors.subject && <p className={styles.error}>{errors.subject}</p>}

              <label className={styles.label} htmlFor="message">메시지</label>
              <textarea
                id="message"
                name="message"
                rows={6}
                className={`${styles.textarea} ${errors.message ? styles.invalid : ""}`}
                placeholder="메시지를 입력해주세요 (50자 이상)"
                value={values.message}
                onChange={onChange}
              />
              {errors.message && <p className={styles.error}>{errors.message}</p>}

              {/* 서버에서 온 에러 메시지 */}
              {generalError && <p className={styles.error}>{generalError}</p>}

              <button className={styles.button} type="submit" disabled={submitting}>
                {submitting ? "전송 중..." : "제출하기"}
              </button>

              {done && (
                <p className={styles.success}>
                  접수되었습니다. 빠르게 연락드리겠습니다!
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

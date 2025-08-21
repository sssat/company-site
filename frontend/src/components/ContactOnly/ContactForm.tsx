import { useEffect, useRef, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import styles from "./ContactForm.module.css";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export default function ContactForm() {
  const [values, setValues] = useState<FormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // 페이드업
  const sectionRef = useRef<HTMLElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e], o) => {
      if (e.isIntersecting) { setShow(true); o.disconnect(); }
    }, { threshold: 0.08 });
    if (sectionRef.current) io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues(v => ({ ...v, [e.target.name]: e.target.value }));
    setErrors(err => ({ ...err, [e.target.name]: undefined }));
  };

  const validate = (v: FormState) => {
    const next: Partial<FormState> = {};
    if (!v.name.trim()) next.name = "성명을 입력해주세요.";
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email);
    if (!emailOk) next.email = "이메일 형식을 확인해주세요.";
    if (!v.subject.trim()) next.subject = "제목을 입력해주세요.";
    if (v.message.trim().length < 50) next.message = "메시지는 50자 이상 입력해주세요.";
    return next;
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      setSubmitting(true);
      // 실제 연동 위치
      // await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      await new Promise(res => setTimeout(res, 600)); // demo
      setDone(true);
      setValues({ name: "", email: "", subject: "", message: "" });
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
      {/* 가운데 정렬 래퍼 + 전용 폭 변수 */}
      <div className={styles.wrap}>
        <div className={styles.stack}>
          <h1 className={styles.title}>문의하기</h1>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>우리 영업팀에 문의하세요</h2>

            <form className={styles.form} onSubmit={onSubmit} noValidate>
              <label className={styles.label} htmlFor="name">성명</label>
              <input
                id="name" name="name"
                className={`${styles.input} ${errors.name ? styles.invalid : ""}`}
                placeholder="이름을 입력해주세요"
                value={values.name} onChange={onChange} autoComplete="name"
              />
              {errors.name && <p className={styles.error}>{errors.name}</p>}

              <label className={styles.label} htmlFor="email">이메일</label>
              <input
                id="email" name="email" type="email"
                className={`${styles.input} ${errors.email ? styles.invalid : ""}`}
                placeholder="이메일을 입력해주세요"
                value={values.email} onChange={onChange} autoComplete="email"
              />
              {errors.email && <p className={styles.error}>{errors.email}</p>}

              <label className={styles.label} htmlFor="subject">제목</label>
              <input
                id="subject" name="subject"
                className={`${styles.input} ${errors.subject ? styles.invalid : ""}`}
                placeholder="제목을 입력해주세요"
                value={values.subject} onChange={onChange}
              />
              {errors.subject && <p className={styles.error}>{errors.subject}</p>}

              <label className={styles.label} htmlFor="message">메시지</label>
              <textarea
                id="message" name="message" rows={6}
                className={`${styles.textarea} ${errors.message ? styles.invalid : ""}`}
                placeholder="메시지를 입력해주세요"
                value={values.message} onChange={onChange}
              />
              {errors.message && <p className={styles.error}>{errors.message}</p>}

              <button className={styles.button} type="submit" disabled={submitting}>
                {submitting ? "전송 중..." : "제출하기"}
              </button>

              {done && <p className={styles.success}>접수되었습니다. 빠르게 연락드리겠습니다!</p>}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

// src/components/Auth/FindPassword/FindPWCard/FindPasswordCard.tsx
// 비밀번호 찾기(임시 비밀번호 발급 요청) - 이름/아이디/이메일 3칸 사용
// - 제출 시 onSubmit(payload: { user_id, name, email })로 서버 연동
// - 카드 폭은 CSS 변수(--card-width)로 제어

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./FindPasswordCard.module.css";

type Props = {
  /** 카드 폭(px 또는 CSS 크기). 기본 420 */
  cardWidth?: number | string;
  /** 제출 시 서버 호출(없으면 데모 alert) */
  onSubmit?: (payload: { user_id: string; name: string; email: string }) => Promise<void> | void;
  /** 링크 경로 커스터마이즈 */
  toSignup?: string;
  toLogin?: string;
};

export default function FindPasswordCard({
  cardWidth = 420,
  onSubmit,
  toSignup = "/signup",
  toLogin = "/login",
}: Props) {
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ user_id?: string; name?: string; email?: string }>({});

  // CSS 변수 주입
  type Vars = React.CSSProperties & { ["--card-width"]?: string };
  const vars: Vars = useMemo(
    () => ({
      ["--card-width"]:
        typeof cardWidth === "number" ? `${cardWidth}px` : String(cardWidth),
    }),
    [cardWidth]
  );

  const validate = () => {
    const e: typeof errors = {};
    const tUserId = userId.trim();
    const tName = name.trim();
    const tEmail = email.trim();

    if (!tName) e.name = "이름을 입력해주세요.";
    if (!tUserId) e.user_id = "아이디를 입력해주세요.";
    if (!tEmail) {
      e.email = "이메일을 입력해주세요.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tEmail)) {
      e.email = "이메일 형식이 올바르지 않습니다.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        user_id: userId.trim(),
        name: name.trim(),
        email: email.trim(),
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        // 데모 동작(실서비스에선 서버 응답 메시지로 대체)
        await new Promise((r) => setTimeout(r, 600));
        alert(
          "요청이 접수되었습니다. 입력하신 이름/아이디/이메일과 일치하는 계정이 있다면 임시 비밀번호를 이메일로 보냈습니다."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.wrap} style={vars}>
        <div className={styles.card}>
          <h1 className={styles.title}>비밀번호 찾기</h1>

          <form className={styles.form} onSubmit={submit} noValidate>
            {/* 이름 */}
            <label className={styles.field}>
              <input
                className={styles.input}
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                inputMode="text"
              />
              {errors.name && <p className={styles.error}>{errors.name}</p>}
            </label>

            {/* 아이디 */}
            <label className={styles.field}>
              <input
                className={styles.input}
                placeholder="아이디"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                autoComplete="username"
                inputMode="text"
              />
              {errors.user_id && <p className={styles.error}>{errors.user_id}</p>}
            </label>

            {/* 이메일 */}
            <label className={styles.field}>
              <input
                className={styles.input}
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
              />
              {errors.email && <p className={styles.error}>{errors.email}</p>}
            </label>

            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? "처리 중…" : "확인"}
            </button>
          </form>
        </div>

        {/* 카드 바깥 하단 링크 바 */}
        <div className={styles.linksRow}>
          <Link to={toSignup} className={styles.link}>
            회원가입 하기
          </Link>
          <Link to={toLogin} className={styles.link}>
            로그인 하기
          </Link>
        </div>
      </div>
    </section>
  );
}

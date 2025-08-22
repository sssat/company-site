// 비밀번호 찾기(재설정 요청) 카드 컴포넌트
// - 라벨 없이 플레이스홀더만 표시
// - 제출 시 onSubmit으로 서버 연동 가능
// - 카드 폭은 CSS 변수로 제어(기본 420px)

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./FindPasswordCard.module.css";

type Props = {
  /** 카드 폭(px 또는 CSS 크기). 기본 420 */
  cardWidth?: number | string;
  /** 제출 시 서버 호출(없으면 데모 alert) */
  onSubmit?: (payload: { username: string; name: string; email: string }) => Promise<void> | void;
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
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; name?: string; email?: string }>({});

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
    if (!username.trim()) e.username = "아이디를 입력해주세요.";
    if (!name.trim()) e.name = "이름을 입력해주세요.";
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) e.email = "이메일 형식이 올바르지 않습니다.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({ username: username.trim(), name: name.trim(), email: email.trim() });
      } else {
        // 데모 동작(실서비스에선 서버 응답 메시지로 대체)
        await new Promise((r) => setTimeout(r, 600));
        alert("요청이 접수되었습니다. 등록된 계정이 있다면 재설정 링크를 메일로 보냈습니다.");
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
            <label className={styles.field}>
              <input
                className={styles.input}
                placeholder="아이디"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
              {errors.username && <p className={styles.error}>{errors.username}</p>}
            </label>

            <label className={styles.field}>
              <input
                className={styles.input}
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              {errors.name && <p className={styles.error}>{errors.name}</p>}
            </label>

            <label className={styles.field}>
              <input
                className={styles.input}
                placeholder="이메일"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
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

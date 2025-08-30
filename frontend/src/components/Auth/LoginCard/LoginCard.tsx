// src/components/Auth/LoginCard/LoginCard.tsx
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LoginCard.module.css";
import logo from "../../../assets/company_logo/company_logo.svg";

type LoginCardProps = {
  /** 외부에서 로그인 처리 로직을 주입하고 싶을 때 사용 (선택) */
  onSubmit?: (username: string, password: string) => Promise<void> | void;
  /** 카드 폭을 바꾸고 싶을 때 사용. 예: 320 | "360px" | "28rem" (선택) */
  cardWidth?: number | string;
};

type StyleWithCardVar = CSSProperties & {
  ["--card-width"]?: string;
};

export default function LoginCard({ onSubmit, cardWidth }: LoginCardProps) {
  // 입력값 상태
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // 로딩/에러 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 폼 제출 */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      if (onSubmit) {
        // 외부 주입 로그인 로직 사용
        await onSubmit(username.trim(), password);
      } else {
        // 데모 기본 동작(외부 onSubmit이 없을 때만)
        await new Promise((r) => setTimeout(r, 600));
        alert(`로그인(샘플)\n아이디: ${username}\n비밀번호: ${"*".repeat(password.length)}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "로그인에 실패했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const cssVarStyle: StyleWithCardVar | undefined =
    cardWidth != null
      ? { ["--card-width"]: typeof cardWidth === "number" ? `${cardWidth}px` : cardWidth }
      : undefined;

  return (
    <section className={styles.section} aria-label="로그인">
      <div className={styles.wrap} style={cssVarStyle}>
        {/* ===== 카드 ===== */}
        <div className={styles.card}>
          <img src={logo} alt="MARKET STAGE" className={styles.logo} />

          <form className={styles.form} onSubmit={handleSubmit}>
            <label htmlFor="login-username" className={styles.srOnly}>아이디</label>
            <input
              id="login-username"
              className={styles.input}
              placeholder="아이디 (예: admin01 / user77)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={loading}
            />

            <label htmlFor="login-password" className={styles.srOnly}>비밀번호</label>
            <input
              id="login-password"
              type="password"
              className={styles.input}
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />

            {error && <div role="alert" className={styles.error}>{error}</div>}

            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? "로그인 중…" : "로그인"}
            </button>
          </form>
        </div>

        {/* ===== 카드 바깥 링크바 ===== */}
        <nav className={styles.linksBar} aria-label="로그인 관련 링크">
          <a className={styles.link} href="/signup">회원가입 하기</a>
          <div className={styles.rightLinks}>
            <a className={styles.link} href="/find-id">아이디 찾기</a>
            <span className={styles.sep} aria-hidden></span>
            <a className={styles.link} href="/find-password">비밀번호 찾기</a>
          </div>
        </nav>
      </div>
    </section>
  );
}

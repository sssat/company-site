// src/components/FindPasswordResultSuccess.tsx
import { useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./FindPasswordResultSuccess.module.css";

type Props = {
  /** 카드 폭(px 또는 CSS 단위). 기본 420 */
  cardWidth?: number | string;
  /** 버튼 라우트 커스터마이즈 */
  toLogin?: string;
  toChangePassword?: string;
  /** 제목/안내 문구 커스터마이즈(선택) */
  title?: string;
  notice?: string;
};

export default function FindPasswordResultSuccess({
  cardWidth = 420,
  toLogin = "/login",
  toChangePassword = "/change-password",
  title = "회원님의 임시 비밀번호를\n이메일로 발송했습니다",
  notice = "*안전을 위해 비밀번호를 변경해 주세요.",
}: Props) {
  // CSS 변수 주입
  type Vars = React.CSSProperties & { ["--card-width"]?: string };
  const vars: Vars = useMemo(
    () => ({
      ["--card-width"]:
        typeof cardWidth === "number" ? `${cardWidth}px` : String(cardWidth),
    }),
    [cardWidth]
  );

  return (
    <section className={styles.section}>
      <div className={styles.wrap} style={vars}>
        <div className={styles.card}>
          {/* 제목 */}
          <h1 className={styles.title} aria-live="polite">
            {title.split("\n").map((line, i) => (
              <span key={i} className={styles.line}>
                {line}
                {i === 0 && <br />}
              </span>
            ))}
          </h1>

          {/* 안내 문구(작은 빨간색) */}
          <p className={styles.notice}>{notice}</p>

          {/* 액션 버튼: 로그인(회색), 비밀번호 변경(파랑) */}
          <div className={styles.actions}>
            <Link to={toLogin} className={`${styles.btn} ${styles.secondary}`}>
              로그인
            </Link>
            <Link
              to={toChangePassword}
              className={`${styles.btn} ${styles.primary}`}
            >
              비밀번호 변경
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

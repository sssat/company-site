// src/components/FindPasswordResultSuccess.tsx
import { useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./FindPasswordResultSuccess.module.css";

type Props = {
  /** 카드 폭(px 또는 CSS 단위). 기본 420 */
  cardWidth?: number | string;
  /** 표시할 비밀번호(예: 임시 비밀번호) */
  password: string;
  /** 버튼 라우트 커스터마이즈 */
  toLogin?: string;
  toChangePassword?: string;
};

export default function FindPasswordResultSuccess({
  cardWidth = 420,
  password,
  toLogin = "/login",
  toChangePassword = "/change-password",
}: Props) {
  // CSS 변수 주입(다른 카드들과 동일 패턴)
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
          {/* 스샷 문구에 맞춰 제목 표기 */}
          <h1 className={styles.title}>회원님의 비밀번호 입니다</h1>

          {/* 결과: 좌측 정렬 */}
          <div className={styles.passwordBox} aria-live="polite">
            <span className={styles.passwordText}>{password}</span>
          </div>

          {/* 안내 문구(작은 빨간색) */}
          <p className={styles.notice}>*안전을 위해 비밀번호를 변경해 주세요.</p>

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

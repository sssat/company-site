import { useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./FindIdResultSuccess.module.css";

type Props = {
  /** 카드 폭(px 또는 CSS 단위). 기본 420 */
  cardWidth?: number | string;
  /** 표시할 사용자 아이디(이메일/아이디 문자열) */
  userId: string;
  /** 버튼 라우트 커스터마이즈 */
  toLogin?: string;
  toFindPassword?: string;
};

export default function FindIdResultSuccess({
  cardWidth = 420,
  userId,
  toLogin = "/login",
  toFindPassword = "/find-password",
}: Props) {
  // CSS 변수 주입(FindIdCard와 동일 패턴)
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
          <h1 className={styles.title}>회원님의 아이디를 확인해 주세요</h1>

          {/* 결과 영역: 좌측 정렬 */}
          <div className={styles.resultBox} aria-live="polite">
            <span className={styles.resultId}>{userId}</span>
          </div>

          {/* 액션 버튼: 로그인(회색), 비밀번호 찾기(파랑) */}
          <div className={styles.actions}>
            <Link to={toLogin} className={`${styles.btn} ${styles.secondary}`}>
              로그인
            </Link>
            <Link
              to={toFindPassword}
              className={`${styles.btn} ${styles.primary}`}
            >
              비밀번호 찾기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

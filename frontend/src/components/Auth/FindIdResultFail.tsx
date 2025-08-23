import { useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./FindIdResultFail.module.css";

type Props = {
  /** 카드 폭(px 또는 CSS 단위). 기본 420 */
  cardWidth?: number | string;
  /** 실패 메시지(기본: "조회결과가 없습니다.") */
  message?: string;
  /** 버튼 라우트 커스터마이즈 */
  toFindId?: string;
  toSignup?: string;
};

export default function FindIdResultFail({
  cardWidth = 420,
  message = "조회결과가 없습니다.",
  toFindId = "/find-id",
  toSignup = "/signup",
}: Props) {
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

          {/* 실패 메시지: 좌측 정렬 */}
          <p className={styles.message} aria-live="polite">
            {message}
          </p>

          {/* 액션: 아이디 찾기(회색), 회원가입(파랑) */}
          <div className={styles.actions}>
            <Link to={toFindId} className={`${styles.btn} ${styles.secondary}`}>
              아이디 찾기
            </Link>
            <Link to={toSignup} className={`${styles.btn} ${styles.primary}`}>
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
    
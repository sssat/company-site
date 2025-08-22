import { useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./FindIdResultCard.module.css";

type Status = "success" | "empty";

type Props = {
  status: Status;
  username?: string;

  toLogin?: string;
  toResetPw?: string;
  toSignup?: string;
  toFindId?: string;

  onBackToFind?: () => void;

  cardWidth?: number | string;
};

type CSSVar = `--${string}`;
type StyleWithVars = React.CSSProperties & Record<CSSVar, string>;
const toUnit = (v: number | string) => (typeof v === "number" ? `${v}px` : String(v));

export default function FindIdResultCard({
  status,
  username,
  toLogin = "/login",
  toResetPw = "/reset-password",
  toSignup = "/signup",
  toFindId = "/find-id",
  onBackToFind,
  cardWidth = 420,
}: Props) {
  const styleVars = useMemo<StyleWithVars>(
    () => ({ "--card-width": toUnit(cardWidth) }),
    [cardWidth]
  );

  return (
    <section className={styles.section}>
      <div className={styles.wrap} style={styleVars}>
        <div className={styles.card}>
          <h1 className={styles.title}>회원님의 아이디를 확인해 주세요</h1>

          {status === "success" ? (
            <>
              <p className={styles.username}>{username}</p>

              {/* 성공 화면: 좌/우 절반 정렬 */}
              <div className={styles.btnRowSplit}>
                <Link className={`${styles.btn} ${styles.btnGhost} ${styles.btnLogin}`} to={toLogin}>
                  로그인
                </Link>
                <Link className={`${styles.btn} ${styles.btnPrimary} ${styles.btnReset}`} to={toResetPw}>
                  비밀번호 찾기
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className={styles.desc}>조회결과가 없습니다.</p>

              {/* 빈 결과 화면도 동일하게 그리드 사용 */}
              <div className={styles.btnRowSplit}>
                {onBackToFind ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost} ${styles.btnFind}`}
                    onClick={onBackToFind}
                  >
                    아이디 찾기
                  </button>
                ) : (
                  <Link
                    className={`${styles.btn} ${styles.btnGhost} ${styles.btnFind}`}
                    to={toFindId}
                  >
                    아이디 찾기
                  </Link>
                )}

                <Link className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSignup}`} to={toSignup}>
                  회원가입
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

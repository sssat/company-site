import { useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./SignUpSuccessCard.module.css";
import logo from "../../assets/company_logo/company_logo.svg";

type Props = {
  name?: string;                 // 예: "홍길동"
  cardWidth?: number | string;   // 기본 420
  toLogin?: string;              // 기본 "/login"
  toHome?: string;               // 기본 "/"
};

/** CSS 변수까지 허용하는 style 타입 */
type CSSVar = `--${string}`;
type StyleWithVars = React.CSSProperties & Record<CSSVar, string>;

/** 숫자면 px를 붙여주는 유틸 */
const toUnit = (v: number | string) => (typeof v === "number" ? `${v}px` : String(v));

export default function SignUpSuccessCard({
  name,
  cardWidth = 420,
  toLogin = "/login",
  toHome = "/",
}: Props) {
  const displayName = (name && name.trim()) || "회원";

  // ✅ any 없이 안전하게 CSS 변수 주입
  const styleVars = useMemo<StyleWithVars>(
    () => ({ "--card-width": toUnit(cardWidth) }),
    [cardWidth]
  );

  return (
    <section className={styles.section}>
      <div className={styles.wrap} style={styleVars}>
        <div className={styles.card}>
          <img src={logo} alt="MARKET STAGE" className={styles.logo} />

          <p className={styles.title}>회원가입이 완료 되었습니다.</p>
          <p className={styles.sub}>{displayName}님의 회원가입을 축하합니다.</p>

          <hr className={styles.hr} />

          <div className={styles.btnRow}>
            <Link to={toLogin} className={`${styles.btn} ${styles.btnPrimary}`}>로그인</Link>
            <Link to={toHome}  className={`${styles.btn} ${styles.btnSecondary}`}>홈으로</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./ChangePasswordComplete.module.css";
import lockPng from "../../assets/lock/lock.png"; // PNG 임포트

type Props = {
  cardWidth?: number | string;
  toLogin?: string;
  title?: string;
  line1?: string;
  line2?: string;
};

export default function ChangePasswordComplete({
  cardWidth = 420,
  toLogin = "/login",
  title = "비밀번호 변경 완료",
  line1 = "비밀번호 변경이 완료되었습니다.",
  line2 = "새 비밀번호로 로그인해 주세요.",
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
          {/* PNG 이미지로 교체 (장식용이므로 alt="" 처리) */}
          <div className={styles.illus} aria-hidden="true">
            <img src={lockPng} alt="" className={styles.illusImg} />
          </div>

          <h1 className={styles.title}>{title}</h1>

          <p className={styles.desc}>
            {line1}
            <br />
            {line2}
          </p>

          <div className={styles.actions}>
            <Link to={toLogin} className={`${styles.btn} ${styles.primary}`}>
              로그인 화면으로
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

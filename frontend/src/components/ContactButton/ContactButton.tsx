import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./ContactButton.module.css";

type Props = {
  to?: string;        // 이동할 경로 (기본: "/contact")
  label?: string;     // 버튼 텍스트 (기본: "문의하기")
  topGap?: number;    // 버튼 위 여백(px, 기본: 206)
  center?: boolean;   // 가로 가운데 정렬 여부 (기본: true)
};

export default function ContactButton({
  to = "/contact",
  label = "문의하기",
  topGap = 206,
  center = true,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  // 뷰포트에 들어오면 페이드-업
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry], obs) => {
        if (entry.isIntersecting) {
          setShow(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`${styles.ctaWrap} ${show ? styles.show : ""}`}
      style={{
        marginTop: topGap,
        justifyContent: center ? "center" : "flex-start",
      }}
    >
      <Link className={styles.cta} to={to}>
        {label}
      </Link>
    </div>
  );
}

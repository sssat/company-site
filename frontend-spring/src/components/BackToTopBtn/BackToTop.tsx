import { useEffect, useState } from "react";
import styles from "./BackToTop.module.css";

type Props = {
  /** 항상 보이게 할지 여부 (기본값: true) */
  always?: boolean;
  /** always=false일 때, 이 픽셀 이상 스크롤되면 나타남 (기본값: 200) */
  showAt?: number;
};

export default function BackToTop({ always = true, showAt = 200 }: Props) {
  const [visible, setVisible] = useState(always);

  useEffect(() => {
    if (always) return;

    const onScroll = () => {
      setVisible(window.scrollY > showAt);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // 초기 체크
    return () => window.removeEventListener("scroll", onScroll);
  }, [always, showAt]);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      aria-label="맨 위로"
      className={`${styles.btn} ${visible ? styles.show : styles.hide}`}
      onClick={handleClick}
    >
      {/* 업-케럿 아이콘 */}
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* strokeWidth는 CSS에서도 올렸지만, 여기서도 조금 두껍게 */}
        <polyline
          points="18 15 12 9 6 15"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.6}
        />
      </svg>
    </button>
  );
}

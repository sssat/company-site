import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./ContactButton.module.css";

type Props = {
  to?: string;        // 기본 "/contact"
  label?: string;     // 기본 "문의하기"
  topGap?: number;    // 버튼 위 여백(px) 기본 206
  center?: boolean;   // 가로 가운데 정렬 기본 true
};

export default function ContactButton({
  to = "/contact",
  label = "문의하기",
  topGap = 206,
  center = true,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry], obs) => {
      if (entry.isIntersecting) {
        setShow(true);
        obs.disconnect();
      }
    }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    const contactPath = to.replace(/#.*$/, ""); // "/contact"

    // 이미 /contact에 있으면 스크롤만
    if (location.pathname === contactPath) {
      e.preventDefault();
      scrollToContact();
      return;
    }

    // 다른 페이지면 /contact#contact 로 이동 + state로 스크롤 의도 전달
    e.preventDefault();
    navigate(`${contactPath}#contact`, { state: { smoothTo: "contact" } });
  };

  return (
    <div
      ref={wrapRef}
      className={`${styles.ctaWrap} ${show ? styles.show : ""}`}
      style={{ marginTop: topGap, justifyContent: center ? "center" : "flex-start" }}
    >
      {/* a11y + 직접 제어를 위해 onClick에서 navigate */}
      <Link className={styles.cta} to="/contact#contact" onClick={handleClick}>
        {label}
      </Link>
    </div>
  );
}

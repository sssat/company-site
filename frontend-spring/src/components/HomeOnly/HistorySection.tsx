import { useEffect, useRef, useState } from "react";
import styles from "./HistorySection.module.css";
import building from "../../assets/history/history.png";

const milestones = [
  { date: "25년 7월", desc: "50억 투자 유치" },
  { date: "26년 2월", desc: "웹 서비스 런칭" },
  { date: "26년 7월", desc: "iOS 런칭" },
  { date: "26년 12월", desc: "안드로이드 런칭" },
];

export default function HistorySection() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e], o) => {
        if (e.isIntersecting) {
          setShow(true);
          o.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`${styles.container} ${show ? styles.show : styles.hidden}`}
    >
      <h2 className={styles.title}>히스토리</h2>

      <div className={styles.grid}>
        <div className={styles.timeline}>
          {milestones.map((m, i) => (
            <div key={i} className={`${styles.item} ${styles[`delay${i}`]}`}>
              <span className={styles.dot} />
              <div className={styles.texts}>
                <p className={styles.date}>{m.date}</p>
                <p className={styles.desc}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.imageWrap}>
          <img src={building} alt="Company building" />
        </div>
      </div>
    </section>
  );
}

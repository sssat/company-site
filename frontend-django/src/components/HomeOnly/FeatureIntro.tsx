import { useEffect, useRef, useState } from "react";
import styles from "./FeatureIntro.module.css";
import StatRoulette from "./StatRoulette";   // 새로 만든 숫자 룰렛 컴포넌트

export default function FeatureIntro() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  /* 화면에 5%만 보이면 애니메이션 시작 → 관찰 종료 */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry], observer) => {
        if (entry.isIntersecting) {
          setShow(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`${styles.container} ${show ? styles.show : styles.hidden}`}
    >
      {/* 키워드 */}
      <div className={styles.headings}>
        <span>STRATEGY</span>
        <span>DESIGN</span>
        <span>DEVELOPMENT</span>
      </div>

      {/* 카피 문구 */}
      <p className={styles.subtitle}>
        세상에 없던 앱, 당신의 손끝에서 시작되다.<br />
        처음부터 끝까지, 마켓스테이지가 함께합니다.
      </p>
      <p className={styles.description}>
        아이디어의 시작부터 브랜딩, 디자인, 개발, 운영까지 모두 마켓스테이지의 손에서 완성됩니다.
      </p>

      {/* 통계 */}
      <div className={styles.stats}>
        {/* 앱 수 */}
        <div className={styles.statItem}>
          <h3>4개</h3>
          <p>자체 운영 앱 수</p>
        </div>

        {/* 누적 다운로드 수 */}
        <div className={styles.statItem}>
        <h3>
            <span className={styles.numberFixed}>
            <StatRoulette target={100} play={show} />
            </span>
            만+
        </h3>
        <p>누적 다운로드 수</p>
        </div>

        {/* 평점 */}
        <div className={styles.statItem}>
          <h3>4.8/5.0</h3>
          <p>앱 스토어 평균 평점</p>
        </div>
      </div>
    </section>
  );
}

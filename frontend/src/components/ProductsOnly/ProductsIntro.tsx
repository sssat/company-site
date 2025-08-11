import { useEffect, useRef, useState } from "react";
import styles from "./ProductsIntro.module.css";

export default function Products() {
  // 섹션 등장 애니메이션용
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 뷰포트에 들어오면 한 번만 show
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
    <main className={styles.page}>
      {/* 인트로 블록 */}
      <section
        ref={ref}
        className={`${styles.intro} ${show ? styles.show : styles.hidden}`}
      >
        <h1 className={styles.title}>
          마켓스테이지가 직접
          <br />
          기획하고 운영하는 대표 앱들을 소개합니다.
        </h1>

        <p className={styles.subtitle}>
          하나의 앱, 하나의 이야기. 우리는 단순히 만들지 않습니다.
          <br />
          기획부터 운영까지, 마켓스테이지의 손끝에서 시작됩니다.
        </p>
      </section>

      {/* ↓ 이 아래에 실제 제품 카드/리스트를 이어서 배치하면 됩니다 */}
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import styles from "./People.module.css";

import m1 from "../../assets/member/member1.jpg";
import m2 from "../../assets/member/member2.jpg";
import m3 from "../../assets/member/member3.jpg";
import m4 from "../../assets/member/member4.jpg";
import m5 from "../../assets/member/member5.jpg";
import m6 from "../../assets/member/member6.jpg";

type Member = {
  img: string;
  name: string;
  role: string;
  blurb: string;
  badge: string; // 배지 배경색
};

const members: Member[] = [
  { img: m1, name: "Alice Kim",  role: "Product Manager", blurb: "문제 정의부터 기능 출시까지", badge: "#0bef7dff" },
  { img: m2, name: "Daniel Park", role: "Product Manager", blurb: "문제 정의부터 기능 출시까지", badge: "#3fd4ff" },
  { img: m3, name: "Sophie Lee",  role: "Product Manager", blurb: "문제 정의부터 기능 출시까지", badge: "#f5f20a" },
  { img: m4, name: "Ethan Choi",  role: "Product Manager", blurb: "문제 정의부터 기능 출시까지", badge: "#a855f7" },
  { img: m5, name: "Jina Seo",    role: "Product Manager", blurb: "문제 정의부터 기능 출시까지", badge: "#db1097ff" },
  { img: m6, name: "Noah Han",    role: "Product Manager", blurb: "문제 정의부터 기능 출시까지", badge: "#f59e0b" },
];

export default function People() {
  // 인트로 애니메이션
  const introRef = useRef<HTMLDivElement>(null);
  const [introShow, setIntroShow] = useState(false);

  // 카드 애니메이션
  const itemsRef = useRef<(HTMLElement | null)[]>([]);
  const [visible, setVisible] = useState<boolean[]>(
    () => new Array(members.length).fill(false)
  );

  useEffect(() => {
    // 인트로
    const ioIntro = new IntersectionObserver(
      ([e], o) => {
        if (e.isIntersecting) {
          setIntroShow(true);
          o.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    if (introRef.current) ioIntro.observe(introRef.current);

    // 카드들
    const ioCards = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const i = Number((entry.target as HTMLElement).dataset.index ?? -1);
          if (i >= 0) {
            setVisible((prev) => {
              if (prev[i]) return prev;
              const next = [...prev];
              next[i] = true;
              return next;
            });
            ioCards.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    itemsRef.current.forEach((el) => el && ioCards.observe(el));

    return () => {
      ioIntro.disconnect();
      ioCards.disconnect();
    };
  }, []);

  return (
    <main className={styles.page}>
      {/* 인트로 */}
      <section
        ref={introRef}
        className={`${styles.intro} ${introShow ? styles.show : styles.hidden}`}
      >
        <h1 className={styles.h1}>People</h1>
        <p className={styles.kicker}>
          성장을 위한 가장 확실한 방법은
          <br />
          뛰어난 동료들 사이에 있는 것입니다.
        </p>
      </section>

      {/* 팀 그리드 */}
      <section className={styles.grid}>
        {members.map((m, i) => (
          <article
            key={m.name}
            ref={(el) => { itemsRef.current[i] = el; }}
            data-index={i}
            className={`${styles.card} ${visible[i] ? styles.show : styles.hidden}`}
            style={{ transitionDelay: `${i * 90}ms` }} // 살짝 스태거
          >
            <div className={styles.thumb}>
              <img src={m.img} alt={`${m.name} 프로필 사진`} />
            </div>

            <p className={styles.blurb}>{m.blurb}</p>

            <div
              className={styles.badge}
              style={{ backgroundColor: m.badge }}
              aria-label={m.role}
              title={m.role}
            >
              {m.role}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

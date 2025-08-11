import { useEffect, useRef, useState } from "react";
import styles from "./Benefits.module.css";

/* ── 좌측 아이콘 이미지 ── */
import icLeisure from "../../assets/benefits/benefit1.png";
import icVacation from "../../assets/benefits/benefit2.png";
import icEducation from "../../assets/benefits/benefit3.png";
import icLife from "../../assets/benefits/benefit4.png";
import icMedical from "../../assets/benefits/benefit5.png";

/* 타입 */
type Benefit = {
  key: string;
  en: string;         // 영어 레이블
  ko: string;         // 한글 레이블
  bullets: string[];  // 우측 상세 항목
  icon: string;       // 좌측 아이콘 이미지
};

/* 데이터 */
const benefits: Benefit[] = [
  {
    key: "leisure",
    en: "Leisure",
    ko: "여가",
    bullets: ["문화·취미 활동 지원", "헬스·피트니스 이용권", "간식·커피 무제한"],
    icon: icLeisure,
  },
  {
    key: "vacation",
    en: "Vacation",
    ko: "휴가",
    bullets: ["연차 자유 사용", "생일·리프레시 휴가", "원격 근무 선택"],
    icon: icVacation,
  },
  {
    key: "education",
    en: "Education",
    ko: "교육",
    bullets: ["도서·강의·컨퍼런스 지원", "사내 스터디 운영", "자격증 취득 비용 지원"],
    icon: icEducation,
  },
  {
    key: "life",
    en: "Life",
    ko: "생활",
    bullets: ["중식·석식 지원", "최신 장비 지급", "야근 교통비·택시 지원"],
    icon: icLife,
  },
  {
    key: "medical",
    en: "Medical",
    ko: "의료",
    bullets: ["종합 건강검진 지원", "단체 상해·질병 보험", "본인·가족 의료비 지원"],
    icon: icMedical,
  },
];

export default function Benefits() {
  // 타이틀 페이드업
  const headRef = useRef<HTMLDivElement>(null);
  const [headShow, setHeadShow] = useState(false);

  // 항목 스태거 페이드업
  const itemsRef = useRef<(HTMLLIElement | null)[]>([]);
  const [visible, setVisible] = useState<boolean[]>(
    () => new Array(benefits.length).fill(false)
  );

  useEffect(() => {
    // 타이틀 관찰
    const ioHead = new IntersectionObserver(([e], o) => {
      if (e.isIntersecting) { setHeadShow(true); o.disconnect(); }
    }, { threshold: 0.1 });
    if (headRef.current) ioHead.observe(headRef.current);

    // 항목 관찰
    const ioItems = new IntersectionObserver((entries) => {
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
          ioItems.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    itemsRef.current.forEach((el) => el && ioItems.observe(el));

    return () => {
      ioHead.disconnect();
      ioItems.disconnect();
    };
  }, []);

  return (
    <section className={styles.section}>
      {/* 타이틀: People 섹션과 동일한 왼쪽 라인 */}
      <div
        ref={headRef}
        className={`${styles.head} ${headShow ? styles.show : styles.hidden}`}
      >
        <h1 className={styles.h1}>복리후생</h1>
      </div>

      {/* 리스트 */}
      <div className={styles.wrap}>
        <ul className={styles.list}>
          {benefits.map((b, i) => (
            <li
              key={b.key}
              ref={(el) => { itemsRef.current[i] = el; }}
              data-index={i}
              className={`${styles.item} ${visible[i] ? styles.show : styles.hidden}`}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              {/* 좌측: 아이콘 + (영어/한글) */}
              <div className={styles.iconCol}>
                <span className={styles.iconWrap}>
                  <img src={b.icon} alt={`${b.ko} 아이콘`} />
                </span>

                <div className={styles.labelCol}>
                  <span className={styles.engWord}>{b.en}</span>
                  <span className={styles.koLabel}>{b.ko}</span>
                </div>
              </div>

              {/* 우측: 불릿 */}
              <div className={styles.detailCol}>
                <ul className={styles.bullets}>
                  {b.bullets.map((t) => <li key={t}>• {t}</li>)}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import styles from "./Faq.module.css";

type FaqItem = { q: string; a: string };

const items: FaqItem[] = [
  {
    q: "회원가입은 꼭 해야 하나요?",
    a: "게스트로도 일부 기능을 이용할 수 있지만, 프로젝트 저장·문의 내역 확인 등 대부분의 기능은 회원가입 후 사용 가능합니다.",
  },
  {
    q: "서비스는 무료인가요?",
    a: "기본 기능은 무료로 제공되며, 고급 리포트/협업/보안 기능은 유료 플랜으로 제공됩니다. 팀 규모에 따라 월간·연간 결제가 가능합니다.",
  },
  {
    q: "문의 응답은 얼마나 걸리나요?",
    a: "평일 기준 평균 24시간 이내에 답변드리며, 급한 이슈는 1:1 채팅 또는 대표 메일로 연락 주시면 우선 지원합니다.",
  },
  {
    q: "개인정보는 안전하게 보호되나요?",
    a: "국내 리전 암호화 스토리지에 보관되며, 전송 구간은 TLS로 보호됩니다. 요청 시 데이터 파기·이전도 지원합니다.",
  },
  {
    q: "개인정보는 안전하게 보호되나요?",
    a: "국내 리전 암호화 스토리지에 보관되며, 전송 구간은 TLS로 보호됩니다. 요청 시 데이터 파기·이전도 지원합니다.",
  },
  {
    q: "개인정보는 안전하게 보호되나요?",
    a: "국내 리전 암호화 스토리지에 보관되며, 전송 구간은 TLS로 보호됩니다. 요청 시 데이터 파기·이전도 지원합니다.",
  },
  {
    q: "개인정보는 안전하게 보호되나요?",
    a: "국내 리전 암호화 스토리지에 보관되며, 전송 구간은 TLS로 보호됩니다. 요청 시 데이터 파기·이전도 지원합니다.",
  },
  {
    q: "개인정보는 안전하게 보호되나요?",
    a: "국내 리전 암호화 스토리지에 보관되며, 전송 구간은 TLS로 보호됩니다. 요청 시 데이터 파기·이전도 지원합니다.",
  }
];

export default function Faq() {
  // 기본을 '닫힘' 상태로: null
  const [open, setOpen] = useState<number | null>(null);

  // 답변 DOM refs
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 페이드업
  const sectionRef = useRef<HTMLElement>(null);
  const [show, setShow] = useState(false);
  const liRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [visible, setVisible] = useState<boolean[]>(items.map(() => false));

  // 컨텐츠/폭 변화 시 강제 리렌더(⇒ scrollHeight 다시 읽기)
  const [, force] = useState(0);
  useEffect(() => {
    const ioSection = new IntersectionObserver(([e], o) => {
      if (e.isIntersecting) { setShow(true); o.disconnect(); }
    }, { threshold: 0.08 });
    if (sectionRef.current) ioSection.observe(sectionRef.current);

    const ioItems = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const i = Number((en.target as HTMLElement).dataset.index ?? -1);
        if (i >= 0) {
          setVisible(v => { const n = [...v]; n[i] = true; return n; });
          ioItems.unobserve(en.target);
        }
      });
    }, { threshold: 0.1 });
    liRefs.current.forEach((el) => el && ioItems.observe(el));

    // ResizeObserver: 폭/폰트 변화 → 재계산
    const ro = new ResizeObserver(() => force(n => n + 1));
    bodyRefs.current.forEach(el => el && ro.observe(el));

    const onResize = () => force(n => n + 1);
    window.addEventListener("resize", onResize);

    return () => {
      ioSection.disconnect();
      ioItems.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${show ? styles.show : styles.hidden}`}
    >
      <div className={styles.wrap}>
        <div className={styles.stack}>
          <h1 className={styles.title}>FAQ</h1>

          <ul className={styles.list}>
            {items.map((it, i) => {
              const isOpen = open === i;
              const currentH = bodyRefs.current[i]?.scrollHeight ?? 0;

              return (
                <li
                  key={it.q}
                  ref={(el) => { liRefs.current[i] = el; }}
                  data-index={i}
                  className={`${styles.item} ${isOpen ? styles.active : ""} ${visible[i] ? styles.show : styles.hidden}`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <button
                    type="button"
                    className={styles.q}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    id={`faq-q-${i}`}
                    onClick={() => setOpen(curr => (curr === i ? null : i))}
                  >
                    <span className={styles.qBadge}>Q.</span>
                    <span className={styles.qText}>{it.q}</span>
                    <span className={styles.icon} aria-hidden>{isOpen ? "−" : "+"}</span>
                  </button>

                  <div
                    id={`faq-a-${i}`}
                    role="region"
                    aria-labelledby={`faq-q-${i}`}
                    className={styles.answer}
                    ref={(el) => { bodyRefs.current[i] = el; }}
                    // 열릴 때마다 실제 scrollHeight 사용 → 글자 절대 안 잘림
                    style={{ maxHeight: isOpen ? currentH : 0 }}
                  >
                    <p className={styles.aText}>
                      <span className={styles.aBadge}>A.</span> {it.a}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import styles from "./InnovationSection.module.css";

/* ─── 상단 로고(영상) + 워드마크 ─── */
import bigVideo  from "../../assets/innovation/BIDDERLIVE.mp4";
import bigPoster from "../../assets/innovation/bidderlive_logo.png";
import wordmark  from "../../assets/innovation/BIDDERLIVE.png";

/* ─── 기능 아이콘 4개 ─── */
import iconBid   from "../../assets/innovation/bid.png";
import iconLive  from "../../assets/innovation/live.png";
import iconDrop  from "../../assets/innovation/drop.png";
import iconChat  from "../../assets/innovation/chat.png";

/* ─── 각 기능에 대응하는 스크린샷 4장 ─── */
import shot1     from "../../assets/innovation/live1.png";
import shot2     from "../../assets/innovation/live2.png";
import shot3     from "../../assets/innovation/live3.png";
import shot4     from "../../assets/innovation/live4.png";

/* 기능 ↔︎ 스크린샷 매핑 */
const features = [
  { icon: iconBid,  title: "라이브를 통한 입찰",   desc: "실시간 영상을 보며 원하는 상품에 바로 입찰하고 낙찰받는 새로운 쇼핑 방식!", shot: shot1 },
  { icon: iconLive, title: "라이브를 통한 생생함", desc: "판매자가 직접 보여주는 생생한 라이브! 실물 확인하고 바로 입찰, 놓치면 눈앞에서 사라져요!", shot: shot2 },
  { icon: iconDrop, title: "라이브를 통한 공구",   desc: "라이브 소통하며 상품을 직접보고, 함께 모이면 더 저렴하게! 실시간 참여형 공동 구매의 재미!", shot: shot3 },
  { icon: iconChat, title: "회사와의 긴밀한 소통", desc: "회사와 판매자가 실시간으로 소통하며 피드백을 주고받고, 함께 성장하는 파트너십을 만들어갑니다.", shot: shot4 },
];

export default function InnovationSection() {
  /* ── 스크롤 등장 애니메이션 ── */
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry], obs) => {
        if (entry.isIntersecting) {
          setShow(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  /* ── 3초 간격 current 순환 ── */
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCurrent((p) => (p + 1) % features.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      ref={ref}
      className={`${styles.container} ${show ? styles.show : styles.hidden}`}
    >
      {/* 타이틀 */}
      <h2 className={styles.title}>Our Innovation</h2>

      {/* 로고(영상) + 설명 */}
      <div className={styles.headerRow}>
        <video
          className={styles.mainLogo}
          src={bigVideo}
          poster={bigPoster}
          autoPlay
          loop
          muted
          playsInline
          aria-label="BidderLive animated logo"
        />
        <div className={styles.headerText}>
          <img src={wordmark} alt="BIDDERLIVE" className={styles.wordmark} />
          <p className={styles.tagline}>
            지금 입찰하라, 늦기 전에!<br />
            살까 말까? <strong>Live</strong>로 보고 Bid!<br />
            입찰의 재미, 수집의 기쁨
          </p>
          <p className={styles.slogan}>Don’t Watch it. Win it.</p>
        </div>
      </div>

      {/* 기능 + 각 기능별 스크린샷 */}
      <ul className={styles.features}>
        {features.map((f, idx) => (
          <li key={idx}>
            <img src={f.icon} alt="" />
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
            <div className={styles.shotBox}>
              <img
                src={f.shot}
                className={idx === current ? styles.shown : styles.hiddenShot}
                alt=""
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

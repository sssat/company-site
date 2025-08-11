import { useEffect, useRef, useState } from "react";
import styles from "./ProductCards.module.css";

import bidderImg    from "../../assets/products/product1.png";
import netcolorsImg from "../../assets/products/product2.png";
import onlinedImg   from "../../assets/products/product3.png";
import greenImg     from "../../assets/products/product4.png";

import bidderLogo    from "../../assets/products_logo/product_logo1.png";
import netcolorsLogo from "../../assets/products_logo/product_logo2.png";
import onlinedLogo   from "../../assets/products_logo/product_logo3.png";
import greenLogo     from "../../assets/products_logo/product_logo4.png";

type Product = {
  img: string;
  logo: string;
  title: string;
  desc: React.ReactNode;
  slogan?: string;
  sloganColor?: string;
};

const products: Product[] = [
  {
    img: bidderImg,
    logo: bidderLogo,
    title: "BIDDERLIVE",
    desc: (
      <>
        <p><strong>지금 입찰하라, 늦기 전에!</strong></p>
        <p>살까 말까? <strong>Live</strong>로 보고 <strong>Bid</strong>!</p>
        <p>입찰의 재미, 수집의 기쁨</p>
      </>
    ),
    slogan: "Don’t Watch it. Win it.",
    sloganColor: "#3b82f6",
  },
  {
    img: netcolorsImg,
    logo: netcolorsLogo,
    title: "NETCOLORS",
    desc: (
      <>
        <p><strong>색으로 연결되는 세상, 당신의 감각을 깨우다.</strong></p>
        <p>감각적인 컬러와 인터랙션을 통해</p>
        <p>창의적인 아이디어를 실시간으로 공유하세요.</p>
      </>
    ),
    slogan: "Let Ideas Flow in Color.",
    sloganColor: "#a855f7",
  },
  {
    img: onlinedImg,
    logo: onlinedLogo,
    title: "ONLINED",
    desc: (
      <>
        <p><strong>디지털 연결의 새로운 기준</strong></p>
        <p>당신의 아이디어, 서비스, 업무가 하나로 이어집니다.</p>
        <p>스마트한 경험과 안정적인 연결성으로</p>
        <p><strong>지금, 당신의 일상을 Onlined 하세요.</strong></p>
      </>
    ),
    slogan: "Seamless. Smart. Onlined.",
    sloganColor: "#2563eb",
  },
  {
    img: greenImg,
    logo: greenLogo,
    title: "GREEN ELEVEN",
    desc: (
      <>
        <p><strong>초록이 만드는 열한 번째 가능성</strong></p>
        <p>지속 가능한 삶과 자연의 조화를 실현하는 브랜드.</p>
        <p>작은 실천이 만드는 큰 변화를 믿습니다.</p>
      </>
    ),
    slogan: "Grow with Green. Live with Purpose.",
    sloganColor: "#22c55e",
  },
];

export default function ProductCards() {
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [visible, setVisible] = useState<boolean[]>(
    () => new Array(products.length).fill(false)
  );

  useEffect(() => {
    const io = new IntersectionObserver(
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
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    itemsRef.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className={styles.wrap}>
      {products.map((p, i) => (
        <div
          key={p.title}
          ref={(el) => { itemsRef.current[i] = el; }}
          data-index={i}
          className={[
            styles.row,
            i % 2 === 1 ? styles.reverse : "",   // 좌/우 위치만 교차
            visible[i] ? styles.show : styles.hidden,
          ].join(" ")}
          style={{ transitionDelay: `${i * 120}ms` }}
        >
          <div className={styles.thumb}>
            <img src={p.img} alt={`${p.title} 이미지`} />
          </div>

          <div className={styles.copy}>
            <img className={styles.logo} src={p.logo} alt={`${p.title} 로고`} />
            <div className={styles.desc}>{p.desc}</div>
            {p.slogan && (
              <p className={styles.slogan} style={{ color: p.sloganColor }}>
                {p.slogan}
              </p>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

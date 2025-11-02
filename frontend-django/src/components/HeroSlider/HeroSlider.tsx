import styles from "./HeroSlider.module.css";

// { useEffect, useState, useRef }: React가 제공하는 3가지 훅(Hook) 을 중괄호 {} 를 사용해 개별적으로 가져옴
// Hook(훅): React 함수형 컴포넌트에서 상태(state) 와 라이프사이클 기능(effect) 등을 사용할 수 있게 해주는 특별한 함수
import { useEffect, useState, useRef } from "react";

// HeroSlider 이미지 경로
import slide1 from "../../assets/hero_slide/slide1.png";
import slide2 from "../../assets/hero_slide/slide2.jpg";
import slide3 from "../../assets/hero_slide/slide3.jpg";
import slide4 from "../../assets/hero_slide/slide4.jpg";

// HeroSlider 화살표 아이콘 이미지 경로
import arrowLeft from "../../assets/hero_slide/arrow-left.png";
import arrowRight from "../../assets/hero_slide/arrow-right.png";

const SLIDES = [slide1, slide2, slide3, slide4];
const INTERVAL_MS = 4000; // 4초마다 슬라이드 자동 전환

// 이건 React 컴포넌트 함수 HeroSlider 안에 다른 함수들이 정의되어 있는 구조이다.
export default function HeroSlider() {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 자동 슬라이드 
  useEffect(() => {
    startAutoPlay();
    return stopAutoPlay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const startAutoPlay = () => {
    stopAutoPlay(); // 기존 interval 제거
    timeoutRef.current = setTimeout(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, INTERVAL_MS);
  };

  const stopAutoPlay = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  // 수동 네비게이션 
  const goPrev = () => setIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  const goNext = () => setIndex((prev) => (prev + 1) % SLIDES.length);

  return (
    <section className={styles.slider} onMouseEnter={stopAutoPlay} onMouseLeave={startAutoPlay}>
      {/* 슬라이드 이미지들 */}
      {SLIDES.map((src, i) => (
        <img
          key={i}
          src={src}
          className={`${styles.slide} ${i === index ? styles.active : ""}`}
          alt={`hero-slide-${i + 1}`}
        />
      ))}

      {/* 좌우 화살표 */}
      <button
        className={`${styles.arrow} ${styles.left}`}
        onClick={goPrev}
        aria-label="이전 슬라이드"
        >
        <img src={arrowLeft} alt="" className={styles.icon} />
        </button>

        <button
        className={`${styles.arrow} ${styles.right}`}
        onClick={goNext}
        aria-label="다음 슬라이드"
        >
        <img src={arrowRight} alt="" className={styles.icon} />
      </button>

      {/* 도트 인디케이터 */}
      <div className={styles.dots}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === index ? styles.activeDot : ""}`}
            onClick={() => setIndex(i)}
            aria-label={`go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
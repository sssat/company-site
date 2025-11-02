import { useEffect, useRef, useState } from "react";

interface StatRouletteProps {
  target: number;       // 최종 값 (예: 100)
  duration?: number;    // 전체 재생 시간(ms)
  play: boolean;        // true가 되면 시작
  fps?: number;         // 선택: 렌더링 업데이트 최대 빈도(기본 30fps)
}

export default function StatRoulette({
  target,
  duration = 2500,
  play,
  fps = 100,
}: StatRouletteProps) {
  const [value, setValue] = useState(0);

  const rafId = useRef<number | null>(null);
  const lastUpdate = useRef(0);
  const valueRef = useRef(0); // 현재 값(ref로 보관해 stale 이슈 방지)

  useEffect(() => {
    if (!play) return;

    // 시작 시 초기화
    setValue(0);
    valueRef.current = 0;

    const frameInterval = 1000 / fps;
    const start = performance.now();

    // cubic ease-out: 초반 빠르고 마지막에 느려짐
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / duration); // 0~1

      // FPS 제한: 너무 자주 setState 하지 않기
      if (now - lastUpdate.current >= frameInterval) {
        const eased = easeOut(p);
        const next = Math.floor(target * eased);

        if (next !== valueRef.current) {
          valueRef.current = next;
          setValue(next);
        }
        lastUpdate.current = now;
      }

      if (p < 1) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        // 정확히 target에서 종료
        valueRef.current = target;
        setValue(target);
      }
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [play, target, duration, fps]);

  return <>{value}</>;
}

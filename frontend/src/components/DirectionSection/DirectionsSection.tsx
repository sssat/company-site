import { useEffect, useRef, useState } from "react";
import styles from "./DirectionsSection.module.css";

const ADDRESS = "서울시 강남구 역삼동 역삼로28길 34 5층 401호";
const PHONE = "02-555-4444";

/** 환경변수에서 카카오 JS 키 안전 추출 */
function getAppKeyFromEnv(): string | null {
  let raw = (import.meta.env.VITE_KAKAO_MAPS_KEY ?? "").toString().trim();
  if (!raw) return null;

  // 잘못된 접두/파라미터 보정
  raw = raw.replace(/^VITE_KAKAO_MAPS_KEY=/, "").replace(/^appkey=/i, "");
  if (raw.includes("&")) raw = raw.split("&")[0];

  const key = raw.trim();
  return key || null;
}

/** Kakao SDK 동적 로더 (중복 방지 + 타임아웃/에러 처리) */
function loadKakaoSdk(appkey: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.kakao?.maps) return resolve();

    const timer = window.setTimeout(
      () => reject(new Error("Kakao SDK load timeout")),
      6000
    );

    const existing = document.getElementById("kakao-maps-sdk") as
      | HTMLScriptElement
      | null;

    if (existing) {
      existing.addEventListener(
        "load",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
      existing.addEventListener(
        "error",
        () => {
          clearTimeout(timer);
          reject(new Error("Kakao SDK load failed"));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-maps-sdk";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false&libraries=services`;

    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Kakao SDK load failed"));
    };

    document.head.appendChild(script);
  });
}

export default function DirectionsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<kakao.maps.Map | null>(null);

  const [show, setShow] = useState(false);

  /** 섹션 페이드-업 */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e], o) => {
        if (e.isIntersecting) {
          setShow(true);
          o.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** 지도 로드 */
  useEffect(() => {
    const appkey = getAppKeyFromEnv();
    if (!appkey) return;

    let destroyed = false;

    (async () => {
      try {
        await loadKakaoSdk(appkey);

        window.kakao.maps.load(() => {
          if (destroyed) return;

          const container = mapRef.current!;
          const center = new window.kakao.maps.LatLng(37.498093, 127.02761);
          const map = new window.kakao.maps.Map(container, { center, level: 3 });
          mapInstance.current = map;

          // 페이드 애니메이션 후 타일 재계산
          setTimeout(() => map.relayout(), 60);

          // 주소 지오코딩
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.addressSearch(ADDRESS, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK && result[0]) {
              const coords = new window.kakao.maps.LatLng(
                +result[0].y,
                +result[0].x
              );
              map.setCenter(coords);
              new window.kakao.maps.Marker({ map, position: coords });
            } else {
              // 실패 시 기본 중심에 마커
              new window.kakao.maps.Marker({ map, position: center });
            }
          });
        });
      } catch {
        // 실패 시 조용히 무시
      }
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) mapRef.current.innerHTML = "";
    };
  }, []);

  /** show 전환 직후 한 번 더 relayout */
  useEffect(() => {
    if (show && mapInstance.current) {
      setTimeout(() => mapInstance.current?.relayout(), 0);
    }
  }, [show]);

  return (
    <section
      ref={sectionRef}
      className={`${styles.container} ${show ? styles.show : styles.hidden}`}
    >
      <h2 className={styles.title}>오시는 길</h2>

      <div className={styles.grid}>
        {/* 지도 */}
        <div className={styles.mapWrap}>
          <div ref={mapRef} className={styles.map} />
        </div>

        {/* 정보 */}
        <div className={styles.info}>
          <div className={styles.block}>
            <span className={styles.badge}>위치 주소</span>
            <p className={styles.addr}>{ADDRESS}</p>
          </div>
          <div className={styles.block}>
            <span className={styles.badge}>전화 번호</span>
            <p className={styles.tel}>{PHONE}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

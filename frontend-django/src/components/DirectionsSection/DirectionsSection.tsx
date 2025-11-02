import { useEffect, useRef, useState, useMemo } from "react";
import styles from "./DirectionsSection.module.css";

const COMPANY_NAME = "마켓스테이지";
const ADDRESS = "서울시 강남구 역삼동 역삼로28길 34 5층 401호";
const PHONE = "02-555-4444";

type Coords = { lat: number; lng: number } | null;

/** 환경변수에서 카카오 JS 키 안전 추출 */
function getAppKeyFromEnv(): string | null {
  let raw = (import.meta.env.VITE_KAKAO_MAPS_KEY ?? "").toString().trim();
  if (!raw) return null;
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

    const existing = document.getElementById("kakao-maps-sdk") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => { clearTimeout(timer); resolve(); }, { once: true });
      existing.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Kakao SDK load failed")); }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-maps-sdk";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false&libraries=services`;
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); reject(new Error("Kakao SDK load failed")); };
    document.head.appendChild(script);
  });
}

export default function DirectionsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<kakao.maps.Map | null>(null);
  const markerRef = useRef<kakao.maps.Marker | null>(null);
  const overlayRef = useRef<kakao.maps.CustomOverlay | null>(null); // 라벨

  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState<Coords>(null);
  const [initialCenter] = useState<{ lat: number; lng: number }>({ lat: 37.498093, lng: 127.02761 });
  const [initialLevel] = useState<number>(3);

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

  /** 지도 로드 + 마커/오버레이/컨트롤 */
  useEffect(() => {
    const appkey = getAppKeyFromEnv();
    if (!appkey) return;

    let destroyed = false;
    const container = mapRef.current; // cleanup용 캡처

    (async () => {
      try {
        await loadKakaoSdk(appkey);

        window.kakao?.maps.load(() => {
          if (destroyed || !mapRef.current || !window.kakao?.maps) return;

          const { maps } = window.kakao;
          const center = new maps.LatLng(initialCenter.lat, initialCenter.lng);
          const map = new maps.Map(mapRef.current, { center, level: initialLevel });
          mapInstance.current = map;

          // 확대/축소 컨트롤 (우측)
          const zoomControl = new maps.ZoomControl();
          map.addControl(zoomControl, maps.ControlPosition.RIGHT);

          // 페이드 애니 후 타일 재계산
          window.setTimeout(() => map.relayout(), 60);

          // 주소 지오코딩 → 좌표 확보
          const geocoder = new maps.services.Geocoder();
          geocoder.addressSearch(ADDRESS, (result, status) => {
            // 이전 오버레이 제거
            overlayRef.current?.setMap(null);
            overlayRef.current = null;

            const makeTag = (pos: kakao.maps.LatLng) => {
              // 마커
              const marker = new maps.Marker({ map, position: pos });
              markerRef.current = marker;

              // 회사명 태그(알약)
              const el = document.createElement("div");
              el.className = styles.markerTag;
              el.textContent = COMPANY_NAME;
              // 마커-라벨 간격(px)
              el.style.setProperty("--tag-gap", "20px");

              const overlay = new maps.CustomOverlay({
                map,
                position: pos,
                content: el,
                xAnchor: 0.5, // 중앙 정렬
                yAnchor: 1,   // 라벨의 '바닥'이 좌표에 닿도록(꼬리 없음)
                zIndex: 3,
              });
              overlayRef.current = overlay;
            };

            if (status === maps.services.Status.OK && result.length > 0) {
              const { x, y } = result[0]; // x=lng, y=lat
              const lat = Number(y);
              const lng = Number(x);
              setCoords({ lat, lng });

              const pos = new maps.LatLng(lat, lng);
              map.setCenter(pos);
              makeTag(pos);
            } else {
              // 실패 시 기본 중심에 생성
              makeTag(center);
            }
          });
        });
      } catch {
        // 실패 시 조용히 무시
      }
    })();

    return () => {
      destroyed = true;
      overlayRef.current?.setMap(null);
      overlayRef.current = null;
      markerRef.current = null;
      mapInstance.current = null;
      if (container) container.innerHTML = "";
    };
  }, [initialCenter.lat, initialCenter.lng, initialLevel]);

  /** show 전환 직후 한 번 더 relayout */
  useEffect(() => {
    if (show && mapInstance.current) {
      window.setTimeout(() => mapInstance.current?.relayout(), 0);
    }
  }, [show]);

  /** 새로고침(초기 상태로 복귀) */
  const onReset = () => {
    const map = mapInstance.current;
    if (!map) return;
    const { maps } = window.kakao;
    map.setLevel(initialLevel);
    map.setCenter(new maps.LatLng(initialCenter.lat, initialCenter.lng));
    window.setTimeout(() => map.relayout(), 0);
  };

  /** 하단 액션 링크 (좌표 없을 때는 검색으로 폴백) */
  const { roadviewUrl, directionsUrl, largeMapUrl } = useMemo(() => {
    if (coords) {
      const { lat, lng } = coords;
      return {
        roadviewUrl: `https://map.kakao.com/link/roadview/${lat},${lng}`,
        directionsUrl: `https://map.kakao.com/link/to/${encodeURIComponent(COMPANY_NAME)},${lat},${lng}`,
        largeMapUrl: `https://map.kakao.com/link/map/${encodeURIComponent(COMPANY_NAME)},${lat},${lng}`,
      };
    }
    const q = encodeURIComponent(ADDRESS);
    return {
      roadviewUrl: `https://map.kakao.com/link/search/${q}`,
      directionsUrl: `https://map.kakao.com/?eName=${encodeURIComponent(COMPANY_NAME)}`,
      largeMapUrl: `https://map.kakao.com/link/search/${q}`,
    };
  }, [coords]);

  return (
    <section
      ref={sectionRef}
      className={`${styles.container} ${show ? styles.show : styles.hidden}`}
    >
      <h2 className={styles.title}>오시는 길</h2>

      <div className={styles.grid}>
        {/* 왼쪽: 지도 + 아래 액션바 */}
        <div className={styles.left}>
          <div className={styles.mapWrap}>
            <div ref={mapRef} className={styles.map} />

            {/* 우측 상단 커스텀 새로고침 버튼 */}
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={onReset}
              aria-label="지도 새로고침"
            >
              ↻ 새로고침
            </button>
          </div>

          {/* 지도 아래 액션바 */}
          <div className={styles.actionsBelow} aria-label="지도 빠른 실행">
            <a href={roadviewUrl} target="_blank" rel="noopener noreferrer">로드뷰</a>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">길찾기</a>
            <a href={largeMapUrl} target="_blank" rel="noopener noreferrer">지도 크게보기</a>
          </div>
        </div>

        {/* 오른쪽: 텍스트 정보 */}
        <div className={styles.info}>
          <div className={styles.block}>
            <span className={styles.badge}>회사명</span>
            <p className={styles.addr}>{COMPANY_NAME}</p>
          </div>
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

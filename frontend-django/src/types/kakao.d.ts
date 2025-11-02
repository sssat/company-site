// src/types/kakao.d.ts
export {};

declare global {
  namespace kakao {
    namespace maps {
      /** SDK 로더 */
      function load(cb: () => void): void;

      /** 좌표 */
      class LatLng {
        constructor(lat: number, lng: number);
      }

      /** 지도 옵션/클래스 */
      interface MapOptions {
        center: LatLng;
        level?: number;
      }
      class Map {
        constructor(container: HTMLElement, options?: MapOptions);
        setCenter(latlng: LatLng): void;
        getCenter(): LatLng;
        setLevel(level: number): void;
        getLevel(): number;
        relayout(): void;
        addControl(control: Control, position: ControlPosition): void;
      }

      /** 컨트롤 공통(빈 인터페이스 경고 방지용 브랜드 속성 포함) */
      interface Control {
        readonly __CONTROL_BRAND__?: unique symbol;
      }

      /** 줌 컨트롤 */
      class ZoomControl implements Control {
        constructor();
      }

      /** 컨트롤 위치 enum */
      enum ControlPosition {
        TOPLEFT,
        TOP,
        TOPRIGHT,
        LEFT,
        RIGHT,
        BOTTOMLEFT,
        BOTTOM,
        BOTTOMRIGHT,
      }

      /** 마커 */
      class Marker {
        constructor(options: { map?: Map; position: LatLng });
        setMap(map: Map | null): void;
        setPosition(pos: LatLng): void;
      }

      /** 커스텀 오버레이 */
      interface CustomOverlayOptions {
        map?: Map;
        position: LatLng;
        content: HTMLElement | string;
        xAnchor?: number;
        yAnchor?: number;
        zIndex?: number;
        clickable?: boolean;
      }
      class CustomOverlay {
        constructor(options: CustomOverlayOptions);
        setMap(map: Map | null): void;
        setPosition(pos: LatLng): void;
        setContent(content: HTMLElement | string): void;
      }

      /** 인포윈도우 (말풍선) */
      class InfoWindow {
        constructor(options: {
          content: HTMLElement | string;
          position?: LatLng;
          removable?: boolean;
          zIndex?: number;
        });
        open(map: Map, marker?: Marker): void;
        close(): void;
        setPosition(pos: LatLng): void;
        setContent(content: HTMLElement | string): void;
      }

      /** 부가 라이브러리 */
      namespace services {
        class Geocoder {
          addressSearch(
            query: string,
            callback: (
              result: Array<{ x: string; y: string }>,
              status: Status
            ) => void
          ): void;
        }
        enum Status {
          OK = "OK",
          ZERO_RESULT = "ZERO_RESULT",
          ERROR = "ERROR",
        }
      }
    }
  }

  interface Window {
    kakao: typeof kakao;
  }
}

export {};

declare global {
  namespace kakao {
    namespace maps {
      function load(cb: () => void): void;

      class LatLng {
        constructor(lat: number, lng: number);
      }

      interface MapOptions {
        center: LatLng;
        level: number;
      }
      class Map {
        constructor(container: HTMLElement, options: MapOptions);
        setCenter(latlng: LatLng): void;
        relayout(): void;           
      }

      interface MarkerOptions {
        map: Map;
        position: LatLng;
      }
      class Marker {
        constructor(opts: MarkerOptions);
        setMap(map: Map | null): void;
      }

      namespace services {
        class Geocoder {
          addressSearch(
            query: string,
            callback: (result: Array<{ x: string; y: string }>, status: string) => void
          ): void;
        }
        enum Status {
          OK = "OK",
        }
      }
    }
  }

  interface Window {
    kakao: typeof kakao;
  }
}

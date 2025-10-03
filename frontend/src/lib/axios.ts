// src/lib/axios.ts
import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  AxiosHeaders,
  type AxiosRequestHeaders,
} from "axios";

/* -----------------------------------------------------------------------------
   커스텀 요청 설정: 401이어도 리프레시/재시도하지 않기 위한 플래그
----------------------------------------------------------------------------- */
export interface AuthRequestConfig<D = unknown> extends InternalAxiosRequestConfig<D> {
  /** 401이어도 토큰 리프레시/재시도 하지 않음 */
  skipAuthRefresh?: boolean;
  /** 내부 재시도 플래그(한 번만 재시도) */
  _retry?: boolean;
}

/* -----------------------------------------------------------------------------
   baseURL 전략
   - 개발: ""(상대경로) -> 브라우저 오리진(예: http://localhost:5173)으로 보내고,
           Vite dev proxy가 /api를 백엔드로 프록시
   - 배포: VITE_API_BASE 사용
----------------------------------------------------------------------------- */
const baseURL =
  import.meta.env.DEV
    ? "" // dev는 상대경로 강제(동일 오리진 유지)
    : ((import.meta.env.VITE_API_BASE as string | undefined) ?? "");

/* -----------------------------------------------------------------------------
   Axios 인스턴스
----------------------------------------------------------------------------- */
const api = axios.create({
  baseURL,
  // 일반 API는 쿠키 불필요. refresh/logout 등 필요한 요청에서만 true로 지정
  withCredentials: false,
});

/* -----------------------------------------------------------------------------
   Access Token 저장 (메모리; 필요시 Context/Store로 교체 가능)
----------------------------------------------------------------------------- */
let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

/* -----------------------------------------------------------------------------
   헤더 유틸: AxiosHeaders 보장 + Authorization 설정
----------------------------------------------------------------------------- */
function toAxiosHeaders(h?: AxiosRequestHeaders): AxiosHeaders {
  return AxiosHeaders.from(h ?? {});
}
function setAuthHeader(h: AxiosRequestHeaders | undefined, token: string): AxiosHeaders {
  const headers = toAxiosHeaders(h);
  headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

/* -----------------------------------------------------------------------------
   요청 인터셉터: Authorization 붙이기
----------------------------------------------------------------------------- */
api.interceptors.request.use((config: AuthRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers = setAuthHeader(config.headers, token);
  }
  return config;
});

/* -----------------------------------------------------------------------------
   401 처리: 자동 리프레시 -> 대기중 요청 재시도 (동시 요청 큐 처리)
   - /api/auth/login/, /api/auth/refresh/, /api/auth/logout/ 은 리프레시 대상에서 제외
   - 개별 요청에서 skipAuthRefresh: true 이면 리프레시 건너뜀
----------------------------------------------------------------------------- */
let isRefreshing = false;
let pendingQueue: Array<(t: string) => void> = [];

function isAuthBypassUrl(url: string | undefined): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  // 상대/절대 모두 커버
  return (
    u.endsWith("/api/auth/login/") ||
    u.endsWith("/api/auth/refresh/") ||
    u.endsWith("/api/auth/logout/")
  );
}

// 우리 백엔드 명세에 맞춘 리프레시 호출 (/api/auth/refresh/)
// NOTE: 인터셉터 영향/Authorization 헤더를 피하기 위해 api가 아닌 axios로 "상대경로" 직접 호출
async function refreshAccessToken(): Promise<string> {
  const res = await axios.post<{ access: string }>(
    "/api/auth/refresh/", // 반드시 상대경로(동일 오리진)로 호출
    {},
    { withCredentials: true } // refresh는 HttpOnly 쿠키 사용
  );
  return res.data.access;
}

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    const resp = error.response;
    const original = (error.config ?? {}) as AuthRequestConfig;

    const status = resp?.status ?? 0;
    const url = original.url;

    const shouldSkip =
      original.skipAuthRefresh === true ||
      isAuthBypassUrl(url);

    // 401 처리: 스킵 조건이 아니고, 아직 재시도 안 했으면 리프레시 시도
    if (status === 401 && !original._retry && !shouldSkip) {
      // 다른 요청이 리프레시 중이면 큐에 보관 후 재시도
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push((newToken) => {
            original.headers = setAuthHeader(original.headers, newToken);
            resolve(api.request(original as AxiosRequestConfig));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        setAccessToken(newToken);

        // 대기중 요청 재시동
        pendingQueue.forEach((resume) => resume(newToken));
        pendingQueue = [];

        // 원 요청 재시도
        original.headers = setAuthHeader(original.headers, newToken);
        return api.request(original as AxiosRequestConfig);
      } catch (e) {
        // 리프레시 실패 -> 토큰 정리 & 큐 비우기
        setAccessToken(null);
        pendingQueue = [];
        throw e;
      } finally {
        isRefreshing = false;
      }
    }

    // 그 외 에러는 그대로 전파
    return Promise.reject(error as AxiosError);
  }
);

export default api;

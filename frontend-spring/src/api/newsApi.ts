// frontend-spring/src/api/newsApi.ts
// 뉴스(News) 관련 백엔드 API 호출 모듈
// - GET    /api/news/                      -> 뉴스 목록(공개)
// - GET    /api/news/{news_seq}/           -> 뉴스 상세(공개)
// - POST   /api/admins/news/               -> 뉴스 생성(관리자)
// - PUT    /api/admins/news/{seq}/         -> 뉴스 수정(관리자) — 부분수정 허용
// - DELETE /api/admins/news/{seq}/         -> 뉴스 삭제(관리자)
// - POST   /api/admins/news/uploads/urls/  -> presigned 업로드 URL 발급(관리자)

import http from "../lib/axios";

/* ────────────── 타입 ────────────── */
export type NewsCategoryFilter = "ALL" | "INTERNAL" | "EXTERNAL";
export type NewsCategoryData = "INTERNAL" | "EXTERNAL";
export type NewsOrder = "recent" | "oldest";
export type UploadKind = "thumbnail" | "content";

export interface NewsListParams {
  page?: number;
  size?: number;
  q?: string;
  category?: NewsCategoryFilter;
  order?: NewsOrder;
}

export interface NewsListItem {
  news_seq: number;
  title: string;
  excerpt: string | null;
  badge: string;
  thumbnail_url: string | null;
  image_url?: string | null;
  category: NewsCategoryData;
  published_at: string;
}

export interface NewsListServerResponse {
  items: NewsListItem[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
  message?: string;
}

export interface NewsListUiResponse {
  items: NewsListItem[];
  page: number;
  size: number;
  total: number;
  total_pages?: number;
  message?: string;
}

export interface NewsDetailResponse {
  news_seq: number;
  slug?: string;
  title: string;
  badge: string | null;
  category: NewsCategoryData;
  image_url: string | null;
  thumbnail_url: string | null;
  published_at: string;
  updated_at: string | null;
  excerpt: string | null;
  body: string[];
  message: string;
}

export interface PresignedResp {
  upload_url: string;
  key: string;
  public_url: string;
  content_type: string;
}

export interface NewsCreateBody {
  title: string;
  excerpt: string;
  content: string;
  category: NewsCategoryData;
  badge?: string | null;
  thumbnail_url?: string | null;
  image_key?: string | null;
  image_url?: string | null;
}

export interface NewsCreateResponse {
  news_seq: number;
  published_at: string;
  message: string;
}

export interface NewsUpdateBody {
  title?: string;
  excerpt?: string;
  content?: string;
  category?: NewsCategoryData;
  badge?: string | null;
  thumbnail_url?: string | null;
  image_key?: string | null;
  remove_thumbnail?: boolean;
  remove_image?: boolean;
  image_url?: string | null;
}

export interface NewsUpdateResponse {
  news_seq: number;
  updated_at: string;
  message: string;
}

export interface NewsDeleteResponse {
  message: string;
}

/* ────────────── 내부 유틸 ────────────── */
const toSortParam = (order: NewsOrder): "-published_at" | "published_at" =>
  order === "oldest" ? "published_at" : "-published_at";

const ensureContentType = (
  v?: string | null,
  fallback = "application/octet-stream"
): string => (v && v.trim()) || fallback;

const isAbortError = (e: unknown): boolean => {
  // 브라우저별로 DOMException 또는 Error로 올 수 있으니 넓게 체크
  if (typeof DOMException !== "undefined" && e instanceof DOMException) {
    return e.name === "AbortError";
  }
  if (e instanceof Error) return e.name === "AbortError";
  if (typeof e === "object" && e !== null && "name" in e) {
    const n = (e as { name?: unknown }).name;
    return typeof n === "string" && n === "AbortError";
  }
  return false;
};

const getErrorMessage = (e: unknown): string => {
  if (e instanceof Error && typeof e.message === "string") return e.message;
  if (typeof e === "string") return e;
  return "알 수 없는 오류";
};

const parseS3XmlError = (xmlText: string): string => {
  try {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    const code = doc.querySelector("Code")?.textContent ?? "";
    const msg = doc.querySelector("Message")?.textContent ?? "";
    const reqId = doc.querySelector("RequestId")?.textContent ?? "";
    const hostId = doc.querySelector("HostId")?.textContent ?? "";
    const parts = [code, msg, reqId && `RequestId=${reqId}`, hostId && `HostId=${hostId}`]
      .filter(Boolean)
      .join(" | ");
    return parts || xmlText.slice(0, 300);
  } catch {
    return xmlText.slice(0, 300);
  }
};

/* ────────────── 공개 API ────────────── */
export const listNews = async (params: NewsListParams = {}): Promise<NewsListUiResponse> => {
  const { page = 1, size = 6, q = "", category = "ALL", order = "recent" } = params;
  const sort = toSortParam(order);

  const { data } = await http.get<NewsListServerResponse>("/news/", {
    params: { page, size, q, category, sort },
  });

  return {
    items: data.items,
    page: data.page,
    size: data.size,
    total: data.total_count,
    total_pages: data.total_pages,
    message: data.message,
  };
};

export const getNewsDetail = async (newsSeq: number): Promise<NewsDetailResponse> => {
  const { data } = await http.get<NewsDetailResponse>(`/news/${newsSeq}/`);
  return data;
};

/* ────────────── presigned 업로드 관련(관리자) ────────────── */
export const getNewsUploadUrl = async (
  filename: string,
  contentType: string,
  kind: UploadKind = "thumbnail",
  signal?: AbortSignal
): Promise<PresignedResp> => {
  const { data } = await http.post<PresignedResp>(
    "/admins/news/uploads/urls/",
    {
      kind,
      filename,
      content_type: ensureContentType(contentType),
    },
    { signal }
  );
  return data;
};

export const uploadToS3Put = async (
  uploadUrl: string,
  file: File,
  contentType: string,
  signal?: AbortSignal
): Promise<void> => {
  const ct = ensureContentType(contentType, file.type || "application/octet-stream");

  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": ct },
      body: file,
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      signal,
    });
  } catch (e: unknown) {
    const reason = isAbortError(e) ? "요청이 취소되었습니다." : getErrorMessage(e);
    throw new Error(`S3 업로드 네트워크 오류: ${reason}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const detail = text ? parseS3XmlError(text) : "";
    throw new Error(`S3 업로드 실패: ${res.status} ${detail}`);
  }
};

export const presignAndUpload = async (
  file: File,
  kind: UploadKind = "thumbnail",
  signal?: AbortSignal
): Promise<Pick<PresignedResp, "key" | "public_url" | "content_type">> => {
  const { upload_url, key, public_url, content_type } = await getNewsUploadUrl(
    file.name,
    ensureContentType(file.type),
    kind,
    signal
  );
  await uploadToS3Put(upload_url, file, content_type, signal);
  return { key, public_url, content_type };
};

/* ────────────── 관리자 API ────────────── */
export const createNews = async (
  body: NewsCreateBody,
  signal?: AbortSignal
): Promise<NewsCreateResponse> => {
  const { data } = await http.post<NewsCreateResponse>("/admins/news/", body, { signal });
  return data;
};

export const updateNews = async (
  newsSeq: number,
  body: NewsUpdateBody,
  signal?: AbortSignal
): Promise<NewsUpdateResponse> => {
  const { data } = await http.put<NewsUpdateResponse>(`/admins/news/${newsSeq}/`, body, { signal });
  return data;
};

export const deleteNews = async (
  newsSeq: number,
  signal?: AbortSignal
): Promise<NewsDeleteResponse> => {
  const { data } = await http.delete<NewsDeleteResponse>(`/admins/news/${newsSeq}/`, { signal });
  return data;
};

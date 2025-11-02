// src/api/inquiriesApi.ts
// 문의(inquiries) 관련 백엔드 API 호출 모듈

// - POST   /api/inquiries/                       -> 문의 등록(공개)
// - GET    /api/inquiries/                       -> 문의 목록(관리자)
// - GET    /api/inquiries/{inquiry_seq}/         -> 문의 단건 조회(관리자)
// - PUT    /api/inquiries/{inquiry_seq}/process/ -> 처리완료 전환만(되돌리기 불가, 관리자)
// - DELETE /api/inquiries/{inquiry_seq}/         -> 영구 삭제(관리자)

import http from "../lib/axios";

/* ────────────── 타입 ────────────── */
export type InquiryStatusFilter = "all" | "pending" | "done";
export type InquiryOrder = "recent" | "oldest";

export interface InquiryCreateBody {
  name: string;
  email: string;
  subject: string;  // 서버에서 title로 매핑
  message: string;  // 50자 이상
}

export interface InquiryCreateResponse {
  inquiry_seq: number;
  message: string; // "문의가 등록되었습니다."
}

export interface InquiryListParams {
  page?: number;          // default 1
  size?: number;          // default 10
  q?: string;             // 검색어
  status?: InquiryStatusFilter; // all|pending|done
  order?: InquiryOrder;   // recent|oldest
}

export interface InquiryListItem {
  inquiry_seq: number;
  name: string;
  email: string;
  subject: string;
  excerpt: string; // 서버에서 120자 요약
  submitted_at: string; // ISO
  is_processed: boolean;
  processed_at: string | null;
  processed_by: number | null; // FK PK(or null)
  status_label: "처리완료" | "처리중";
}

export interface InquiryListResponse {
  page: number;
  size: number;
  total: number;
  total_pages: number;
  items: InquiryListItem[];
}

export interface InquiryDetail {
  inquiry_seq: number;
  name: string;
  email: string;
  subject: string;
  message: string;        // 전문
  submitted_at: string;   // ISO
  is_processed: boolean;
  processed_at: string | null;
  processed_by: number | null;
  status_label: "처리완료" | "처리중";
}

export interface InquiryProcessResponse {
  inquiry_seq: number;
  subject: string;
  is_processed: boolean;
  processed_at: string | null;
  processed_by: number | null;
  status_label: "처리완료" | "처리중";
}

export interface InquiryDeleteResponse {
  inquiry_seq: number;
  deleted: boolean;        // 항상 true
  message: string;         // "영구 삭제되었습니다."
}

/* ────────────── API ────────────── */

/** 문의 등록 (공개 엔드포인트) */
export const createInquiry = async (body: InquiryCreateBody) => {
  const { data } = await http.post<InquiryCreateResponse>("/api/inquiries/", body);
  return data;
};

/** 문의 목록 (관리자) */
export const listInquiries = async (params: InquiryListParams = {}) => {
  const {
    page = 1,
    size = 10,
    q = "",
    status = "all",
    order = "recent",
  } = params;

  const { data } = await http.get<InquiryListResponse>("/api/inquiries/", {
    params: { page, size, q, status, order },
  });
  return data;
};

/** 단건 조회 (관리자) */
export const getInquiry = async (inquirySeq: number) => {
  const { data } = await http.get<InquiryDetail>(`/api/inquiries/${inquirySeq}/`);
  return data;
};

/** 처리완료 전환 (관리자) — 되돌리기 불가 정책 */
export const completeInquiry = async (inquirySeq: number) => {
  const { data } = await http.put<InquiryProcessResponse>(
    `/api/inquiries/${inquirySeq}/process/`,
    { is_processed: true }
  );
  return data;
};

/** 영구 삭제 (관리자) */
export const deleteInquiry = async (inquirySeq: number) => {
  const { data } = await http.delete<InquiryDeleteResponse>(`/api/inquiries/${inquirySeq}/`);
  return data;
};

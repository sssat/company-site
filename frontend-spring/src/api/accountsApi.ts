// frontend-spring/src/api/accountsApi.ts
// 인증/회원(accounts) 관련 백엔드 API 호출 모듈

// [인증]
// - POST /api/auth/login/                 -> 로그인 (HttpOnly refresh 쿠키 수신, access 토큰 반환)
// - POST /api/auth/logout/                -> 로그아웃 (refresh 쿠키 삭제)
// - POST /api/auth/refresh/               -> 액세스 토큰 재발급 (refresh 쿠키 필요; 인터셉터 무한루프 방지용 skipAuthRefresh 사용)
// - POST /api/auth/change-password/       -> 비밀번호 변경 (Authorization: Bearer access 필요)

// [회원가입 & 사전검사]
// - POST /api/auth/register/precheck/user-id/  -> 아이디 사전검사 + id_check_token 발급
// - POST /api/auth/register/precheck/email/    -> 이메일 사전검사 + email_check_token 발급
// - POST /api/auth/register/                   -> 회원가입 (id_check_token, email_check_token 필수)

// [아이디/비번 찾기]
// - POST /api/auth/find-id/              -> 아이디 찾기 (이름+이메일로 user_id 회신)
// - POST /api/auth/find-password/        -> 비밀번호 찾기 (이름+아이디+이메일 모두 일치 시 임시 비밀번호 발급)

// [관리자]
// - GET  /api/admins/users/              -> 회원 목록 조회 (page, size, q 쿼리 지원; 슈퍼관리자 권한 필요)
// - POST /api/admins/promote/            -> 관리자 승격 (user_seq 전달; 슈퍼관리자 권한 필요)
// - POST /api/admins/demote/             -> 관리자 강등 (user_seq 전달; 슈퍼관리자 권한 필요)

import { AxiosHeaders } from "axios";
import http, { setAccessToken, type AuthRequestConfig } from "../lib/axios";

/* ────────────── 타입 ────────────── */
export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

/** 로그인 응답 */
export interface LoginResponse {
  access: string;
  user_seq: number;
  user_id: string;
  user_name: string; // 헤더에서 "OOO님" 표시용
  role: Role;
}

/** 리프레시 응답 */
export interface TokenRefreshResponse {
  access?: string;
  message?: string;
}

/** 사전검사 응답 */
export interface IdPrecheckResponse {
  user_id: { valid: boolean; status: "available" | "taken" | "invalid" };
  id_check_token?: string;
  expires_in?: number;
  message?: string;
}
export interface EmailPrecheckResponse {
  email: { valid: boolean; status: "available" | "taken" | "invalid" };
  email_check_token?: string;
  expires_in?: number;
  message?: string;
}

/** 회원가입 - 요청/응답 */
export interface RegisterPayload {
  user_id: string;
  password: string;
  password2: string;
  username: string;        // (백엔드에서 source="user_name")
  birth_date: string;      // YYYY-MM-DD
  gender: "M" | "F";
  email: string;
  agree_whether: boolean;
  id_check_token: string;
  email_check_token: string;
}
export interface RegisterResponse {
  user_seq: number;
  joined_at: string; // ISO
}

/** 비밀번호 변경 */
export interface ChangePasswordResponse {
  message: string;
}

/** 아이디 찾기 / 비번 찾기 */
export interface FindIdRequest {
  email: string;
  name: string; // user_name 아님
}
export interface FindIdResponse {
  user_id: string;
}

/** 비밀번호 찾기 요청/응답 타입 */
export interface FindPasswordRequest {
  user_id: string;
  name: string;
  email: string;
}
export interface FindPasswordResponse {
  message: string;
  temp_password?: string; // DEBUG 모드에서만 내려올 수 있으므로 선택적
}

/** 로그아웃 */
export interface LogoutResponse {
  message: string;
}

/** (관리) 회원 목록 */
export interface UsersListItem {
  user_seq: number;
  user_id: string;
  user_name: string;
  grade_code: number; // 0 USER / 1 ADMIN / 2 SUPER_ADMIN
  grade_name: string;
}
export interface UsersListResponse {
  items: UsersListItem[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
  message: string;
}

/** (관리) 승격/강등 */
export interface PromoteResponse {
  user_seq: number;
  admin_level: "ADMIN";
  granted_at: string; // ISO
  acted_seq: number;
  message: string;
}
export interface DemoteResponse {
  user_seq: number;
  demoted_at: string; // ISO
  acted_seq: number;
  message: string;
}

/* ────────────── 인증 플로우 ────────────── */
/** 로그인: refresh 쿠키 심기 + access 메모리 세팅 */
export async function login(user_id: string, password: string) {
  const cfg: AuthRequestConfig = {
    withCredentials: true,          // HttpOnly refresh 쿠키 수신
    skipAuthRefresh: true,          // 로그인 401은 리프레시 시도 금지
    headers: AxiosHeaders.from({}),
  };
  const res = await http.post<LoginResponse>(
    "/auth/login/",
    { user_id, password },
    cfg
  );
  const data = res.data;
  setAccessToken(data.access);
  return data;
}

/** 로그아웃: refresh 쿠키 삭제 */
export async function logout(): Promise<void> {
  try {
    const cfg: AuthRequestConfig = {
      withCredentials: true,
      // 로그아웃은 401이어도 '자동 리프레시 금지'
      skipAuthRefresh: true,
      headers: AxiosHeaders.from({}),
    };
    await http.post<LogoutResponse>("/auth/logout/", {}, cfg);
  } finally {
    setAccessToken(null);
  }
}

/**
 * 리프레시: 같은 인스턴스(http)로 호출해 호스트/스킴/포트 일치 보장
 * - 인터셉터 무한루프 방지를 위해 skipAuthRefresh 사용
 */
export async function refreshAccess() {
  const cfg: AuthRequestConfig = {
    withCredentials: true,
    skipAuthRefresh: true, // 인터셉터 무한루프 방지
    headers: AxiosHeaders.from({}),
  };
  const res = await http.post<TokenRefreshResponse>("/auth/refresh/", {}, cfg);
  const access = res.data.access ?? "";
  if (access) setAccessToken(access);
  return access;
}

/** 비밀번호 변경 (Authorization 필요) */
export async function changePassword(
  current_password: string,
  new_password: string,
  new_password_confirm: string
) {
  const res = await http.post<ChangePasswordResponse>("/auth/change-password/", {
    current_password,
    new_password,
    new_password_confirm,
  });
  return res.data;
}

/* ────────────── 회원가입/사전검사/찾기 ────────────── */
export async function precheckUserId(user_id: string) {
  const res = await http.post<IdPrecheckResponse>("/auth/register/precheck/user-id/", {
    user_id,
  });
  return res.data;
}

export async function precheckEmail(email: string) {
  const res = await http.post<EmailPrecheckResponse>("/auth/register/precheck/email/", {
    email,
  });
  return res.data;
}

export async function register(payload: RegisterPayload) {
  const res = await http.post<RegisterResponse>("/auth/register/", payload);
  return res.data;
}

export async function findId(payload: FindIdRequest) {
  const res = await http.post<FindIdResponse>("/auth/find-id/", payload);
  return res.data;
}

/** 이름+아이디+이메일 모두 전송 */
export async function findPassword(payload: FindPasswordRequest) {
  const res = await http.post<FindPasswordResponse>("/auth/find-password/", payload);
  return res.data;
}

/* ────────────── (관리) 유틸 ────────────── */
/** 검색어 q를 선택 인자로 받아 서버 전체 검색 + 페이지네이션 */
export async function getUsersList(page = 1, size = 10, q?: string) {
  const params: Record<string, string | number> = { page, size };
  if (q && q.trim() !== "") params.q = q.trim();

  const res = await http.get<UsersListResponse>("/admins/users/", {
    params,
  });
  return res.data;
}

export async function promoteToAdmin(user_seq: number) {
  const res = await http.post<PromoteResponse>("/admins/promote/", { user_seq });
  return res.data;
}

export async function demoteFromAdmin(user_seq: number) {
  const res = await http.post<DemoteResponse>("/admins/demote/", { user_seq });
  return res.data;
}

// src/api/authApi.ts
// DRF views/serializers 스펙 기준 최신 교정본

import axios, { AxiosHeaders } from "axios";
import http, { setAccessToken, type AuthRequestConfig } from "@/lib/axios";

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
export interface FindPasswordRequest {
  user_id: string; // email 불필요
}
export interface FindPasswordResponse {
  message: string;
  temp_password: string; 
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

/* ────────────── 상수 ────────────── */
const BASE = (import.meta.env.VITE_API_BASE as string) ?? "";

/* ────────────── 인증 플로우 ────────────── */
/** 로그인: refresh 쿠키 심기 + access 메모리 세팅 */
export async function login(user_id: string, password: string) {
  const res = await http.post<LoginResponse>(
    "/api/auth/login/",
    { user_id, password },
    {
      // HttpOnly refresh 쿠키 수신
      withCredentials: true,
      // Axios v1 타입 안전 (headers 필드 요구 충족)
      headers: AxiosHeaders.from({}),
    }
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
    await http.post<LogoutResponse>("/api/auth/logout/", {}, cfg);
  } finally {
    setAccessToken(null);
  }
}

/** 리프레시: 쿠키의 refresh로 새 access (인터셉터 영향 제외 위해 axios 기본 인스턴스 사용) */
export async function refreshAccess() {
  const res = await axios.post<TokenRefreshResponse>(
    `${BASE}/api/auth/refresh/`,
    {},
    { withCredentials: true }
  );
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
  const res = await http.post<ChangePasswordResponse>("/api/auth/change-password/", {
    current_password,
    new_password,
    new_password_confirm,
  });
  return res.data;
}

/* ────────────── 회원가입/사전검사/찾기 ────────────── */
export async function precheckUserId(user_id: string) {
  const res = await http.post<IdPrecheckResponse>("/api/auth/register/precheck/user-id/", {
    user_id,
  });
  return res.data;
}

export async function precheckEmail(email: string) {
  const res = await http.post<EmailPrecheckResponse>("/api/auth/register/precheck/email/", {
    email,
  });
  return res.data;
}

export async function register(payload: RegisterPayload) {
  const res = await http.post<RegisterResponse>("/api/auth/register/", payload);
  return res.data;
}

export async function findId(payload: FindIdRequest) {
  const res = await http.post<FindIdResponse>("/api/auth/find-id/", payload);
  return res.data;
}

export async function findPassword(payload: FindPasswordRequest) {
  const res = await http.post<FindPasswordResponse>("/api/auth/find-password/", payload);
  return res.data;
}

/* ────────────── (관리) 유틸 ────────────── */
export async function getUsersList(page = 1, size = 10) {
  const res = await http.get<UsersListResponse>("/api/admins/users/", {
    params: { page, size },
  });
  return res.data;
}

export async function promoteToAdmin(user_seq: number) {
  const res = await http.post<PromoteResponse>("/api/admins/promote/", { user_seq });
  return res.data;
}

export async function demoteFromAdmin(user_seq: number) {
  const res = await http.post<DemoteResponse>("/api/admins/demote/", { user_seq });
  return res.data;
}

// src/routes/RequireRole.tsx 
// children이 없어도 동작하고, 초기 로딩/역할 문자열/숫자코드까지 모두 안전하게 처리

import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";        
import type { Role } from "../api/accountsApi";           

type Props = {
  allowed: Role[];            // Role 타입 실제 사용
  children?: ReactNode;       // children 옵션
};

// 어떤 형태로 와도 Role로 정규화
function normalizeRole(r: unknown): Role | null {
  if (r == null) return null;

  if (typeof r === "number") {
    return r >= 2 ? "SUPER_ADMIN" : r === 1 ? "ADMIN" : "USER";
  }

  if (typeof r === "string") {
    const s = r.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (s === "SUPER_ADMIN" || s === "ADMIN" || s === "USER") {
      return s as Role;
    }
  }
  return null;
}

export default function RequireRole({ allowed, children }: Props) {
  const { auth } = useAuth();
  const loc = useLocation();

  const authed = !!auth?.isAuthed;
  const role = normalizeRole(auth?.role);

  // 로그인은 됐는데 role이 아직 안 들어온 초기 로딩 시엔 판정 보류
  if (authed && role === null) return null; // 필요하면 스피너 UI

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  if (!role || !allowed.includes(role)) {
    return <Navigate to="/forbidden" replace />;
  }

  // children이 있으면 children, 없으면 Outlet로 중첩 라우트 렌더
  return <>{children ?? <Outlet />}</>;
}

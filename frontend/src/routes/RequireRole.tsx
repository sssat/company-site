// RequireRole = 라우트 가드 
// 
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../contexts/AuthContext"; 
import type { ReactElement } from "react";

type RequireRoleProps = {
  allowed: Role[];          // 예: ["SUPER_ADMIN"]
  children: ReactElement;   // ← JSX.Element 대신 ReactElement 사용
};

export default function RequireRole({ allowed, children }: RequireRoleProps) {
  const { isAuthenticated, role } = useAuth();
  const loc = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  if (!allowed.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

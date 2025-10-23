// src/components/AdminRoleNotice/AdminRoleNotice.tsx
import { useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import styles from "./AdminRoleNotice.module.css";
import type { Role } from "../../api/accountsApi";

type MinimalAuth = {
  isAuthed?: boolean;
  role?: Role | null;
  // camelCase (컨텍스트)
  userId?: string | null;
  userName?: string | null;
  // snake_case / 기타 호환
  user_id?: string;
  user_name?: string;
  username?: string;
  name?: string;
};

function pickNonEmpty(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

export default function AdminRoleNotice() {
  const { auth } = useAuth() as { auth: MinimalAuth };

  const displayName = useMemo(() => {
    const fromCtx = pickNonEmpty(
      auth?.userName,
      auth?.user_name,
      auth?.name,
      auth?.username,
      auth?.userId,
      auth?.user_id
    );
    if (fromCtx) return fromCtx;

    const fromLS = pickNonEmpty(
      localStorage.getItem("auth.userName") ?? undefined,
      localStorage.getItem("auth.userId") ?? undefined
    );
    return fromLS ?? "사용자";
  }, [auth?.userName, auth?.user_name, auth?.name, auth?.username, auth?.userId, auth?.user_id]);

  const isAuthenticated = Boolean(auth?.isAuthed);
  const role = auth?.role ?? null;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  if (!isAuthenticated || !isAdmin) return null;

  const label = role === "SUPER_ADMIN" ? "슈퍼 관리자" : "관리자";

  return (
    <div className={styles.bar} role="status" aria-live="polite">
      {/* 이름만 별도 색상으로 */}
      <strong>
        <span className={styles.name}>{displayName}</span>님
      </strong>
      <span>&nbsp;은 이 프로그램의 {label} 권한을 가지고 있습니다</span>
    </div>
  );
}

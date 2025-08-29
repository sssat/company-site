// src/components/AdminRoleNotice/AdminRoleNotice.tsx
import { useAuth } from "../../hooks/useAuth";
import styles from "./AdminRoleNotice.module.css";

export default function AdminRoleNotice() {
  const { isAuthenticated, role, userName } = useAuth();

  // 로그인 X 또는 일반 USER면 표시하지 않음
  if (!isAuthenticated || (role !== "ADMIN" && role !== "SUPER_ADMIN")) return null;

  const label = role === "SUPER_ADMIN" ? "슈퍼 관리자" : "관리자";

  return (
    <div className={styles.bar} role="status" aria-live="polite">
      <strong>{userName ?? "사용자"}님</strong>
      <span>&nbsp;은 이 프로그램의 {label} 권한을 가지고 있습니다</span>
    </div>
  );
}

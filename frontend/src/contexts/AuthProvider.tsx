// 전역 인증 컨텍스트 공급자: 하위 트리 어디서든 useAuth()로 다음 값을 꺼내 쓰게 함
// isAuthenticated(로그인 여부)
// role(권한: "USER" | "ADMIN" | "SUPER_ADMIN")
// userName(사용자명)
// login(username)
// logout()

import { useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import type { Role } from "./AuthContext";

// 아이디 문자열에서 역할을 판별
function roleFromUsername(username: string): Role {
  const id = username.trim().toLowerCase();

  // SUPER_ADMIN 우선 매칭 (부분 문자열 허용)
  if (id.includes("super_admin") || id.includes("superadmin")) return "SUPER_ADMIN";

  // 그다음 ADMIN
  if (id.includes("admin")) return "ADMIN";

  // 기본은 USER (혹은 id.includes("user")도 허용됨)
  return "USER";
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuth] = useState(false);
  const [role, setRole] = useState<Role>("USER");
  const [userName, setUserName] = useState<string | null>(null);

  // 로그인: 아이디 문자열로 역할 자동 분류
  const login = (username: string) => {
    const nextRole = roleFromUsername(username);
    setAuth(true);
    setRole(nextRole);
    setUserName(username);
  };

  const logout = () => {
    setAuth(false);
    setRole("USER");
    setUserName(null);
  };

  const value = useMemo(
    () => ({ isAuthenticated, role, userName, login, logout }),
    [isAuthenticated, role, userName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

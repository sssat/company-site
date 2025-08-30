// src/contexts/AuthProvider.tsx
import { useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import type { Role } from "./AuthContext";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuth] = useState(false);
  const [role, setRole] = useState<Role>("USER");
  const [userName, setUserName] = useState<string | null>(null);

  // 아이디에 'admin' 포함 → ADMIN, 그 외 → USER
  const login = (username: string) => {
    const id = username.trim().toLowerCase();
    const nextRole: Role = id.includes("admin") ? "ADMIN" : "USER";
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

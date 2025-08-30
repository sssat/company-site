import { createContext } from "react";

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

export type AuthContextType = {
  isAuthenticated: boolean;
  role: Role;
  userName: string | null;
  login: (username: string, password?: string) => void; // 데모에선 password 미사용
  logout: () => void;
};

// 컴포넌트가 아닌 "컨텍스트 객체"만 export (← react-refresh 경고 회피)
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// useAuth()는 AuthContext를 읽는 커스텀 훅
// AuthProvider로 감싸지 않은 곳에서 호출하면 즉시 에러를 던져 개발 실수를 빨리 잡는다.

// React의 useContext로 전역 인증 컨텍스트를 읽기 위한 준비
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

// 현재 컴포넌트가 트리 상에서 가장 가까운 <AuthContext.Provider>가 준 value(예: isAuthenticated, role, userName, login, logout)를 받음.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 내부에서만 사용 가능합니다.");
  return ctx;
}

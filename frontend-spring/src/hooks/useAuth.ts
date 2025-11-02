// frontend/src/hooks/useAuth.ts
// useAuth()는 AuthContext를 읽는 커스텀 훅
// AuthProvider로 감싸지 않은 곳에서 호출하면 즉시 에러를 던져 개발 실수를 빨리 잡는다.
export { useAuth } from "../contexts/AuthContext";

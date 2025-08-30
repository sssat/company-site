// src/pages/Auth/LoginPage/LoginPage.tsx
import { useNavigate } from "react-router-dom";
import LoginCard from "../../../components/Auth/LoginCard/LoginCard";
import { useAuth } from "../../../hooks/useAuth";  

/** /login 페이지 컨테이너: 카드만 깔끔히 렌더 */
export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();

  // 아이디에 따라 역할 자동 분류(컨텍스트 login 내부에서 처리)
  const handleSubmit = async (username: string, password: string) => {
    login(username, password);       
    nav("/", { replace: true });     // 로그인 후 홈으로 이동
  };

  return <LoginCard onSubmit={handleSubmit} />;
}

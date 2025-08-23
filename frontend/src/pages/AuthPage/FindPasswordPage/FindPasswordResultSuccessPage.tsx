// src/pages/AuthPage/FindPasswordResultSuccessPage.tsx
// 목적: 비밀번호 찾기 "성공 결과" 페이지
// 전달 경로: (1) location.state.password  (2) 쿼리스트링 ?pwd=  (없으면 데모 값)

import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import FindPasswordResultSuccess from "../../../components/Auth/FindPasswordResultSuccess";

export default function FindPasswordResultSuccessPage() {
  const location = useLocation();
  const [params] = useSearchParams();

  const pwdFromState = (location.state as { password?: string } | null)?.password;
  const pwdFromQuery = params.get("pwd") || undefined;

  // 데모 기본값(스샷과 비슷한 형태)
  const password = pwdFromState ?? pwdFromQuery ?? "Esg@saas123";

  useEffect(() => {
    document.title = "비밀번호 확인";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return <FindPasswordResultSuccess password={password} />;
}

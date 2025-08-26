// src/pages/AuthPage/FindIdResultSuccessPage.tsx
// 목적: 아이디 찾기 "성공 결과" 페이지. 라우트 예: /find-id/result
// 전달 경로: (1) location.state.userId  (2) 쿼리스트링 ?id=  (없으면 데모 문자열)
import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import FindIdResultSuccess from "../../../components/Auth/FindID/FindIDResultSuccess/FindIdResultSuccess";

export default function FindIdResultSuccessPage() {
  const location = useLocation();
  const [params] = useSearchParams();

  const idFromState = (location.state as { userId?: string } | null)?.userId;
  const idFromQuery = params.get("id") || undefined;

  // 백엔드 연동 전 데모를 위해 기본값 유지(요청 스샷과 동일한 예시)
  const userId = idFromState ?? idFromQuery ?? "Esggs123";

  useEffect(() => {
    document.title = "아이디 확인";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return <FindIdResultSuccess userId={userId} />;
}

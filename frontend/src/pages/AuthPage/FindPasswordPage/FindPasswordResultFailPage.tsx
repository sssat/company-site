// src/pages/AuthPage/FindPasswordResultFailPage.tsx
// 목적: 비밀번호 찾기 "실패 결과" 페이지. 라우트 예: /find-password/result/fail
// message는 location.state.message 또는 기본 문구 사용.
import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import FindPasswordResultFail from "../../../components/Auth/FindPasswordResultFail";

export default function FindPasswordResultFailPage() {
  const location = useLocation();
  const [params] = useSearchParams();

  const msgFromState = (location.state as { message?: string } | null)?.message;
  const msgFromQuery = params.get("msg") || undefined;

  const message = msgFromState ?? msgFromQuery ?? "조회결과가 없습니다.";

  useEffect(() => {
    document.title = "비밀번호 확인";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return <FindPasswordResultFail message={message} />;
}

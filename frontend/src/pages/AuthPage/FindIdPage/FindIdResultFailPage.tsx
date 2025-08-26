// src/pages/AuthPage/FindIdResultFailPage.tsx
// 목적: 아이디 찾기 "실패 결과" 페이지. 라우트 예: /find-id/result/fail
// message는 location.state.message 또는 기본 문구 사용.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import FindIdResultFail from "../../../components/Auth/FindID/FindIDResultFail/FindIdResultFail";

export default function FindIdResultFailPage() {
  const location = useLocation();
  const message =
    (location.state as { message?: string } | null)?.message ??
    "조회결과가 없습니다.";

  useEffect(() => {
    document.title = "아이디 확인";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return <FindIdResultFail message={message} />;
}

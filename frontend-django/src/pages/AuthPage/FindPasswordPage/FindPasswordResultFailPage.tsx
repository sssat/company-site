// src/pages/AuthPage/FindPasswordResultFailPage.tsx
// 목적: 비밀번호 찾기 "실패 결과" 페이지.
// message는 state -> 쿼리(msg|message) -> 기본 문구 순으로 사용.
import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import FindPasswordResultFail from "../../../components/Auth/FindPassword/FindPWResultFail/FindPasswordResultFail";

function readStringFromState(state: unknown, key: string): string | undefined {
  if (typeof state !== "object" || state === null) return undefined;
  const v = (state as Record<string, unknown>)[key];
  return typeof v === "string" ? v : undefined;
}

export default function FindPasswordResultFailPage() {
  const location = useLocation();
  const [params] = useSearchParams();

  const message =
    readStringFromState(location.state, "message") ??
    // 쿼리 키 두 가지 모두 지원
    params.get("msg") ??
    params.get("message") ??
    "조회결과가 없습니다.";

  useEffect(() => {
    document.title = "비밀번호 찾기 실패 | Market Stage";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return <FindPasswordResultFail message={message} />;
}

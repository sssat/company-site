// 비밀번호 찾기 페이지(얇은 래퍼)
// - 문서 타이틀 설정 + 스크롤 상단 이동
// - 실제 서버 연동은 FindPasswordCard의 onSubmit에서 처리

import { useEffect } from "react";
import FindPasswordCard from "../../components/Auth/FindPasswordCard";

export default function FindPasswordPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "비밀번호 찾기 | Market Stage";
  }, []);

  return (
    <main style={{ padding: "32px 16px" }}>
      <FindPasswordCard
        cardWidth={420}
        toSignup="/signup"
        toLogin="/login"
        // onSubmit={async ({ username, name, email }) => {
        //   await fetch("/api/auth/password-Find/request", {
        //     method: "POST",
        //     headers: { "Content-Type": "application/json" },
        //     body: JSON.stringify({ login: username, name, email }),
        //   });
        //   // 서버는 계정 존재 유무와 무관하게 동일 응답 권장
        // }}
      />
    </main>
  );
}

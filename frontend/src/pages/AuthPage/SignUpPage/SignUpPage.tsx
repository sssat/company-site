import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 컴포넌트는 일반 import
import SignUpCard from "../../../components/Auth/SignUpCard";
// 타입은 type-only import (TS1484 해결 포인트)
import type { SignUpForm } from "../../../components/Auth/SignUpCard";

export default function SignUpPage() {
  const nav = useNavigate();

  useEffect(() => {
    document.title = "회원가입 | Market Stage";
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (data: SignUpForm) => {
    // 1) 실제 API 연동 자리
    // await fetch("/api/auth/signup", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(data),
    // });

    // 2) 성공 시 완료 페이지로 이동 (이름 전달)
    nav(`/signup/success?name=${encodeURIComponent(data.name)}`, {
      state: { name: data.name },
    });
  };

  return (
    <main style={{ padding: "32px 16px" }}>
      <SignUpCard onSubmit={handleSubmit} cardWidth={420} />
    </main>
  );
}

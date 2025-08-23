// src/pages/AuthPage/FindPasswordPage.tsx
import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import FindPasswordCard from "../../../components/Auth/FindPasswordCard";

// const API_PASSWORD_FIND = "/api/auth/password-find"; // 실제 엔드포인트로 교체

export default function FindPasswordPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.title = "비밀번호 찾기 | Market Stage";
  }, []);

  const handleSubmit = useCallback(
    async ({
      username,
      name,
      email,
    }: {
      username: string;
      name: string;
      email: string;
    }) => {
      // ----- 데모 분기: 특정 키워드가 들어오면 '실패' 페이지로 보냄 -----
      const shouldFail =
        /fail|없음|nomatch/i.test(username ?? "") ||
        /fail|없음|nomatch/i.test(name ?? "") ||
        /fail|없음|nomatch/i.test(email ?? "");

      if (shouldFail) {
        navigate("/find-password/result/fail", {
          state: { message: "조회결과가 없습니다." },
        });
        return;
      }

      // ----- 실제 연동 예시 -----
      // const res = await fetch(API_PASSWORD_FIND, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ username, name, email }),
      // });
      // if (!res.ok) {
      //   navigate("/find-password/result/fail", { state: { message: "조회결과가 없습니다." }});
      //   return;
      // }
      // const data = await res.json();
      // const pwd = data?.password; // 서버에서 내려주는 임시/현재 비밀번호
      // if (!pwd) {
      //   navigate("/find-password/result/fail", { state: { message: "조회결과가 없습니다." }});
      //   return;
      // }
      // navigate("/find-password/result", { state: { password: pwd } });

      // ----- 데모 성공 동작: 임시 비밀번호 생성해 성공 페이지로 이동 -----
      const demoPassword =
        (username?.slice(0, 3) || "Esg") + "@saas123"; // 스샷과 유사한 형태
      navigate("/find-password/result", { state: { password: demoPassword } });
    },
    [navigate]
  );

  return (
    <main style={{ padding: "32px 16px" }}>
      <FindPasswordCard
        cardWidth={420}
        toSignup="/signup"
        toLogin="/login"
        onSubmit={handleSubmit}
      />
    </main>
  );
}

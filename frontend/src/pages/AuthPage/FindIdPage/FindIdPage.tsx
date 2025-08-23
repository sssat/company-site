// src/pages/AuthPage/FindIdPage.tsx
import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FindIdCard from "../../../components/Auth/FindIdCard";

// const API_FIND_ID = "/api/auth/find-id"; // 백엔드 붙일 때 사용

export default function FindIdPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "아이디 찾기";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const handleSubmit = useCallback(
    async ({ name, email }: { name: string; email: string }) => {
      // ----- [데모 분기] 입력에 특정 키워드가 있으면 '실패' 페이지로 보냄 -----
      const shouldFail =
        /fail|없음|nomatch/i.test(name ?? "") ||
        /fail|없음|nomatch/i.test(email ?? "");

      if (shouldFail) {
        navigate("/find-id/result/fail", {
          state: { message: "조회결과가 없습니다." },
        });
        return;
      }

      // ----- [실제 연동 시] 서버 응답에 따라 성공/실패 라우팅 -----
      // const res = await fetch(API_FIND_ID, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      // });
      // if (!res.ok) {
      //   navigate("/find-id/result/fail", { state: { message: "조회결과가 없습니다." }});
      //   return;
      // }
      // const data = await res.json();
      // if (!data?.userId) {
      //   navigate("/find-id/result/fail", { state: { message: "조회결과가 없습니다." }});
      //   return;
      // }
      // navigate("/find-id/result", { state: { userId: data.userId } });

      // ----- [데모 성공 동작] 키워드가 없을 때만 성공 페이지로 -----
      const userId =
        (name?.trim() || (email.includes("@") ? email.split("@")[0] : "")).trim() ||
        "Esggs123";
      navigate("/find-id/result", { state: { userId } });
    },
    [navigate]
  );

  return <FindIdCard onSubmit={handleSubmit} />;
}

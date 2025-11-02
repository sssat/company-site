// src/pages/AuthPage/FindIdPage/FindIdPage.tsx
import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FindIdCard from "../../../components/Auth/FindID/FindIDCard/FindIdCard";

import axios, { AxiosError } from "axios";
import { findId, type FindIdRequest, type FindIdResponse } from "../../../api/accountsApi";

export default function FindIdPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "아이디 찾기 | Market Stage";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const handleSubmit = useCallback(
    async ({ name, email }: { name: string; email: string }) => {
      const trimmedName = (name ?? "").trim();
      const trimmedEmail = (email ?? "").trim();

      if (!trimmedName || !trimmedEmail) {
        alert("이름과 이메일을 모두 입력하세요.");
        return;
      }

      const payload: FindIdRequest = { name: trimmedName, email: trimmedEmail }; // name으로 전송

      try {
        const res: FindIdResponse = await findId(payload);
        // 성공: 서버가 내려준 user_id로 성공 페이지 이동
        navigate("/find-id/success", { state: { userId: res.user_id }, replace: false });
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          const ax = err as AxiosError<{ message?: string; detail?: string }>;
          if (ax.response?.status === 404) {
            navigate("/find-id/fail", {
              state: { message: ax.response.data?.message ?? "조회 결과가 없습니다." },
              replace: false, 
            });
            return;
          }
          alert(
            ax.response?.data?.message ??
              ax.response?.data?.detail ??
              ax.message ??
              "아이디 찾기에 실패했습니다."
          );
        } else if (err instanceof Error) {
          alert(err.message);
        } else {
          alert("아이디 찾기에 실패했습니다.");
        }
      }
    },
    [navigate]
  );

  return <FindIdCard onSubmit={handleSubmit} />;
}

// src/pages/AuthPage/FindPasswordPage/FindPasswordPage.tsx
import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import FindPasswordCard from "../../../components/Auth/FindPassword/FindPWCard/FindPasswordCard";

import axios, { AxiosError } from "axios";
import {
  findPassword,
  type FindPasswordRequest,
  type FindPasswordResponse,
} from "../../../api/accountsApi";

export default function FindPasswordPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.title = "비밀번호 찾기 | Market Stage";
  }, []);

  const handleSubmit = useCallback(
    async (payload: { user_id: string; name: string; email: string }) => {
      const body: FindPasswordRequest = {
        user_id: (payload.user_id ?? "").trim(),
        name: (payload.name ?? "").trim(),
        email: (payload.email ?? "").trim(),
      };

      // 방어적 체크(카드에서 검증했지만 이중 방어)
      if (!body.user_id) return alert("아이디를 입력하세요.");
      if (!body.name) return alert("이름을 입력하세요.");
      if (!body.email) return alert("이메일을 입력하세요.");

      try {
        const res: FindPasswordResponse = await findPassword(body);

        // 개발 모드(DEBUG=True)에서는 temp_password가 같이 내려올 수 있음
        const tmp =
          typeof res?.temp_password === "string" ? res.temp_password : undefined;

        // 히스토리에 남겨서 뒤로가기 시 폼으로 복귀 가능
        navigate("/find-password/success", {
          state: tmp ? { password: tmp } : undefined,
        });
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          const ax = err as AxiosError<{ message?: string; detail?: string }>;
          if (ax.response?.status === 404) {
            navigate("/find-password/fail", {
              state: { message: "조회결과가 없습니다." }, // 항상 고정 문구
            });
            return;
          }
          alert(
            ax.response?.data?.message ??
              ax.response?.data?.detail ??
              ax.message ??
              "비밀번호 찾기에 실패했습니다."
          );
        } else if (err instanceof Error) {
          alert(err.message);
        } else {
          alert("비밀번호 찾기에 실패했습니다.");
        }
      }
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

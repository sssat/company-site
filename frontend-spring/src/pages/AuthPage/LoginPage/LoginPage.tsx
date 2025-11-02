// src/pages/AuthPage/LoginPage/LoginPage.tsx
// 원래 구조(컨테이너 + 카드) 유지: LoginCard를 그대로 렌더하고,
// onSubmit 핸들러만 주입해서 백엔드 연동(로그인) + 이동까지 수행.

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { useAuth } from "../../../hooks/useAuth";
import LoginCard from "../../../components/Auth/LoginCard/LoginCard";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();

  /**
   * LoginCard가 전달하는 onSubmit의 형태가 프로젝트마다 다를 수 있어
   * 안전하게 unknown으로 받고 내부에서 분기 처리합니다.
   *
   * 허용 형식:
   *  1) 객체형: { user_id?: string; userId?: string; id?: string; password: string }
   *  2) 튜플형: [user_id: string, password: string]
   *  3) (드물게) 문자열 2개 인자: (user_id, password)
   */
  const handleSubmit = useCallback(
    async (...args: unknown[]) => {
      let userId = "";
      let password = "";

      // 케이스 A: onSubmit(payloadObj)
      if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
        const payload = args[0] as Partial<{
          user_id: string;
          userId: string;
          id: string;
          password: string;
        }>;
        userId = payload.user_id ?? payload.userId ?? payload.id ?? "";
        password = payload.password ?? "";
      }
      // 케이스 B: onSubmit([id, pw])
      else if (args.length === 1 && Array.isArray(args[0])) {
        const arr = args[0] as unknown[];
        userId = (arr[0] as string) ?? "";
        password = (arr[1] as string) ?? "";
      }
      // 케이스 C: onSubmit(id, pw)
      else if (args.length >= 2 && typeof args[0] === "string" && typeof args[1] === "string") {
        userId = args[0];
        password = args[1];
      }

      const uid = (userId ?? "").trim();

      // 대문자 사용 금지: 즉시 경고 후 중단 (이중 방어)
      if (/[A-Z]/.test(uid)) {
        alert("아이디에는 대문자를 사용할 수 없습니다.");
        return;
      }

      if (!uid || !password) {
        // 카드 컴포넌트가 자체 검증을 한다면 이 경고는 거의 보이지 않음
        alert("아이디와 비밀번호를 입력하세요.");
        return;
      }

      try {
        await login(uid, password);
        nav("/"); // 로그인 성공 시 홈으로 이동(원하는 경로로 변경 가능)
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          const ax = error as AxiosError<{ message?: string }>;
          alert(ax.response?.data?.message ?? ax.message ?? "로그인 실패");
        } else if (error instanceof Error) {
          alert(error.message);
        } else {
          alert("로그인 실패");
        }
      }
    },
    [login, nav]
  );

  // LoginCard가 cardWidth, toSignup/toFindId 등의 부가 props를 지원한다면 여기서 함께 넘겨주면 됩니다.
  return <LoginCard onSubmit={handleSubmit} />;
}


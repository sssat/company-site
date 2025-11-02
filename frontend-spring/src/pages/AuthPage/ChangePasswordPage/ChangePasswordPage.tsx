// src/pages/AuthPage/ChangePasswordPage/ChangePasswordPage.tsx
import { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChangePasswordCard from "../../../components/Auth/ChangePassword/ChangePWCard/ChangePasswordCard";
import { changePassword } from "../../../api/accountsApi";
import axios from "axios";
import { useAuth } from "../../../hooks/useAuth";
import { validatePassword } from "../../../utils/signupValidators";

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
};

type ChangePasswordErrorResponse = {
  message?: string;
  detail?: string;
  current_password?: string | string[];
  new_password?: string | string[];
  new_password_confirm?: string | string[];
  new_password_confirmation?: string | string[];
  password?: string | string[];
  password2?: string | string[];
  errors?: Record<string, string | string[] | undefined>;
};

/** 배열/문자 혼합 응답에서 첫 문구 뽑기 */
function firstString(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const v0 = v[0];
    return typeof v0 === "string" ? v0 : undefined;
  }
  return undefined;
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.title = "비밀번호 변경 | Market Stage";
  }, []);

  useEffect(() => {
    if (!auth.isAuthed) {
      navigate("/login", { replace: true });
    }
  }, [auth.isAuthed, navigate]);

  const handleSubmit = useCallback(
    async ({
      currentPassword,
      newPassword,
      confirmPassword,
    }: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      // 클라이언트 1차 검증: 필드 하단 표시
      const next: FieldErrors = {};
      if (!currentPassword) next.currentPassword = "현재 비밀번호를 입력해주세요.";
      if (!newPassword) next.newPassword = "새 비밀번호를 입력해주세요.";
      if (!confirmPassword) next.confirmPassword = "새 비밀번호를 한 번 더 입력해주세요.";

      // 정책 검증(회원가입과 동일 룰 사용)
      if (newPassword && confirmPassword) {
        const policyMsg = validatePassword(newPassword, confirmPassword /*, userId(optional) */);
        if (policyMsg) {
          if (policyMsg.includes("일치")) next.confirmPassword = policyMsg; // 확인 불일치
          else next.newPassword = policyMsg;                                // 그 외 정책 위반
        }
      }

      if (Object.keys(next).length > 0) {
        setErrors(next);
        return;
      }

      try {
        await changePassword(currentPassword, newPassword, confirmPassword);

        // 성공 후 즉시 로그아웃
        await logout();
        navigate("/login?pwChanged=1", { replace: true });
      } catch (error: unknown) {
        // 서버 응답을 필드 에러로 매핑 (❌ any 사용 없음)
        if (axios.isAxiosError<ChangePasswordErrorResponse>(error)) {
          const status = error.response?.status ?? 0;

          // 토큰 만료 등으로 401 발생 시 안내 후 재로그인 유도 (기존 동작 유지)
          if (status === 401) {
            alert("비밀번호가 변경되었습니다. 다시 로그인 해주세요.");
            await logout();
            navigate("/login?pwChanged=1", { replace: true });
            return;
          }

          const data = error.response?.data;
          const fe: FieldErrors = {};

          if (data) {
            // 대표 필드 매핑
            if (data.current_password !== undefined)
              fe.currentPassword = firstString(data.current_password) ?? "현재 비밀번호가 올바르지 않습니다.";
            if (data.new_password !== undefined)
              fe.newPassword = firstString(data.new_password);
            if (data.new_password_confirm !== undefined)
              fe.confirmPassword = firstString(data.new_password_confirm);
            if (data.new_password_confirmation !== undefined)
              fe.confirmPassword = fe.confirmPassword ?? firstString(data.new_password_confirmation);

            // 다른 키 케이스
            if (!fe.newPassword && data.password !== undefined)
              fe.newPassword = firstString(data.password);
            if (!fe.confirmPassword && data.password2 !== undefined)
              fe.confirmPassword = firstString(data.password2);

            // errors 객체 형태 지원
            if (data.errors) {
              const e = data.errors;
              fe.currentPassword = fe.currentPassword ?? firstString(e.current_password);
              fe.newPassword = fe.newPassword ?? firstString(e.new_password ?? e.password);
              fe.confirmPassword = fe.confirmPassword ?? firstString(e.new_password_confirm ?? e.password2);
              if (!fe.currentPassword && !fe.newPassword && !fe.confirmPassword) {
                fe.general = firstString(e.message) ?? firstString(e.detail);
              }
            }

            // 아무 필드도 못찾으면 상단 공통 에러로
            if (!fe.currentPassword && !fe.newPassword && !fe.confirmPassword) {
              fe.general = data.message ?? data.detail ?? "비밀번호 변경에 실패했습니다.";
            }
          } else {
            fe.general = error.message ?? "비밀번호 변경에 실패했습니다.";
          }

          setErrors(fe);
          return;
        }

        setErrors({ general: "비밀번호 변경에 실패했습니다." });
      }
    },
    [logout, navigate]
  );

  return (
    <main style={{ padding: "32px 16px" }}>
      <ChangePasswordCard
        cardWidth={420}
        onSubmit={handleSubmit}
        errors={errors}
        onClearError={(field) =>
          setErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
          })
        }
      />
    </main>
  );
}


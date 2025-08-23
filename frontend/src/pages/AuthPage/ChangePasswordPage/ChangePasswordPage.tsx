import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ChangePasswordCard from "../../../components/Auth/ChangePasswordCard";

export default function ChangePasswordPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.title = "비밀번호 변경 | Market Stage";
  }, []);

  const handleSubmit = useCallback(
    async ({
      newPassword,
      confirmPassword,
    }: {
      newPassword: string;
      confirmPassword: string;
    }) => {
      // 경고 제거용 더미 사용
      void newPassword;
      void confirmPassword;

      // 성공 시 완료 페이지로 이동
      navigate("/change-password/complete");
    },
    [navigate]
  );

  return (
    <main style={{ padding: "32px 16px" }}>
      <ChangePasswordCard cardWidth={420} onSubmit={handleSubmit} />
    </main>
  );
}

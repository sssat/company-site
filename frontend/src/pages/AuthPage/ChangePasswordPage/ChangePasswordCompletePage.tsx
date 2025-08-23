import { useEffect } from "react";
import ChangePasswordComplete from "../../../components/Auth/ChangePasswordComplete";

export default function ChangePasswordCompletePage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.title = "비밀번호 변경 완료 | Market Stage";
  }, []);

  return (
    <main style={{ padding: "32px 16px" }}>
      <ChangePasswordComplete toLogin="/login" />
    </main>
  );
}

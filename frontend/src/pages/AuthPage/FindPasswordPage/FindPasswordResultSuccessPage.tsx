// src/components/Auth/FindPassword/FindPWResultSuccess/FindPasswordResultSuccess.tsx
import { useEffect } from "react";

type Props = {
  /** 서버/네비게이션에서 임시 비밀번호를 전달할 수 있음 (선택) */
  password?: string;
};

export default function FindPasswordResultSuccess({ password }: Props) {
  useEffect(() => {
    // 필요 시 포커스/자동 선택/접근성 처리 등을 여기에
  }, []);

  const hasPassword = typeof password === "string" && password.length > 0;

  return (
    <section style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>임시 비밀번호가 발급되었습니다.</h1>

      {hasPassword ? (
        <>
          <p style={{ marginBottom: 8 }}>
            아래 임시 비밀번호로 로그인한 뒤, 반드시 비밀번호를 변경해 주세요.
          </p>
          <div
            style={{
              display: "inline-block",
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: 8,
              fontFamily: "monospace",
              fontSize: 16,
            }}
            aria-label="임시 비밀번호"
          >
            {password}
          </div>
        </>
      ) : (
        <>
          <p style={{ marginBottom: 8 }}>
            등록하신 이메일로 임시 비밀번호 안내를 전송했습니다. 메일함을 확인해 주세요.
          </p>
          <p style={{ color: "#666", fontSize: 14 }}>
            메일이 보이지 않으면 스팸함을 확인하거나, 조금 후 다시 시도해 주세요.
          </p>
        </>
      )}
    </section>
  );
}

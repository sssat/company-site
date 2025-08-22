import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FindIdCard from "../../components/Auth/FindIdCard";
import FindIdResultCard from "../../components/Auth/FindIdResultCard";

type ResultState =
  | { status: "idle" }
  | { status: "success"; username: string }
  | { status: "empty" };

export default function FindIdPage() {
  const [result, setResult] = useState<ResultState>({ status: "idle" });
  const [params] = useSearchParams();
  const nav = useNavigate();

  useEffect(() => {
    document.title = "아이디 찾기 | Market Stage";
    window.scrollTo(0, 0);

    // URL에 ?done=1 이면 결과 화면부터 (뒤로가기 자연스러움)
    if (params.get("done") === "1") {
      setResult((prev) => (prev.status === "idle" ? { status: "empty" } : prev));
    }
  }, [params]);

  const handleSubmit = async (payload: { name: string; email: string }) => {
    void payload; // 데모용

    // 실제 API 연동 후 found / username 세팅
    const found = true; // demo
    const username = "Esggs123";

    setResult(found ? { status: "success", username } : { status: "empty" });
    nav("?done=1", { replace: true });
  };

  // 결과에서 "아이디 찾기" 눌렀을 때 폼으로 복귀
  const backToForm = () => {
    setResult({ status: "idle" });
    nav("", { replace: true }); // 쿼리 제거
  };

  return (
    <main style={{ padding: "32px 16px" }}>
      {result.status === "idle" && (
        <FindIdCard onSubmit={handleSubmit} cardWidth={420} />
      )}

      {result.status === "success" && (
        <FindIdResultCard
          status="success"
          username={result.username}
          toLogin="/login"
          toResetPw="/reset-password"
          cardWidth={420}
        />
      )}

      {result.status === "empty" && (
        <FindIdResultCard
          status="empty"
          toFindId="/find-id"
          toSignup="/signup"
          onBackToFind={backToForm}   
          cardWidth={420}
        />
      )}
    </main>
  );
}

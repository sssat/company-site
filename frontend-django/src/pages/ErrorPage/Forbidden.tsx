// src/pages/ErrorPage/Forbidden.tsx
import { Link } from "react-router-dom";

export default function Forbidden() {
  return (
    <main style={{ padding: 32 }}>
      <h1>접근 권한이 없습니다.</h1>
      <p>관리자 또는 슈퍼관리자만 이용할 수 있습니다.</p>
      <Link to="/media">뉴스 목록으로 돌아가기</Link>
    </main>
  );
}

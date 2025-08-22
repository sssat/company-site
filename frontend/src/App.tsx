import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import BackToTop from "./components/BackToTopBtn/BackToTop";

/* ---------- ErrorBoundary (typed) ---------- */
type ErrorBoundaryProps = { fallback?: React.ReactNode; children: React.ReactNode };
type ErrorBoundaryState = { hasError: boolean };

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  // 인자 사용 안 하므로 생략해 unused-vars 경고 제거
  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    // 필요 시 로깅
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div style={{ padding: 24 }}>문제가 발생했습니다.</div>;
    }
    return this.props.children;
  }
}

/* ---------- Layout Shell (sticky footer) ---------- */
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {children}
    </div>
  );
}

function PageLoading() {
  return <div style={{ padding: 24 }}>불러오는 중…</div>;
}

// 컴포넌트란? => 화면의 일정 부분을 담당하는 독립된 단위. 재사용이 가능하다.
// App()은 함수형 컴포넌트이다. 즉, React에선 컴포넌트를 함수로 만든다.
// App은 화면에서 최상위 컴포넌트 역할을 한다. 이처럼 컴포넌트에는 계층이 존재한다.
// return(): 이 함수는 실행되면 JSX(HTML 비슷한 코드)를 반환하고 이 JSX가 화면에 렌더링 된다.
// <> ... </>: React Fragment. 여러 개의 요소를 묶어줄 때 쓰는 "보이지 않는 부모 태그"이다.
export default function App() {
  return (
    <AppShell>
      <Header />   {/* 이 위치에 있으므로 어떤 페이지든 헤더 컴포넌트가 상단에 항상 표시됨 */}

      <ErrorBoundary fallback={<div style={{ padding: 24 }}>문제가 발생했습니다.</div>}>
        <Suspense fallback={<PageLoading />}>
          <main style={{ flex: 1 }}>
            {/* 라우트별 화면은 모두 Outlet으로 렌더 ( /login, /signup 포함 ) */}
            <Outlet />
          </main>
        </Suspense>
      </ErrorBoundary>

      <Footer />    {/* 하단 고정 컴포넌트 */}
      <BackToTop always={false} showAt={240} />
    </AppShell>
  );
}

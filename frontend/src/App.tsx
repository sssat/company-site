// src/App.tsx
import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import BackToTop from "./components/BackToTopBtn/BackToTop";

/* ───────────────── ErrorBoundary (typed) ───────────────── */
type ErrorBoundaryProps = {
  /** 에러 발생 시 표시할 대체 UI */
  fallback?: React.ReactNode;
  children: React.ReactNode;
};
type ErrorBoundaryState = { hasError: boolean };

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    // 운영 시 Sentry/LogRocket 등으로 전송 가능
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: 24 }}>
            문제가 발생했습니다.{" "}
            <button type="button" onClick={() => window.location.reload()}>
              새로고침
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

/* ───────────────── Layout Shell (sticky footer) ───────────────── */
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {children}
    </div>
  );
}

function PageLoading() {
  return (
    <div style={{ padding: 24 }} role="status" aria-live="polite">
      불러오는 중…
    </div>
  );
}

/* ───────────────── App (레이아웃 + Outlet) ───────────────── */
export default function App() {
  return (
    <AppShell>
      {/* 공통 상단 */}
      <Header />

      <ErrorBoundary
        fallback={
          <div style={{ padding: 24 }}>
            문제가 발생했습니다.{" "}
            <button type="button" onClick={() => window.location.reload()}>
              새로고침
            </button>
          </div>
        }
      >
        <Suspense fallback={<PageLoading />}>
          {/* sticky footer: main이 flex:1 로 높이 확보 */}
          <main id="main-content" role="main" style={{ flex: 1 }}>
            {/* 라우트별 화면은 Outlet로 */}
            <Outlet />
          </main>
        </Suspense>
      </ErrorBoundary>

      {/* 공통 하단 */}
      <Footer />

      {/* 스크롤 상단 이동 버튼 */}
      <BackToTop always={false} showAt={240} />
    </AppShell>
  );
}

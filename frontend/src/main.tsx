// export란? 
// JavaScript에서 한 파일(모듈)의 변수·함수·클래스를 다른 파일에서 가져다 쓸 수 있게 내보내는 것
// (1) Named Export
// 여러 개를 이름 붙여서 내보낼 수 있음
// 불러올 때 중괄호 { } 안에 이름을 정확히 써야 함
// (2) Default Export
// 한 모듈에서 단 하나만 지정 가능
// 가져올 때 중괄호 없이 아무 이름이나 붙여서 불러올 수 있음
// 주로 모듈의 “대표 기능”을 내보낼 때 사용

// react라는 라이브러리에서 default export된 항목을 React라는 이름으로 가져온 것
// 여기서 React는 사용자가 지정하는 이름. 다만 관례적으로 'React'라고 부름  
import React from "react";

// react-dom/client 라이브러리에서 createRoot 라는 named export된 항목을 가져옴  
import ReactDOM from "react-dom/client";

// react-router-dom 라이브러리에서 createBrowserRouter, RouterProvider 라는 named export된 항목을 가져옴  
// React에서 라우팅(Routing) 기능은 앱이 "페이지를 전환하는 것처럼 보이게 만드는 기술"이다.
// 하지만 실제로는 화면을 새로고침하지 않고 컴포넌트를 바꿔 끼우는 것이다.
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// App.tsx 파일에서 App 컴포넌트(App 함수) 임포트
// App은 전체 화면의 뼈대가 되는 컴포넌트이다.
// App 컴포넌트 안에 Header, Footer, Home, Router, Footer, ... 등 모든 구조가 들어간다.
// <=> import App from './App.tsx';
import App from "./App";

// 전체 앱에 적용할 전역 스타일(css) 파일
import "./index.css";

// ----------------------------- 페이지 임포트 ------------------------------------
// 1. 기본 헤더 페이지 임포트
import Home from "./pages/Home";
import Products from "./pages/Products";
import Media from "./pages/MediaPage/Media.tsx";
import NewsDetailPage from "./pages/MediaPage/NewsDetailPage.tsx"; 
import Team from "./pages/Team";
import Contact from "./pages/Contact";

// 2. 인증 페이지
// (1) 로그인/회원가입
import LoginPage from "./pages/AuthPage/LoginPage/LoginPage";
import SignUpPage from "./pages/AuthPage/SignUpPage/SignUpPage";
import SignUpSuccessPage from "./pages/AuthPage/SignUpPage/SignUpSuccessPage";

// (2) ID 찾기
import FindIdPage from "./pages/AuthPage/FindIdPage/FindIdPage"; 
import FindIdResultSuccessPage from "./pages/AuthPage/FindIdPage/FindIdResultSuccessPage";
import FindIdResultFailPage from "./pages/AuthPage/FindIdPage/FindIdResultFailPage";

// (3) 비밀번호 찾기
import FindPasswordPage from "./pages/AuthPage/FindPasswordPage/FindPasswordPage";
import FindPasswordResultSuccessPage from "./pages/AuthPage/FindPasswordPage/FindPasswordResultSuccessPage";
import FindPasswordResultFailPage from "./pages/AuthPage/FindPasswordPage/FindPasswordResultFailPage.tsx";

// (4) 비밀번호 변경
import ChangePasswordPage from "./pages/AuthPage/ChangePasswordPage/ChangePasswordPage";
import ChangePasswordCompletePage from "./pages/AuthPage/ChangePasswordPage/ChangePasswordCompletePage";
// -----------------------------------------------------------------------------------------

// 매칭되는 라우트가 없을 때(=404 상황) 보여줄 간단한 화면
export function NotFound() {
  return <div style={{ padding: 24 }}>404 Not Found 페이지를 찾을 수 없습니다.</div>; 
}

// 
const router = createBrowserRouter([
  { 
    // { path: "/", element: <App /> } => 최상위 부모 라우트
    // path: "/" => 매칭할 URL은 사이트의 루트 주소 (/)
    // element: <App /> => 라우트가 매칭되었을 때 화면에 렌더링할 컴포넌트 (여기서는 App 컴포넌트를 불러옴)
    // children: [ ... ] => 자식 라우트들의 배열 (/라는 부모 경로 안에서 세부 경로들을 정의하는 부분)
    path: "/",
    element: <App />,
    children: [
      // 1. 인덱스 라우트
      { index: true, element: <Home /> },                   // 인덱스 라우트 (부모(/)가 매칭되었을 때, 추가 경로 없이 기본으로 렌더링될 화면)
      
      // 2. 정적 라우트
      { path: "products", element: <Products /> },          // 최종 경로: /products (http://localhost:5173/products), 렌더: <App />(틀) + <Products />(본문)
      { path: "media", element: <Media /> },                // 최종 경로: /media, 렌더: <App />(틀) + <Media />(본문)
      { path: "team", element: <Team /> },
      { path: "contact", element: <Contact /> },
      
      // 3. 동적 라우트
      // :slug => 동적 세그먼트
      // 고정된 문자열이 아니라, 사용자가 어떤 값을 넣든 URL에 맞춰 매칭됨
      // ex) http://localhost:5173/media/bidderlive-1m-user 
      // => 라우트 경로: media/:slug, 실제 매칭된 slug 값: bidderlive-1m-user, 렌더: <App />(틀) + <NewsDetailPage />(본문)
      { path: "media/:slug", element: <NewsDetailPage /> }, 


      // 나머지 정적 라우트들
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignUpPage /> },
      { path: "signup/success", element: <SignUpSuccessPage /> },

      { path: "find-id", element: <FindIdPage /> },
      { path: "find-id/success", element: <FindIdResultSuccessPage /> },
      { path: "find-id/fail", element: <FindIdResultFailPage /> },

      { path: "find-password", element: <FindPasswordPage /> },
      { path: "find-password/success", element: <FindPasswordResultSuccessPage /> },
      { path: "find-password/fail", element: <FindPasswordResultFailPage /> },

      { path: "change-password", element: <ChangePasswordPage /> },
      { path: "change-password/complete", element: <ChangePasswordCompletePage /> },

      // 4. 와일드 카드 라우트
      // 사용자가 입력한 URL이 자식 라우트 목록 중 어디에도 맞지 않으면 이 라우트가 매칭된다.
      { path: "*", element: <NotFound /> }
    ]
  }
]);

// document.getElementById('root')! => index.html 안에 있는 <div id="root"></div> 이 부분을 찾는 코드
// createRoot() => React 렌더링(컴포넌트를 화면에 그리는 과정) 엔진 초기화
// .render() => App 컴포넌트를 실제 HTML에 그림
// <React.StrictMode> => React의 개발용 도우미(디버깅 도구) -> 개발 중 실수나 문제를 미리 감지
// <RouterProvider router={router} /> => React Router에서 라우팅 시스템 전체를 앱에 공급하는 컴포넌트
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

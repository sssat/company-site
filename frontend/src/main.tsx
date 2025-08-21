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
import './index.css';

// Home, Products, ... 컴포넌트 임포트
import Home from "./pages/Home";
import Media from "./pages/Media";
import Products from "./pages/Products";
import Team from "./pages/Team";
import Contact from "./pages/Contact";
import NewsDetail from "./components/MediaOnly/NewsDetail";

// export를 추가해 경고 제거
export function NotFound() {
  return <div style={{ padding: 24 }}>페이지를 찾을 수 없습니다.</div>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "media", element: <Media /> },
      { path: "media/:slug", element: <NewsDetail /> }, // 상대 경로(슬래시 없음)
      { path: "products", element: <Products /> },
      { path: "team", element: <Team /> },
      { path: "contact", element: <Contact /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

// document.getElementById('root')! => index.html 안에 있는 <div id="root"></div> 이 부분을 찾는 코드
// createRoot() => React 렌더링(컴포넌트를 화면에 그리는 과정) 엔진 초기화
// .render() => App 컴포넌트를 실제 HTML에 그림
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

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
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// App.tsx 파일에서 App 컴포넌트(App 함수) 임포트
// App은 전체 화면의 뼈대가 되는 컴포넌트이다.
// App 컴포넌트 안에 Header, Footer, Home, Router, Footer, ... 등 모든 구조가 들어간다.
// <=> import App from './App.tsx';
import App from './App';

import './index.css';

import Home from './pages/Home';
import Products from './pages/Products';
import Media from './pages/Media';
import Team from './pages/Team';
import Contact from './pages/Contact';

// document.getElementById('root')! => index.html 안에 있는 <div id="root"></div> 이 부분을 찾는 코드
// createRoot() => React 렌더링(컴포넌트를 화면에 그리는 과정) 엔진 초기화
// .render() => App 컴포넌트를 실제 HTML에 그림
// <StrictMode> => React의 개발용 도우미(디버깅 도구) -> 개발 중 실수나 문제를 미리 감지
// <BrowserRouter> => 앱 전체를 라우터 기능으로 감쌈 (이 안에서만 <Route>, <NavLink> 등 라우팅이 동작한다)
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* <Routes>: 라우터 경로들을 묶어주는 컨테이너 역할. 내부에는 반드시 하나 이상의 <Route> 컴포넌트가 들어가야 함 */}
      {/* element={<App />}: "화면에 App 컴포넌트를 렌더링하라"는 뜻 */ }
      {/* 
          index: 부모 라우트(<App />)에 딱 맞게 들어왔을 때 보여줄 기본 자식 라우트(여기선 <Home />)
          /products 접근 시 동작
          1. React Router는 부모(<App />)를 먼저 렌더링
          2. <App /> 안의 <Outlet /> 자리에 path="products" 자식 라우트인 <Products />가 들어감
      {/* 참고로 index는 Nesting 구조일 때만 사용 가능하다. 
          Nesting(중첩 라우팅)이란 "부모-자식 구조로 라우트를 구성" 하는걸 뜻한다. 왜 쓰냐면 공통 레이아웃을 한 번만 작성하고, 자식 페이지의 내용만 바꾸고 싶기때문. 
          <App>
            <Header />
            <Outlet>
              <Products />  ← 여기만 바뀜
            </Outlet>
            <Footer />
          </App> 
          => 이런식으로 사용하고 싶을 때 Nesting 구조를 사용한다. */}
      <Routes>
        <Route element={<App />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="media" element={<Media />} />
          <Route path="team" element={<Team />} />
          <Route path="contact" element={<Contact />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import { Outlet } from 'react-router-dom';
import BackToTop from './components/BackToTopBtn/BackToTop';

// 컴포넌트란? => 화면의 일정 부분을 담당하는 독립된 단위. 재사용이 가능하다.
// App()은 함수형 컴포넌트이다. 즉, React에선 컴포넌트를 함수로 만든다.
// App은 화면에서 최상위 컴포넌트 역할을 한다. 이처럼 컴포넌트에는 계층이 존재한다.
// return(): 이 함수는 실행되면 JSX(HTML 비슷한 코드)를 반환하고 이 JSX가 화면에 렌더링 된다.
// <> ... </>: React Fragment. 여러 개의 요소를 묶어줄 때 쓰는 "보이지 않는 부모 태그"이다.
function App() {
  return (
    <>
      <Header />   {/* 이 위치에 있으므로 어떤 페이지든 헤더 컴포넌트가 상단에 항상 표시됨 */}
      <Outlet />   {/* 상위 라우트에서 정의한 <Route element={<App />} 안에 <Route path="..." element={<... />} /> 얘네들이 있으면 -> 그 각각의 컴포넌트가 여기 <Outlet /> 자리에 들어감 */}
      <Footer />   {/* 하단 고정 컴포넌트 */}

      {/* 화면 하단 우측에 떠있는 '맨 위로' 버튼 */}
      {/* 스크롤 240px 이상일 때만 보이게: */}
      <BackToTop always={false} showAt={240} />
    </> 
  );
}

// “이 파일에서 기본으로 내보낼 것은 App 함수(컴포넌트)" 라는 뜻
// 이를 통해 외부에서 App이라는 이름으로 가져갈 수 있다.
export default App;

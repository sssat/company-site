// 참고로 .tsx란 TypeScript(타입이 있는 자바스크립트) + JSX(HTML처럼 생긴 문법)가 함께 들어간 파일이다.
// TypeScript: 변수/함수/props에 타입을 붙일 수 있는 언어 (string, number, React.FC, 등)
// JavaScript: 실제 로직, 함수 실행, 조건문, 이벤트 처리
// JSX: UI 구조를 표현하는 문법 (HTML처럼 생김)
// HTML: .tsx엔 실제론 없음! JSX를 브라우저가 HTML로 바꾸는 것뿐

import { NavLink } from 'react-router-dom';
import styles from './Header.module.css';
import logo from '../../assets/company_logo/company_logo.svg'; 

export default function Header() {
  const userName = 'OOO님'; // 실제 로그인 데이터로 대체

  // return () => JSX 문법을 반환. 이게 화면에 그려짐(렌더링 됨)
  return (

    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          {/* 로고 이미지 */}
          {/* src={logo}: 이미지 경로를 지정. 여기서 logo는 import logo from '../assets/logo.svg';로 불러온 이미지 파일 경로
              alt="MARKET STAGE": 이미지가 로딩되지 않을때의 대체 텍스트 */}
          <img src={logo} alt="MARKET STAGE" className={styles.logo} />
        </div>

        {/* 네비게이션 */}
        <nav className={styles.nav}>
          {[
            { to: '/', label: 'Home' },
            { to: '/products', label: 'Products' },
            { to: '/media', label: 'Media' },
            { to: '/team', label: 'Team' },
            { to: '/contact', label: 'Contact' },
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}

              className={function(data) {

                // data에서 isActive값을 꺼내서 별도 변수에 저장함
                const isActive = data.isActive;
                let classNames = styles.pill;

                if (isActive) {
                  classNames += ' ' + styles.active;
                }

                return classNames;
              }}
            >
              {item.label}
            </NavLink>
          ))}

        {/*최종적으로 
          <nav className={styles.nav}>
            [
              <NavLink ...>Home</NavLink>,
              <NavLink ...>Products</NavLink>,
              <NavLink ...>Media</NavLink>,
              <NavLink ...>Team</NavLink>,
              <NavLink ...>Contact</NavLink>
            ]
          </nav>
          이런 형태이다.
        */}  
        </nav>

        {/* 우측: Admin / 사용자명 / 로그아웃 */}
        <div className={styles.userArea}>
          <div className={styles.userInfo}>
            <div className={styles.adminRow}>
              <span className={styles.adminBadge}>🛡️</span>
              <span className={styles.adminText}>Admin</span>
            </div>
            <span className={styles.userName}>{userName}</span>
          </div>
          <button className={styles.logoutBtn} onClick={() => alert('로그아웃')}>
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}

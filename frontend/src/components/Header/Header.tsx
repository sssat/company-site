// 참고로 .tsx란 TypeScript(타입이 있는 자바스크립트) + JSX(HTML처럼 생긴 문법)가 함께 들어간 파일이다.
// TypeScript: 변수/함수/props에 타입을 붙일 수 있는 언어 (string, number, React.FC, 등)
// JavaScript: 실제 로직, 함수 실행, 조건문, 이벤트 처리
// JSX: UI 구조를 표현하는 문법 (HTML처럼 생김)
// HTML: .tsx엔 실제론 없음! JSX를 브라우저가 HTML로 바꾸는 것뿐

import { NavLink } from "react-router-dom";
import styles from "./Header.module.css";
import logo from "../../assets/company_logo/company_logo.svg";

export default function Header() {
  // 실제 앱에선 글로벌 상태(예: Recoil/Context)나 쿠키/토큰 검사로 대체
  const isLoggedIn = false;         // ← 데모: 로그인 여부
  const userName = "OOO님";         // ← 데모: 로그인 시 표시될 이름

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* 브랜드 로고 (클릭 시 Home으로 이동) */}
        <div className={styles.brand}>
          <NavLink
            to="/"
            className={styles.brandLink}
            aria-label="홈으로 이동"
            title="홈으로 이동"
          >
            <img src={logo} alt="MARKET STAGE" className={styles.logo} />
          </NavLink>
        </div>

        {/* 네비게이션 */}
        <nav className={styles.nav}>
          {[
            { to: "/", label: "Home" },
            { to: "/products", label: "Products" },
            { to: "/media", label: "Media" },
            { to: "/team", label: "Team" },
            { to: "/contact", label: "Contact" },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={(data) => {
                const isActive = data.isActive;
                let classNames = styles.pill;
                if (isActive) classNames += " " + styles.active;
                return classNames;
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 우측 영역: 로그인 여부에 따라 표시 분기 */}
        {isLoggedIn ? (
          // 로그인 상태: Admin 뱃지 + 사용자명 + 로그아웃
          <div className={styles.userArea}>
            <div className={styles.userInfo}>
              <div className={styles.adminRow}>
                <span className={styles.adminBadge}>🛡️</span>
                <span className={styles.adminText}>Admin</span>
              </div>
              <span className={styles.userName}>{userName}</span>
            </div>
            <button
              className={styles.logoutBtn}
              onClick={() => alert("로그아웃")}
            >
              로그아웃
            </button>
          </div>
        ) : (
          // 비로그인 상태: 로그인 · 회원가입
          <div className={styles.authArea}>
            <NavLink to="/login" className={styles.authLink}>
              로그인
            </NavLink>
            <NavLink to="/signup" className={styles.authLink}>
              회원가입
            </NavLink>
          </div>
        )}
      </div>
    </header>
  );
}

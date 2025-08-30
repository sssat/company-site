// src/components/Header.tsx
import { NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import styles from "./Header.module.css";
import logo from "../../assets/company_logo/company_logo.svg";

export default function Header() {
  const { isAuthenticated, role, userName, logout } = useAuth(); // ← 전역 상태 사용

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* 좌측 브랜드 로고 */}
        <div className={styles.brand}>
          <NavLink to="/" className={styles.brandLink} aria-label="홈으로 이동" title="홈으로 이동">
            <img src={logo} alt="MARKET STAGE" className={styles.logo} />
          </NavLink>
        </div>

        {/* 가운데 내비게이션 */}
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
              className={({ isActive }) =>
                isActive ? `${styles.pill} ${styles.active}` : styles.pill
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 우측 인증/사용자 영역 */}
        {isAuthenticated ? (
          <div className={styles.userArea} ref={menuRef}>
            <button
              className={styles.userTrigger}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {role !== "USER" && (
                <span className={styles.adminBadge} aria-label="관리자">
                  🛡️ {role === "ADMIN" ? "Admin" : "Super Admin"}
                </span>
              )}
              <span className={styles.userName}>{`${userName ?? "사용자"}님`}</span>
              <span className={styles.caret} aria-hidden>▾</span>
            </button>

            {menuOpen && (
              <div className={styles.userMenu} role="menu">
                {/* SUPER_ADMIN 전용 메뉴 */}
                {role === "SUPER_ADMIN" && (
                  <NavLink
                    to="/admin/users"
                    className={styles.menuItem}
                    onClick={() => setMenuOpen(false)}
                  >
                    회원 관리
                  </NavLink>
                )}

                <NavLink
                  to="/change-password"
                  className={styles.menuItem}
                  onClick={() => setMenuOpen(false)}
                >
                  비밀번호 변경
                </NavLink>
                <button className={styles.menuItem} onClick={logout}>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.authArea}>
            <NavLink to="/login" className={styles.authLink}>로그인</NavLink>
            <span className={styles.divider}>|</span>
            <NavLink to="/signup" className={styles.authLink}>회원가입</NavLink>
          </div>
        )}
      </div>
    </header>
  );
}

// src/components/Header.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth"; // hooks -> contexts 리다이렉트
import styles from "./Header.module.css";
import logo from "../../assets/company_logo/company_logo.svg";

type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

/** 표시용 이름 생성 유틸 */
function getDisplayName(userName: string | null, userId: string | null): string {
  if (userName && userName.trim().length > 0) return userName;
  if (userId && userId.trim().length > 0) return userId;
  return "사용자";
}

/** Role 안전 파싱 (알 수 없는 값이면 'USER') */
function normalizeRole(role: Role | null): Role {
  return role === "ADMIN" || role === "SUPER_ADMIN" ? role : "USER";
}

export default function Header() {
  const { auth, logout } = useAuth(); 
  const isAuthenticated = Boolean(auth.isAuthed);
  const role: Role = normalizeRole(auth.role);
  const displayName = getDisplayName(auth.userName, auth.userId);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  // 바깥 클릭 시 메뉴 닫기
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Esc로 메뉴 닫기(접근성 보완)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      setMenuOpen(false);
      nav("/");
    }
  };

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
        <nav className={styles.nav} aria-label="주요 메뉴">
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
              aria-controls="user-menu"
            >
              {role !== "USER" && (
                <span className={styles.adminBadge} aria-label="관리자">
                  🛡️ {role === "ADMIN" ? "Admin" : "Super Admin"}
                </span>
              )}
              <span className={styles.userName}>{`${displayName}님`}</span>
              <span className={styles.caret} aria-hidden>
                ▾
              </span>
            </button>

            {menuOpen && (
              <div id="user-menu" className={styles.userMenu} role="menu">
                {/* SUPER_ADMIN 전용 메뉴 */}
                {role === "SUPER_ADMIN" && (
                  <NavLink
                    to="/admin/users"
                    className={styles.menuItem}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    회원 관리
                  </NavLink>
                )}

                {/* ADMIN/SUPER_ADMIN 공통 메뉴가 필요하면 주석 해제
                {(role === "ADMIN" || role === "SUPER_ADMIN") && (
                  <NavLink
                    to="/contact/board"
                    className={styles.menuItem}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    문의 게시판
                  </NavLink>
                )} */}

                <NavLink
                  to="/change-password"
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  비밀번호 변경
                </NavLink>

                <button className={styles.menuItem} role="menuitem" onClick={onLogout}>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.authArea}>
            <NavLink to="/login" className={styles.authLink}>
              로그인
            </NavLink>
            <span className={styles.divider}>|</span>
            <NavLink to="/signup" className={styles.authLink}>
              회원가입
            </NavLink>
          </div>
        )}
      </div>
    </header>
  );
}
